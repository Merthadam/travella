import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plansApi, requestId } from './plansApi';
import { readCanvasView, writeCanvasView, forgetCanvasView } from './features/plans/canvasViewState';
import { usePlanAction } from './features/plans/usePlanAction';
import { PlanDrawer } from './features/plans/components/PlanDrawers';
import { PlansJournal } from './features/plans/components/PlansJournal';
import { PlanningCanvas } from './features/plans/components/PlanningCanvas';
import { PlanConversation } from './features/plans/components/PlanConversation';
import { AppHeader } from './components/AppHeader';
import { PlanHeaderContext } from './components/PlanHeaderContext';
import './components/focused-header.css';
import { AccountMenu } from './components/AccountMenu';

const unknown = error => !error.status || error.status >= 500 || error.code === 'request_pending';
const date = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' });
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
  const conversation = path.match(/^\/plans\/([0-9a-f-]{36})\/conversation$/i);
  if (conversation) return { id: conversation[1] };
  const match = path.match(/^\/plans\/([0-9a-f-]{36})$/i);
  return match ? { id: match[1] } : { view: 'active' };
}

function RestoreDialog({ value, onClose, onDone, onExpired, api }) {
  const { plan, busy, error, unavailable, uncertain, submit } = usePlanAction({ value, onDone, onExpired, api });
  const dialog = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current.showModal();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className="plan-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description" onCancel={event => { if (busy || uncertain) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit} aria-busy={busy}>
      <h2 id="dialog-title">Restore plan</h2>
      <p id="dialog-description">Restore “{plan.title}” and open its Conversation.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="plan-actions"><button type="button" disabled={busy || uncertain} onClick={onClose}>Cancel</button>
        <button className="primary" disabled={busy || unavailable} type="submit">{busy ? 'Saving…' : uncertain ? 'Retry' : 'Restore plan'}</button></div>
    </form>
  </dialog>;
}

export function PlansApp({ travelerProfile, onExpired, onSignOut, onAccount, accountBusy = false, accountError, inactive = false, api = plansApi }) {
  const [headerActions, setHeaderActions] = useState(null);
  const headerShell = useMemo(() => ({ actions: headerActions }), [headerActions]);
  const inactiveView = useRef(inactive);
  inactiveView.current = inactive;
  const initialized = useRef(false);
  const mountedRoute = useRef(window.location.pathname);
  const [view, setView] = useState('active'), [plans, setPlans] = useState([]), [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(null), [notice, setNotice] = useState(''), [dialog, setDialog] = useState(null);
  const [renameNotice, setRenameNotice] = useState('');
  const [conversationPage, setConversationPage] = useState(false);
  const [canvasPage, setCanvasPage] = useState(false);
  const [generateCanvas, setGenerateCanvas] = useState(false);
  const canvasDirty = useRef(false), canvasBusy = useRef(false);
  function leaveCanvas() {
    if ((canvasDirty.current || canvasBusy.current) && !window.confirm('Leave this canvas? Changes still waiting to save and unfinished edits may be lost. Generation will stop.')) return false;
    canvasDirty.current = false; canvasBusy.current = false; setCanvasPage(false); return true;
  }
  function showCanvas(generate, revision, researchEntryReceipt) { writeCanvasView(selected?.plan_id, { canvas: true }); setGenerateCanvas(generate ? { revision, researchEntryReceipt } : false); setCanvasPage(true); }
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const drawerTrigger = useRef(null), drawerCloseButton = useRef(null), planDrawerElement = useRef(null);
  const [drawerPlans, setDrawerPlans] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(''), [drawerCursor, setDrawerCursor] = useState(null);
  const drawerRequest = useRef(0), drawerLocked = useRef(false);
  const setDrawerLocked = useCallback(value => { drawerLocked.current = value; }, []);
  const generation = useRef(0), lock = useRef(false), createAttempt = useRef(null), heading = useRef(null);
  const active = ticket => generation.current === ticket;
  function fail(err, retry, ticket) {
    if (!active(ticket)) return;
    if (err.status === 401) { generation.current++; onExpired(); return; }
    setError({ message: err.message || 'We couldn’t load your plans. Try again.', retry });
  }
  function url(path) {
    if (inactiveView.current) return;
    if (window.location.pathname !== path) window.history.pushState({ accountPosition: (window.history.state?.accountPosition || 0) + 1 }, '', path);
    mountedRoute.current = path;
  }
  async function load(nextView = 'active', nextCursor = null) {
    if (!leaveCanvas()) return;
    const ticket = ++generation.current;
    setLoading(true); setError(null); setView(nextView); setSelected(null); setConversationPage(false);
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
    if (!leaveCanvas()) return;
    const ticket = ++generation.current;
    setLoading(true); setSelected(null); setConversationPage(true); setError(null); setCursor(null); url(`/plans/${id}`);
    try {
      let plan;
      try { plan = await api.get(id); }
      catch (err) { if (err.status !== 404) throw err; plan = await api.get(id, 'deleted'); }
      if (!active(ticket)) return;
      setSelected(plan); setView('detail');
      if (plan.lifecycle === 'active' && (plan.resume_target === 'workspace' || readCanvasView(plan.plan_id).canvas === true)) { setGenerateCanvas(false); setCanvasPage(true); }
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
  function closePlanDrawer() {
    if (drawerLocked.current) return;
    drawerRequest.current++;
    setDrawerLoading(false); setPlanDrawerOpen(false);
    drawerTrigger.current?.focus();
  }
  async function loadDrawerPlans(nextCursor = null) {
    const ticket = ++drawerRequest.current;
    setDrawerLoading(true); setDrawerError('');
    try {
      const result = await api.list('active', nextCursor);
      if (ticket !== drawerRequest.current) return;
      const incoming = Array.isArray(result?.plans) ? result.plans : [];
      setDrawerPlans(old => nextCursor ? [...old, ...incoming.filter(plan => !old.some(existing => existing.plan_id === plan.plan_id))] : incoming);
      setDrawerCursor(result?.next_cursor || null);
    } catch (err) {
      if (ticket !== drawerRequest.current) return;
      if (err.status === 401) onExpired();
      else setDrawerError('Plans could not be loaded. Try again.');
    } finally { if (ticket === drawerRequest.current) setDrawerLoading(false); }
  }
  function togglePlanDrawer(event) {
    if (planDrawerOpen) { closePlanDrawer(); return; }
    drawerTrigger.current = event?.currentTarget || null;
    setPlanDrawerOpen(true); setDrawerPlans([]); setDrawerCursor(null);
    loadDrawerPlans();
  }
  function drawerCompleted(plan, operation) {
    if (operation === 'delete') forgetCanvasView(plan.plan_id);
    drawerRequest.current++; setDrawerLoading(false);
    setDrawerPlans(current => operation === 'delete' ? current.filter(item => item.plan_id !== plan.plan_id) : current.map(item => item.plan_id === plan.plan_id ? plan : item));
    setPlans(current => operation === 'delete' ? current.filter(item => item.plan_id !== plan.plan_id) : current.map(item => item.plan_id === plan.plan_id ? plan : item));
    if (selected?.plan_id === plan.plan_id) {
      if (operation === 'delete') { closePlanDrawer(); setNotice('Plan moved to Recently deleted.'); load(); }
      else setSelected(plan);
    }
  }
  useEffect(() => {
    if (!planDrawerOpen) return undefined;
    drawerCloseButton.current?.focus();
    const handleDrawerKeys = event => {
      if (event.key === 'Escape' && !event.defaultPrevented) { closePlanDrawer(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(planDrawerElement.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) { event.preventDefault(); drawerCloseButton.current?.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !planDrawerElement.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !planDrawerElement.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleDrawerKeys);
    return () => window.removeEventListener('keydown', handleDrawerKeys);
  }, [planDrawerOpen]);
  useEffect(() => {
    function navigate(event) {
      if (inactiveView.current || location.pathname === '/account') return;
      // Canvas owns same-route view history. Do not depend on child listener
      // ordering to prevent a Plan reload and its unsaved-changes guard.
      if (event && location.pathname === mountedRoute.current) return;
      initialized.current = true;
      const current = route(); if (current.id) open(current.id, false); else load(current.view);
    }
    navigate(); window.addEventListener('popstate', navigate);
    return () => { generation.current++; window.removeEventListener('popstate', navigate); };
  }, []);
  useEffect(() => {
    if (!inactive && !initialized.current) {
      initialized.current = true;
      const current = route(); if (current.id) open(current.id, false); else load(current.view);
    }
  }, [inactive]);
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
    if (operation === 'delete') forgetCanvasView(plan.plan_id);
    setDialog(null);
    if (operation === 'delete') { setNotice(`Plan moved to Recently deleted. Restore it before ${date(plan.recovery_deadline)}.`); load('active'); }
    else if (operation === 'restore') { setNotice('Plan restored.'); open(plan.plan_id, false, true); }
    else { setRenameNotice(`Plan name updated to ${plan.title}.`); if (selected) setSelected(plan); else setPlans(current => current.map(item => item.plan_id === plan.plan_id ? plan : item)); }
  }
  const link = (event, callback) => { event.preventDefault(); if (!busy) callback(); };
  return <PlanHeaderContext.Provider value={headerShell}><div className={`plans-app${conversationPage ? ' chat-app' : ''}`}>
    <p className="sr-only" role="status">{renameNotice}</p>
    <a className="skip-link" href={conversationPage && selected ? (canvasPage ? '#canvas-main' : '#conversation-main') : '#plans-main'}>{conversationPage ? (canvasPage ? 'Skip to plan canvas' : 'Skip to conversation') : 'Skip to plans'}</a>
    <AppHeader className={conversationPage ? 'chat-header plan-workspace-header' : ''} leading={conversationPage ? <div className="chat-nav-leading">
        <button type="button" className="sidebar-toggle" aria-label={planDrawerOpen ? 'Close plans navigation' : 'Open plans navigation'} aria-expanded={planDrawerOpen} onClick={togglePlanDrawer}><span /><span /><span /></button>
        <a className="brand" href="/plans" onClick={e => link(e, () => load())}>Travella</a>
      </div> : <a className="brand" href="/plans" onClick={e => link(e, () => load())}>Travella</a>}>
        <div ref={setHeaderActions} hidden={!conversationPage} />
        {!conversationPage && <AccountMenu disabled={accountBusy || busy || inactive} onAccount={onAccount} onSignOut={() => { if (leaveCanvas()) onSignOut(); }} />}
    </AppHeader>
    {planDrawerOpen && <PlanDrawer accountBusy={accountBusy || busy || inactive} onAccount={() => { closePlanDrawer(); onAccount(); }} onSignOut={() => { if (leaveCanvas()) { closePlanDrawer(); onSignOut(); } }} drawerRef={planDrawerElement} closeRef={drawerCloseButton} plans={drawerPlans} loading={drawerLoading} selected={selected} api={api} onExpired={onExpired} onDone={drawerCompleted} onLockedChange={setDrawerLocked} error={drawerError} hasMore={Boolean(drawerCursor)} onLoadMore={() => loadDrawerPlans(drawerCursor)} onRetry={() => loadDrawerPlans(drawerCursor)} onClose={closePlanDrawer} onOpen={(event, id) => link(event, () => { closePlanDrawer(); id ? open(id) : load(); })} onNew={() => { closePlanDrawer(); createPlan(); }} />}
    {conversationPage && selected ? (canvasPage ? <PlanningCanvas key={selected.plan_id} travelerProfile={travelerProfile} selected={selected} api={api} onExpired={onExpired} autoGenerate={generateCanvas} onBack={() => { canvasDirty.current = false; canvasBusy.current = false; load(); }} onDirtyChange={dirty => { canvasDirty.current = dirty; }} onBusyChange={active => { canvasBusy.current = active; }} onSaved={result => setSelected(current => current ? { ...current, revision: result.revision } : current)} /> : <PlanConversation key={selected.plan_id} inactive={inactive} selected={selected} api={api} onExpired={onExpired} onCanvas={showCanvas} />) : !selected && view === 'active' && !conversationPage ? <PlansJournal plans={plans} loading={loading} busy={busy} cursor={cursor} onMore={() => load(view, cursor)} onNew={createPlan} onOpen={(event, id) => link(event, () => open(id))} onDeleted={event => link(event, () => load('deleted'))} onDone={completed} onExpired={onExpired} api={api} notice={notice} error={error} accountError={accountError} headingRef={heading}/> : <main id="plans-main" className="plans-main" tabIndex={-1}>
      <div className="plans-heading"><h1 ref={heading} tabIndex={-1}>{conversationPage ? (loading ? 'Opening plan…' : 'Plan unavailable') : 'Recently deleted'}</h1></div>
      {notice && <p className="plan-notice" role="status">{notice}</p>}
      {accountError && <p role="alert" className="error">{accountError.message}</p>}
      {error && <div role="alert" className="error"><p>{error.message}</p>{error.retry && <button onClick={error.retry} disabled={busy || loading}>{error.message.startsWith('Your plan was restored') ? 'Open plan' : 'Retry'}</button>}</div>}
      {loading && <p role="status">{conversationPage ? 'Opening plan…' : 'Loading recently deleted plans…'}</p>}
      {conversationPage ? <a href="/plans" onClick={event => link(event, () => load())}>Return to My plans</a> : <>
        <ul className="plan-grid" aria-label="Deleted plans" aria-busy={loading}>
          {plans.map(plan => <li key={plan.plan_id} className="plan-card"><span className="plan-badge">Draft plan</span>
            <h2>{plan.title}</h2>
            <p>Restore before <time dateTime={plan.recovery_deadline}>{date(plan.recovery_deadline)}</time></p>
            <p className="meta">{remaining(plan.recovery_deadline)}</p>
            <div className="plan-actions"><button className="primary" onClick={() => setDialog({ operation: 'restore', plan })}>Restore plan<span className="sr-only"> {plan.title}</span></button></div>
          </li>)}
        </ul>
        {!loading && !error && !plans.length && <section className="plan-empty"><h2>No recently deleted plans</h2><p>Plans you delete appear here for seven days.</p></section>}
        {cursor && <button disabled={loading || busy} onClick={() => load(view, cursor)}>Load more plans</button>}
      </>}
    </main>}
    {dialog && <RestoreDialog value={dialog} onClose={() => setDialog(null)} onDone={completed} onExpired={onExpired} api={api} />}
  </div></PlanHeaderContext.Provider>;
}
