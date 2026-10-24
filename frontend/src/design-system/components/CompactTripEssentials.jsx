import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { essentialsSchema } from '../schemas';
import { Icon, useDraftEditor } from './primitives';
import './compact-trip-essentials.css';

const titles = { dates: 'Travel dates', travelers: 'Travelers', budget: 'Trip budget' };
function dateLabel(dates) {
  if (dates.flexible) return 'Flexible dates';
  const format = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const start = dates.start && new Date(`${dates.start}T00:00:00Z`);
  const end = dates.end && new Date(`${dates.end}T00:00:00Z`);
  if (start && end) return format.formatRange(start, end);
  if (start) return `${format.format(start)} → …`;
  if (end) return `… → ${format.format(end)}`;
  return 'Add dates';
}

export function CompactTripEssentials({ data, onAction, disabled }) {
  const [field, setField] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const dialog = useRef(null), trigger = useRef(null);
  const id = useId();
  useDraftEditor(draft, onAction);
  function close() { setField(null); setDraft(null); setError(''); }
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!field) { element.close(); trigger.current?.focus({ preventScroll: true }); return; }
    element.showModal();
    const position = () => {
      const anchor = trigger.current.getBoundingClientRect();
      element.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - element.offsetWidth - 16))}px`;
      element.style.top = `${Math.max(16, Math.min(anchor.bottom + 12, window.innerHeight - element.offsetHeight - 16))}px`;
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [field]);
  function open(event, next) { trigger.current = event.currentTarget; setDraft(structuredClone(data)); setError(''); setField(next); }
  function save(event) {
    event.preventDefault();
    if (disabled) return;
    // Editing one detail must not replace unrelated updates to the current draft.
    const result = essentialsSchema.safeParse({ ...data, [field]: draft[field] });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    onAction('edit_essentials', result.data); close();
  }
  const values = { dates: dateLabel(data.dates), travelers: data.travelers ? `${data.travelers} ${data.travelers === 1 ? 'traveler' : 'travelers'}` : 'Add travelers', budget: data.budget.noFixedBudget ? 'No fixed budget' : data.budget.label || 'Add budget' };
  return <section className="canvas-trip-essentials" aria-label="Trip details">
    <div className="trip-detail-controls">{Object.keys(titles).map(key => <button key={key} type="button" className="trip-detail-trigger" aria-label={`Edit ${key}`} aria-haspopup="dialog" aria-controls={id} aria-expanded={field === key} disabled={disabled} onClick={event => open(event, key)}><span>{values[key]}</span><svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>)}</div>
    <dialog ref={dialog} id={id} className="trip-detail-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); close(); }}>
      {draft && <form onSubmit={save}>
        <header><h2 id={`${id}-title`}>{titles[field]}</h2><button type="button" className="trip-detail-close" aria-label="Close editor" onClick={close}><Icon name="close" size={18}/></button></header>
        {field === 'dates' && <>
          <p>When would you like to go?</p>
          <label className="trip-detail-check"><input type="checkbox" checked={draft.dates.flexible} onChange={event => setDraft({ ...draft, dates: { ...draft.dates, flexible: event.target.checked, start: '', end: '' } })}/>My dates are flexible</label>
          {!draft.dates.flexible && <div className="trip-date-range"><label>Start date<input autoFocus type="date" value={draft.dates.start} onChange={event => setDraft({ ...draft, dates: { ...draft.dates, start: event.target.value } })}/></label><label>End date<input type="date" min={draft.dates.start || undefined} value={draft.dates.end} onChange={event => setDraft({ ...draft, dates: { ...draft.dates, end: event.target.value } })}/></label></div>}
          <label>Date note <span className="trip-optional">(optional)</span><input autoFocus={draft.dates.flexible} type="text" maxLength={200} placeholder="e.g. A long weekend in November" value={draft.dates.note} onChange={event => setDraft({ ...draft, dates: { ...draft.dates, note: event.target.value } })}/></label>
        </>}
        {field === 'travelers' && <><p>How many people are going?</p><label htmlFor={`${id}-travelers`}>Total travelers</label><div className="trip-traveler-stepper"><button type="button" aria-label="Remove one traveler" disabled={disabled || (draft.travelers ?? 1) <= 1} onClick={() => setDraft({ ...draft, travelers: Math.max(1, (draft.travelers ?? 1) - 1) })}>−</button><input autoFocus id={`${id}-travelers`} type="number" min="1" max="50" step="1" value={draft.travelers ?? ''} placeholder="Not set" onChange={event => setDraft({ ...draft, travelers: event.target.value === '' ? null : Number(event.target.value) })}/><button type="button" aria-label="Add one traveler" disabled={disabled || (draft.travelers ?? 0) >= 50} onClick={() => setDraft({ ...draft, travelers: Math.min(50, (draft.travelers ?? 0) + 1) })}>+</button></div><small>Up to 50 travelers.</small></>}
        {field === 'budget' && <><p>Your total budget for the whole trip.</p><label className="trip-detail-check"><input type="checkbox" checked={draft.budget.noFixedBudget} onChange={event => setDraft({ ...draft, budget: { label: '', noFixedBudget: event.target.checked } })}/>No fixed budget</label>{!draft.budget.noFixedBudget && <label>Budget<input autoFocus type="text" maxLength={200} placeholder="e.g. €1,800 total" value={draft.budget.label} onChange={event => setDraft({ ...draft, budget: { ...draft.budget, label: event.target.value } })}/></label>}</>}
        {error && <p role="alert" className="trip-detail-error">{error}</p>}
        <p className="trip-detail-hint">Your updates are saved automatically to this draft.</p>
        <footer><button type="button" className="ds-button ghost" onClick={close}>Cancel</button><button className="ds-button primary" disabled={disabled}>Update {field}</button></footer>
      </form>}
    </dialog>
  </section>;
}
