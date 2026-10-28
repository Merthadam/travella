import { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';
import { travelRequest } from './travelApi';
import { emptyStayFilters } from './StaySearchFilters';
import { draftTravelFacts, travelSnapshotSchema, travelState } from './CanvasTravel';
import { emptyWorkspaceView, travelReferenceSchema, travelWorkspaceContextSchema, travelWorkspaceUpdateSchema } from './travelWorkspaceSchema';
import { getTravelRecoveryScope, readTravelWorkspace, writeTravelWorkspace, subscribeTravelRecovery } from '../canvasViewState';

export function initialWorkspace({ owner = 'session', planId, topic, initialData, instanceId = requestId() }) {
  const dates = initialData?.essentials?.dates;
  const travelers = initialData?.essentials?.travelers;
  const adults = Number.isInteger(travelers) && travelers >= 1 && travelers <= (topic === 'stays' ? 16 : 9) ? travelers : 2;
  const rooms = Array.from({ length: Math.ceil(adults / 6) }, (_, index) => ({ adults: Math.min(6, adults - index * 6), children_ages: [] }));
  return { owner, planId, topic, instanceId, revision: 0, requestGeneration: 0,
    draftCriteria: { city: initialData?.map?.destination || '', place: null, country: '', nationality: '', start: dates?.flexible ? '' : dates?.start || '', end: dates?.flexible ? '' : dates?.end || '', rooms, adults, children: [], infants: [], origin: null, destination: null, cabin: 'ECONOMY', currency: 'EUR', stayFilters: emptyStayFilters() },
    draftDirty: false, appliedCriteria: null, searchId: null, snapshot: null, view: emptyWorkspaceView(),
    detailsReference: null, loading: false, error: '', imported: false, importIdentity: null, authority: null, inverse: null, inverseRevision: null, notice: '', appliedActions: [],
  };
}
export function draftFromCriteria(c, topic) {
  return topic === 'stays' ? { city: c.destination.city, place: { name: c.destination.city, place_id: c.destination.place_id }, country: c.destination.country_code, nationality: c.guest_nationality, start: c.check_in, end: c.check_out, rooms: c.rooms, currency: c.currency, stayFilters: { hotel_type_ids: c.hotel_type_ids || [], facility_ids: c.facility_ids || [], strict_facility_filtering: c.strict_facility_filtering ?? true, refundable_rates_only: c.refundable_rates_only || false } } : { origin: { iata: c.origin, label: c.origin }, destination: { iata: c.destination, label: c.destination }, start: c.departure_date, end: c.return_date, adults: c.adults, children: c.children_ages, infants: c.infant_ages, cabin: c.cabin_class, country: c.country_code, currency: c.currency };
}
const fresh = (snapshot, now) => snapshot && Number.isFinite(Date.parse(snapshot.expires_at)) && now < Date.parse(snapshot.expires_at) && Date.parse(snapshot.searched_at) <= now;
const advanced = state => state.revision < Number.MAX_SAFE_INTEGER ? { ...state, revision: state.revision + 1, authority: null, inverse: null, inverseRevision: null, notice: '' } : { ...state, instanceId: requestId(), revision: 0, authority: null, inverse: null, inverseRevision: null, notice: '', appliedActions: [] };
const inverseOf = state => ({ snapshot: state.snapshot, searchId: state.searchId, appliedCriteria: state.appliedCriteria, draftCriteria: state.draftCriteria, draftDirty: state.draftDirty, imported: state.imported, view: state.view });
const matches = (state, token) => token && ['owner', 'planId', 'topic', 'instanceId', 'revision', 'requestGeneration'].every(key => state[key] === token[key]);

export function travelWorkspaceReducer(state, action) {
  switch (action.type) {
    case 'draft': return { ...advanced(state), draftCriteria: { ...state.draftCriteria, [action.field]: typeof action.value === 'function' ? action.value(state.draftCriteria[action.field]) : action.value }, draftDirty: true, loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'view': return { ...advanced(state), view: { ...state.view, ...action.patch }, loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'dismiss':
    case 'restore': {
      const parsed = travelReferenceSchema.safeParse(action.reference);
      if (!parsed.success || state.draftDirty || !fresh(state.snapshot, action.now ?? Date.now())) return state;
      const ref = parsed.data;
      const item = state.snapshot.results.find(item => item.id === ref.option_id);
      if (ref.search_id !== state.searchId || !item || ref.room_id && (state.topic !== 'stays' || !item.rooms.some(room => room.id === ref.room_id))) return state;
      const dismissed = state.view.dismissed_ids.includes(ref.option_id);
      if (dismissed === (action.type === 'dismiss')) return state;
      const next = advanced(state);
      return { ...next, view: { ...state.view, page: 1, dismissed_ids: action.type === 'dismiss' ? [...state.view.dismissed_ids, ref.option_id] : state.view.dismissed_ids.filter(id => id !== ref.option_id) },
        loading: false, requestGeneration: state.requestGeneration + 1, inverse: inverseOf(state), inverseRevision: next.revision,
        notice: action.type === 'dismiss' ? 'Option dismissed from these results. Your saved choices have not changed.' : 'Option restored to these results. Your saved choices have not changed.' };
    }
    case 'details': return { ...state, detailsReference: action.value, recoveredDetails: null };
    case 'error': return { ...state, error: action.value };
    case 'cancel': return { ...advanced(state), loading: false, requestGeneration: state.requestGeneration + 1 };
    case 'search-start': return { ...advanced(state), loading: true, error: '', requestGeneration: state.requestGeneration + 1 };
    case 'search-success': return matches(state, action.token) ? { ...state, loading: false, error: '', imported: false, draftDirty: false, snapshot: action.snapshot, searchId: action.snapshot.search_id || null, appliedCriteria: action.snapshot.criteria, view: emptyWorkspaceView() } : state;
    case 'search-error': return matches(state, action.token) ? { ...state, loading: false, error: action.error } : state;
    case 'recover-success': return matches(state, action.token) ? { ...advanced(state), snapshot: action.snapshot, appliedCriteria: action.snapshot.criteria, loading: false, error: '', recovery: null, recoveredDetails: action.details } : state;
    case 'recover-error': return matches(state, action.token) ? { ...advanced(state), snapshot: null, searchId: null, view: emptyWorkspaceView(), detailsReference: null, recovery: null, loading: false, error: 'Previous results are no longer available. Search again for current options.' } : state;
    case 'import': return { ...advanced(state), loading: false, requestGeneration: state.requestGeneration + 1, error: '', imported: true, importIdentity: action.identity, snapshot: action.snapshot, searchId: action.snapshot.search_id, appliedCriteria: action.snapshot.criteria, draftCriteria: { ...state.draftCriteria, ...draftFromCriteria(action.snapshot.criteria, state.topic) }, draftDirty: false, view: emptyWorkspaceView() };
    case 'run-start': return { ...state, authority: { ...action.authority, owner: state.owner, instanceId: state.instanceId, revision: state.revision } };
    case 'run-end': return state.authority?.run_id === action.runId ? { ...state, authority: null } : state;
    case 'workspace-update': {
      const parsed = travelWorkspaceUpdateSchema.safeParse(action.update);
      if (!parsed.success || action.hydrating || !state.authority || state.draftDirty) return state;
      const u = parsed.data, a = state.authority;
      if (state.appliedActions.includes(u.action_id) || u.plan_id !== state.planId || u.topic !== state.topic || u.instance_id !== state.instanceId || u.base_revision !== state.revision || a.owner !== state.owner || a.instanceId !== state.instanceId || a.revision !== state.revision || u.run_id !== a.run_id || u.brief_digest !== a.brief_digest || !fresh(u.snapshot, action.now ?? Date.now())) return state;
      const next = advanced(state);
      return { ...next, snapshot: u.snapshot, searchId: u.search_id, appliedCriteria: u.snapshot.criteria, draftCriteria: { ...state.draftCriteria, ...draftFromCriteria(u.snapshot.criteria, state.topic) }, draftDirty: false, imported: false, view: u.view, loading: false, error: '', requestGeneration: state.requestGeneration + 1, inverse: inverseOf(state), inverseRevision: next.revision, notice: 'Results updated. Your saved choices have not changed.', appliedActions: [...state.appliedActions.slice(-99), u.action_id] };
    }
    case 'undo': {
      if (!state.inverse || state.inverseRevision !== state.revision) return state;
      if (state.inverse.snapshot && !fresh(state.inverse.snapshot, action.now ?? Date.now())) return { ...state, error: 'Previous results expired. Search again for current options.', inverse: null, inverseRevision: null, notice: '' };
      return { ...advanced(state), ...state.inverse, inverse: null, loading: false, requestGeneration: state.requestGeneration + 1, notice: 'Workspace change undone. Your saved choices have not changed.' };
    }
    default: return state;
  }
}

export function useTravelWorkspace({ owner: suppliedOwner, planId, topic, initialData, active = true, onExpired, onManualChange, enabled = true }) {
  const owner = getTravelRecoveryScope() || suppliedOwner || 'session';
  const ref = useRef(null), pending = useRef(null), callbacks = useRef({}), checkout = useRef(new Map());
  const savedFacts = JSON.stringify(draftTravelFacts(initialData)), previousFacts = useRef(savedFacts);
  const [, render] = useState(0);
  callbacks.current = { onExpired, onManualChange };
  if (!ref.current || ref.current.owner !== owner || ref.current.planId !== planId || ref.current.topic !== topic) {
    pending.current?.abort(); checkout.current.clear();
    const saved = enabled && readTravelWorkspace(owner, planId, topic);
    ref.current = { ...initialWorkspace({ owner, planId, topic, initialData }), ...(saved ? { draftCriteria: saved.draftCriteria, draftDirty: saved.draftDirty, appliedCriteria: saved.appliedCriteria, searchId: saved.searchId, view: saved.view, recovery: saved } : {}) };
  }
  function dispatch(action) { const previous = ref.current; ref.current = travelWorkspaceReducer(previous, action); if (previous !== ref.current) render(n => n + 1); return ref.current; }
  function invalidate(action) {
    const previous = ref.current;
    const hadAuthority = Boolean(ref.current.authority);
    const value = dispatch(action); // Revoke before cancellation can yield or complete.
    if (value === previous) return value;
    if (action.type !== 'cancel') value.recovery = null;
    pending.current?.abort();
    if (hadAuthority) void callbacks.current.onManualChange?.();
    return value;
  }
  useEffect(() => {
    if (!enabled) return;
    const instanceId = ref.current.instanceId;
    if (!active) invalidate({ type: 'cancel' });
    return () => {
      if (ref.current.instanceId === instanceId) {
        pending.current?.abort();
        ref.current = travelWorkspaceReducer(ref.current, { type: 'cancel' });
      }
    };
  }, [owner, planId, topic, active, enabled]);
  useEffect(() => subscribeTravelRecovery(() => {
    pending.current?.abort(); checkout.current.clear();
    ref.current = initialWorkspace({ owner: 'revoked', planId, topic, initialData });
    void callbacks.current.onManualChange?.(); render(n => n + 1);
  }), [planId, topic]);
  useEffect(() => {
    if (previousFacts.current === savedFacts) return;
    previousFacts.current = savedFacts;
    invalidate({ type: 'cancel' });
  }, [savedFacts]);
  useEffect(() => {
    if (enabled) writeTravelWorkspace(owner, planId, topic, ref.current);
  });
  useEffect(() => {
    const saved = ref.current.recovery;
    if (!enabled || !active || !saved?.searchId) return;
    const token = ref.current, controller = new AbortController(); pending.current = controller;
    async function recover() {
      try {
        const raw = await travelRequest(planId, 'research/snapshot', { search_id: saved.searchId }, controller.signal);
        if (!matches(ref.current, token)) return;
        const snapshot = travelSnapshotSchema.parse({ ...raw, draft_facts: draftTravelFacts(initialData) });
        const member = reference => reference.search_id === snapshot.search_id && snapshot.results.some(item => item.id === reference.option_id && (!reference.room_id || topic === 'stays' && item.rooms.some(room => room.id === reference.room_id)));
        if (snapshot.plan_id !== planId || snapshot.mode !== topic || snapshot.search_id !== saved.searchId || !fresh(snapshot, Date.now()) || saved.view.dismissed_ids.some(id => !snapshot.results.some(item => item.id === id)) || saved.view.comparison_refs.some(ref => !member(ref))) throw new Error('Recovery unavailable');
        let details = null;
        if (saved.detailsReference) {
          const reference = saved.detailsReference;
          const detailSnapshot = reference.search_id === snapshot.search_id ? snapshot : travelSnapshotSchema.parse({ ...await travelRequest(planId, 'research/snapshot', { search_id: reference.search_id }, controller.signal), draft_facts: draftTravelFacts(initialData) });
          if (!matches(ref.current, token)) return;
          const item = detailSnapshot.results.find(item => item.id === reference.option_id && (!reference.room_id || topic === 'stays' && item.rooms.some(room => room.id === reference.room_id)));
          if (detailSnapshot.plan_id === planId && detailSnapshot.mode === topic && detailSnapshot.search_id === reference.search_id && item && fresh(detailSnapshot, Date.now())) details = { item, snapshot: detailSnapshot, reference, historical: detailSnapshot.search_id !== snapshot.search_id };
        }
        dispatch({ type: 'recover-success', token, snapshot, details });
      } catch (error) {
        if (!matches(ref.current, token) || error.name === 'AbortError') return;
        dispatch({ type: 'recover-error', token });
        if (error.status === 401) callbacks.current.onExpired?.();
      }
    }
    void recover();
    return () => controller.abort();
  }, [owner, planId, topic, active, enabled]);
  async function search(criteria) {
    const token = invalidate({ type: 'search-start' });
    // Cancellation is advisory; generation/revision checks remain authoritative.
    const controller = new AbortController(); pending.current = controller;
    try {
      const result = await travelRequest(planId, topic === 'stays' ? 'hotels/search' : 'flights/search', criteria, controller.signal);
      if (!matches(ref.current, token)) return;
      // The manual endpoint also carries private checkout handles. Resolve its
      // registered, allowlisted observation before sharing any evidence.
      if (typeof result.search_id !== 'string' || !result.search_id || result.search_id.length > 100) throw new Error('These results could not be verified. Search again.');
      const observation = await travelRequest(planId, 'research/snapshot', { search_id: result.search_id }, controller.signal);
      if (!matches(ref.current, token)) return;
      const parsed = travelSnapshotSchema.safeParse({ ...observation, draft_facts: draftTravelFacts(initialData) });
      if (!parsed.success || parsed.data.plan_id !== planId || parsed.data.mode !== topic || parsed.data.search_id !== result.search_id || !fresh(parsed.data, Date.now())) throw new Error('These results could not be verified. Search again.');
      // Private mock-checkout handles never enter the reducer, agent context or
      // recovery. Keep only the current search handles and any open detail.
      const retained = ref.current.detailsReference?.reference;
      const retainedKey = retained && `${retained.search_id}:${retained.option_id}`;
      for (const key of checkout.current.keys()) if (key !== retainedKey) checkout.current.delete(key);
      for (const item of result.results || []) if (typeof item.checkout_token === 'string' && item.checkout_token.length <= 40000 && parsed.data.results.some(option => option.id === item.id)) checkout.current.set(`${result.search_id}:${item.id}`, item.checkout_token);
      dispatch({ type: 'search-success', token, snapshot: { ...parsed.data, criteria: { ...parsed.data.criteria, ...criteria } } });
    } catch (error) {
      if (matches(ref.current, token) && error.name !== 'AbortError') {
        dispatch({ type: 'search-error', token, error: error.message || 'Unable to connect. Please try again.' });
        if (error.status === 401) callbacks.current.onExpired?.();
      }
    }
  }
  function importSnapshot(value, identity, reason, expectedRevision = ref.current.revision) {
    if (ref.current.importIdentity === identity) return false;
    if (expectedRevision !== ref.current.revision) return false;
    const parsed = travelSnapshotSchema.safeParse(value);
    if (!parsed.success || parsed.data.plan_id !== planId || parsed.data.mode !== topic || reason || travelState(parsed.data, initialData)) {
      dispatch({ type: 'error', value: 'These results are no longer available. Return to Plan chat to search again.' }); return false;
    }
    invalidate({ type: 'import', snapshot: parsed.data, identity }); return true;
  }
  return { state: ref.current, dispatch, search, importSnapshot,
    getCheckoutToken: reference => reference && checkout.current.get(`${reference.search_id}:${reference.option_id}`),
    setDraft: (field, value) => invalidate({ type: 'draft', field, value }),
    setView: patch => invalidate({ type: 'view', patch: typeof patch === 'function' ? patch(ref.current.view) : patch }),
    cancel: () => invalidate({ type: 'cancel' }),
    undo: () => invalidate({ type: 'undo' }),
    dismiss: reference => invalidate({ type: 'dismiss', reference }),
    restore: reference => invalidate({ type: 'restore', reference }),
    getWorkspaceContext: () => travelWorkspaceContextSchema.parse({ instance_id: ref.current.instanceId, revision: ref.current.revision, search_id: ref.current.searchId, view: ref.current.view, draft_dirty: ref.current.draftDirty }),
    onWorkspaceRunStart: authority => dispatch({ type: 'run-start', authority }),
    onWorkspaceRunEnd: runId => dispatch({ type: 'run-end', runId }),
    applyWorkspaceUpdate: (update, options = {}) => { const previous = ref.current; dispatch({ type: 'workspace-update', update, ...options }); return previous !== ref.current; },
  };
}
