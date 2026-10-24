import React, { useEffect, useRef, useState } from 'react';
import { usePlanAction } from '../usePlanAction';
import { activityLabel, planStage, tripDates } from '../planJournal';
import { DestinationPhoto } from './DestinationPhoto';
import './plans-journal.css';

function InlineName({ plan, api, onExpired, onDone, onCancel }) {
  const action = usePlanAction({ value: { plan, operation: 'rename' }, api, onExpired, onDone });
  const input = useRef(null);
  const { draft, changeDraft, normalized, busy, uncertain, error, unavailable, conflict, submit } = action;
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  return <form className="journal-name-edit" onSubmit={e => { if (!e.nativeEvent.isComposing) submit(e); else e.preventDefault(); }} aria-label={`Rename ${plan.title}`} aria-busy={busy}>
    <input ref={input} aria-label="Plan name" value={draft} onChange={e => changeDraft(e.target.value)} disabled={busy || uncertain || unavailable} aria-invalid={Boolean(normalized.error)} aria-describedby={`name-help-${plan.plan_id}`} onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) { e.preventDefault(); return; } if (e.key === 'Escape' && !busy && !uncertain) { e.preventDefault(); onCancel(); } }} />
    <p id={`name-help-${plan.plan_id}`} className="journal-edit-help">{busy ? 'Saving name…' : 'Enter to save · Esc to cancel'} <button type="button" disabled={busy || uncertain} onClick={onCancel}>Cancel</button></p>
    {conflict && <p className="journal-edit-help">Latest saved name: {action.plan.title}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {uncertain && <button type="submit" disabled={busy}>Retry saving</button>}
  </form>;
}
function Trash({ plan, api, onExpired, onDone, disabled }) {
  const action = usePlanAction({ value: { plan, operation: 'delete' }, api, onExpired, onDone });
  return <div className="journal-delete"><button type="button" className="journal-trash" disabled={disabled || action.busy || action.unavailable} aria-label={`Delete ${plan.title}`} title="Move to Recently deleted · recoverable for 7 days" onClick={action.submit}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg></button>{action.busy && <span role="status" className="journal-edit-help">Deleting…</span>}{action.error && <div role="alert" className="journal-action-error"><p>{action.error}</p>{action.conflict && <p>Current name: {action.plan.title}</p>}{!action.unavailable && <button onClick={action.submit} disabled={action.busy}>{action.uncertain ? 'Retry deletion' : 'Delete current plan'}</button>}</div>}</div>;
}
function PlanCard({ plan, featured, api, onExpired, onDone, onOpen }) {
  const [editing, setEditing] = useState(false);
  const titleButton = useRef(null);
  const stage = planStage(plan), generated = stage === 'Canvas';
  const title = <button ref={titleButton} className="journal-title" aria-label={`Rename ${plan.title}`} title="Click to rename" onClick={() => setEditing(true)}>{plan.title}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m15 4 5 5-11 11-6 1 1-6ZM13 6l5 5"/></svg></button>;
  function cancel() { setEditing(false); requestAnimationFrame(() => titleButton.current?.focus()); }
  return <article className={`journal-card ${featured ? 'journal-feature' : 'journal-entry'}`}>
    <DestinationPhoto destination={plan.destination_summary} generated={generated}/>
    <div className="journal-card-body"><div className="journal-card-top">{featured && <span className="journal-kicker">PICK UP WHERE YOU LEFT OFF</span>}<span className={`journal-stage ${generated ? 'is-canvas' : ''}`}>{stage}</span><time dateTime={plan.last_activity_at} title={new Date(plan.last_activity_at).toLocaleString()}>{activityLabel(plan.last_activity_at)}</time><Trash key={`${plan.plan_id}:${plan.revision}`} plan={plan} api={api} onExpired={onExpired} onDone={onDone} disabled={editing}/></div>
      {editing ? <InlineName plan={plan} api={api} onExpired={onExpired} onDone={(updated, operation) => { cancel(); onDone(updated, operation); }} onCancel={cancel}/> : featured ? <h2>{title}</h2> : <h3>{title}</h3>}
      <p className="journal-destination">{plan.destination_summary || 'Destination undecided'}</p>
      <p className="journal-summary"><span>{tripDates(plan)}</span><span aria-hidden="true">·</span><span>{plan.saved_places_count ? `${plan.saved_places_count} ${plan.saved_places_count === 1 ? 'place' : 'places'} saved` : 'No saved places yet'}</span></p>
      {featured && <ol className="journal-progress" aria-label="Planning stage"><li aria-current={!generated ? 'step' : undefined} className="reached"><span>{generated ? '✓' : '1'}</span>Research</li><li aria-current={generated ? 'step' : undefined} className={generated ? 'reached' : ''}><span>2</span>Canvas</li></ol>}
      <div className="journal-card-bottom">{featured && <p>{generated ? 'Your saved canvas is ready. Continue shaping your trip.' : plan.destination_summary ? 'Keep exploring ideas before generating your plan.' : 'Start with a place, a feeling, or a little time away.'}</p>}<a href={`/plans/${plan.plan_id}`} aria-label={plan.title} onClick={e => onOpen(e, plan.plan_id)}>{generated ? 'Open canvas' : 'Continue research'} <span aria-hidden="true">↗</span></a></div>
    </div>
  </article>;
}
export function PlansJournal({ plans, loading, busy, cursor, onMore, onNew, onOpen, onDeleted, onDone, onExpired, api, notice, error, accountError, headingRef }) {
  const [filter, setFilter] = useState('All plans'), [query, setQuery] = useState('');
  const filtered = plans.filter(p => (filter === 'All plans' || planStage(p) === filter) && `${p.title} ${p.destination_summary || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const [first, ...rest] = filtered;
  const cardProps = { api, onExpired, onDone, onOpen };
  return <main id="plans-main" className="plans-journal" tabIndex={-1}>
    <header className="journal-heading"><div><p className="journal-kicker">A LITTLE CLOSER TO SOMEWHERE</p><h1 ref={headingRef} tabIndex={-1}>My plans<span>.</span></h1><p>Ideas worth coming back to. Journeys taking shape.</p></div><button className="journal-primary" disabled={busy || loading} onClick={onNew}><span aria-hidden="true">＋</span>{busy ? 'Creating plan…' : 'New plan'}</button></header>
    <div className="journal-toolbar"><div className="journal-filters" aria-label="Filter by planning stage">{['All plans', 'Research', 'Canvas'].map(name => <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}{name === 'All plans' && <span>{plans.length}{cursor ? '+' : ''}</span>}</button>)}</div><label className="journal-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input aria-label="Find a trip" placeholder="Find a trip…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
    {notice && <p className="plan-notice" role="status">{notice}</p>}{accountError && <p role="alert" className="error">{accountError.message}</p>}{error && <div role="alert" className="error"><p>{error.message}</p>{error.retry && <button disabled={busy || loading} onClick={error.retry}>Retry</button>}</div>}
    {loading && <p role="status">Loading your plans…</p>}
    <div aria-busy={loading} aria-label="Active plans">{first && <PlanCard key={first.plan_id} plan={first} featured {...cardProps}/>} {rest.length > 0 && <><div className="journal-section-heading"><h2>The rest of your journeys</h2><span>{rest.length} {rest.length === 1 ? 'plan' : 'plans'} to come back to</span></div><div className="journal-grid">{rest.map(p => <PlanCard key={p.plan_id} plan={p} {...cardProps}/>)}</div></>}</div>
    {!first && !loading && !error && <section className="journal-empty"><h2>{plans.length ? 'No trips here just yet.' : 'No plans yet'}</h2><p>{plans.length ? 'Try another name or planning stage.' : 'Your next journey starts with an idea.'}</p>{plans.length > 0 && <button onClick={() => { setFilter('All plans'); setQuery(''); }}>Show all plans</button>}</section>}
    {cursor && <div className="journal-pagination"><p>Search and filters cover the plans loaded so far.</p><button disabled={busy || loading} onClick={onMore}>Load more plans</button></div>}
    <footer className="journal-footer"><span>At your pace. Always your plan.</span><a href="/plans/deleted" onClick={onDeleted}>View recently deleted ↗</a></footer>
  </main>;
}
