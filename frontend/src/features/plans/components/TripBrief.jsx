import React, { useMemo, useState } from 'react';

export const emptyTripContext = () => ({
  candidates: [],
  finalDestination: '',
  dateStart: '',
  dateEnd: '',
  flexibleDates: false,
  travelers: '',
  budget: '',
  noFixedBudget: false,
  flights: 'undecided',
  accommodation: 'undecided',
});

export function tripBriefProgress(context) {
  const datesProvided = Boolean(context.flexibleDates || (context.dateStart && context.dateEnd));
  const budgetProvided = Boolean(context.noFixedBudget || String(context.budget).trim());
  const complete = [
    Boolean(String(context.finalDestination || '').trim()),
    datesProvided,
    Number(context.travelers) > 0,
    budgetProvided,
    context.flights !== 'undecided',
    context.accommodation !== 'undecided',
  ];
  const count = complete.filter(Boolean).length;
  return { count, total: 6, percentage: Math.round((count / 6) * 100), complete };
}

export function TripBrief({ value, onChange, locked = false }) {
  const context = value || emptyTripContext();
  const [candidateDraft, setCandidateDraft] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const progress = useMemo(() => tripBriefProgress(context), [context]);
  const update = patch => onChange({ ...context, ...patch });
  const datesTravelersCount = Number(progress.complete[1]) + Number(progress.complete[2]);
  const needsCount = Number(progress.complete[4]) + Number(progress.complete[5]);

  function addCandidate(event) {
    event.preventDefault();
    const name = candidateDraft.trim();
    if (!name || context.candidates.some(item => item.toLowerCase() === name.toLowerCase())) return;
    update({ candidates: [...context.candidates, name] });
    setCandidateDraft('');
  }

  function changeNeed(field, status) {
    if (status === context[field]) { setPendingStatus(null); return; }
    setPendingStatus({ field, status });
  }

  return <aside className="trip-brief" aria-label="Trip Brief" aria-busy={locked}>
    <header className="trip-brief-header">
      <div><p className="trip-brief-kicker">YOUR PLAN</p><h1>Trip Brief</h1></div>
      <span className="trip-brief-count" aria-label={`${progress.count} of 6 details complete`}>{progress.count}/6</span>
    </header>
    <section className="trip-brief-progress" aria-label="Trip progress">
      <p>{progress.count === 6 ? 'Your trip basics are clear' : `${6 - progress.count} details left to shape`}</p>
    </section>

    <details className="trip-brief-group" open>
      <summary><span>Where to?</span><small>{context.candidates.length} candidates{context.finalDestination ? ' · final place set' : ' · not settled'}</small></summary>
      <section className="trip-brief-section" aria-labelledby="trip-destinations-heading">
      <h2 id="trip-destinations-heading" className="sr-only">Places to consider</h2>
      {context.finalDestination ? <div className="trip-brief-final"><span className="trip-brief-final-mark" aria-hidden="true">✓</span><div><span className="trip-brief-label">Settled destination</span><strong>{context.finalDestination}</strong></div></div> : <p className="trip-brief-muted">Choose a final place when you’re ready.</p>}
      {context.candidates.length > 0 && <ul className="trip-brief-candidates" aria-label="Destination candidates">{context.candidates.map(name => <li key={name}><span>{name}</span><div>
        <button type="button" disabled={locked || context.finalDestination === name} onClick={() => update({ finalDestination: name })} aria-label={`Set ${name} as final destination`}>{context.finalDestination === name ? 'Chosen' : 'Choose'}</button>
        <button type="button" className="trip-brief-remove" disabled={locked} onClick={() => update({ candidates: context.candidates.filter(item => item !== name), ...(context.finalDestination === name ? { finalDestination: '' } : {}) })} aria-label={`Remove ${name}`}>Remove</button>
      </div></li>)}</ul>}
      <form className="trip-brief-add" onSubmit={addCandidate}>
        <label htmlFor="trip-candidate">Add a place</label>
        <div><input id="trip-candidate" value={candidateDraft} maxLength={100} onChange={event => setCandidateDraft(event.target.value)} placeholder="City or country" disabled={locked} /><button type="submit" disabled={locked || !candidateDraft.trim()}>Add</button></div>
      </form>
      </section>
    </details>

    <details className="trip-brief-group">
      <summary><span>When &amp; who?</span><small>{datesTravelersCount} of 2 details</small></summary>
      <section className="trip-brief-section" aria-labelledby="trip-dates-heading">
      <div className="trip-brief-section-heading"><div><p className="trip-brief-kicker">WHEN</p><h2 id="trip-dates-heading">Dates</h2></div></div>
      <div className="trip-brief-date-fields"><label>From<input type="date" aria-label="Start date" value={context.dateStart} onChange={event => update({ dateStart: event.target.value, flexibleDates: false })} disabled={locked || context.flexibleDates} /></label><label>To<input type="date" aria-label="End date" value={context.dateEnd} onChange={event => update({ dateEnd: event.target.value, flexibleDates: false })} disabled={locked || context.flexibleDates} /></label></div>
      <label className="trip-brief-inline-check"><input type="checkbox" checked={context.flexibleDates} onChange={event => update({ flexibleDates: event.target.checked, ...(event.target.checked ? { dateStart: '', dateEnd: '' } : {}) })} disabled={locked} /> My dates are flexible</label>
      </section>

      <section className="trip-brief-section" aria-labelledby="trip-travelers-heading">
      <div className="trip-brief-section-heading"><div><p className="trip-brief-kicker">WHO</p><h2 id="trip-travelers-heading">Travelers</h2></div></div>
      <label className="trip-brief-field">People<input type="number" min="1" max="50" step="1" value={context.travelers} onChange={event => update({ travelers: event.target.value })} placeholder="Number of travelers" disabled={locked} /></label>
      </section>
    </details>

    <details className="trip-brief-group">
      <summary><span>Budget</span><small>{progress.complete[3] ? context.noFixedBudget ? 'No fixed budget' : 'Added' : 'Not set'}</small></summary>
      <section className="trip-brief-section" aria-labelledby="trip-budget-heading">
      <div className="trip-brief-section-heading"><div><p className="trip-brief-kicker">SPENDING</p><h2 id="trip-budget-heading">Trip budget</h2></div></div>
      <label className="trip-brief-field">Approximate total<input type="text" inputMode="decimal" value={context.budget} onChange={event => update({ budget: event.target.value, noFixedBudget: false })} placeholder="Amount and currency" disabled={locked || context.noFixedBudget} /></label>
      <label className="trip-brief-inline-check"><input type="checkbox" checked={context.noFixedBudget} onChange={event => update({ noFixedBudget: event.target.checked, ...(event.target.checked ? { budget: '' } : {}) })} disabled={locked} /> I don’t have a fixed budget</label>
      </section>
    </details>

    <details className="trip-brief-group">
      <summary><span>What we need</span><small>{needsCount} of 2 decided</small></summary>
      <section className="trip-brief-section" aria-labelledby="trip-needs-heading">
      <h2 id="trip-needs-heading" className="sr-only">What you need</h2>
      {[['flights', 'Flights'], ['accommodation', 'Accommodation']].map(([field, label]) => <div className="trip-brief-need" key={field}>
        <div className="trip-brief-need-heading"><strong>{label}</strong><span className={`trip-brief-state ${context[field] !== 'undecided' ? 'is-set' : ''}`}>{context[field] === 'undecided' ? 'Undecided' : context[field] === 'needed' ? 'Needed' : 'Not needed'}</span></div>
        <div className="trip-brief-segment" role="group" aria-label={`${label} status`}>
          {[['undecided', 'Undecided'], ['needed', 'Needed'], ['not-needed', 'Not needed']].map(([status, text]) => <button type="button" key={status} aria-pressed={context[field] === status} disabled={locked} onClick={() => changeNeed(field, status)}>{text}</button>)}
        </div>
        {pendingStatus?.field === field && <div className="trip-brief-inline-confirm" role="group" aria-label={`Confirm ${label} status change`}>
          <span>Change to {pendingStatus.status === 'needed' ? 'Needed' : pendingStatus.status === 'not-needed' ? 'Not needed' : 'Undecided'}?</span>
          <button type="button" className="trip-brief-confirm" disabled={locked} onClick={() => { update({ [field]: pendingStatus.status }); setPendingStatus(null); }}>Confirm</button>
          <button type="button" disabled={locked} onClick={() => setPendingStatus(null)}>Cancel</button>
        </div>}
      </div>)}
      </section>
    </details>
    {locked && <p className="trip-brief-lock-note" role="status">Trip Brief is paused while Travella replies.</p>}
  </aside>;
}
