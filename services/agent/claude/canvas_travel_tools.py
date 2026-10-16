"""Model-selected read-only travel tools; no natural-language intent gate."""
from __future__ import annotations

import asyncio
import json
from typing import Literal

from claude_agent_sdk import create_sdk_mcp_server, tool
from pydantic import Field, ValidationError
from services.shared.traveler_profile import reference_catalog

from ..travel_contracts import AirportQuery, Airports, FlightSearch, HotelSearch, PlaceQuery, Places
from .canvas_travel import CanvasTravelObserver, draft_facts
from .research_result import StrictResult


class DateEvidence(StrictResult):
    source: Literal["canvas", "conversation"]
    quotes: list[str] = Field(default_factory=list, max_length=3)


class StayArguments(StrictResult):
    criteria: HotelSearch
    dates: DateEvidence


class FlightArguments(StrictResult):
    criteria: FlightSearch
    dates: DateEvidence


class CanvasTravelTools(CanvasTravelObserver):
    """Reuse provider budgets/projection, with validated model tool arguments.

    Language interpretation belongs to the model. The host checks structured
    input, date provenance, provider response, identity and per-turn budgets.
    No tool can mutate a Plan or book anything.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs, parse_message=False)

    def _validate_dates(self, arguments):
        criteria = arguments.criteria.model_dump(mode="json")
        pair = [criteria.get("check_in", criteria.get("departure_date")),
                criteria.get("check_out", criteria.get("return_date"))]
        facts = draft_facts(self.draft)
        if arguments.dates.source == "canvas":
            if facts["flexible"] or pair != [facts["start"], facts["end"]]:
                raise ValueError("Dates must match the exact current Canvas dates, or cite the traveler's date request.")
        else:
            texts = [self.message] + [m["content"] for m in self.context.recent_messages if m.get("role") == "user"]
            if not arguments.dates.quotes or any(not q.strip() or len(q) > 2000 or not any(q in t for t in texts)
                                                for q in arguments.dates.quotes):
                raise ValueError("Cite the traveler's actual date words, including context for the year. Assistant text is not date evidence.")

    @staticmethod
    def _error(code, detail):
        return {"is_error": True, "content": [{"type": "text", "text": json.dumps({"error": code, "detail": detail})}]}

    async def _invoke(self, name, arguments):
        if name not in self.names:
            return self._error("tool_not_allowed", "Only read-only travel discovery is available.")
        if name in {"search_stays", "search_flights"}:
            mode = "stays" if name == "search_stays" else "flights"
            try:
                parsed = (StayArguments if mode == "stays" else FlightArguments).model_validate(arguments)
                self._validate_dates(parsed)
                if mode == "flights":
                    airports = {a["code"] for a in reference_catalog("airports")}
                    invalid = [field for field in ("origin", "destination") if getattr(parsed.criteria, field) not in airports]
                    if invalid:
                        return self._error("airport_selection_required", {
                            "fields": invalid,
                            "instruction": "Use search_airports to resolve actual airports. City codes such as LON are not airports. Retain dates and passengers. If several airports fit, ask which one, or use an explicitly authorized alternative and name it. This validation failure has not consumed a rate search.",
                        })
            except ValidationError as error:
                # Field paths only: validation errors can otherwise echo input.
                fields = sorted({".".join(str(p) for p in e["loc"]) or "criteria" for e in error.errors()})
                return self._error("invalid_search_inputs", {"fields": fields, "instruction": "Ask naturally for missing or invalid details; never invent values."})
            except ValueError as error:
                return self._error("date_evidence_required", str(error))
            previous = self.criteria_by_mode.get(mode)
            if previous is not None and previous != parsed.criteria:
                return self._error("search_already_attempted", "Only one search per mode per turn. Ask the traveler before another search.")
            self.criteria_by_mode[mode] = parsed.criteria
            return await super()._invoke(name, {})

        # Lookup tools help the model resolve locations before all booking inputs
        # exist; they do not search rates, and share the same bounded call budget.
        try:
            if name == "travel_capabilities":
                if arguments:
                    return self._error("invalid_lookup_inputs", "This tool takes no arguments.")
                from ..travel_contracts import Capabilities
                caps = Capabilities.model_validate(await self._call("capabilities", {}, "capabilities"))
                payload = {"stays": caps.hotels, "flights": caps.flights, "sandbox": caps.sandbox}
            elif name == "search_destinations":
                query = PlaceQuery.model_validate(arguments)
                result = Places.model_validate(await self._call("places", query.model_dump(), "lookup"))
                payload = {"places": [p.model_dump() for p in result.places]}
            else:
                query = AirportQuery.model_validate(arguments)
                result = Airports.model_validate(await self._call("airports", query.model_dump(), "lookup"))
                payload = {"airports": [a.model_dump() for a in result.airports]}
            encoded = json.dumps(payload)
            if self.tool_bytes + len(encoded.encode()) > 24576:
                raise ValueError("travel_text_limit")
            self.tool_bytes += len(encoded.encode())
            return {"content": [{"type": "text", "text": encoded}]}
        except ValidationError:
            return self._error("invalid_lookup_inputs", "Use a location query and, for stays, its ISO country code.")
        except asyncio.CancelledError:
            self.snapshots.clear()
            raise
        except Exception:
            return self._error("lookup_unavailable", "Location lookup unavailable. Do not retry automatically or invent results.")

    def server(self):
        @tool("travel_capabilities", "Check enabled provider modes. Read-only; no booking inputs required.", {})
        async def capabilities(args): return await self.invoke("travel_capabilities", args)

        @tool("search_destinations", "Resolve a stay destination by city/area name and ISO country code. Ask if geography is ambiguous.", PlaceQuery.model_json_schema())
        async def destinations(args): return await self.invoke("search_destinations", args)

        @tool("search_airports", "Find airports by city or name. Ask the traveler to choose if several airports fit.", AirportQuery.model_json_schema())
        async def airports(args): return await self.invoke("search_airports", args)

        @tool("search_stays", "Search stays using complete structured criteria from the conversation/current Canvas. Exact dates, explicit room allocation/child ages and nationality required. dates.source=canvas uses current exact draft dates; conversation requires verbatim traveler date quotes. Read-only; nothing saved or booked.", StayArguments.model_json_schema())
        async def stays(args): return await self.invoke("search_stays", args)

        @tool("search_flights", "Search return flights using actual airport IATA codes (e.g. LHR, never city codes such as LON). Resolve cities with search_airports. Require exact dates, explicit adults/child/infant ages and pricing country. dates.source=canvas uses exact draft dates; conversation requires verbatim traveler date quotes. Read-only.", FlightArguments.model_json_schema())
        async def flights(args): return await self.invoke("search_flights", args)

        return create_sdk_mcp_server(name="travel", version="2.0.0", tools=[capabilities, destinations, stays, airports, flights])
