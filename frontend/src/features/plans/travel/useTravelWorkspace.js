import { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';
import { travelRequest } from './travelApi';
import { emptyStayFilters } from './StaySearchFilters';
import { travelSnapshotSchema, travelState } from './CanvasTravel';
import { emptyWorkspaceView, travelWorkspaceContextSchema, travelWorkspaceUpdateSchema } from './travelWorkspaceSchema';

export function initialWorkspace({ owner = 'session', planId, topic, initialData, instanceId = requestId() }) {
  const dates = initialData?.essentials?.dates;
  return { owner, planId, topic, instanceId, revision: 0, requestGeneration: 0,
    draftCriteria: { city: initialData?.map?.destination || '', place: null, country: '', nationality: '', start: dates?.flexible ? '' : dates?.start || '', end: dates?.flexible ? '' : dates?.end || '', rooms: [{ adults: 2, children_ages: [] }], adults: 2, children: [], infants: [], origin: null, destination: null, cabin: 'ECONOMY', currency: 'EUR', stayFilters: emptyStayFilters() },
    draftDirty: false, appliedCriteria: null, searchId: null, snapshot: null, view: emptyWorkspaceView(),
    detailsReference: null, loading: false, error: '', imported: false, importIdentity: null, authority: null, inverse: null, appliedActions: [],
  };
}
export function draftFromCriteria(c, topic) {
  return topic === 'stays' ? { city: c.destination.city, place: { name: c.destination.city, place_id: c.destination.place_id }, country: c.destination.country_code, nationality: c.guest_nationality, start: c.check_in, end: c.check_out, rooms: c.rooms, currency: c.currency, stayFilters: { hotel_type_ids: c.hotel_type_ids || [], facility_ids: c.facility_ids || [], strict_facility_filtering: c.strict_facility_filtering ?? true, refundable_rates_only: c.refundable_rates_only || false } } : { origin: { iata: c.origin, label: c.origin }, destination: { iata: c.destination, label: c.destination }, start: c.departure_date, end: c.return_date, adults: c.adults, children: c.children_ages, infants: c.infant_ages, cabin: c.cabin_class, country: c.country_code, currency: c.currency };
}
const fresh = (snapshot, now) => snapshot && Number.isFinite(Date.parse(snapshot.expires_at)) && now < Date.parse(snapshot.expires_at) && Date.parse(snapshot.searched_at) <= now;
const advanced = state => state.revision < Number.MAX_SAFE_INTEGER ? { ...state, revision: state.revision + 1, authority: null, inverse: null } : { ...state, instanceId: requestId(), revision: 0, authority: null, inverse: null, appliedActions: [] };
const matches = (state, token) => token && ['owner', 'planId', 'topic', 'instanceId', 'revision', 'requestGeneration'].every(key => state[key] === token[key]);

export function travelWorkspaceReducer(state, action) {
  switch (action.type) {
    case 'draft': return { ...advanced(state), draftCriteria: { ...state.draftCriteria, [action.field]: typeof action.value === 'function' ? action.value(state.draftCriteria[action.field]) : action.value }, draftDirty: true, loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'view': return { ...advanced(state), view: { ...state.view, ...action.patch }, loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'details': return { ...state, detailsReference: action.value };
    case 'error': return { ...state, error: action.value };
    case 'cancel': return { ...advanced(state), loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'search-start': return { ...advanced(state), loading: true, error: '', requestGeneration: state.requestGeneration + 1 };
    case 'search-success': return matches(state, action.token) ? { ...state, loading: false, error: '', imported: false, draftDirty: false, snapshot: action.snapshot, searchId: action.snapshot.search_id || null, appliedCriteria: action.snapshot.criteria, view: emptyWorkspaceView() } : state;
    case 'search-error': return matches(state, action.token) ? { ...state, loading: false, error: action.error } : state;
    case 'import': return { ...advanced(state), loading: false, requestGeneration: state.requestGeneration + 1, error: '', imported: true, importIdentity: action.identity, snapshot: action.snapshot, searchId: action.snapshot.search_id, appliedCriteria: action.snapshot.criteria, draftCriteria: { ...state.draftCriteria, ...draftFromCriteria(action.snapshot.criteria, state.topic) }, draftDirty: false, view: emptyWorkspaceView() };
    case 'run-start': return { ...state, authority: { ...action.authority, owner: state.owner, instanceId: state.instanceId, revision: state.revision } };
    case 'run-end': return state.authority?.run_id === action.runId ? { ...state, authority: null } : state;
    case 'workspace-update': {
      const parsed = travelWorkspaceUpdateSchema.safeParse(action.update);
      if (!parsed.success || action.hydrating || !state.authority || state.draftDirty) return state;
      const u = parsed.data, a = state.authority;
      if (state.appliedActions.includes(u.action_id) || u.plan_id !== state.planId || u.topic !== state.topic || u.instance_id !== state.instanceId || u.base_revision !== state.revision || a.owner !== state.owner || a.instanceId !== state.instanceId || a.revision !== state.revision || u.run_id !== a.run_id || u.brief_digest !== a.brief_digest || !fresh(u.snapshot, action.now ?? Date.now())) return state;
      const inverse = { snapshot: state.snapshot, searchId: state.searchId, appliedCriteria: state.appliedCriteria, draftCriteria: state.draftCriteria, draftDirty: state.draftDirty, imported: state.imported, view: state.view };
      return { ...advanced(state), snapshot: u.snapshot, searchId: u.search_id, appliedCriteria: u.snapshot.criteria, draftCriteria: { ...state.draftCriteria, ...draftFromCriteria(u.snapshot.criteria, state.topic) }, draftDirty: false, imported: false, view: u.view, loading: false, error: '', requestGeneration: state.requestGeneration + 1, inverse, appliedActions: [...state.appliedActions.slice(-99), u.action_id] };
    }
    case 'undo': {
      if (!state.inverse) return state;
      if (state.inverse.snapshot && !fresh(state.inverse.snapshot, action.now ?? Date.now())) return { ...state, error: 'Previous results expired. Search again for current options.', inverse: null };
      return { ...advanced(state), ...state.inverse, inverse: null, loading: false, requestGeneration: state.requestGeneration + 1 };
    }
    default: return state;
  }
}

export function useTravelWorkspace({ owner = 'session', planId, topic, initialData, active = true, onExpired, onManualChange, enabled = true }) {
  const ref = useRef(null), pending = useRef(null), callbacks = useRef({});
  const [, render] = useState(0);
  callbacks.current = { onExpired, onManualChange };
  if (!ref.current || ref.current.owner !== owner || ref.current.planId !== planId || ref.current.topic !== topic) {
    pending.current?.abort(); ref.current = initialWorkspace({ owner, planId, topic, initialData });
  }
  function dispatch(action) { const previous = ref.current; ref.current = travelWorkspaceReducer(previous, action); if (previous !== ref.current) render(n => n + 1); return ref.current; }
  function invalidate(action) {
    pending.current?.abort();
    const hadAuthority = Boolean(ref.current.authority);
    const value = dispatch(action); // Revoke before cancellation can yield or complete.
    if (hadAuthority) void callbacks.current.onManualChange?.();
    return value;
  }
  useEffect(() => { if (!enabled) return; if (!active) invalidate({ type: 'cancel' }); return () => { pending.current?.abort(); ref.current = travelWorkspaceReducer(ref.current, { type: 'cancel' }); }; }, [owner, planId, topic, active, enabled]);
  async function search(criteria) {
    const token = invalidate({ type: 'search-start' });
    // Cancellation is advisory; generation/revision checks remain authoritative.
    const controller = new AbortController(); pending.current = controller;
    try {
      const result = await travelRequest(planId, topic === 'stays' ? 'hotels/search' : 'flights/search', criteria, controller.signal);
      dispatch({ type: 'search-success', token, snapshot: { ...result, criteria, expires_at: result.expires_at || new Date(Date.parse(result.searched_at) + 600000).toISOString() } });
    } catch (error) {
      if (matches(ref.current, token) && error.name !== 'AbortError') {
        dispatch({ type: 'search-error', token, error: error.message || 'Unable to connect. Please try again.' });
        if (error.status === 401) callbacks.current.onExpired?.();
      }
    }
  }
  function importSnapshot(value, identity, reason) {
    if (ref.current.importIdentity === identity) return false;
    const parsed = travelSnapshotSchema.safeParse(value);
    if (!parsed.success || parsed.data.plan_id !== planId || parsed.data.mode !== topic || reason || travelState(parsed.data, initialData)) {
      dispatch({ type: 'error', value: 'These results are no longer available. Return to Plan chat to search again.' }); return false;
    }
    invalidate({ type: 'import', snapshot: parsed.data, identity }); return true;
  }
  return { state: ref.current, dispatch, search, importSnapshot,
    setDraft: (field, value) => invalidate({ type: 'draft', field, value }),
    setView: patch => invalidate({ type: 'view', patch: typeof patch === 'function' ? patch(ref.current.view) : patch }),
    cancel: () => invalidate({ type: 'cancel' }),
    undo: () => invalidate({ type: 'undo' }),
    getWorkspaceContext: () => travelWorkspaceContextSchema.parse({ instance_id: ref.current.instanceId, revision: ref.current.revision, search_id: ref.current.searchId, view: ref.current.view, draft_dirty: ref.current.draftDirty }),
    onWorkspaceRunStart: authority => dispatch({ type: 'run-start', authority }),
    onWorkspaceRunEnd: runId => dispatch({ type: 'run-end', runId }),
    applyWorkspaceUpdate: (update, options = {}) => { const previous = ref.current; dispatch({ type: 'workspace-update', update, ...options }); return previous !== ref.current; },
  };
}
