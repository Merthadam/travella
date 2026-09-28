import React, { useRef, useState } from 'react';

function SwipeDrawer({ side, onClose, children, className, label }) {
  const [offset, setOffset] = useState(0);
  const drag = useRef(null);
  const isLeft = side === 'left';
  const start = event => {
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
    if (distance > 90) onClose();
    else setOffset(0);
  };
  return <aside className={`${className} shadow-2xl`} aria-label={label} style={{ transform: `translateX(${offset}px)`, transition: drag.current ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>{children}</aside>;
}

export function PlanDrawer({ plans, loading, selected, onClose, onOpen, onNew }) {
  return <><button className="drawer-backdrop" aria-label="Close plans navigation" onClick={onClose} /><SwipeDrawer side="left" className="plan-drawer" label="Your plans" onClose={onClose}><div className="drawer-header"><div><p className="eyebrow">TRAVELLA</p><h2>Plans</h2></div><button aria-label="Close plans navigation" onClick={onClose}>Close</button></div><a className="drawer-all" href="/plans" onClick={event => onOpen(event, null)}>All plans</a>{loading && <p role="status">Loading plans…</p>}<ul className="drawer-list">{plans.map(plan => <li key={plan.plan_id}><a className={selected?.plan_id === plan.plan_id ? 'current' : ''} href={`/plans/${plan.plan_id}`} onClick={event => onOpen(event, plan.plan_id)}><strong>{plan.title}</strong><span>{plan.destination_summary || 'No destination yet'}</span></a></li>)}</ul>{!loading && !plans.length && <p className="drawer-empty">No active plans yet.</p>}<button className="primary drawer-new" onClick={onNew}>New plan</button></SwipeDrawer></>;
}

export function ConversationDrawer({ selected, onClose }) {
  return <><button className="drawer-backdrop" aria-label="Close Copilot" onClick={onClose} /><SwipeDrawer side="right" className="conversation-drawer" label="Copilot" onClose={onClose}><div className="drawer-header"><div><p className="eyebrow">COPILOT</p><h2>{selected?.title}</h2></div><button aria-label="Close Copilot" onClick={onClose}>Close</button></div><div className="conversation-empty"><span className="plan-badge">Coming next</span><h3>Travel Copilot</h3><p>This pane is reserved for the focused travel conversation. It will become interactive when the agent phase is implemented.</p></div></SwipeDrawer></>;
}
