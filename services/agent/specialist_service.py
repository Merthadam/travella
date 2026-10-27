"""One focused turn using the same Plan coordinator and durable CRUD lease."""
import asyncio
import hashlib
import json
from collections.abc import Awaitable

from fastapi import HTTPException

from .http_contracts import AgentResponse
from services.travel_topics import WorkspaceUpdate, WorkspaceView, digest as input_digest


async def handle_specialist(service, request, subject, token, plan, *, on_text_delta=None):
    plan_id = str(request.plan_id)
    if not service.context_reader or not hasattr(service.context_reader, "travel_run"):
        raise HTTPException(503, "Travel discussions are unavailable.")
    digest = hashlib.sha256(json.dumps(request.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()
    try:
        reservation = await service.runs.reserve(subject, plan_id, request.event_id,
                                                 exclusive=True, input_digest=digest)
    except ValueError:
        raise HTTPException(409, "Another reply is running or this message changed. Please retry.") from None
    if not reservation.owner:
        if reservation.future.done():
            return AgentResponse.model_validate(reservation.future.result())
        return AgentResponse(status="in_progress", plan_id=request.plan_id,
                             event_id=request.event_id, generation=reservation.generation)
    generation = reservation.generation
    base = {"plan_id": plan_id, "event_id": request.event_id, "generation": generation}
    begun = committed = False
    workspace = request.workspace_context
    workspace_digest = input_digest(workspace.model_dump(mode="json")) if workspace else None
    binding = {"workspace_input_digest": workspace_digest} if workspace_digest else {}

    async def finish(value):
        projection = {**base, **value}
        await service.runs.resolve_pending(subject, plan_id, request.event_id, projection)
        return AgentResponse.model_validate(projection)

    async def emit(value):
        if on_text_delta and await service.runs.generation_current(subject, plan_id, generation):
            result = on_text_delta(value)
            if isinstance(result, Awaitable):
                await result

    try:
        from .travel_registry import travel_registry
        discussion = request.travel_discussion
        workspace_snapshot = None
        if workspace and workspace.search_id:
            workspace_snapshot = travel_registry.get(subject, plan_id, workspace.search_id, request.topic)
            try:
                workspace.view.validate_members(workspace_snapshot)
            except ValueError:
                raise HTTPException(409, "These workspace options changed. Search again to continue.") from None
        selected_snapshots = travel_registry.resolve(subject, plan_id, request.topic, discussion) if discussion else []
        snapshot = await service.context_reader.travel_run(
            request.plan_id, token, topic=request.topic, action="begin", event_id=request.event_id,
            message=request.message.strip(), generation=generation,
            discussion=discussion.model_dump() if discussion else None,
            **binding,
        )
        begun = True
        if selected_snapshots:
            from types import SimpleNamespace
            from .claude.canvas_travel import draft_facts
            for selected_snapshot in selected_snapshots:
                if not selected_snapshot.draft_facts:
                    selected_snapshot.draft_facts = draft_facts(SimpleNamespace(components=(snapshot.get("saved_canvas") or {}).get("components", {})))
                travel_registry.put(subject, plan_id, selected_snapshot)
        if discussion and discussion.intent == "review":
            from .claude.travel_specialist import _comparison
            ref = discussion.options[0]
            snap = selected_snapshots[0]
            option = next(o for o in snap.results if o.id == ref.option_id)
            comparison = _comparison(snap, option, room_id=ref.room_id)
            projection = {"status": "in_progress", "assistant_text": "Review the exact offer below before confirming your choice. Nothing is booked or held.",
                          "travel_specialist_result": {"comparison": {"options": [comparison.model_dump()]}}}
        else:
            if workspace:
                snapshot["workspace_context"] = {**workspace.model_dump(mode="json"),
                    "applied_criteria": workspace_snapshot.criteria.model_dump(mode="json") if workspace_snapshot else None}
            if discussion:
                snapshot["selected_context"] = {"snapshots": selected_snapshots, "discussion": discussion}
            result = await service.graph.invoke(
                {**base, "traveler_scope": subject, "plan_revision": plan.get("revision", 1),
                 "topic": request.topic, "message": request.message.strip()},
                authorization_token=token, specialist_context=snapshot, on_text_delta=emit,
            )
            projection = result.get("projection", {})
        if not await service.runs.generation_current(subject, plan_id, generation):
            return await finish({"status": "interrupted"})
        text = projection.get("assistant_text") or projection.get("question")
        if projection.get("status") not in {"in_progress", "needs your input"} or not text:
            return await finish({"status": "unable to continue", "error": projection.get("error") or "Travel research could not be completed."})
        from services.travel_topics import issue_comparison_proof
        output = projection.get("travel_specialist_result") or {}
        comparison = output.get("comparison")
        if comparison and not comparison.get("options"):
            comparison = None
        brief_digest = snapshot["brief"]["digest"]
        proof = issue_comparison_proof(subject, plan_id, request.topic, request.event_id, brief_digest, comparison) if comparison else None
        payload = dict(action="complete", event_id=request.event_id, message=request.message.strip(),
                       assistant_text=text[:2000], generation=generation, brief_digest=brief_digest,
                       notes=output.get("notes"))
        payload["discussion"] = discussion.model_dump() if discussion else None
        payload.update(binding)
        if comparison:
            payload.update(comparison=comparison, comparison_proof=proof)
        active = service._active_streams.get((subject, plan_id, request.event_id))
        if active:
            active["committing"] = True
        commit = asyncio.create_task(service.context_reader.travel_run(request.plan_id, token, topic=request.topic, **payload))
        try:
            saved = await asyncio.shield(commit)
        except asyncio.CancelledError:
            saved = await commit
        committed = True
        update = None
        final_search = projection.get("workspace_update")
        if workspace and not workspace.draft_dirty and final_search and await service.runs.generation_current(subject, plan_id, generation):
            # Resolve again after commit: expiry and owner/topic are authority,
            # whereas the browser revision is only an optimistic concurrency token.
            try:
                final = travel_registry.get(subject, plan_id, final_search["search_id"], request.topic)
                from types import SimpleNamespace
                from .claude.canvas_travel import draft_facts
                final.draft_facts = draft_facts(SimpleNamespace(components=(snapshot.get("saved_canvas") or {}).get("components", {})))
                view = WorkspaceView.model_validate(final_search.get("view") or {})
                update = WorkspaceUpdate(action_id=input_digest({"event": request.event_id, "generation": generation}),
                    plan_id=plan_id, topic=request.topic, instance_id=workspace.instance_id,
                    base_revision=workspace.revision, run_id=request.event_id, brief_digest=brief_digest,
                    search_id=final.search_id, snapshot=final.model_dump(mode="json"), view=view)
            except (HTTPException, ValueError, KeyError):
                update = None  # Committed conversation remains valid when evidence expires.
        return await finish({"status": projection["status"], "assistant_text": text[:2000],
                             "travel_specialist_result": saved, "workspace_update": update.model_dump(mode="json") if update else None})
    except asyncio.CancelledError:
        await finish({"status": "interrupted"})
        raise
    except HTTPException as exc:
        await finish({"status": "unable to continue", "error": str(exc.detail)})
        raise
    except Exception:
        return await finish({"status": "unable to continue", "error": "Travel research is temporarily unavailable. Please retry."})
    finally:
        if begun and not committed:
            async def release():
                try:
                    await service.context_reader.travel_run(request.plan_id, token, topic=request.topic,
                        action="cancel", event_id=request.event_id, message=request.message.strip(), generation=generation)
                except Exception:
                    pass  # A process/network failure is also bounded by the durable lease.
            task = asyncio.create_task(release())
            try:
                await asyncio.shield(task)
            except asyncio.CancelledError:
                await task
