import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestId } from '../../plansApi';
import { definitions, ids } from '../../design-system/schemas';
import { flightNeedConfirmed } from './flightNeeds';
import { destinationConfirmed } from './generationRequirements';
import { suggestedPlaceCategory } from './placeCategory';
import { appendPlaceWebsite, preservePlaceWebsites } from './placeWebsites';

const groupIds = { themes: ['themes'], research: ['findings', 'links'], all: ids };
const clone = value => structuredClone(value);
const fingerprint = value => JSON.stringify(value);
const initialGroups = { themes: 'idle', research: 'idle' };
const mapHint = context => context?.candidates?.length === 1 ? context.candidates[0] : '';

export function validateCanvasComponents(components, complete = false) {
  if (!components || typeof components !== 'object' || Array.isArray(components)) throw new Error('Invalid canvas update.');
  if (new TextEncoder().encode(JSON.stringify(components)).length > 65536) throw new Error('Canvas update is too large.');
  if (Object.keys(components).some(id => !ids.includes(id)) || (complete && ids.some(id => id !== 'flights' && !components[id]))) throw new Error('Invalid canvas components.');
  return Object.fromEntries(Object.entries(components).map(([id, value]) => [id, definitions[id].schema.parse(value)]));
}

function knownComponents(context = {}) {
  const destination = context.finalDestination || '';
  const dates = { start: context.dateStart || '', end: context.dateEnd || '', note: context.dateNote || '', flexible: Boolean(context.flexibleDates) };
  const travel = mode => ({ status: 'ready', need: context[mode] || 'undecided', bookingStatus: 'not-booked', title: destination ? `${mode === 'flights' ? 'Flights to' : 'Stay in'} ${destination}` : 'Destination not set', subtitle: context.travelers ? `${context.travelers} travelers` : 'Travelers not set', detail: dates.flexible ? 'Flexible dates' : [dates.start, dates.end].filter(Boolean).join(' → ') || 'Dates not set', availability: 'unavailable' });
  return validateCanvasComponents({
    essentials: { status: 'ready', dates, travelers: context.travelers ?? null, budget: { label: context.budget || '', noFixedBudget: Boolean(context.noFixedBudget) } },
    map: { status: 'ready', destination, final: Boolean(destination), pins: [] },
    themes: { status: 'ready', items: [] },
    ...(flightNeedConfirmed(context) && context.flights === 'needed' ? { flights: travel('flights') } : {}),
    accommodation: travel('accommodation'),
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
  const [saveError, setSaveError] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(null);
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
  const initialSnapshot = useRef(null);
  const saveLatest = useRef(null);
  const evidenceRef = useRef(evidence); evidenceRef.current = evidence;
  const pendingSave = useRef(null);
  const editedComponents = useRef(new Set());
  const dataRef = useRef(null); dataRef.current = data;
  const externalBusyRef = useRef(externalBusy); externalBusyRef.current = externalBusy;
  const callbacks = useRef({ onExpired, onSaved }); callbacks.current = { onExpired, onSaved };

  useEffect(() => {
    const generation = ++epoch.current;
    setMapDestinationHint('');
    setGenerationProgress(null);
    setData(null); setEvidence({}); setSaved(null); setLoading(true); setError(''); setConflict(false); setStaleContext(false); setEditors([]); setNotice(''); setGroups(initialGroups); setActiveGroup(null); setSaving(false);
    base.current = null; initialSnapshot.current = null; setSaveError(''); pendingSave.current = null; editedComponents.current = new Set(); savingRef.current = false;
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

      initialSnapshot.current = { version: 1, components, evidence: sourceEvidence };
      setData(components); setEvidence(sourceEvidence); setSaved(canvas.snapshot ? { version: 1, components, evidence: sourceEvidence } : null);
      setNotice(canvas.snapshot ? 'Draft loaded. Changes are saved automatically.' : 'Your confirmed trip details are here. Generate your plan to add preferences and research.');
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
  const dirty = Boolean(snapshot && (pendingSave.current || fingerprint(snapshot) !== fingerprint(saved || initialSnapshot.current)));
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
    let websiteLinkFits = true;
    if (name === 'edit_essentials' && id === 'essentials') {
      next[id] = payload;
      // Keep visible travel dates/party aligned with the locally edited essentials.
      for (const mode of ['flights', 'accommodation']) {
        if (!next[mode]) continue;
        next[mode].subtitle = payload.travelers ? `${payload.travelers} travelers` : 'Travelers not set';
        next[mode].detail = payload.dates.flexible ? 'Flexible dates' : [payload.dates.start, payload.dates.end].filter(Boolean).join(' → ') || 'Dates not set';
      }
    } else if (id === 'map' && name === 'set_place_details') {
      const pin = item.pins.find(pin => pin.id === payload.id);
      if (!pin || pin.googleDetails) return;
      pin.googleDetails = payload.details;
      if (!pin.website && payload.website) {
        pin.website = payload.website;
        try { websiteLinkFits = appendPlaceWebsite(next.links, pin); } catch { return; }
      }
    } else if (id === 'map' && name === 'set_place_website') {
      const pin = item.pins.find(pin => pin.id === payload.id);
      if (!pin || pin.website) return;
      try {
        pin.website = payload.website;
        websiteLinkFits = appendPlaceWebsite(next.links, pin);
      } catch { return; }
    } else if (id === 'map' && name === 'restore_pin') {
      if (item.pins.some(pin => pin.id === payload.pin?.id) || !Number.isInteger(payload.index) || payload.index < 0 || payload.index > item.pins.length) return;
      item.pins.splice(payload.index, 0, payload.pin);
      item.status = 'ready'; delete item.error;
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
      if (['set_place_website', 'set_place_details'].includes(name)) editedComponents.current.add('links');
      if (id === 'essentials') { editedComponents.current.add('flights'); editedComponents.current.add('accommodation'); }
      if (id === 'findings') setEvidence(current => { const result = { ...current }; delete result[payload.id]; return result; });
      setNotice(websiteLinkFits ? 'Your changes will be saved automatically.' : 'Website saved with the place. Useful websites is full.'); setError('');
    } catch { setError('That change could not be applied. Check the details and try again.'); }
  }, []);

  const updateMockBooking = useCallback((sourcePlanId, result) => {
    if (sourcePlanId !== base.current?.plan_id || !dataRef.current || !result?.sandbox || !result.booking_id) return;
    const next = clone(dataRef.current);
    const stay = next[result.mode === 'flights' ? 'flights' : 'accommodation'];
    if (!stay || (result.mode === 'flights' && stay.need !== 'needed')) return;
    if (result.status === 'confirmed') {
      stay.bookingStatus = 'mock-booked';
      stay.mockBooking = result.mode === 'flights' ? { reference: result.booking_id, origin: result.flight?.outbound.segments[0].origin, destination: result.flight?.outbound.segments.at(-1).destination, departureDate: result.flight?.outbound.segments[0].departure_at.slice(0, 10), returnDate: result.flight?.inbound.segments[0].departure_at.slice(0, 10) } : { reference: result.booking_id, hotelName: result.hotel_name?.slice(0, 160), checkIn: result.check_in, checkOut: result.check_out };
    } else if (['cancelled', 'failed'].includes(result.status) && stay.mockBooking?.reference === result.booking_id) {
      stay.bookingStatus = 'not-booked'; delete stay.mockBooking;
    } else return;
    try {
      const parsed = validateCanvasComponents(next, true);
      if (fingerprint(parsed) === fingerprint(dataRef.current)) return;
      dataRef.current = parsed; setData(parsed);
      setNotice('Mock booking state updated. Your draft saves automatically. No real reservation was made.');
      setError('');
    } catch { setError('The mock booking could not be added to your canvas. Reopen the checkout and check its status.'); }
  }, []);

  async function generate(group = 'all', reviewedRevision, researchEntryReceipt) {
    if (active.current || savingRef.current || pendingSave.current || externalBusyRef.current || !base.current || editors.length || !groupIds[group]) return;
    const currentEpoch = epoch.current;
    const id = requestId(); const controller = new AbortController();
    const run = { id, controller, group, completed: new Set(), components: {} };
    active.current = run; setActiveGroup(group); setError(''); setNotice('Preparing your trip…');
    setGenerationProgress({ phase: 'research', count: 0, destination: dataRef.current?.map.final ? dataRef.current.map.destination : '' });
    const runGroups = group === 'all' ? ['themes', 'research'] : [group];
    setGroups(current => ({ ...current, ...Object.fromEntries(runGroups.map(key => [key, 'loading'])) }));
    try {
      // Refresh the canonical lease before generation. Local drafts are replaced
      // only for the group the traveler explicitly chose above this hook.
      const currentContext = await api.researchContext(selected);
      if (active.current !== run || epoch.current !== currentEpoch) return;
      if (currentContext.locked) throw new Error('Trip details are being updated. Wait for the reply to finish, then review again.');
      if (reviewedRevision !== undefined && currentContext.revision !== reviewedRevision) throw new Error('Trip details changed after your review. Review them again before generating.');
      if (!destinationConfirmed(currentContext.context)) throw new Error('Confirm a destination before generating your plan.');
      if (!flightNeedConfirmed(currentContext.context)) throw new Error('Confirm whether you need flights using Generate plan before generating sections.');
      setMapDestinationHint(mapHint(currentContext.context));
      if ((staleContext || currentContext.revision !== base.current.context_revision) && group !== 'all') { setStaleContext(true); throw new Error('The conversation changed. Regenerate the full plan to review the updated trip details.'); }
      run.contextRevision = currentContext.revision;
      setGenerationProgress({ phase: 'research', count: 0, destination: currentContext.context.finalDestination || '' });
      const result = await api.generateCanvas(base.current, { group, context_revision: run.contextRevision, generation_id: id, ...(researchEntryReceipt ? { research_entry_receipt: researchEntryReceipt } : {}), ...(group === 'research' ? { themes: dataRef.current.themes } : {}) }, id, {
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
              for (const key of ['essentials', 'accommodation']) if (editedComponents.current.has(key)) delete replacement[key];
              if (replacement.flights && editedComponents.current.has('essentials')) {
                const { dates, travelers } = dataRef.current.essentials;
                replacement.flights = { ...replacement.flights,
                  subtitle: travelers ? `${travelers} travelers` : 'Travelers not set',
                  detail: dates.flexible ? 'Flexible dates' : [dates.start, dates.end].filter(Boolean).join(' → ') || 'Dates not set' };
              }
              if (replacement.map) replacement.map = { ...replacement.map, pins: dataRef.current.map.pins };
            }
            // Research can refresh trip labels, but cannot undo a confirmed test stay.
            for (const mode of ['accommodation', 'flights']) {
              if (replacement[mode] && dataRef.current[mode]?.mockBooking) replacement[mode] = { ...replacement[mode], bookingStatus: 'mock-booked', mockBooking: dataRef.current[mode].mockBooking };
            }
            if (replacement.links) replacement.links = preservePlaceWebsites(dataRef.current.links, replacement.links);
            const combined = { ...dataRef.current, ...replacement };
            if (group === 'all' && currentContext.context.flights === 'not-needed') delete combined.flights;
            const next = validateCanvasComponents(combined, true);
            for (const [key, status] of Object.entries(statuses)) {
              if (status === 'ready') run.completed.add(key);
              else run.completed.delete(key);
            }
            dataRef.current = next; setData(next);
            // Count validated items from this run only, after their group completes.
            // Duplicate snapshots replace values rather than incrementing a counter.
            run.components = { ...run.components, ...incoming };
            const count = ['themes', 'findings', 'links'].reduce((total, key) => {
              const owner = key === 'themes' ? 'themes' : 'research';
              const component = run.components[key];
              return total + (run.completed.has(owner) && component?.status === 'ready' ? component.items.length : 0);
            }, 0);
            setGenerationProgress({ phase: runGroups.every(key => run.completed.has(key)) ? 'canvas' : 'research', count, destination: currentContext.context.finalDestination || '' });
            if (replacement.findings) setEvidence(sourceEvidence);
            if (group === 'all') { base.current.context_revision = run.contextRevision; setStaleContext(false); }
            // Generation never acquires a new save revision over another tab's changes.
            setGroups(current => ({ ...current, ...statuses }));
            setNotice(statuses.research === 'loading' ? 'Checking details…' : statuses.themes === 'loading' ? 'Summarizing preferences…' : 'Your draft is taking shape.');
          } catch { setError('An invalid update was rejected. Your last valid draft is still here.'); }
        },
      });
      if (active.current !== run || epoch.current !== currentEpoch) return;
      if (result?.status === 'error' || result?.status === 'interrupted') throw new Error('Generation could not finish. Your completed draft is still here. Retry the affected group.');
      if (result?.status !== 'stopped' && runGroups.some(key => !run.completed.has(key))) {
        setNotice('Completed details remain in your draft and will save automatically.');
        throw new Error('Some parts of your plan could not be generated. Retry the affected group.');
      }
      setNotice(result?.status === 'stopped' ? 'Generation stopped. Completed details will save automatically.' : 'Draft ready to review. Changes are saved automatically.');
    } catch (err) {
      if (active.current !== run || epoch.current !== currentEpoch) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      setError(err.name === 'AbortError' ? '' : err.message || 'Generation could not finish. Retry the affected group.');
      setNotice('Completed details remain in your draft and will save automatically.');
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
    active.current = null; run.controller.abort();
    setGroups(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value === 'loading' ? 'error' : value])));
    setNotice('Generation stopped. Completed details will save automatically.');
    try { await api.cancelAgentTurn(selected, run.id); }
    catch { if (epoch.current === currentEpoch && !active.current) setError('The stream stopped, but cancellation could not be confirmed. Retry after the current request finishes.'); }
    finally { if (epoch.current === currentEpoch && !active.current) setActiveGroup(null); }
  }

  async function save() {
    if (!snapshot || !valid || !base.current || active.current || savingRef.current || externalBusyRef.current || editors.length || conflict) return;
    const currentEpoch = epoch.current;
    const value = clone(snapshot);
    const body = { snapshot: value, context_revision: base.current.context_revision };
    if (!pendingSave.current) pendingSave.current = { body, id: requestId(), plan: { ...base.current } };
    const pending = pendingSave.current;
    savingRef.current = true; setSaving(true); setSaveError(''); setNotice('Saving your draft…');
    try {
      const result = await api.saveCanvas(pending.plan, pending.body, pending.id);
      if (epoch.current !== currentEpoch) return;
      if (!Number.isInteger(result.revision) || !Number.isInteger(result.context_revision)) throw new Error('The saved draft revision is unavailable.');
      const components = validateCanvasComponents(result.snapshot?.components, true);
      const sourceEvidence = validEvidence(result.snapshot?.evidence);
      base.current = { ...selected, revision: result.revision, context_revision: result.context_revision };
      const canonical = { version: 1, components, evidence: sourceEvidence };
      // Retry an ambiguous request with its original id and payload, then queue
      // newer edits. A response must never overwrite changes made after that request.
      const next = { ...components };
      const changed = new Set();
      for (const id of ids) {
        if (fingerprint(dataRef.current[id]) === fingerprint(pending.body.snapshot.components[id])) continue;
        changed.add(id);
        if (dataRef.current[id]) next[id] = dataRef.current[id];
        else delete next[id];
      }
      const nextEvidence = changed.has('findings') ? evidenceRef.current : sourceEvidence;
      editedComponents.current = changed;
      dataRef.current = next; setData(next); setEvidence(nextEvidence); setSaved(canonical);
      setNotice(changed.size ? 'Saving your latest changes…' : 'Draft saved automatically.');
      setConflict(false); setStaleContext(false); pendingSave.current = null;
      callbacks.current.onSaved?.(result);
    } catch (err) {
      if (epoch.current !== currentEpoch) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      const temporarilyBusy = ['context_locked', 'request_pending'].includes(err.code);
      setConflict(err.status === 409 && !temporarilyBusy);
      setSaveError(temporarilyBusy ? 'The current request is still finishing. Your changes are not saved yet. Retry in a moment.' : err.status === 409 ? 'This plan changed elsewhere. Your changes are not saved. Review the latest draft before continuing.' : 'Your changes could not be saved. Keep this page open and retry.');
      setNotice('Changes not saved');
    } finally { if (epoch.current === currentEpoch) { savingRef.current = false; setSaving(false); } }
  }

  saveLatest.current = save;
  useEffect(() => {
    if (loading || !dirty || !valid || saving || activeGroup || externalBusy || editors.length || conflict || saveError) return;
    const timer = setTimeout(() => { void saveLatest.current(); }, 350);
    return () => clearTimeout(timer);
  }, [snapshot, dirty, valid, loading, saving, activeGroup, externalBusy, editors.length, conflict, saveError]);

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
      let websitesFit = true;
      for (const place of places) {
        if (next.map.pins.some(pin => pin.id === place.id || (pin.name === place.name && pin.position.lat === place.position.lat && pin.position.lng === place.position.lng))) continue;
        const googleDetails = /^google_[a-f0-9]{32}$/.test(place.id) && place.place_id && Object.hasOwn(place, 'editorial_summary')
          ? { summary: place.editorial_summary, language: place.editorial_summary_language ?? null, placeId: place.place_id } : null;
        next.map.pins.push({ id: place.id, name: place.name, category: suggestedPlaceCategory(place), position: place.position, description: '', ...(place.website ? { website: place.website } : {}), ...(googleDetails ? { googleDetails } : {}) });
        if (!appendPlaceWebsite(next.links, place)) websitesFit = false;
      }
      next.map.status = 'ready'; delete next.map.error;
      const parsed = validateCanvasComponents(next, true);
      dataRef.current = parsed; setData(parsed); editedComponents.current.add('map'); editedComponents.current.add('links');
      setNotice(websitesFit ? 'Places and available websites added. Your draft saves automatically.' : 'Places added. Useful websites is full; their websites are still available in place details.'); setError('');
      return true;
    } catch { setError('These places could not be added. Check your draft has room for more places.'); return false; }
  }
  return { data, renderData, mapDestinationHint, saved, dirty, loading, saving, activeGroup, generationProgress, groups, error, saveError, notice, conflict, staleContext, editing: editors.length > 0, valid, action, generate, stop, save, addActivities, updateMockBooking, reload: () => setReloadVersion(value => value + 1) };
}
