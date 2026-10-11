import React, { useEffect, useRef } from 'react';
import './canvas-generation-review.css';

export function PlanStages({ canvas = false }) {
  return <nav className="plan-stages" aria-label="Plan stages"><ol><li aria-current={!canvas ? 'step' : undefined}><span aria-hidden="true">1</span>Research</li><li aria-current={canvas ? 'step' : undefined}><span aria-hidden="true">2</span>Planning canvas</li></ol></nav>;
}

export function CanvasGenerationReview({ context, replacing = false, cancelLabel = 'Edit trip details', onCancel, onConfirm }) {
  const dialog = useRef(null);
  const submitted = useRef(false);
  const returnFocus = useRef(document.activeElement);
  useEffect(() => {
    const previous = returnFocus.current;
    dialog.current.showModal();
    return () => { dialog.current?.close(); previous?.focus?.(); };
  }, []);
  const need = value => value === 'needed' ? 'Needed' : value === 'not-needed' ? 'Not needed' : 'Undecided';
  const rows = [
    ['Destination', context.finalDestination || 'Not chosen'],
    ['Dates', context.flexibleDates ? 'Flexible dates' : [context.dateStart || 'Start undecided', context.dateEnd || 'End undecided'].join(' → ')],
    ...(context.dateNote ? [['Timing notes', context.dateNote]] : []),
    ['Travelers', context.travelers ? String(context.travelers) : 'Undecided'],
    ['Budget', context.noFixedBudget ? 'No fixed budget' : context.budget || 'Undecided'],
    ['Flights', need(context.flights)],
    ['Accommodation', need(context.accommodation)],
  ];
  return <dialog ref={dialog} className="canvas-generation-review" aria-labelledby="generation-review-title" aria-describedby="generation-review-description" onCancel={event => { event.preventDefault(); onCancel(); }}>
    <p className="generation-review-kicker">RESEARCH → PLANNING CANVAS</p>
    <h2 id="generation-review-title">Ready to generate your plan?</h2>
    <p id="generation-review-description">Check the trip details we’ll use. You can leave undecided details open.</p>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {replacing && <p className="generation-review-warning">New results replace generated sections and edits in those sections. Your essentials and saved map places stay in the draft.</p>}
    <p className="generation-review-note">This creates a draft canvas. You’ll review it before choosing Save plan.</p>
    <div className="generation-review-actions"><button type="button" autoFocus onClick={onCancel}>{cancelLabel}</button><button type="button" className="primary" onClick={() => { if (submitted.current) return; submitted.current = true; onConfirm(); }}>Confirm &amp; generate</button></div>
  </dialog>;
}
