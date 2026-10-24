import React, { useEffect, useRef, useState } from 'react';
import { flightNeedConfirmed } from '../flightNeeds';
import { destinationConfirmed } from '../generationRequirements';
import './canvas-generation-review.css';

export function PlanStages({ canvas = false }) {
  if (canvas) return <nav className="generation-stages canvas-stage-progress" aria-label="Plan stages"><ol><li className="complete"><span className="generation-step" aria-hidden="true">✓</span>Research<span className="sr-only"> complete</span></li><li className="generation-rail" aria-hidden="true"><span/></li><li className="active" aria-current="step"><span className="generation-step" aria-hidden="true">2</span>Canvas</li></ol></nav>;
  return <nav className="plan-stages" aria-label="Plan stages"><ol><li aria-current={!canvas ? 'step' : undefined}><span aria-hidden="true">1</span>Research</li><li aria-current={canvas ? 'step' : undefined}><span aria-hidden="true">2</span>Planning canvas</li></ol></nav>;
}

export function CanvasGenerationReview({ context, replacing = false, cancelLabel = 'Edit trip details', onCancel, onConfirm }) {
  const dialog = useRef(null);
  const submitted = useRef(false);
  const [flights, setFlights] = useState(flightNeedConfirmed(context) ? context.flights : '');
  const destinationReady = destinationConfirmed(context);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
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
    ['Accommodation', need(context.accommodation)],
  ];
  async function confirm() {
    if (submitted.current || !flights || !destinationReady) return;
    submitted.current = true; setPending(true); setError('');
    try { await onConfirm(flights); }
    catch (error) { setError(error.message || 'Your flight choice could not be confirmed. Try again.'); }
    finally { submitted.current = false; setPending(false); }
  }
  return <dialog ref={dialog} className="canvas-generation-review" aria-labelledby="generation-review-title" aria-describedby="generation-review-description" onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}>
    <p className="generation-review-kicker">RESEARCH → PLANNING CANVAS</p>
    <h2 id="generation-review-title">Ready to generate your plan?</h2>
    <p id="generation-review-description">Your destination is set. Confirm whether you need flights; other details can stay undecided.</p>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <fieldset className="generation-flight-choice" disabled={pending} aria-describedby="flight-choice-help">
      <legend>Do you need flights for this trip?</legend>
      <label><input type="radio" name="generation-flights" value="needed" checked={flights === 'needed'} onChange={() => setFlights('needed')}/> Yes, include flights</label>
      <label><input type="radio" name="generation-flights" value="not-needed" checked={flights === 'not-needed'} onChange={() => setFlights('not-needed')}/> No, leave flights out</label>
      <p id="flight-choice-help">{!flights ? 'Choose one to continue. ' : ''}Other undecided details can stay open.</p>
    </fieldset>
    {!destinationReady && <p role="alert">Confirm a destination in your trip details before generating.</p>}
    {replacing && <p className="generation-review-warning">New results replace generated sections and edits in those sections. Your essentials and saved map places stay in the draft.</p>}
    <p className="generation-review-note">This creates a draft canvas that saves automatically. You can keep editing it here.</p>
    {error && <p role="alert">{error} You can return to trip details to review the latest version.</p>}
    <div className="generation-review-actions"><button type="button" autoFocus disabled={pending} onClick={onCancel}>{cancelLabel}</button><button type="button" className="primary" disabled={!destinationReady || !flights || pending} onClick={confirm}>{pending ? 'Confirming flights…' : 'Confirm & generate'}</button></div>
  </dialog>;
}
