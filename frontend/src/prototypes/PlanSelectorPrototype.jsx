import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './plan-selector-prototype.css';

// Three Plan selector header prototypes on the authenticated Conversation route.
const variantNames = { A: 'Right-edge drawer', B: 'Anchored popover', C: 'Sliding rail' };
const plans = [
  { id: 'current', title: 'Untitled plan', detail: 'Vienna · Current conversation' },
  { id: 'weekend', title: 'Lisbon weekend', detail: 'Lisbon · 4 days' },
  { id: 'summer', title: 'Summer in Kyoto', detail: 'Kyoto · 8 days' },
];

export function PlanSelectorPrototype({ variant, seedTitle, onVariantChange }) {
  const initialPlans = plans.map((plan, index) => index === 0 ? { ...plan, title: seedTitle || plan.title } : plan);
  const [items, setItems] = useState(initialPlans);
  const [currentId, setCurrentId] = useState('current');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const trigger = useRef(null);
  const input = useRef(null);
  const current = items.find(item => item.id === currentId) || items[0];
  const exactMatch = confirmation.trim() === draft.trim() && Boolean(draft.trim());

  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);

  function beginEdit(event) {
    event?.stopPropagation();
    setDraft(current.title);
    setEditing(true);
    setOpen(false);
  }
  function requestConfirmation(event) {
    event.preventDefault();
    if (!draft.trim() || draft.trim() === current.title) { setEditing(false); return; }
    setConfirmation('');
    setConfirming(true);
  }
  function acceptRename(event) {
    event.preventDefault();
    if (!exactMatch) return;
    setItems(existing => existing.map(item => item.id === currentId ? { ...item, title: draft.trim() } : item));
    setConfirming(false);
    setEditing(false);
    setNotice('Simulated name change applied in memory.');
  }
  function selectPlan(id) {
    setCurrentId(id);
    setOpen(false);
    setEditing(false);
    setNotice(`Simulated switch to ${items.find(item => item.id === id)?.title}.`);
  }
  function changeVariant(next) { setOpen(false); setEditing(false); onVariantChange(next); }

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const index = ['A', 'B', 'C'].indexOf(variant);
        changeVariant(['A', 'B', 'C'][(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3]);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [variant]);

  const toggle = () => setOpen(value => !value);
  const title = editing
    ? <form className="prototype-title-edit" onSubmit={requestConfirmation} onClick={event => event.stopPropagation()}>
      <label className="prototype-sr-only" htmlFor={`prototype-title-${variant}`}>Edit plan name</label>
      <input id={`prototype-title-${variant}`} ref={input} maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditing(false); }} />
      <span className="prototype-edit-hint">Enter to review · Esc to cancel</span>
    </form>
    : <button className="prototype-title" type="button" onClick={beginEdit} aria-label={`Edit plan name, ${current.title}`}>{current.title}</button>;

  return <div className={`prototype-selector prototype-${variant.toLowerCase()}`}>
    <div className="prototype-control" ref={trigger}>
      {variant !== 'C' && title}
      <button className="prototype-chevron" type="button" aria-label={open ? 'Close plan selector' : 'Open plan selector'} aria-expanded={open} aria-controls={`prototype-list-${variant}`} onClick={toggle}><span aria-hidden="true">⌄</span></button>
      {variant === 'C' && <div className="prototype-current-title">{title}</div>}
    </div>

    <div id={`prototype-list-${variant}`} className={`prototype-options prototype-options-${variant.toLowerCase()}${open ? ' is-open' : ''}`} aria-label="Prototype plans" aria-hidden={!open}>
      {variant === 'A' && <div className="prototype-options-heading"><strong>Your plans</strong><span>Choose a draft</span></div>}
      {variant === 'B' && <div className="prototype-options-heading"><strong>Switch plan</strong><span>Click the current title above to edit</span></div>}
      {variant === 'C' && <div className="prototype-options-heading"><span>TRAVEL PLANS</span><button type="button" onClick={() => setOpen(false)} aria-label="Close plan rail">×</button></div>}
      <ul>
        {items.map(item => <li key={item.id} className={item.id === currentId ? 'is-current' : ''}>
          <button type="button" onClick={() => selectPlan(item.id)} aria-current={item.id === currentId ? 'true' : undefined}>
            <span>{item.title}</span><small>{item.detail}</small>
          </button>
        </li>)}
      </ul>
      {variant === 'A' && <p className="prototype-local-note">Switches are temporary for this preview.</p>}
    </div>

    {notice && <div className="prototype-feedback" role="status">{notice}</div>}

    {createPortal(<div className="prototype-switcher" aria-label="Prototype variant switcher">
      <button type="button" aria-label="Previous design" onClick={() => changeVariant(['C', 'A', 'B'][['A', 'B', 'C'].indexOf(variant)])}>←</button>
      <span><strong>{variant}</strong> · {variantNames[variant]}</span>
      <button type="button" aria-label="Next design" onClick={() => changeVariant(['B', 'C', 'A'][['A', 'B', 'C'].indexOf(variant)])}>→</button>
    </div>, document.body)}

    {confirming && <div className="prototype-confirm-backdrop" role="presentation">
      <section className="prototype-confirm" role="dialog" aria-modal="true" aria-labelledby={`prototype-confirm-title-${variant}`}>
        <h2 id={`prototype-confirm-title-${variant}`}>Confirm this simulated name</h2>
        <p>To apply this prototype change, type the exact plan name below:</p>
        <p className="prototype-confirm-name">{draft.trim()}</p>
        <form onSubmit={acceptRename}>
          <label htmlFor={`prototype-confirm-input-${variant}`}>Exact plan name</label>
          <input id={`prototype-confirm-input-${variant}`} autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          <div><button type="button" onClick={() => setConfirming(false)}>Cancel</button><button type="submit" disabled={!exactMatch}>Confirm simulated change</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
