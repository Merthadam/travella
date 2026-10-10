import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestId } from '../../plansApi';
import { definitions, ids } from '../../design-system/schemas';

const groupIds = { themes: ['themes'], research: ['findings', 'links'], all: ids };
const clone = value => structuredClone(value);
const fingerprint = value => JSON.stringify(value);
const initialGroups = { themes: 'idle', research: 'idle' };
const mapHint = context => context?.candidates?.length === 1 ? context.candidates[0] : '';

export function validateCanvasComponents(components, complete = false) {
  if (!components || typeof components !== 'object' || Array.isArray(components)) throw new Error('Invalid canvas update.');
  if (new TextEncoder().encode(JSON.stringify(components)).length > 65536) throw new Error('Canvas update is too large.');
  if (Object.keys(components).some(id => !ids.includes(id)) || (complete && ids.some(id => !components[id]))) throw new Error('Invalid canvas components.');
  return Object.fromEntries(Object.entries(components).map(([id, value]) => [id, definitions[id].schema.parse(value)]));
}

function knownComponents(context = {}) {
  const destination = context.finalDestination || '';
  const dates = { start: context.dateStart || '', end: context.dateEnd || '', note: context.dateNote || '', flexible: Boolean(context.flexibleDates) };
  const travel = mode => ({ status: 'ready', need: context[mode] || 'undecided', bookingStatus: 'not-booked', title: destination ? `${mode === 'flights' ? 'Flights to' : 'Stay in'} ${destination}` : 'Destination not set', subtitle: context.travelers ? `${context.travelers} travelers` : 'Travelers not set', detail: dates.flexible ? 'Flexible dates' : [dates.start, dates.end].filter(Boolean).join(' → ') || 'Dates not set', availability: 'unavailable' });
  return validateCanvasComponents({
    essentials: { status: 'ready', dates, travelers: context.travelers ?? null, budget: { label: context.budget || '', noFixedBudget: Boolean(context.noFixedBudget) } },
    map: { status: 'ready', destination, final: Boolean(destination), pins: [] },
    themes: { status: 'ready', items: [] }, flights: travel('flights'), accommodation: travel('accommodation'),
    findings: { status: 'ready', items: [] }, links: { status: 'ready', items: [] },
  }, true);
}

function validEvidence(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 30 || Object.entries(value).some(([key, token]) => !/^[a-zA-Z0-9_-]{1,80}$/.test(key) || typeof token !== 'string' || token.length > 4096)) throw new Error('Invalid source verification.');
  return clone(value);
}

export function usePlanningCanvas({ selected, api, onExpired, onSaved, externalBusy = false }) {
  const planId = selected.plan_id;
  const [data, setData] = useState(null);
  const [mapDestinationHint, setMapDestinationHint] = useState('');
  const [evidence, setEvidence] = useState({});
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groups, setGroups] = useState(initialGroups);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [staleContext, setStaleContext] = useState(false);
  const [editors, setEditors] = useState([]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const epoch = useRef(0);
  const active = useRef(null);
  const savingRef = useRef(false);
  const base = useRef(null);
  const pendingSave = useRef(null);
  const editedComponents = useRef(new Set());
  const dataRef = useRef(null); dataRef.current = data;
  const externalBusyRef = useRef(externalBusy); externalBusyRef.current = externalBusy;
  const callbacks = useRef({ onExpired, onSaved }); callbacks.current = { onExpired, onSaved };

  useEffect(() => {
    const generation = ++epoch.current;
    setMapDestinationHint('');
    setData(null); setEvidence({}); setSaved(null); setLoading(true); setError(''); setConflict(false); setStaleContext(false); setEditors([]); setNotice(''); setGroups(initialGroups); setActiveGroup(null); setSaving(false);
    base.current = null; pendingSave.current = null; editedComponents.current = new Set(); savingRef.current = false;
    Promise.all([api.canvas(selected), api.researchContext(selected)]).then(([canvas, context]) => {
      if (epoch.current !== generation) return;
      if (!Number.isInteger(canvas.revision) || !Number.isInteger(canvas.context_revision)) throw new Error('The saved Plan could not be read.');
      const components = canvas.snapshot ? validateCanvasComponents(canvas.snapshot.components, true) : knownComponents(context.context);
      const sourceEvidence = validEvidence(canvas.snapshot?.evidence);
      const reviewedRevision = canvas.snapshot ? canvas.saved_context_revision : context.revision;
      if (!Number.isInteger(reviewedRevision)) throw new Error('The saved Plan revision is unavailable.');
      base.current = { ...selected, revision: canvas.revision, context_revision: reviewedRevision };
      // A saved canvas remains exact even if chat has since changed. Save must use
      // its original context revision until the traveler explicitly regenerates.
      setStaleContext(Boolean(canvas.snapshot && context.revision !== reviewedRevision));
      setMapDestinationHint(mapHint(context.context));

      setData(components); setEvidence(sourceEvidence); setSaved(canvas.snapshot ? { version: 1, components, evidence: sourceEvidence } : null);
      setNotice(canvas.snapshot ? 'Saved plan loaded.' : 'Your confirmed trip details are here. Generate your plan to add preferences and research.');
    }).catch(err => {
      if (epoch.current !== generation) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      setError('Your planning canvas could not load. Try again.');
    }).finally(() => { if (epoch.current === generation) setLoading(false); });
    return () => {
      epoch.current += 1;
      const run = active.current; active.current = null;
      if (run) { run.controller.abort(); api.cancelAgentTurn?.(selected, run.id).catch(() => {}); }
    };
  }, [api, planId, reloadVersion]);

  const snapshot = useMemo(() => data ? { version: 1, components: data, evidence } : null, [data, evidence]);
  const dirty = Boolean(snapshot && (!saved || fingerprint(snapshot) !== fingerprint(saved)));
  const valid = useMemo(() => { try { if (!data) return false; validateCanvasComponents(data, true); return true; } catch { return false; } }, [data]);

  const action = useCallback((id, name, payload) => {
    if (!ids.includes(id)) return;
    if (name === 'editor_state') {
      setEditors(current => payload.editing ? current.includes(id) ? current : [...current, id] : current.includes(id) ? current.filter(value => value !== id) : current);
      return;
    }
    if (active.current || savingRef.current || externalBusyRef.current) return;
    if (['inspect_place', 'filter_pins', 'expand_finding'].includes(name)) return;
    const previous = dataRef.current;
    if (!previous?.[id]) return;
    const next = clone(previous);
    const item = next[id];
    if (name === 'edit_essentials' && id === 'essentials') {
      next[id] = payload;
      // Keep visible travel dates/party aligned with the locally edited essentials.
      for (const mode of ['flights', 'accommodation']) {
        next[mode].subtitle = payload.travelers ? `${payload.travelers} travelers` : 'Travelers not set';
        next[mode].detail = payload.dates.flexible ? 'Flexible dates' : [payload.dates.start, payload.dates.end].filter(Boolean).join(' → ') || 'Dates not set';
      }
    } else {
      const operations = { themes: ['theme', 'items'], map: ['pin', 'pins'], findings: ['finding', 'items'], links: ['link', 'items'] };
      const [kind, field] = operations[id] || [];
      if (!kind || ![`add_${kind}`, `edit_${kind}`, `remove_${kind}`].includes(name)) return;
      if (name === `add_${kind}`) item[field].push(payload);
      if (name === `edit_${kind}`) item[field] = item[field].map(value => value.id === payload.id ? payload : value);
      if (name === `remove_${kind}`) item[field] = item[field].filter(value => value.id !== payload.id);
      item.status = 'ready'; delete item.error;
      if (id === 'themes' && name !== 'remove_theme') item.items = item.items.map(value => value.id === payload.id ? { ...value, source: 'You' } : value);
      if (id === 'findings') {
        if (name !== 'remove_finding') item.items = item.items.map(value => value.id === payload.id ? { ...value, certainty: 'uncertain' } : value);
      }
    }
    try {
      const parsed = validateCanvasComponents(next, true);
      dataRef.current = parsed; setData(parsed); editedComponents.current.add(id);
      if (id === 'essentials') { editedComponents.current.add('flights'); editedComponents.current.add('accommodation'); }
      if (id === 'findings') setEvidence(current => { const result = { ...current }; delete result[payload.id]; return result; });
      pendingSave.current = null; setNotice('Unsaved changes. Save plan to keep your edits.'); setError('');
    } catch { setError('That change could not be applied. Check the details and try again.'); }
  }, []);

  const updateMockBooking = useCallback((sourcePlanId, result) => {
    if (sourcePlanId !== base.current?.plan_id || !dataRef.current || !result?.sandbox || !result.booking_id) return;
    const next = clone(dataRef.current);
    const stay = next.accommodation;
    if (result.status === 'confirmed') {
      stay.bookingStatus = 'mock-booked';
      stay.mockBooking = { reference: result.booking_id, hotelName: result.hotel_name?.slice(0, 160), checkIn: result.check_in, checkOut: result.check_out };
    } else if (['cancelled', 'failed'].includes(result.status) && stay.mockBooking?.reference === result.booking_id) {
      stay.bookingStatus = 'not-booked'; delete stay.mockBooking;
    } else return;
    try {
      const parsed = validateCanvasComponents(next, true);
      if (fingerprint(parsed) === fingerprint(dataRef.current)) return;
      dataRef.current = parsed; setData(parsed); pendingSave.current = null;
      setNotice('Mock booking state updated in your draft. Choose Save plan to keep it. No real reservation was made.');
      setError('');
    } catch { setError('The mock stay could not be added to your canvas. Reopen the checkout and check its status.'); }
  }, []);

  async function generate(group = 'all') {
    if (active.current || savingRef.current || externalBusyRef.current || !base.current || editors.length || !groupIds[group]) return;
    const currentEpoch = epoch.current;
    const id = requestId(); const controller = new AbortController();
    const run = { id, controller, group, completed: new Set() };
    active.current = run; setActiveGroup(group); setError(''); setNotice('Preparing your trip…');
    const runGroups = group === 'all' ? ['themes', 'research'] : [group];
    setGroups(current => ({ ...current, ...Object.fromEntries(runGroups.map(key => [key, 'loading'])) }));
    try {
      // Refresh the canonical lease before generation. Local drafts are replaced
      // only for the group the traveler explicitly chose above this hook.
      const currentContext = await api.researchContext(selected);
      if (active.current !== run || epoch.current !== currentEpoch) return;
      setMapDestinationHint(mapHint(currentContext.context));
      if ((staleContext || currentContext.revision !== base.current.context_revision) && group !== 'all') { setStaleContext(true); throw new Error('The conversation changed. Regenerate the full plan to review the updated trip details.'); }
      run.contextRevision = currentContext.revision;
      const result = await api.generateCanvas(base.current, { group, context_revision: run.contextRevision, generation_id: id, ...(group === 'research' ? { themes: dataRef.current.themes } : {}) }, id, {
        signal: controller.signal,
        onEvent(event) {
          if (active.current !== run || epoch.current !== currentEpoch) return;
          const draft = event.type === 'STATE_SNAPSHOT' ? event.snapshot?.canvas_draft : null;
          if (!draft || draft.generation_id !== id || draft.context_revision !== run.contextRevision) return;
          try {
            const incoming = validateCanvasComponents(draft.components || {});
            const sourceEvidence = validEvidence(draft.evidence);
            const statuses = Object.fromEntries(Object.entries(draft.group_status || {}).filter(([key, value]) => runGroups.includes(key) && ['loading', 'ready', 'error'].includes(value)));
            const replacement = Object.fromEntries(Object.entries(incoming).filter(([key, value]) => groupIds[group].includes(key) && !['loading', 'error'].includes(value.status)));
            if (group === 'all') {
              for (const key of ['essentials', 'flights', 'accommodation']) if (editedComponents.current.has(key)) delete replacement[key];
              if (replacement.map) replacement.map = { ...replacement.map, pins: dataRef.current.map.pins };
            }
            // Research can refresh trip labels, but cannot undo a confirmed test stay.
            if (replacement.accommodation && dataRef.current.accommodation.mockBooking) {
              replacement.accommodation = { ...replacement.accommodation, bookingStatus: 'mock-booked', mockBooking: dataRef.current.accommodation.mockBooking };
            }
            const next = validateCanvasComponents({ ...dataRef.current, ...replacement }, true);
            for (const [key, status] of Object.entries(statuses)) {
              if (status === 'ready') run.completed.add(key);
              else run.completed.delete(key);
            }
            dataRef.current = next; setData(next);
            if (replacement.findings) setEvidence(sourceEvidence);
            if (group === 'all') { base.current.context_revision = run.contextRevision; setStaleContext(false); }
            // Generation never acquires a new save revision over another tab's changes.
            setGroups(current => ({ ...current, ...statuses })); pendingSave.current = null;
            setNotice(statuses.research === 'loading' ? 'Checking details…' : statuses.themes === 'loading' ? 'Summarizing preferences…' : 'Your draft is taking shape.');
          } catch { setError('An invalid update was rejected. Your last valid draft is still here.'); }
        },
      });
      if (active.current !== run || epoch.current !== currentEpoch) return;
      if (result?.status === 'error' || result?.status === 'interrupted') throw new Error('Generation could not finish. Your completed draft is still here. Retry the affected group.');
      if (result?.status !== 'stopped' && runGroups.some(key => !run.completed.has(key))) {
        setNotice('Your completed details are still here. Nothing has been saved.');
        throw new Error('Some parts of your plan could not be generated. Retry the affected group.');
      }
      setNotice(result?.status === 'stopped' ? 'Generation stopped. Completed draft details are unsaved.' : 'Draft ready to review. Nothing is saved until you choose Save plan.');
    } catch (err) {
      if (active.current !== run || epoch.current !== currentEpoch) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      setError(err.name === 'AbortError' ? '' : err.message || 'Generation could not finish. Retry the affected group.');
      setNotice('Your completed details are still here. Nothing has been saved.');
      // A broken stream may leave the server run holding the context lease.
      // Release that run so the visible Retry action can actually start again.
      await api.cancelAgentTurn?.(selected, run.id).catch(() => {});
    } finally {
      if (active.current === run && epoch.current === currentEpoch) {
        active.current = null; setActiveGroup(null);
        setGroups(current => ({ ...current, ...Object.fromEntries(runGroups.map(key => [key, run.completed.has(key) ? 'ready' : 'error'])) }));
      }
    }
  }

  async function stop() {
    const run = active.current; if (!run) return;
    const currentEpoch = epoch.current;
    active.current = null; run.controller.abort(); setActiveGroup(null);
    setGroups(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value === 'loading' ? 'error' : value])));
    setNotice('Generation stopped. Completed draft details are unsaved and ready to edit.');
    try { await api.cancelAgentTurn(selected, run.id); }
    catch { if (epoch.current === currentEpoch && !active.current) setError('The stream stopped, but cancellation could not be confirmed. Your draft is safe; retry after the current request finishes.'); }
  }

  async function save() {
    if (!snapshot || !valid || active.current || savingRef.current || externalBusyRef.current || editors.length || conflict) return;
    const currentEpoch = epoch.current;
    const value = clone(snapshot);
    const body = { snapshot: value, context_revision: base.current.context_revision };
    const signature = fingerprint(body);
    if (!pendingSave.current || pendingSave.current.signature !== signature) pendingSave.current = { body, signature, id: requestId(), plan: { ...base.current } };
    const pending = pendingSave.current;
    savingRef.current = true; setSaving(true); setError(''); setNotice('Saving your plan…');
    try {
      const result = await api.saveCanvas(pending.plan, pending.body, pending.id);
      if (epoch.current !== currentEpoch) return;
      const components = validateCanvasComponents(result.snapshot?.components, true);
      const sourceEvidence = validEvidence(result.snapshot?.evidence);
      base.current = { ...selected, revision: result.revision, context_revision: result.context_revision };
      const canonical = { version: 1, components, evidence: sourceEvidence };
      editedComponents.current = new Set();
      // A checkout may finish while Save is in flight. Keep that later change
      // unsaved instead of overwriting it with the earlier reviewed snapshot.
      const bookingChanged = fingerprint(dataRef.current.accommodation.mockBooking) !== fingerprint(value.components.accommodation.mockBooking);
      const next = bookingChanged ? { ...components, accommodation: { ...components.accommodation, bookingStatus: dataRef.current.accommodation.bookingStatus } } : components;
      if (bookingChanged) {
        delete next.accommodation.mockBooking;
        if (dataRef.current.accommodation.mockBooking) next.accommodation.mockBooking = dataRef.current.accommodation.mockBooking;
      }
      dataRef.current = next; setData(next); setEvidence(sourceEvidence); setSaved(canonical); setNotice(bookingChanged ? 'Plan saved. Your newer mock booking update is still unsaved; choose Save plan to keep it.' : 'Saved. Your plan is ready to reopen.'); setConflict(false); setStaleContext(false); pendingSave.current = null;
      callbacks.current.onSaved?.(result);
    } catch (err) {
      if (epoch.current !== currentEpoch) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      const temporarilyBusy = ['context_locked', 'request_pending'].includes(err.code);
      setConflict(err.status === 409 && !temporarilyBusy);
      setError(temporarilyBusy ? 'The current request is still finishing. Your edits are safe. Retry Save plan in a moment.' : err.status === 409 ? 'This Plan changed elsewhere. Your edits are still here. Reload the saved plan to review the latest version.' : 'Your plan could not be saved. Your edits are still here. Retry Save plan.');
      setNotice('Unsaved changes');
    } finally { if (epoch.current === currentEpoch) { savingRef.current = false; setSaving(false); } }
  }

  const renderData = useMemo(() => {
    if (!data) return null;
    const rendered = { ...data };
    for (const [group, status] of Object.entries(groups)) {
      if (['loading', 'error'].includes(status)) for (const id of groupIds[group]) {
        if (!data[id].items?.length) rendered[id] = { ...data[id], status,
          ...(status === 'error' ? { error: group === 'research'
            ? 'We could not finish reading useful sources for this trip. Try again.'
            : 'We could not summarize your preferences. Try again.' } : {}) };
      }
    }
    return rendered;
  }, [data, groups]);
  function addActivities(places, expectedDraft) {
    if (!dataRef.current || active.current || savingRef.current || (externalBusyRef.current && !expectedDraft)) return false;
    if (expectedDraft && fingerprint(dataRef.current) !== expectedDraft) return false;
    try {
      const next = clone(dataRef.current);
      for (const place of places) {
        if (next.map.pins.some(pin => pin.id === place.id || (pin.name === place.name && pin.position.lat === place.position.lat && pin.position.lng === place.position.lng))) continue;
        next.map.pins.push({ id: place.id, name: place.name, category: 'activity', position: place.position, description: place.reason.slice(0, 240) });
      }
      next.map.status = 'ready'; delete next.map.error;
      const parsed = validateCanvasComponents(next, true);
      dataRef.current = parsed; setData(parsed); editedComponents.current.add('map'); pendingSave.current = null;
      setNotice('Places added to your draft. Choose Save plan to keep them.'); setError('');
      return true;
    } catch { setError('These places could not be added. Check your draft has room for more places.'); return false; }
  }
  return { data, renderData, mapDestinationHint, saved, dirty, loading, saving, activeGroup, groups, error, notice, conflict, staleContext, editing: editors.length > 0, valid, action, generate, stop, save, addActivities, updateMockBooking, reload: () => setReloadVersion(value => value + 1) };
}
