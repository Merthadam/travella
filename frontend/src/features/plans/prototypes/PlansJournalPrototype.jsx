// Throwaway: three My plans layouts on /plans?prototype=plans-journal&variant=A.
// Every trip and mutation below is simulated, in-memory, and discarded on reload.
import React, { useEffect, useRef, useState } from 'react';
import { useAppearance } from '../../appearance/AppearanceProvider';
import './plans-journal-prototype.css';

const stages = ['Exploring', 'Researching', 'Draft'];
const variants = { A: 'Travel journal', B: 'Trip index', C: 'Journey board' };
const samples = [
  { id: 'yakushima', title: 'Yakushima escape', destination: 'Yakushima, Japan', stage: 1, source: 'automatic', when: 'Today', dates: 'Dates undecided', saved: 3, description: 'Ancient forests, slow walks, and a little island time.', next: 'You were exploring forest walks and places to stay.', art: 'forest' },
  { id: 'lisbon', title: 'A long weekend in Lisbon', destination: 'Lisbon, Portugal', stage: 2, source: 'manual', when: 'Yesterday', dates: '14–18 Nov', saved: 8, description: 'Neighbourhood cafés and a few days by the water.', next: 'Your draft is ready to revisit. Compare your saved stays.', art: 'coast' },
  { id: 'japan', title: 'Japan nature escape', destination: 'Destination undecided', stage: 0, source: 'automatic', when: '3 days ago', dates: 'Dates undecided', saved: 0, description: 'Somewhere green, quiet, and a little off the beaten path.', next: 'You were finding the right destination for a nature break.', art: 'contour' },
  { id: 'copenhagen', title: 'Copenhagen, slowly', destination: 'Copenhagen, Denmark', stage: 2, source: 'automatic', when: 'Last week', dates: '4–8 Dec', saved: 6, description: 'Design stops, bakeries, and winter walks.', next: 'Six places are saved. Pick up your draft whenever you like.', art: 'city' },
];
const titleFor = plan => plan.stage === 0 ? 'Japan nature escape' : plan.stage === 1 ? 'Yakushima escape' : 'A week in Yakushima';
const cta = plan => plan.stage === 0 ? 'Continue exploring' : plan.stage === 1 ? 'Continue researching' : 'Open draft';

function Landscape({ kind = 'forest', large = false }) {
  return <div className={`pj-landscape pj-${kind}${large ? ' pj-landscape-large' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 480 310" preserveAspectRatio="xMidYMid slice">
      <circle cx="370" cy="68" r="31" className="pj-sun" />
      {kind === 'contour' ? <g className="pj-contours">{[0,1,2,3,4,5,6,7].map(n => <ellipse key={n} cx="260" cy="166" rx={45+n*27} ry={28+n*19} transform="rotate(-28 260 166)" />)}<path d="M45 245 Q150 280 210 155 T430 55" className="pj-route" /></g> : <>
        <path d="M-20 220 Q50 80 130 135 T270 95 T510 125 V330 H-20Z" className="pj-hill-back" />
        <path d="M-20 260 Q105 117 230 217 T510 160 V330 H-20Z" className="pj-hill-mid" />
        <path d="M-20 310 Q160 172 310 275 T510 232 V330 H-20Z" className="pj-hill-front" />
        <path d="M180 310 Q315 250 260 217 T305 170" className="pj-trail" />
        {kind === 'forest' && [45,78,109,350,387,419].map((x,n) => <path key={x} d={`M${x} ${225-n%3*18} v-55 m-19 35 19-31 19 31 m-15-12 11 18 m-34-18 23-30 23 30`} className="pj-tree" />)}
        {kind === 'city' && [55,93,131,335,373,411].map((x,n) => <path key={x} d={`M${x} 245 v-${45+n%3*18} l15 -15 15 15 v${45+n%3*18}Z`} className="pj-house" />)}
      </>}
      <circle cx="305" cy="170" r="7" className="pj-point" /><circle cx="305" cy="170" r="17" className="pj-point-ring" />
    </svg>
    <span className="pj-art-caption">{kind === 'contour' ? 'A little possibility' : kind === 'forest' ? '30.34° N / 130.52° E' : kind === 'coast' ? '38.72° N / 9.14° W' : '55.68° N / 12.57° E'}</span>
  </div>;
}
function Stage({ plan }) { return <span className={`pj-stage pj-stage-${plan.stage}`}><i />{stages[plan.stage]}</span>; }
function Journey({ plan }) { return <ol className="pj-journey" aria-label="Planning stage">{['Explore','Research','Draft'].map((name,i) => <li key={name} className={i <= plan.stage ? 'pj-reached' : ''} aria-current={i === plan.stage ? 'step' : undefined}><span>{i < plan.stage ? '✓' : i+1}</span>{name}</li>)}</ol>; }
function Menu({ plan, onEdit }) {
  return <button className="pj-more" aria-label={`Options for ${plan.title}`} onClick={() => onEdit(plan, 'manage')}>···</button>;
}
function Summary({ plan }) { return <p className="pj-summary">{plan.dates}<span>·</span>{plan.saved ? `${plan.saved} places saved` : 'No saved places yet'}</p>; }
function Entry({ plan, onOpen, onEdit }) {
  return <article className="pj-entry"><Landscape kind={plan.art} /><div className="pj-entry-body"><div className="pj-card-top"><Stage plan={plan}/><span className="pj-time">{plan.when}</span><Menu plan={plan} onEdit={onEdit}/></div><h3><button onClick={() => onOpen(plan)}>{plan.title}</button></h3><p className="pj-destination">{plan.destination}</p><Summary plan={plan}/><button className="pj-text-action" onClick={() => onOpen(plan)}>{cta(plan)} <span>↗</span></button></div></article>;
}
export function VariantA({ plans, onOpen, onEdit }) {
  const [first, ...rest] = plans;
  if (!first) return null;
  return <div className="pj-journal"><section className="pj-feature"><Landscape kind={first.art} large/><div className="pj-feature-body"><div className="pj-card-top"><span className="pj-kicker">PICK UP WHERE YOU LEFT OFF</span><Menu plan={first} onEdit={onEdit}/></div><div className="pj-inline"><Stage plan={first}/><span className="pj-time">Active {first.when.toLowerCase()}</span></div><h2>{first.title}</h2><p className="pj-feature-description">{first.description}</p><Summary plan={first}/><Journey plan={first}/><div className="pj-feature-bottom"><p>{first.next}</p><button className="pj-primary" onClick={() => onOpen(first)}>{cta(first)} <span>↗</span></button></div></div></section>{rest.length > 0 && <><div className="pj-section-heading"><h2>The rest of your journeys</h2><span>{rest.length} plans to come back to</span></div><div className="pj-entry-grid">{rest.map(plan => <Entry key={plan.id} plan={plan} onOpen={onOpen} onEdit={onEdit}/>)}</div></>}</div>;
}
export function VariantB({ plans, onOpen, onEdit }) {
  const [selected, setSelected] = useState(plans[0]?.id);
  const plan = plans.find(p => p.id === selected) || plans[0];
  if (!plan) return null;
  return <div className="pj-index"><section className="pj-index-list" aria-label="Trip index"><div className="pj-index-label"><span>YOUR JOURNEYS</span><span>LAST OPENED</span></div>{plans.map((p,i) => <button key={p.id} className={`pj-index-row ${plan.id === p.id ? 'pj-selected' : ''}`} aria-pressed={plan.id === p.id} onClick={() => { setSelected(p.id); if (matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => document.querySelector(".pj-index-preview")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })); }}><span className="pj-number">{String(i+1).padStart(2,'0')}</span><div><strong>{p.title}</strong><span className="pj-index-sub"><Stage plan={p}/><span>{p.destination}</span></span></div><span className="pj-row-time">{p.when}<b>↗</b></span></button>)}<p className="pj-index-note">Big ideas, small beginnings.<br/>Every journey has a place here.</p></section><aside className="pj-index-preview" aria-label={`Preview of ${plan.title}`}><Landscape kind={plan.art} large/><div className="pj-preview-body"><div className="pj-card-top"><Stage plan={plan}/><Menu plan={plan} onEdit={onEdit}/></div><h2>{plan.title}</h2><p className="pj-destination">{plan.destination}</p><Summary plan={plan}/><Journey plan={plan}/><p className="pj-next">{plan.next}</p><button className="pj-primary" onClick={() => onOpen(plan)}>{cta(plan)} <span>↗</span></button></div></aside></div>;
}
export function VariantC({ plans, onOpen, onEdit }) {
  return <div className="pj-board">{stages.map((stage,index) => <section className={`pj-lane pj-lane-${index}`} key={stage}><header><span className="pj-lane-number">0{index+1}</span><h2>{stage}</h2><span className="pj-lane-count">{plans.filter(p=>p.stage===index).length}</span></header><p className="pj-lane-description">{['Finding your somewhere','Getting to know your destination','Bringing the details together'][index]}</p><div className="pj-lane-cards">{plans.filter(p=>p.stage===index).map(plan => <article className="pj-board-card" key={plan.id}><div className="pj-board-card-top"><span>{plan.when}</span><Menu plan={plan} onEdit={onEdit}/></div>{index !== 0 && <Landscape kind={plan.art}/>}<div className="pj-board-card-body"><h3><button onClick={() => onOpen(plan)}>{plan.title}</button></h3><p className="pj-destination">{plan.destination}</p><p className="pj-board-description">{plan.description}</p><Summary plan={plan}/><button className="pj-text-action" onClick={() => onOpen(plan)}>{cta(plan)} <span>↗</span></button></div></article>)}</div>{!plans.some(p=>p.stage===index) && <p className="pj-lane-empty">Room for your next chapter.</p>}</section>)}</div>;
}
function PreviewDialog({ value, onClose, onUpdate, onDelete }) {
  const ref = useRef(null), [name, setName] = useState(value.plan.title);
  const {plan, mode} = value;
  useEffect(() => { const prior = document.activeElement; ref.current.showModal(); return () => prior?.isConnected && prior.focus(); }, []);
  function advance() { const next = { ...plan, stage: Math.min(2,plan.stage+1), destination: 'Yakushima, Japan', art: 'forest', dates: plan.stage === 1 ? '7 days · Dates undecided' : plan.dates, next: plan.stage === 1 ? 'Your draft is ready to revisit. Continue shaping your Yakushima trip.' : 'Yakushima is confirmed. Explore places to stay and things to do.' }; if (next.source === 'automatic') next.title = titleFor(next); onUpdate(next); setName(next.title); }
  return <dialog ref={ref} className="pj-dialog" onCancel={onClose} aria-labelledby="pj-dialog-title"><button className="pj-dialog-close" onClick={onClose} aria-label="Close preview">×</button><p className="pj-kicker">SIMULATED TRIP · CHANGES RESET ON RELOAD</p><Stage plan={plan}/><h2 id="pj-dialog-title">{plan.title}</h2><p className="pj-destination">{plan.destination}</p><Journey plan={plan}/>{mode === 'manage' ? <form onSubmit={e => { e.preventDefault(); if(name.trim()) { onUpdate({...plan,title:name.trim(),source:'manual'}); onClose(); } }}><label htmlFor="pj-name">Trip name</label><input id="pj-name" value={name} onChange={e=>setName(e.target.value)} maxLength={120} required/><p className="pj-next">Your own name stays yours, even as the trip takes shape.</p><div className="pj-dialog-actions"><button className="pj-primary" type="submit">Save name</button><button className="pj-delete" type="button" onClick={()=>{onDelete(plan.id);onClose();}}>Delete sample trip</button></div></form> : <><p className="pj-next">{plan.next}</p><div className="pj-demo-box"><strong>Try the naming behavior</strong><p>{plan.source==='manual' ? 'Custom name protected. Progress will never overwrite it.' : 'Automatic name. It evolves at meaningful planning milestones.'}</p><button className="pj-secondary" disabled={plan.stage===2} onClick={advance}>{plan.stage===0 ? 'Simulate confirming Yakushima' : plan.stage===1 ? 'Simulate creating a 7-day draft' : 'Draft created'}</button></div></>}<p className="pj-dialog-foot">Preview only. No real plan is opened, renamed, or deleted.</p></dialog>;
}
function PrototypeSwitcher({ variant, cycle, theme, toggleTheme, empty, toggleEmpty }) {
  return <div className="pj-switcher"><button aria-label="Previous design" onClick={()=>cycle(-1)}>←</button><span><small>INTERACTIVE PROTOTYPE</small><strong>{variant} · {variants[variant]}</strong></span><button aria-label="Next design" onClick={()=>cycle(1)}>→</button><i/><button onClick={toggleTheme} aria-label="Toggle preview theme">{theme==='dark'?'☀':'☾'}</button><button onClick={toggleEmpty}>{empty?'Show trips':'Empty state'}</button></div>;
}
export function PlansJournalPrototype() {
  const initial = new URLSearchParams(location.search).get('variant');
  const [variant,setVariant] = useState(variants[initial] ? initial : 'A');
  const [plans,setPlans] = useState(samples), [query,setQuery] = useState(''), [filter,setFilter] = useState('All plans'), [dialog,setDialog] = useState(null);
  const [notice,setNotice] = useState(''), [empty,setEmpty] = useState(false);
  const {theme,setTheme} = useAppearance();
  function switchVariant(next) { setVariant(next); const url=new URL(location.href);url.searchParams.set('variant',next);history.replaceState(null,'',url); }
  function cycle(direction) { const keys=Object.keys(variants);switchVariant(keys[(keys.indexOf(variant)+direction+3)%3]); }
  useEffect(()=>{ function key(e) { if(e.target.closest('input,textarea,select,[contenteditable="true"],dialog') || e.altKey || e.metaKey || e.ctrlKey) return; if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cycle(e.key==='ArrowRight'?1:-1);} } window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key); },[variant]);
  const filtered=(empty ? [] : plans).filter(p=>(filter==='All plans'||stages[p.stage]===filter)&&`${p.title} ${p.destination}`.toLowerCase().includes(query.toLowerCase()));
  const Component={A:VariantA,B:VariantB,C:VariantC}[variant];
  function newPlan(){const plan={...samples[2],id:`new-${Date.now()}`,title:'New trip',description:'A new idea, ready to take shape.',when:'Just now',next:'Start with the kind of holiday you have in mind.'};setPlans(p=>[plan,...p]);setEmpty(false);setFilter('All plans');setQuery('');setNotice('Sample trip created. Open it to try its first automatic name.');}
  return <main id="plans-main" className={`pj-root pj-variant-${variant}`}>
    <div className="pj-page-heading"><div><p className="pj-kicker">A LITTLE CLOSER TO SOMEWHERE</p><h1>My plans<span>.</span></h1><p>Ideas worth coming back to. Journeys taking shape.</p></div><button className="pj-primary" onClick={newPlan}><span>＋</span> New plan</button></div>
    <div className="pj-toolbar"><div className="pj-filters" aria-label="Filter by planning stage">{['All plans',...stages].map(s=><button key={s} aria-pressed={filter===s} onClick={()=>setFilter(s)}>{s}{s==='All plans'&&<span>{empty?0:plans.length}</span>}</button>)}</div><label className="pj-search"><span aria-hidden="true">⌕</span><input aria-label="Find a trip" placeholder="Find a trip…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    {notice&&<p role="status" className="pj-notice">{notice}<button aria-label="Dismiss notice" onClick={()=>setNotice('')}>×</button></p>}
    {filtered.length ? <Component plans={filtered} onOpen={plan=>setDialog({plan,mode:'resume'})} onEdit={(plan,mode)=>setDialog({plan,mode})}/> : <section className="pj-empty"><span>↗</span><h2>{query||filter!=='All plans'?'No trips here just yet.':'Your next journey starts with an idea.'}</h2><p>{query||filter!=='All plans'?'Try a different search or planning stage.':'A city, a feeling, or simply a little time away.'}</p><button className="pj-primary" onClick={query||filter!=='All plans'?()=>{setQuery('');setFilter('All plans');}:newPlan}>{query||filter!=='All plans'?'Show all plans':'Start a plan'}</button></section>}
    <footer className="pj-footer"><span>At your pace. Always your plan.</span><button onClick={()=>setNotice('Recently deleted preview: no sample trips to restore. Real plans stay recoverable for 7 days.')}>Recently deleted ↗</button></footer>
    <div className="pj-prototype-tools"><PrototypeSwitcher variant={variant} cycle={cycle} theme={theme} toggleTheme={()=>setTheme(theme==='dark'?'light':'dark')} empty={empty} toggleEmpty={()=>setEmpty(!empty)}/><details className="pj-state"><summary>Sample data · changes reset on reload</summary><pre>{JSON.stringify({variant,filter,query,empty,plans:plans.map(({id,title,stage,source})=>({id,title,stage:stages[stage],source}))},null,2)}</pre><button onClick={()=>{setPlans(samples);setEmpty(false);setNotice('');setQuery('');setFilter('All plans');}}>Reset sample trips</button></details></div>
    {dialog&&<PreviewDialog value={dialog} onClose={()=>setDialog(null)} onUpdate={plan=>{setPlans(list=>list.map(p=>p.id===plan.id?plan:p));setDialog(d=>({...d,plan}));}} onDelete={id=>{setPlans(list=>list.filter(p=>p.id!==id));setNotice('Sample trip removed. Reload to restore all sample trips.');}}/>}
  </main>;
}
