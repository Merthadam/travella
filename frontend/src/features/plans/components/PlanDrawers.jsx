import React, { useEffect, useRef, useState } from 'react';
import { AccountMenu } from '../../../components/AccountMenu';
import { PlanDrawerAction } from './PlanDrawerAction';
import './plan-drawer.css';

function SwipeDrawer({ side, onClose, children, className, label, modal = false, drawerRef }) {
  const [offset, setOffset] = useState(0);
  const drag = useRef(null);
  const isLeft = side === 'left';
  const start = event => {
    if (event.target.closest?.('button, a, input, textarea, select, [role="button"], [contenteditable="true"]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, offset: 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const delta = event.clientX - drag.current.x;
    const next = isLeft ? Math.min(0, delta) : Math.max(0, delta);
    drag.current.offset = next;
    setOffset(next);
  };
  const end = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const distance = Math.abs(drag.current.offset);
    drag.current = null;
    setOffset(0);
    if (distance > 90) onClose();
  };
  return <aside ref={drawerRef} className={`${className} shadow-2xl`} aria-label={label} role={modal ? 'dialog' : undefined} aria-modal={modal ? 'true' : undefined} style={{ transform: `translateX(${offset}px)`, transition: drag.current ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>{children}</aside>;
}

function Icon({ name }) {
  const paths = { close: 'm6 6 12 12M6 18 18 6', plus: 'M12 5v14M5 12h14', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7', search: 'm16 16 4 4' };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{name === 'search' && <circle cx="10.5" cy="10.5" r="6.5" />}<path d={paths[name]} /></svg>;
}
function recentGroup(value, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Earlier';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= new Date(now.getFullYear(), now.getMonth(), 1)) return 'This month';
  return 'Earlier';
}

export function PlanDrawer({ onAccount, onSignOut, accountBusy, plans, loading, error, hasMore, selected, api, onExpired, onDone, onRetry, onLoadMore, onClose, onOpen, onNew, closeRef, drawerRef, onLockedChange }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState(null);
  const [locked, setLocked] = useState(false);
  const openTimer = useRef(null), links = useRef(new Map());
  useEffect(() => () => clearTimeout(openTimer.current), []);
  useEffect(() => { onLockedChange(locked); return () => onLockedChange(false); }, [locked, onLockedChange]);
  const close = () => { if (!locked) onClose(); };
  const startAction = (plan, operation) => {
    clearTimeout(openTimer.current);
    if (!action) setAction({ plan, operation });
  };
  const cancel = () => { const id = action.plan.plan_id; setAction(null); requestAnimationFrame(() => links.current.get(id)?.focus()); };
  const done = (plan, operation) => {
    setAction(null); setLocked(false); onLockedChange(false); onDone(plan, operation);
    requestAnimationFrame(() => (operation === 'delete' ? closeRef.current : links.current.get(plan.plan_id))?.focus());
  };
  function open(event, plan) {
    if (action) { event.preventDefault(); return; }
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); clearTimeout(openTimer.current);
    // Let the second click enter rename before navigation unmounts this drawer.
    if (event.detail === 0) onOpen(event, plan.plan_id);
    else openTimer.current = setTimeout(() => onOpen(event, plan.plan_id), 500);
  }
  const visible = plans.filter(plan => `${plan.title} ${plan.destination_summary || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = ['Today', 'Yesterday', 'This month', 'Earlier'].map(label => ({ label, plans: visible.filter(plan => recentGroup(plan.last_activity_at) === label) })).filter(group => group.plans.length);
  return <><button className="drawer-backdrop" aria-label="Close plans navigation" disabled={locked} onClick={close} /><SwipeDrawer side="left" className="plan-drawer quiet-plan-drawer" label="Your plans" modal drawerRef={drawerRef} onClose={close}>
    <div className="quiet-drawer-header"><h2>Your plans</h2><button ref={closeRef} className="drawer-close" aria-label="Close plans navigation" disabled={locked} onClick={close}><Icon name="close" /></button></div>
    <label className="drawer-search"><Icon name="search" /><span className="sr-only">Find a plan</span><input type="search" placeholder="Find a plan…" value={query} disabled={Boolean(action)} onChange={event => { clearTimeout(openTimer.current); setQuery(event.target.value); }} /></label>
    <button className="drawer-create" disabled={Boolean(action)} onClick={onNew}><Icon name="plus" />New plan</button>
    <div className="drawer-scroll" aria-busy={loading}>
      {groups.map(group => <section className="drawer-group" key={group.label} aria-label={group.label}><h3>{group.label}</h3><ul className="quiet-drawer-list">
        {group.plans.map(plan => <li key={plan.plan_id} className={`quiet-plan-row${selected?.plan_id === plan.plan_id ? ' is-current' : ''}`}>
          {action?.plan.plan_id === plan.plan_id && action.operation === 'rename' ? null : <>
            <a ref={node => { if (node) links.current.set(plan.plan_id, node); else links.current.delete(plan.plan_id); }} className={`drawer-plan-link${selected?.plan_id === plan.plan_id ? ' current' : ''}`} href={`/plans/${plan.plan_id}`} aria-current={selected?.plan_id === plan.plan_id ? 'page' : undefined} aria-disabled={Boolean(action)} onClick={event => open(event, plan)}
              onKeyDown={event => { if (event.key === 'F2') { event.preventDefault(); startAction(plan, 'rename'); } }}>
              <strong title="Double-click to rename" onDoubleClick={event => { event.preventDefault(); startAction(plan, 'rename'); }}>{plan.title}</strong><span>{plan.destination_summary || 'No destination yet'}</span>
            </a>
            <button className="drawer-trash" aria-label={`Delete ${plan.title}`} title="Delete plan" disabled={Boolean(action)} onClick={() => startAction(plan, 'delete')}><Icon name="trash" /></button>
          </>}
          {action?.plan.plan_id === plan.plan_id && <PlanDrawerAction key={`${plan.plan_id}-${action.operation}`} value={action} api={api} onExpired={onExpired} onDone={done} onCancel={cancel} onLockedChange={setLocked} />}
        </li>)}
      </ul></section>)}
      {loading && <p className="drawer-feedback" role="status">Loading plans…</p>}
      {error && <div className="drawer-feedback" role="alert"><p>{error}</p><button disabled={loading || Boolean(action)} onClick={onRetry}>Retry loading plans</button></div>}
      {!loading && !error && !visible.length && <p className="drawer-feedback">{query.trim() ? 'No matching plans.' : 'No active plans yet.'}</p>}
      {hasMore && !error && <button className="drawer-load-more" disabled={loading || Boolean(action)} onClick={onLoadMore}>Load more plans</button>}
      {hasMore && query.trim() && <p className="drawer-feedback">Search covers loaded plans. Load more to search older plans.</p>}
    </div>
    <footer className="quiet-drawer-footer"><a href="/plans" aria-disabled={Boolean(action)} onClick={event => { if (action) event.preventDefault(); else onOpen(event, null); }}>All plans</a><p>Double-click a name to rename.</p><p>Or focus it and press F2 · Enter saves</p>{onAccount && <AccountMenu placement="drawer" disabled={accountBusy || Boolean(action) || locked} onAccount={onAccount} onSignOut={onSignOut}/>}</footer>
  </SwipeDrawer></>;
}
