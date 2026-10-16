// Throwaway: three focused navigation/generation alternatives on /plans?prototype=plan-navigation&variant=A|B|C.
// Same production conversation and A2UI Trip Brief; every interaction uses memory-only sample data.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlanConversation } from '../components/PlanConversation';
import { CanvasGenerationReview } from '../components/CanvasGenerationReview';
import { emptyTripContext } from '../components/TripBrief';
import { CanvasSurface } from '../../../design-system/a2ui/CanvasSurface';
import { fixtures } from '../../../design-system/preview/fixtures';
import { MapFixtureAdapter } from '../../../design-system/preview/MapFixtureAdapter';
import { ids } from '../../../design-system/schemas';
import './plan-navigation-prototype.css';

const names = { A: 'Quiet toolbar', B: 'In the conversation', C: 'Inside the canvas' };
const seed = () => ({ ...emptyTripContext(), candidates: ['Lisbon'], finalDestination: 'Lisbon', dateStart: '2027-05-12', dateEnd: '2027-05-19', travelers: 2, budget: '€1,500 total', accommodation: 'needed' });
const sampleMessages = [
  { message_id: 'sample-1', role: 'user', content: 'A week in Lisbon for two. We want good food, walks and time to explore, without packing every day.' },
  { message_id: 'sample-2', role: 'assistant', content: 'Let’s keep the week relaxed. We can compare a few neighbourhoods for your base, leave space for cafés and walks, and decide later whether to add a day by the coast.\n\nYour Trip Brief is on the right. You can adjust the dates, budget or anything else as we go.' },
  { message_id: 'sample-3', role: 'user', content: 'Sounds good. Somewhere walkable and quieter in the evenings would be ideal.' },
  { message_id: 'sample-4', role: 'assistant', content: 'I’ll use that as the starting point: a walkable base, quieter evenings, and plenty of room to wander.' },
];
function surface(context) { return [
  { version: 'v0.9', createSurface: { surfaceId: 'trip-brief', catalogId: 'urn:travella:catalog:trip-brief:v1' } },
  { version: 'v0.9', updateComponents: { surfaceId: 'trip-brief', components: [{ id: 'root', component: 'TripBrief', value: { path: '/tripContext/context' } }] } },
  { version: 'v0.9', updateDataModel: { surfaceId: 'trip-brief', path: '/tripContext', value: { context } } },
]; }
function Views({ ui }) { return <nav className="pn-tabs" aria-label="Plan views">{['research', 'canvas'].map(view => <button key={view} aria-current={ui.view === view ? 'page' : undefined} onClick={() => ui.setView(view)}>{view === 'research' ? 'Research' : 'Canvas'}{view === 'canvas' && ui.generated && <span className="pn-ready-dot" aria-label="Draft ready"/>}</button>)}</nav>; }
function Prepare({ ui, children = 'Prepare canvas' }) { return <button className="pn-link" onClick={() => ui.setReview(true)}>{children} <span aria-hidden="true">↗</span></button>; }
export function VariantA({ ui }) { return <div className="pn-top"><Views ui={ui}/>{!ui.generated && <Prepare ui={ui}/>}</div>; }
export function VariantB({ ui }) { return <div className="pn-top pn-breadcrumb"><span>Lisbon <span aria-hidden="true">/</span></span><label className="sr-only" htmlFor="pn-view">Plan view</label><select id="pn-view" value={ui.view} onChange={event => ui.setView(event.target.value)}><option value="research">Research</option><option value="canvas">Canvas</option></select></div>; }
export function VariantC({ ui }) { return <div className="pn-top"><Views ui={ui}/><span className="pn-destination">Lisbon</span></div>; }

export function PrototypeNavigationSwitcher({ variant, onChange }) {
  const cycle = step => onChange(Object.keys(names)[(Object.keys(names).indexOf(variant) + step + 3) % 3]);
  useEffect(() => {
    const key = event => {
      if (event.target.closest('input, textarea, select, [contenteditable], [role="textbox"], dialog') || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [variant]);
  return <div className="pn-switcher" aria-label="Prototype variants"><button aria-label="Previous prototype" onClick={() => cycle(-1)}>←</button><span>{variant} · {names[variant]}</span><button aria-label="Next prototype" onClick={() => cycle(1)}>→</button></div>;
}

export function PlanNavigationPrototype() {
  const initial = new URLSearchParams(location.search).get('variant');
  const baseline = initial === 'baseline';
  const [variant, setVariant] = useState(names[initial] ? initial : 'A');
  const [view, setView] = useState('research');
  const [review, setReview] = useState(false);
  const [stage, setStage] = useState('empty');
  const [failure, setFailure] = useState(false);
  const [context, setContext] = useState(seed);
  const [lastAction, setLastAction] = useState('None');
  const [resetKey, setResetKey] = useState(0);
  const timer = useRef(null);
  const store = useRef({ context: seed(), revision: 1 });
  useEffect(() => () => clearTimeout(timer.current), []);
  const api = useMemo(() => {
    const snapshot = () => ({ ...store.current, locked: false, a2ui_messages: surface(store.current.context) });
    return {
      conversationMessages: async () => structuredClone(sampleMessages),
      researchContext: async () => snapshot(),
      updateResearchContext: async (_, changes) => {
        const next = structuredClone(store.current.context);
        for (const change of changes) {
          if (change.operation === 'add_candidate') next.candidates.push(change.value);
          else if (change.operation === 'remove_candidate') next.candidates = next.candidates.filter(value => value !== change.value);
          else next[change.field] = change.operation === 'clear' ? (change.field === 'travelers' ? null : '') : change.value;
        }
        store.current = { context: next, revision: store.current.revision + 1 }; setContext(next); setLastAction('Trip Brief changed in memory'); return snapshot();
      },
      agentTurnStream: async (_, message, eventId, { onEvent }) => {
        onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: 'Sample reply: we can keep exploring, or prepare a draft canvas whenever you’re ready. This preview does not contact the travel agent.' });
        onEvent({ type: 'RUN_FINISHED', status: 'complete' }); setLastAction('Simulated conversation reply'); return { status: 'complete' };
      },
    };
  }, []);
  function reset() {
    clearTimeout(timer.current); store.current = { context: seed(), revision: 1 }; setContext(seed()); setStage('empty'); setReview(false); setView('research'); setLastAction('Preview reset'); setResetKey(value => value + 1);
  }
  function changeVariant(next) {
    setVariant(next); const url = new URL(location.href); url.searchParams.set('variant', next); history.replaceState(null, '', url); reset();
  }
  const ui = { view, setView, setReview, generated: stage === 'ready' };
  const Header = { A: VariantA, B: VariantB, C: VariantC }[variant];
  const data = useMemo(() => {
    const next = fixtures(); next.map.destination = context.finalDestination; next.essentials.dates = { start: context.dateStart, end: context.dateEnd, flexible: context.flexibleDates, note: context.dateNote }; next.essentials.travelers = context.travelers; next.essentials.budget = { label: context.budget, noFixedBudget: context.noFixedBudget }; next.flights.need = context.flights; next.flights.detail = '12–19 May 2027 · Sample itinerary'; return next;
  }, [context]);
  async function generate(flights) {
    const next = { ...store.current.context, flights };
    store.current = { context: next, revision: store.current.revision + 1 }; setContext(next); setReview(false); setView('canvas'); setStage('loading'); setLastAction('Explicit confirmation: simulated generation');
    timer.current = setTimeout(() => { setStage(failure ? 'error' : 'ready'); setLastAction(failure ? 'Simulated generation failure' : 'Sample draft ready; not saved'); }, 1400);
  }
  return <section className={`pn-prototype pn-variant-${variant}`} id="plans-main">
    <div className="pn-preview-note"><span>DESIGN PREVIEW <span>· Sample trip · Nothing is saved</span></span><details className="pn-inspector"><summary>Preview controls</summary><div><button onClick={reset}>Reset preview</button><label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)}/> Simulate generation failure</label><pre>{JSON.stringify({ variant, view, stage, review, context, lastAction }, null, 2)}</pre></div></details></div>
    <div className="pn-research" hidden={view !== 'research'}><PlanConversation key={resetKey} selected={{ plan_id: 'navigation-sample' }} api={api} onExpired={() => {}} onCanvas={baseline ? () => setView('canvas') : undefined} prototypeNavigation={baseline ? undefined : <Header ui={ui}/>} prototypeInvitation={!baseline && variant === 'B' ? <div className="pn-invitation"><p>Ready to pull this together?</p><p>Your brief can become a draft canvas. You can keep researching afterwards.</p><Prepare ui={ui}>{ui.generated ? 'Prepare a new draft' : 'Review your brief'}</Prepare></div> : undefined}/></div>
    {view === 'canvas' && <main className="pn-canvas"><Header ui={ui}/>{stage === 'ready' ? <><div className="pn-canvas-heading"><div><h1>{context.finalDestination || 'Your trip'}</h1><p>Illustrative draft · Not saved</p></div><Prepare ui={ui}>Prepare again</Prepare></div><CanvasSurface data={data} visible={ids} mapAdapter={MapFixtureAdapter} disabled preview onAction={() => {}}/></> : <section className="pn-empty" aria-live="polite"><span className="pn-canvas-icon" aria-hidden="true">▦</span><h1>{stage === 'loading' ? 'Putting your trip together…' : stage === 'error' ? 'Your canvas couldn’t be prepared' : 'A little space for your plans'}</h1><p>{stage === 'loading' ? 'Simulated generation — your brief is becoming a draft.' : stage === 'error' ? 'This is a simulated error. Your trip details are still here.' : 'Bring your trip details, places and ideas together here when you’re ready.'}</p>{stage !== 'loading' && <Prepare ui={ui}>{stage === 'error' ? 'Try again' : 'Prepare from your brief'}</Prepare>}<button className="pn-return" onClick={() => setView('research')}>Keep researching</button></section>}</main>}
    {review && <CanvasGenerationReview context={context} cancelLabel="Keep researching" onCancel={() => setReview(false)} onConfirm={generate}/>}
    {!baseline && <PrototypeNavigationSwitcher variant={variant} onChange={changeVariant}/>}
  </section>;
}
