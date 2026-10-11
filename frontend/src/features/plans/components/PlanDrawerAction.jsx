import React, { useEffect, useRef } from 'react';
import { usePlanAction } from '../usePlanAction';

export function PlanDrawerAction({ value, api, onDone, onExpired, onCancel, onLockedChange }) {
  const action = usePlanAction({ value, api, onDone, onExpired });
  const { plan, draft, changeDraft, normalized, rename, busy, error, conflict, unavailable, uncertain, submit } = action;
  const input = useRef(null);
  const locked = busy || uncertain;
  const id = `drawer-action-${plan.plan_id}`;
  useEffect(() => { input.current?.focus(); if (rename) input.current?.select(); }, [rename]);
  useEffect(() => { onLockedChange(locked); return () => onLockedChange(false); }, [locked, onLockedChange]);
  return <form className="drawer-inline-action" onSubmit={submit} aria-label={rename ? `Rename ${plan.title}` : `Delete ${plan.title}`} aria-busy={busy}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!locked) onCancel(); } }}>
    {rename ? <>
      <label className="sr-only" htmlFor={id}>Plan name</label>
      <input ref={input} id={id} value={draft} onChange={event => changeDraft(event.target.value)} disabled={locked || unavailable} aria-describedby={`${id}-hint${draft !== normalized.title ? ` ${id}-preview` : ''}`} aria-invalid={Boolean(error || normalized.error)} />
      <p id={`${id}-hint`} className="drawer-edit-hint">Enter to save · Esc to cancel</p>
      {draft !== normalized.title && <p id={`${id}-preview`} className="drawer-edit-hint">Will be saved as: {normalized.title || '—'}</p>}
      {conflict && <p className="drawer-edit-hint">Latest saved name: {plan.title}</p>}
    </> : <>
      <p className="drawer-delete-question" id={id}>Delete “{plan.title}”?</p>
      <p className="drawer-edit-hint">Recoverable for 7 days, then permanently deleted.</p>
      {conflict && <p className="drawer-edit-hint">Review the updated plan before deleting.</p>}
    </>}
    {error && <p role="alert" className="drawer-action-error">{error}</p>}
    <div className="drawer-inline-buttons">
      <button ref={rename ? undefined : input} type="button" disabled={locked} onClick={onCancel}>{rename ? 'Cancel' : 'Keep plan'}</button>
      <button className={rename ? 'drawer-save' : 'drawer-confirm-delete'} type="submit" disabled={busy || unavailable}>{busy ? 'Saving…' : uncertain ? 'Retry' : rename ? 'Save name' : 'Delete plan'}</button>
    </div>
  </form>;
}
