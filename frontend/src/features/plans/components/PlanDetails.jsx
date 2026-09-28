import React, { useEffect, useState } from 'react';

export const emptyBrief = {
  interests: '', start_date: '', end_date: '', travelers: 1, budget: '',
  transport_tolerance: '', accessibility_needs: '',
};

function briefLabel(brief) {
  const parts = [];
  if (brief.start_date || brief.end_date) parts.push(`${brief.start_date || 'Flexible'} → ${brief.end_date || 'Flexible'}`);
  parts.push(`${brief.travelers || 1} ${brief.travelers === 1 ? 'traveler' : 'travelers'}`);
  if (brief.budget) parts.push(brief.budget);
  return parts.join(' · ');
}

export function PlanDetails({ brief, open, onOpen, onClose, onSave, saving, error }) {
  const [draft, setDraft] = useState({ ...emptyBrief, ...(brief || {}) });
  useEffect(() => { if (open) setDraft({ ...emptyBrief, ...(brief || {}) }); }, [open, brief]);
  const update = event => setDraft(current => ({ ...current, [event.target.name]: event.target.name === 'travelers' ? (event.target.value === '' ? '' : Math.min(50, Math.max(1, Number(event.target.value)))) : event.target.value }));
  return <section className={`trip-details ${open ? 'is-open' : ''}`} aria-label="Trip details">
    <div className="trip-details-summary"><div><p className="eyebrow">PLAN CONTEXT</p><strong>{briefLabel(brief || emptyBrief)}</strong></div><button aria-expanded={open} onClick={open ? onClose : onOpen}>{open ? 'Close' : (brief ? 'Edit details' : 'Add trip details')}</button></div>
    <div className="trip-details-collapse"><div className="trip-details-editor" role="region" aria-label="Edit trip details">
      <div className="trip-details-editor-header"><div><p className="eyebrow">PLAN CONTEXT</p><h3>Trip details</h3></div></div>
      <p className="trip-details-help">These details shape the plan while you stay in control of every saved change.</p>
      <div className="trip-details-fields">
        <label>Interests<textarea name="interests" value={draft.interests} onChange={update} placeholder="Food, museums, beaches…" /></label>
        <div className="trip-details-row"><label>Start date<input name="start_date" type="date" value={draft.start_date} onChange={update} /></label><label>End date<input name="end_date" type="date" value={draft.end_date} onChange={update} /></label></div>
        <div className="trip-details-row"><label>Travelers<input name="travelers" type="number" min="1" max="50" value={draft.travelers} onChange={update} /></label><label>Budget<input name="budget" value={draft.budget} onChange={update} placeholder="€2,000" /></label></div>
        <label>Transport tolerance<input name="transport_tolerance" value={draft.transport_tolerance} onChange={update} placeholder="Walkable, public transit…" /></label>
        <label>Accessibility needs<textarea name="accessibility_needs" value={draft.accessibility_needs} onChange={update} placeholder="Anything the plan should account for" /></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="trip-details-actions"><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" type="button" onClick={() => onSave(draft)} disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button></div>
    </div></div>
  </section>;
}
