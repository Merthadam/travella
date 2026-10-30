import { ApiError, request } from './api';
import { travelTopicProjection } from './features/plans/travel/travelTopicSchema';
import { travelWorkspaceContextSchema, travelWorkspaceUpdateSchema } from './features/plans/travel/travelWorkspaceSchema';

export const requestId = () => `${Date.now()}.${crypto.randomUUID()}`;
export function normalizeTitle(value) {
  const title = value.normalize('NFC').trim();
  const count = [...title].length;
  const error = !count ? 'Enter a plan name.' : count > 120 ? 'Use 120 characters or fewer.' : /\p{Cc}/u.test(title) ? 'Remove unsupported control characters.' : '';
  return { title, count, error };
}
const path = id => `/v1/plans/${encodeURIComponent(id)}`;
const canvasSaveAttempts = new Map();
const agentPath = plan => `/v1/agent/plans/${encodeURIComponent(plan.plan_id)}/events`;

export function researchOfferProjection(value) {
  if (!value || typeof value.id !== 'string' || value.id.length > 100 || !Number.isInteger(value.revision)
    || !['available', 'review', 'deferred', 'consumed', 'superseded'].includes(value.status)
    || (value.message_id !== null && (typeof value.message_id !== 'string' || value.message_id.length > 100))) return null;
  return { id: value.id, status: value.status, revision: value.revision, message_id: value.message_id };
}

function workspaceProjection(value, planId, topic, runId) {
  const parsed = travelWorkspaceUpdateSchema.safeParse(value);
  return parsed.success && parsed.data.plan_id === planId && parsed.data.topic === topic && parsed.data.run_id === runId ? parsed.data : undefined;
}

async function agentTurnStream(plan, message, eventId, { signal, onEvent, topic, travelDiscussion, workspaceContext, forwardedProps, canvasAction, contextRevision, canvasThemes, canvasEdit, researchEntryReceipt }) {
  const workspace = workspaceContext === undefined ? undefined : travelWorkspaceContextSchema.parse(workspaceContext);
  if (workspace && !['stays', 'flights'].includes(topic)) throw new ApiError('Workspace context requires a focused discussion.', 422);
  let response;
  try {
    response = await fetch(`${agentPath(plan)}/stream`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
      headers: { 'Content-Type': 'application/json', 'X-Travella-Request': '1', Accept: 'text/event-stream' },
      body: JSON.stringify({ plan_id: plan.plan_id, event_id: eventId, message, ...(workspace ? { workspace_context: workspace } : {}), ...(topic ? { topic } : {}), ...(travelDiscussion ? { travel_discussion: travelDiscussion } : {}), ...(forwardedProps ? { forwardedProps } : {}), ...(canvasEdit ? { canvas_edit: canvasEdit } : {}), ...(canvasAction ? { canvas_action: canvasAction, context_revision: contextRevision, ...(researchEntryReceipt ? { research_entry_receipt: researchEntryReceipt } : {}), ...(canvasThemes ? { canvas_themes: canvasThemes } : {}) } : {}) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Unable to connect. Please try again.', 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.message || 'Please try again.', response.status, data.fields, data.state, data.code);
  }
  if (!response.body?.getReader) throw new ApiError('The streaming response is unavailable.', 503);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', terminal = null;
  const consumeFrame = frame => {
    const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    let event;
    try { event = JSON.parse(data); } catch { return; }
    if (event.type === 'TEXT_MESSAGE_START' && event.role === 'assistant') {
      onEvent({ type: event.type, messageId: String(event.messageId || '') });
    } else if (event.type === 'TEXT_MESSAGE_CONTENT' && typeof event.delta === 'string') {
      onEvent({ type: event.type, messageId: String(event.messageId || ''), delta: event.delta });
    } else if (event.type === 'TEXT_MESSAGE_END') {
      onEvent({ type: event.type, messageId: String(event.messageId || '') });
    } else if (event.type === 'CUSTOM' && event.name === 'a2ui' && event.value && typeof event.value === 'object') {
      onEvent({ type: 'CUSTOM', name: 'a2ui', value: event.value });
    } else if (event.type === 'STATE_SNAPSHOT' && event.snapshot && (event.snapshot.trip_context || event.snapshot.canvas_draft || event.snapshot.canvas_edit_result || event.snapshot.research_offer || event.snapshot.flight_preview || event.snapshot.travel_specialist_result || event.snapshot.workspace_update)) {
      const specialist = travelTopicProjection(event.snapshot.travel_specialist_result, plan.plan_id, topic);
      onEvent({ type: 'STATE_SNAPSHOT', snapshot: { ...(specialist ? { travel_specialist_result: specialist } : {}), workspace_update: workspaceProjection(event.snapshot.workspace_update, plan.plan_id, topic, eventId), ...(event.snapshot.trip_context ? { trip_context: event.snapshot.trip_context } : {}), ...(event.snapshot.canvas_draft ? { canvas_draft: event.snapshot.canvas_draft } : {}), ...(event.snapshot.canvas_edit_result ? { canvas_edit_result: event.snapshot.canvas_edit_result } : {}), ...(event.snapshot.flight_preview ? { flight_preview: event.snapshot.flight_preview } : {}), research_offer: researchOfferProjection(event.snapshot.research_offer), assistant_message_id: typeof event.snapshot.assistant_message_id === 'string' ? event.snapshot.assistant_message_id.slice(0, 100) : undefined } });
    } else if (event.type === 'TERMINAL') {
      terminal = {
        type: 'TERMINAL',
        generation: Number.isInteger(event.generation) ? event.generation : undefined,
        status: ['complete', 'needs your input', 'shortlist_ready', 'stopped', 'interrupted', 'error'].includes(event.status) ? event.status : 'error',
        sources: Array.isArray(event.sources) ? event.sources.slice(0, 5).map(source => ({ title: String(source?.title || '').slice(0, 120), url: String(source?.url || '').slice(0, 320) })) : [],
        message: typeof event.message === 'string' ? event.message.slice(0, 240) : undefined,
        research_offer: researchOfferProjection(event.research_offer),
        workspace_update: workspaceProjection(event.workspace_update, plan.plan_id, topic, eventId),
        ...(travelTopicProjection(event.travel_specialist_result, plan.plan_id, topic) ? { travel_specialist_result: travelTopicProjection(event.travel_specialist_result, plan.plan_id, topic) } : {}),
        assistant_message_id: typeof event.assistant_message_id === 'string' ? event.assistant_message_id.slice(0, 100) : undefined,
      };
      onEvent(terminal);
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        consumeFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
      if (done) break;
    }
    if (buffer.trim()) consumeFrame(buffer);
  } finally {
    if (signal?.aborted) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (!terminal) throw new ApiError('The connection stopped before the reply finished.', 0);
  return terminal;
}

export const plansApi = {
  list: (view = 'active', cursor) => request(`/v1/plans?${new URLSearchParams({ view, ...(cursor ? { cursor } : {}) })}`),
  get: (id, view = 'active') => request(`${path(id)}?view=${view}`),
  create: id => request('/v1/plans', {}, { headers: { 'Idempotency-Key': id } }),
  activity: (plan, id) => request(`${path(plan.plan_id)}/activity`, {}, { headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision) } }),
  conversationMessages: plan => request(`${path(plan.plan_id)}/conversation/messages`),
  travelTopic: async (plan, topic) => {
    const snapshot = travelTopicProjection(await request(`${path(plan.plan_id)}/travel/${encodeURIComponent(topic)}`), plan.plan_id, topic);
    if (!snapshot) throw new ApiError('This discussion could not be loaded safely.', 502);
    return snapshot;
  },
  travelTurn: (plan, topic, message, id, stream) => agentTurnStream(plan, message, id, { ...stream, topic }),
  prepareTravelChoice: (plan, topic, action, revision) => request(`${path(plan.plan_id)}/travel/${encodeURIComponent(topic)}/choices/challenge`, action, { headers: { 'Idempotency-Key': requestId(), 'If-Match': String(revision) } }),
  commitTravelChoice: (plan, topic, action, revision, challenge, id) => request(`${path(plan.plan_id)}/travel/${encodeURIComponent(topic)}/choices`, action, { headers: { 'Idempotency-Key': id, 'If-Match': String(revision), 'X-Plan-Challenge': challenge } }),
  researchContext: plan => request(`${path(plan.plan_id)}/research-context`),
  researchOffer: plan => request(`${path(plan.plan_id)}/research-offer`),
  researchOfferAction: (plan, action, revision, id) => request(`${path(plan.plan_id)}/research-offer/actions`, action, { headers: { 'Idempotency-Key': id, 'If-Match': String(revision) } }),
  updateResearchContext: async (plan, changes, revision, id, action) => {
    let snapshot;
    const messages = [];
    const result = await agentTurnStream(plan, '', id, {
      forwardedProps: { a2ui: { action: {
        name: 'update_trip_context', surfaceId: 'trip-brief', sourceComponentId: 'root',
        timestamp: action?.timestamp || new Date().toISOString(), context: { changes, revision },
      } } },
      onEvent(event) {
        if (event.type === 'CUSTOM') messages.push(event.value);
        if (event.type === 'STATE_SNAPSHOT') snapshot = event.snapshot.trip_context;
      },
    });
    if (result.status !== 'complete' || !snapshot) throw new ApiError(result.message || 'Trip details could not be saved. Refresh and try again.', 409);
    return { ...snapshot, a2ui_messages: messages };
  },
  agentTurn: (plan, message, eventId) => request(`${agentPath(plan)}`, { plan_id: plan.plan_id, event_id: eventId, message }),
  agentTurnStream,
  editCanvas: (plan, context, message, id, stream) => agentTurnStream(plan, message, id, { ...stream, canvasEdit: context }),
  canvas: plan => request(`${path(plan.plan_id)}/canvas`),
  generateCanvas: (plan, options, id, stream) => agentTurnStream(plan, '', id, {
    ...stream, canvasAction: { all: 'generate_plan', themes: 'generate_themes', research: 'generate_research' }[options.group || 'all'],
    researchEntryReceipt: options.research_entry_receipt,
    contextRevision: options.context_revision, canvasThemes: options.themes ? { status: 'ready', items: options.themes.items.map(item => ({ ...item, source: ['Conversation', 'Trip context', 'Saved preference'].includes(item.source) ? item.source : 'Conversation' })) } : undefined,
  }),
  saveCanvas: async (plan, payload, id) => {
    const identity = JSON.stringify({ planId: plan.plan_id, revision: plan.revision, payload });
    let attempt = canvasSaveAttempts.get(id);
    if (attempt && attempt.identity !== identity) throw new ApiError('Review your changed draft before saving again.', 409);
    if (!attempt) {
      const headers = { 'Idempotency-Key': requestId(), 'If-Match': String(plan.revision) };
      const challenge = await request(`${path(plan.plan_id)}/canvas/challenge`, payload, { headers });
      attempt = { identity, challenge: challenge.challenge };
      if (canvasSaveAttempts.size >= 30) canvasSaveAttempts.delete(canvasSaveAttempts.keys().next().value);
      canvasSaveAttempts.set(id, attempt);
    }
    try {
      const result = await request(`${path(plan.plan_id)}/canvas`, payload, {
        method: payload.snapshot === null ? 'DELETE' : 'PUT',
        headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision), 'X-Plan-Challenge': attempt.challenge },
      });
      canvasSaveAttempts.delete(id);
      return result;
    } catch (error) {
      if (error.status && error.status < 500 && error.code !== 'request_pending') canvasSaveAttempts.delete(id);
      throw error;
    }
  },
  cancelAgentTurn: (plan, eventId) => request(`${agentPath(plan)}/${encodeURIComponent(eventId)}/cancel`, {}),
  prepare: (plan, operation, title) => request(`${path(plan.plan_id)}/challenges`, { operation, ...(operation === 'rename' ? { title } : {}) }, { headers: { 'Idempotency-Key': requestId(), 'If-Match': String(plan.revision) } }),
  commit: ({ plan, operation, title, challenge, id }) => request(`${path(plan.plan_id)}${operation === 'rename' ? '/title' : operation === 'restore' ? '/restore' : ''}`, operation === 'rename' ? { title } : {}, { method: operation === 'rename' ? 'PATCH' : operation === 'delete' ? 'DELETE' : 'POST', headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision), 'X-Plan-Challenge': challenge } }),
};
