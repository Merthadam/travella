// Throwaway: three focused navigation/generation alternatives on /plans?prototype=state-bar&variant=A|B|C.
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
import './state-bar-prototype.css';

const names = { A: 'Action at the edge', B: 'The next stage', C: 'Readiness drawer' };
const initialScene = () => new URLSearchParams(location.search).get('scene') === 'ready' ? 'ready' : 'early';
const readySeed = () => ({ ...emptyTripContext(), candidates: ['Lisbon'], finalDestination: 'Lisbon', dateStart: '2027-05-12', dateEnd: '2027-05-19', travelers: 2, budget: '€1,500 total', accommodation: 'needed' });
const seed = (scene = initialScene()) => scene === 'ready' ? readySeed() : ({ ...emptyTripContext(), candidates: ['Lisbon', 'Porto'], travelers: 2 });
const sampleMessages = [
  { message_id: 'sample-1', role: 'user', content: 'A week in Lisbon for two. We want good food, walks and time to explore, without packing every day.' },
  { message_id: 'sample-2', role: 'assistant', content: 'Let’s keep the week relaxed. We can compare a few neighbourhoods for your base, leave space for cafés and walks, and decide later whether to add a day by the coast.\n\nYour Trip Brief keeps track of the essentials. You can adjust the dates, budget or anything else as we go.' },
  { message_id: 'sample-3', role: 'user', content: 'Sounds good. Somewhere walkable and quieter in the evenings would be ideal.' },
  { message_id: 'sample-4', role: 'assistant', content: 'I’ll use that as the starting point: a walkable base, quieter evenings, and plenty of room to wander.' },
];
function surface(context) { return [
  { version: 'v0.9', createSurface: { surfaceId: 'trip-brief', catalogId: 'urn:travella:catalog:trip-brief:v1' } },
  { version: 'v0.9', updateComponents: { surfaceId: 'trip-brief', components: [{ id: 'root', component: 'TripBrief', value: { path: '/tripContext/context' } }] } },
  { version: 'v0.9', updateDataModel: { surfaceId: 'trip-brief', path: '/tripContext', value: { context } } },
]; }
function Steps({ ui }) { return <nav className="sb-steps" aria-label="Plan progress"><ol>
  <li aria-current={ui.view === 'research' ? 'step' : undefined}><button onClick={() => ui.setView('research')}><span className="sb-number">1</span><span>Research<small>{ui.generated ? 'Your conversation & brief' : 'Shape your trip'}</small></span></button></li>
  <li className="sb-connector" aria-hidden="true"/>
  <li aria-current={ui.view === 'canvas' ? 'step' : undefined}><button disabled={!ui.generated} onClick={() => ui.setView('canvas')}><span className="sb-number">2</span><span>Draft plan<small>{ui.generated ? 'Your canvas is ready' : 'Up next · Your planning canvas'}</small></span></button></li>
</ol></nav>; }
function DraftAction({ ui }) { return <button className="sb-action" disabled={!ui.ready || ui.busy} onClick={() => ui.generated ? ui.setView('canvas') : ui.setReview(true)}>{ui.busy ? 'Preparing your draft…' : ui.generated ? 'Open draft plan' : 'Review & create draft'} <span aria-hidden="true">→</span></button>; }
function Status({ ui }) { return <p className="sb-status" role="status">{ui.busy ? 'We’re turning your confirmed brief into a draft canvas.' : ui.error ? 'Your brief is safe. Review it to try preparing your draft again.' : ui.generated ? 'Your draft is ready. Keep researching or continue on your canvas.' : ui.ready ? 'Your trip has enough detail for a first draft. Review it when you’re ready.' : `We’ll turn your research into a draft plan. Next: ${ui.missing.join(', ')}.`}</p>; }
export function VariantA({ ui }) { return <header className="sb-bar sb-bar-a"><div className="sb-a-main"><Steps ui={ui}/><DraftAction ui={ui}/></div><Status ui={ui}/></header>; }
export function VariantB({ ui }) { return <header className="sb-bar sb-bar-b"><div className="sb-current"><button className="sb-stage-title" onClick={() => ui.setView('research')} aria-current={ui.view === 'research' ? 'step' : undefined}><span className="sb-number">1</span>Research</button><Status ui={ui}/></div><div className={`sb-next ${ui.ready ? 'is-ready' : ''}`}><span className="sb-number">2</span><div><span className="sb-next-label">{ui.generated ? 'YOUR CANVAS' : 'UP NEXT'}</span><strong>Draft plan</strong><p>{ui.ready ? 'Bring your details, places and ideas together.' : 'Available once the essentials are shaped.'}</p></div><DraftAction ui={ui}/></div></header>; }
export function VariantC({ ui }) { return <header className="sb-bar sb-bar-c"><Steps ui={ui}/><details className="sb-readiness"><summary><Status ui={ui}/><span>{ui.generated ? 'View draft' : ui.ready ? 'Review readiness' : 'What’s needed?'} <span aria-hidden="true">⌄</span></span></summary><div className="sb-readiness-content"><ul>{ui.checks.map(([label, done]) => <li key={label}><span aria-hidden="true">{done ? '✓' : '○'}</span>{label}<small>{done ? 'Set' : 'To decide'}</small></li>)}</ul><div><p>Check the brief before creating anything. You can continue researching afterwards.</p><DraftAction ui={ui}/></div></div></details></header>; }

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

export function StateBarPrototype() {
  const initial = new URLSearchParams(location.search).get('variant');
  const [scene, setScene] = useState(initialScene);
  const [variant, setVariant] = useState(names[initial] ? initial : 'A');
  const [view, setView] = useState('research');
  const [review, setReview] = useState(false);
  const [stage, setStage] = useState('empty');
  const [failure, setFailure] = useState(false);
  const [context, setContext] = useState(() => seed());
  const [lastAction, setLastAction] = useState('None');
  const [resetKey, setResetKey] = useState(0);
  const timer = useRef(null);
  const store = useRef({ context: seed(), revision: 1 });
  useEffect(() => () => clearTimeout(timer.current), []);
  const api = useMemo(() => {
    const snapshot = () => ({ ...store.current, locked: false, a2ui_messages: surface(store.current.context) });
    return {
      conversationMessages: async () => store.current.context.finalDestination ? structuredClone(sampleMessages) : [{ message_id: 'early-1', role: 'user', content: 'We’re thinking about Portugal for two. Maybe Lisbon or Porto. We like food and wandering around a city.' }, { message_id: 'early-2', role: 'assistant', content: 'Let’s narrow down what feels right for your trip. We can explore both places, then settle on a destination and a rough time to go.\n\nAs we work through that, your Trip Brief will take shape. Once we have the essentials, you’ll be able to review them and create a draft plan.' }],
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
  function reset(nextScene = scene) {
    clearTimeout(timer.current); store.current = { context: seed(nextScene), revision: 1 }; setContext(seed(nextScene)); setStage('empty'); setReview(false); setView('research'); setLastAction('Preview reset'); setResetKey(value => value + 1);
  }
  function changeVariant(next) {
    setVariant(next); const url = new URL(location.href); url.searchParams.set('variant', next); history.replaceState(null, '', url); reset();
  }
  const checks = [['Destination chosen', Boolean(context.finalDestination)], ['Timing or flexible dates', Boolean(context.flexibleDates || (context.dateStart && context.dateEnd))], ['Travelers', Boolean(context.travelers)], ['Trip priorities discussed', true]];
  const missing = checks.filter(([, done]) => !done).map(([label]) => label === 'Destination chosen' ? 'choose your destination' : label === 'Timing or flexible dates' ? 'add timing or flexible dates' : 'add travelers');
  const ready = checks.every(([, done]) => done);
  const ui = { view, setView, setReview, generated: stage === 'ready', ready, checks, missing, busy: stage === 'loading', error: stage === 'error' };
  function changeScene(next) { setScene(next); const url = new URL(location.href); url.searchParams.set('scene', next); history.replaceState(null, '', url); reset(next); }

  const Header = { A: VariantA, B: VariantB, C: VariantC }[variant];
  const data = useMemo(() => {
    const next = fixtures(); next.map.destination = context.finalDestination; next.essentials.dates = { start: context.dateStart, end: context.dateEnd, flexible: context.flexibleDates, note: context.dateNote }; next.essentials.travelers = context.travelers; next.essentials.budget = { label: context.budget, noFixedBudget: context.noFixedBudget }; next.flights.need = context.flights; next.flights.detail = '12–19 May 2027 · Sample itinerary'; return next;
  }, [context]);
  async function generate(flights) {
    if (!ready) return;
    const next = { ...store.current.context, flights };
    store.current = { context: next, revision: store.current.revision + 1 }; setContext(next); setReview(false); setStage('loading'); setLastAction('Explicit confirmation: simulated generation');
    timer.current = setTimeout(() => { setStage(failure ? 'error' : 'ready'); if (!failure) setView('canvas'); setLastAction(failure ? 'Simulated generation failure' : 'Sample draft ready; not saved'); }, 1400);
  }
  return <section className={`pn-prototype sb-prototype pn-variant-${variant}`} id="plans-main">
    <div className="pn-preview-note"><span>DESIGN PREVIEW <span>· Sample trip · Nothing is saved</span></span><details className="pn-inspector"><summary>Preview controls</summary><div><button onClick={() => reset()}>Reset preview</button><label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)}/> Simulate generation failure</label><pre>{JSON.stringify({ variant, scene, ready, checks, view, stage, review, context, lastAction }, null, 2)}</pre></div></details></div>
    <Header ui={ui}/>
    <div className="pn-research" hidden={view !== 'research'}><PlanConversation key={resetKey} selected={{ plan_id: 'state-bar-sample' }} api={api} onExpired={() => {}}/></div>
    {view === 'canvas' && stage === 'ready' && <main className="pn-canvas"><div className="pn-canvas-heading"><div><h1>{context.finalDestination || 'Your trip'}</h1><p>Illustrative draft · Not saved</p></div></div><CanvasSurface data={data} visible={ids} mapAdapter={MapFixtureAdapter} disabled preview onAction={() => {}}/></main>}
    {review && <CanvasGenerationReview context={context} cancelLabel="Keep researching" onCancel={() => setReview(false)} onConfirm={generate}/>}
    <div className="sb-preview-dock"><label>Sample stage<select aria-label="Sample stage" value={scene} onChange={event => changeScene(event.target.value)}><option value="early">Early research</option><option value="ready">Ready to draft</option></select></label><PrototypeNavigationSwitcher variant={variant} onChange={changeVariant}/></div>
  </section>;
}
