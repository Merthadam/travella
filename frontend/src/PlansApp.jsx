import React, { useEffect, useRef, useState } from 'react';
import { normalizeTitle, plansApi, requestId } from './plansApi';
import { ConversationDrawer, PlanDrawer } from './features/plans/components/PlanDrawers';
import { PlanWorkspace } from './features/plans/components/PlanWorkspace';

const unknown = error => !error.status || error.status >= 500 || error.code === 'request_pending';
const date = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' });
const configuredMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const mapsKeyIsPlaceholder = !configuredMapsKey || configuredMapsKey === 'VITE_GOOGLE_MAPS_API_KEY' || configuredMapsKey.includes('replace-with');
export function remaining(value, now = Date.now()) {
  const hours = Math.max(0, (new Date(value).getTime() - now) / 3600000);
  if (hours < 1) return 'Less than 1 hour remaining';
  if (hours < 24) return `${Math.floor(hours)} ${Math.floor(hours) === 1 ? 'hour' : 'hours'} remaining`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`;
}
function route() {
  const path = window.location.pathname;
  if (path === '/plans/deleted') return { view: 'deleted' };
  const match = path.match(/^\/plans\/([0-9a-f-]{36})$/i);
  return match ? { id: match[1] } : { view: 'active' };
}

function ActionDialog({ value, onClose, onDone, onExpired, api }) {
  const [plan, setPlan] = useState(value.plan);
  const [draft, setDraft] = useState(value.plan.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const dialog = useRef(null), pending = useRef(null), lock = useRef(false), alive = useRef(true);
  const normalized = normalizeTitle(draft);
  const rename = value.operation === 'rename';
  useEffect(() => {
    alive.current = true;
    const opener = document.activeElement;
    dialog.current.showModal();
    return () => { alive.current = false; if (opener?.isConnected) opener.focus(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || unavailable) return;
    if (rename && normalized.error) { setError(normalized.error); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (!pending.current) {
        const confirmation = await api.prepare(plan, value.operation, normalized.title);
        if (!alive.current) return;
        pending.current = { plan, operation: value.operation, title: confirmation.title, challenge: confirmation.challenge, id: requestId() };
      }
      const result = await api.commit(pending.current);
      if (alive.current) onDone(result, value.operation);
    } catch (err) {
      if (!alive.current) return;
      if (err.status === 401) { onExpired(); return; }
      if (unknown(err)) {
        setUncertain(Boolean(pending.current));
        setError('We couldn’t confirm the result. Retry to check your request.');
      } else {
        pending.current = null; setUncertain(false);
        if (err.status === 409) {
          try {
            const latest = await api.get(plan.plan_id, value.operation === 'restore' ? 'deleted' : 'active');
            if (!alive.current) return;
            setPlan(latest); setConflict(true);
            setError(rename ? 'This plan changed since you opened it. Review the latest saved name and apply your name again.' : 'This plan changed. Review the current plan before confirming again.');
          } catch (readError) {
            if (!alive.current) return;
            if (readError.status === 401) onExpired();
            else { setUnavailable(true); setError('This plan isn’t available. Close this review and refresh your plans.'); }
          }
        } else if (err.status === 410 || err.status === 404) {
          setUnavailable(true); setError('This plan’s recovery period has ended or the plan is no longer available.');
        } else setError(err.message || 'We couldn’t save this change. Try again.');
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const action = rename ? 'Apply name' : value.operation === 'delete' ? 'Delete plan' : 'Restore plan';
  return <dialog ref={dialog} className="plan-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description" onCancel={event => { if (busy || uncertain) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit} aria-busy={busy}>
      <h2 id="dialog-title">{rename ? 'Rename plan' : value.operation === 'delete' ? 'Delete plan?' : 'Restore plan'}</h2>
      <p id="dialog-description">{rename ? 'Choose the exact name to save for this plan.' : value.operation === 'delete' ? `Delete “${plan.title}”? This removes the plan from My plans. You can restore it from Recently deleted for seven days. After that, its saved data will be permanently removed.` : `Restore “${plan.title}” and open its Conversation.`}</p>
      {rename && <><label htmlFor="plan-name">Plan name</label><input id="plan-name" autoFocus value={draft} onChange={e => { setDraft(e.target.value); pending.current = null; }} disabled={busy || uncertain} aria-invalid={Boolean(normalized.error)} aria-describedby="name-count name-preview" />
        <p id="name-count" className="meta">{normalized.count} of 120 characters</p>
        {conflict && <p>Latest saved name: <strong>{plan.title}</strong></p>}
        <p id="name-preview">Will be saved as: <strong>{normalized.title || '—'}</strong></p></>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="plan-actions"><button type="button" disabled={busy || uncertain} onClick={onClose}>Cancel</button>
        <button className={value.operation === 'delete' ? 'danger' : 'primary'} disabled={busy || unavailable} type="submit">{busy ? 'Saving…' : uncertain ? 'Retry' : action}</button></div>
    </form>
  </dialog>;
}

export function PlansApp({ onExpired, onSignOut, onAccount, accountBusy = false, accountError, api = plansApi }) {
  const [view, setView] = useState('active'), [plans, setPlans] = useState([]), [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(null), [notice, setNotice] = useState(''), [dialog, setDialog] = useState(null);
  const [destinationView, setDestinationView] = useState('map');
  const mapsApiKey = mapsKeyIsPlaceholder ? '' : configuredMapsKey;
  const [mapsStatus, setMapsStatus] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [savingDestination, setSavingDestination] = useState(false);
  const [savedDestinations, setSavedDestinations] = useState([]);
  const mapCanvas = useRef(null);
  const placeSearch = useRef(null);
  const mapInstance = useRef(null);
  const markerInstances = useRef([]);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [drawerPlans, setDrawerPlans] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const generation = useRef(0), lock = useRef(false), createAttempt = useRef(null), heading = useRef(null);
  useEffect(() => {
    if (!selected || selected.lifecycle !== 'active' || destinationView !== 'map' || !mapsApiKey || !mapCanvas.current) return undefined;
    let cancelled = false;
    const scriptId = 'travella-google-maps';
    const loadMap = async () => {
      try {
        if (!window.google?.maps) {
          await new Promise((resolve, reject) => {
            const existing = document.getElementById(scriptId);
            if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
            const script = document.createElement('script');
            script.id = scriptId; script.async = true; script.defer = true;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&v=weekly&libraries=places,marker`;
            script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
          });
        }
        if (cancelled || !window.google?.maps) return;
        const { Map } = await window.google.maps.importLibrary('maps');
        if (cancelled) return;
        mapInstance.current = new Map(mapCanvas.current, { center: { lat: 42.5, lng: 12.5 }, zoom: 4, mapId: 'DEMO_MAP_ID', fullscreenControl: false, streetViewControl: false, mapTypeControl: false });
        mapInstance.current.addListener('click', event => {
          const location = event.latLng?.toJSON?.();
          if (!location) return;
          const placeId = `pin:${location.lat.toFixed(5)},${location.lng.toFixed(5)}`;
          setCandidate({ place_id: placeId, name: 'Dropped map pin', address: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`, location, types: [] });
        });
        await window.google.maps.importLibrary('places');
        const input = placeSearch.current?.querySelector('input');
        if (input && !input.dataset.autocompleteReady) {
          const autocomplete = new window.google.maps.places.Autocomplete(input, { types: ['(regions)'] });
          autocomplete.setFields(['place_id', 'name', 'formatted_address', 'geometry', 'types']);
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location?.toJSON?.() || place.geometry?.location;
            if (!location || !place.place_id) return;
            const next = { place_id: place.place_id, name: place.name || 'Selected destination', address: place.formatted_address || '', location, types: place.types || [] };
            setCandidate(next);
            if (place.geometry?.viewport) mapInstance.current?.fitBounds(place.geometry.viewport);
            else mapInstance.current?.setCenter(location);
            mapInstance.current?.setZoom(7);
          });
          input.dataset.autocompleteReady = 'true';
        }
        setMapsStatus('Google Maps is connected.');
      } catch {
        if (!cancelled) setMapsStatus('Google Maps could not load. Check the key restrictions and try again.');
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, [selected, destinationView, mapsApiKey]);
  useEffect(() => {
    markerInstances.current.forEach(marker => { marker.map = null; });
    markerInstances.current = [];
    if (!mapInstance.current || !window.google?.maps || !savedDestinations.length) return;
    window.google.maps.importLibrary('marker').then(({ AdvancedMarkerElement }) => {
      markerInstances.current = savedDestinations.map(destination => new AdvancedMarkerElement({ map: mapInstance.current, position: destination.location || { lat: destination.latitude, lng: destination.longitude }, title: destination.name }));
    });
  }, [savedDestinations]);
  const active = ticket => generation.current === ticket;
  function fail(err, retry, ticket) {
    if (!active(ticket)) return;
    if (err.status === 401) { generation.current++; onExpired(); return; }
    setError({ message: err.message || 'We couldn’t load your plans. Try again.', retry });
  }
  function url(path) { if (window.location.pathname !== path) window.history.pushState({}, '', path); }
  async function load(nextView = 'active', nextCursor = null) {
    const ticket = ++generation.current;
    setLoading(true); setError(null); setView(nextView); setSelected(null);
    if (!nextCursor) { setPlans([]); setCursor(null); }
    url(nextView === 'deleted' ? '/plans/deleted' : '/plans');
    try {
      const result = await api.list(nextView, nextCursor);
      if (!active(ticket)) return;
      const page = result || {};
      const incoming = Array.isArray(page.plans) ? page.plans : [];
      setPlans(old => nextCursor ? [...old, ...incoming.filter(p => !old.some(existing => existing.plan_id === p.plan_id))] : incoming);
      setCursor(page.next_cursor || null);
    } catch (err) { fail(err, () => load(nextView, nextCursor), ticket); }
    finally { if (active(ticket)) { setLoading(false); heading.current?.focus(); } }
  }
  async function open(id, recordActivity = true, restored = false) {
    const ticket = ++generation.current;
    setLoading(true); setSelected(null); setSavedDestinations([]); setError(null); setCursor(null); url(`/plans/${id}`);
    try {
      let plan;
      try { plan = await api.get(id); }
      catch (err) { if (err.status !== 404) throw err; plan = await api.get(id, 'deleted'); }
      if (!active(ticket)) return;
      setSelected(plan); setView('detail');
      if (api.destinations) {
        try { setSavedDestinations(await api.destinations(plan)); }
        catch (destinationError) { if (destinationError.status === 401) { fail(destinationError, null, ticket); return; } if (active(ticket)) setError({ message: 'Your plan opened, but its destinations could not be loaded.', retry: () => open(id, false) }); }
      }
      if (recordActivity && plan.lifecycle === 'active') {
        const activityId = requestId();
        const updateActivity = async () => {
          try { const updated = await api.activity(plan, activityId); if (active(ticket)) { setSelected(updated); setError(null); } }
          catch (err) { if (err.status === 401) fail(err, null, ticket); else if (active(ticket)) setError({ message: 'Your plan is open, but we couldn’t update its place in My plans.', retry: updateActivity }); }
        };
        await updateActivity();
      }
    } catch (err) {
      if (restored && err.status !== 401 && active(ticket)) setError({ message: 'Your plan was restored, but we couldn’t open it. Choose Open plan to try again.', retry: () => open(id) });
      else fail({ ...err, message: 'This plan isn’t available. Return to My plans.' }, () => open(id), ticket);
    } finally { if (active(ticket)) { setLoading(false); heading.current?.focus(); } }
  }
  async function togglePlanDrawer() {
    const next = !planDrawerOpen;
    setPlanDrawerOpen(next);
    if (!next || drawerLoading) return;
    setDrawerLoading(true);
    try {
      const result = await api.list('active');
      setDrawerPlans(Array.isArray(result?.plans) ? result.plans : []);
    } catch (err) {
      if (err.status === 401) onExpired();
    } finally { setDrawerLoading(false); }
  }
  useEffect(() => {
    function navigate() { const current = route(); if (current.id) open(current.id, false); else load(current.view); }
    navigate(); window.addEventListener('popstate', navigate);
    return () => { generation.current++; window.removeEventListener('popstate', navigate); };
  }, []);
  async function createPlan() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    const ticket = generation.current;
    createAttempt.current ||= requestId();
    try {
      const plan = await api.create(createAttempt.current);
      if (!active(ticket)) return;
      createAttempt.current = null; setNotice('Your draft is saved.'); await open(plan.plan_id, false);
    } catch (err) {
      if (!unknown(err)) createAttempt.current = null;
      fail({ ...err, message: unknown(err) ? 'We couldn’t confirm the result. Retry to check your request.' : err.message }, createPlan, ticket);
    } finally { lock.current = false; if (active(ticket) || createAttempt.current === null) setBusy(false); }
  }
  function completed(plan, operation) {
    setDialog(null);
    if (operation === 'delete') { setNotice(`Plan moved to Recently deleted. Restore it before ${date(plan.recovery_deadline)}.`); load('active'); }
    else if (operation === 'restore') { setNotice('Plan restored.'); open(plan.plan_id, false, true); }
    else { setNotice('Plan name updated.'); if (selected) setSelected(plan); else load('active'); }
  }
  const link = (event, callback) => { event.preventDefault(); if (!busy) callback(); };
  function actions(plan) {
    return plan.lifecycle === 'deleted' ? <button className="primary" onClick={() => setDialog({ operation: 'restore', plan })}>Restore plan<span className="sr-only"> {plan.title}</span></button> : <>
      <button onClick={() => setDialog({ operation: 'rename', plan })}>Rename<span className="sr-only"> {plan.title}</span></button>
      <button className="danger" onClick={() => setDialog({ operation: 'delete', plan })}>Delete<span className="sr-only"> {plan.title}</span></button></>;
  }
  async function saveCandidate() {
    if (!candidate || savingDestination || savedDestinations.some(destination => destination.place_id === candidate.place_id)) return;
    setSavingDestination(true);
    try {
      if (api.addDestination && selected) {
        const result = await api.addDestination(selected, { place_id: candidate.place_id, name: candidate.name, address: candidate.address, latitude: candidate.location.lat, longitude: candidate.location.lng, granularity: candidate.types?.includes('country') ? 'country' : 'city' }, requestId());
        setSavedDestinations(current => [...current, result.destination]);
        setSelected(current => ({ ...current, revision: result.plan_revision }));
      } else setSavedDestinations(current => [...current, candidate]);
      setCandidate(null);
    } catch (err) { if (err.status === 401) onExpired(); else setError({ message: err.message || 'Could not save this destination.', retry: saveCandidate }); }
    finally { setSavingDestination(false); }
  }
  async function removeDestination(destination) {
    try {
      if (api.removeDestination && selected) {
        const result = await api.removeDestination(selected, destination.destination_id, requestId());
        setSelected(current => ({ ...current, revision: result.plan_revision }));
      }
      setSavedDestinations(current => current.filter(item => item.place_id !== destination.place_id));
    } catch (err) { if (err.status === 401) onExpired(); else setError({ message: err.message || 'Could not remove this destination.' }); }
  }
  return <div className="plans-app">
    <a className="skip-link" href="#plans-main">Skip to plans</a>
    <header className="plans-header"><div>
      <a className="brand" href="/plans" onClick={e => link(e, () => load())}>Travella</a>
      <nav className="app-nav" aria-label="Application navigation">
        <button className="nav-button" aria-expanded={planDrawerOpen} onClick={togglePlanDrawer}>Plans</button>{selected && <button className="nav-button" aria-expanded={conversationOpen} onClick={() => setConversationOpen(true)}>Copilot</button>}
        <button className="nav-button" aria-label="Set up authenticator" disabled={accountBusy || busy} onClick={onAccount}>Account</button>
        <button className="nav-button subtle" disabled={accountBusy || busy} onClick={onSignOut}>Sign out</button>
      </nav>
    </div></header>
    {planDrawerOpen && <PlanDrawer plans={drawerPlans} loading={drawerLoading} selected={selected} actions={actions} onClose={() => setPlanDrawerOpen(false)} onOpen={(event, id) => link(event, () => { setPlanDrawerOpen(false); id ? open(id) : load(); })} onNew={() => { setPlanDrawerOpen(false); createPlan(); }} />}
    <main id="plans-main" className="plans-main" tabIndex={-1}>
      <div className="plans-heading"><div><h1 ref={heading} tabIndex={-1}>{selected ? selected.title : view === 'deleted' ? 'Recently deleted' : 'My plans'}</h1>{!selected && view === 'active' && <p>Your draft plans, most recently opened or changed first.</p>}</div>
        {!selected && view === 'active' && <button className="primary" disabled={busy || loading} onClick={createPlan}>{busy ? 'Creating plan…' : 'New plan'}</button>}</div>
      {notice && <p className="plan-notice" role="status">{notice}</p>}
      {accountError && <p role="alert" className="error">{accountError.message}</p>}
      {error && <div role="alert" className="error"><p>{error.message}</p>{error.retry && <button onClick={error.retry} disabled={busy || loading}>{error.message.startsWith('Your plan was restored') ? 'Open plan' : 'Retry'}</button>}</div>}
      {loading && <p role="status">{selected ? 'Opening plan…' : view === 'deleted' ? 'Loading recently deleted plans…' : 'Loading your plans…'}</p>}
      {selected && <PlanWorkspace selected={selected} actions={actions} onOpenConversation={() => setConversationOpen(true)} destinationView={destinationView} setDestinationView={setDestinationView} mapCanvas={mapCanvas} placeSearch={placeSearch} mapsApiKey={mapsApiKey} mapsStatus={mapsStatus} candidate={candidate} setCandidate={setCandidate} savedDestinations={savedDestinations} saveCandidate={saveCandidate} savingDestination={savingDestination} removeDestination={removeDestination} />}
      {!selected && <><ul className="plan-grid" aria-label={view === 'deleted' ? 'Deleted plans' : 'Active plans'} aria-busy={loading}>
        {plans.map(plan => <li key={plan.plan_id} className="plan-card"><span className="plan-badge">Draft plan</span>
          <h2>{view === 'deleted' ? plan.title : <a href={`/plans/${plan.plan_id}`} onClick={e => link(e, () => open(plan.plan_id))}>{plan.title}</a>}</h2>
          {view === 'deleted' ? <><p>Restore before <time dateTime={plan.recovery_deadline}>{date(plan.recovery_deadline)}</time></p><p className="meta">{remaining(plan.recovery_deadline)}</p></> : <><p>{plan.destination_summary || 'No destination yet'}</p><p className="meta">Last active <time dateTime={plan.last_activity_at}>{date(plan.last_activity_at)}</time></p></>}
          <div className="plan-actions">{actions(plan)}</div></li>)}
      </ul>{!loading && !error && !plans.length && <section className="plan-empty"><h2>{view === 'deleted' ? 'No recently deleted plans' : 'No plans yet'}</h2><p>{view === 'deleted' ? 'Plans you delete appear here for seven days.' : 'Choose New plan to save your first draft.'}</p></section>}
      {cursor && <button disabled={loading || busy} onClick={() => load(view, cursor)}>Load more plans</button>}
      {view === 'active' && <section className="plan-panel recently-deleted"><h2>Recently deleted</h2><p>Restore deleted plans for up to seven days.</p><a href="/plans/deleted" onClick={e => link(e, () => load('deleted'))}>View recently deleted →</a></section>}</>}
    </main>
    {conversationOpen && <ConversationDrawer selected={selected} onClose={() => setConversationOpen(false)} />}
    {dialog && <ActionDialog value={dialog} onClose={() => setDialog(null)} onDone={completed} onExpired={onExpired} api={api} />}
  </div>;
}
