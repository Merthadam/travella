// Selected throwaway journal A on /plans?prototype=plans-journal&variant=A.
// Trips and mutations are simulated in memory. Destination photos load live from Google Maps with contributor attribution.
import React, { useEffect, useRef, useState } from 'react';
import { useAppearance } from '../../appearance/AppearanceProvider';
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../../lib/googleMaps';
import './plans-journal-prototype.css';

const stages = ['Research', 'Canvas'];
const samples = [
  { id: 'yakushima', title: 'Yakushima escape', destination: 'Yakushima, Japan', stage: 0, generated: false, destinationConfirmed: true, source: 'automatic', when: 'Today', dates: 'Dates undecided', saved: 3, description: 'Ancient forests, slow walks, and a little island time.', next: 'You were exploring forest walks and places to stay.', art: 'forest' },
  { id: 'lisbon', title: 'A long weekend in Lisbon', destination: 'Lisbon, Portugal', stage: 1, generated: true, destinationConfirmed: true, source: 'manual', when: 'Yesterday', dates: '14–18 Nov', saved: 8, description: 'Neighbourhood cafés and a few days by the water.', next: 'Your draft is ready to revisit. Compare your saved stays.', art: 'coast' },
  { id: 'japan', title: 'Japan nature escape', destination: 'Destination undecided', stage: 0, generated: false, destinationConfirmed: false, source: 'automatic', when: '3 days ago', dates: 'Dates undecided', saved: 0, description: 'Somewhere green, quiet, and a little off the beaten path.', next: 'You were finding the right destination for a nature break.', art: 'contour' },
  { id: 'copenhagen', title: 'Copenhagen, slowly', destination: 'Copenhagen, Denmark', stage: 1, generated: true, destinationConfirmed: true, source: 'automatic', when: 'Last week', dates: '4–8 Dec', saved: 6, description: 'Design stops, bakeries, and winter walks.', next: 'Six places are saved. Pick up your draft whenever you like.', art: 'city' },
];
const titleFor = plan => plan.generated ? 'A week in Yakushima' : plan.destinationConfirmed ? 'Yakushima escape' : 'Japan nature escape';
const cta = plan => plan.generated ? 'Open canvas' : 'Continue research';

function safePhotoLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
async function loadDestinationPhoto(destination) {
  const { libraries } = await loadGoogleMaps({ libraries: ['geocoding', 'places'] });
  // Resolve the actual destination, never substitute an unrelated landmark image.
  const { results = [] } = await new libraries.geocoding.Geocoder().geocode({ address: destination });
  if (results.length !== 1 || results[0].partial_match || !results[0].place_id) return null;
  const place = new libraries.places.Place({ id: results[0].place_id });
  await place.fetchFields({ fields: ['photos', 'displayName'] });
  const photo = place.photos?.[0];
  return photo ? { uri: photo.getURI({ maxWidth: 1000, maxHeight: 800 }), authors: photo.authorAttributions || [], name: place.displayName || destination, mapsURI: photo.googleMapsURI } : null;
}
function PlanVisual({ plan, large = false }) {
  const host = useRef(null), pending = useRef(null);
  const [visible, setVisible] = useState(false), [result, setResult] = useState({ status: 'loading', photo: null });
  useEffect(() => {
    if (!plan.generated || !host.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '100px' });
    observer.observe(host.current); return () => observer.disconnect();
  }, [plan.generated]);
  useEffect(() => {
    if (!plan.generated || !visible) return;
    let alive = true;
    setResult({ status: 'loading', photo: null });
    if (new URLSearchParams(location.search).get('photoState') === 'unavailable' || !getGoogleMapsApiKey()) { setResult({ status: 'unavailable', photo: null }); return; }
    if (pending.current?.destination !== plan.destination) pending.current = { destination: plan.destination, promise: loadDestinationPhoto(plan.destination).catch(() => null) };
    pending.current.promise.then(photo => { if (alive) setResult({ status: photo ? 'ready' : 'unavailable', photo }); });
    return () => { alive = false; };
  }, [plan.generated, plan.destination, visible]);
  const { photo, status } = result;
  return <div ref={host} className={`pj-landscape pj-plan-visual ${plan.generated ? 'pj-generated-photo' : 'pj-awaiting-photo'}${large ? ' pj-landscape-large' : ''}`} data-photo-status={plan.generated ? status : 'not-generated'}>
    {plan.generated && photo ? <><img className="pj-destination-photo" src={photo.uri} alt={`Destination photo of ${photo.name}`} onError={() => setResult({ status: 'unavailable', photo: null })}/><div className="pj-photo-credit"><span>Google Maps</span>{photo.authors.map((author,i) => <span key={i}>{safePhotoLink(author.uri) ? <a href={safePhotoLink(author.uri)} target="_blank" rel="noopener noreferrer">{author.displayName || 'Photo contributor'}</a> : author.displayName || 'Photo contributor'}</span>)}</div></> : <div className="pj-photo-placeholder"><svg viewBox="0 0 60 60" aria-hidden="true"><path d="m10 17 13-5 14 6 13-5v31l-13 5-14-6-13 5Zm13-5v31m14-25v31"/><circle cx="30" cy="29" r="4"/></svg><strong>{!plan.generated ? 'A journey taking shape' : status === 'loading' ? 'Finding your destination photo…' : 'A place to look forward to'}</strong><span>{!plan.generated ? 'A destination photo appears once your plan is generated.' : status === 'loading' ? plan.destination : 'A destination photo isn’t available yet.'}</span></div>}
  </div>;
}
function Stage({ plan }) { return <span className={`pj-stage pj-stage-${plan.stage}`}><i />{stages[plan.stage]}</span>; }
function Journey({ plan }) { return <ol className="pj-journey" aria-label="Planning stage">{['Research','Canvas'].map((name,i) => <li key={name} className={i <= plan.stage ? 'pj-reached' : ''} aria-current={i === plan.stage ? 'step' : undefined}><span>{i < plan.stage ? '✓' : i+1}</span>{name}</li>)}</ol>; }
function Menu({ plan, onEdit }) {
  return <button className="pj-more" aria-label={`Options for ${plan.title}`} onClick={() => onEdit(plan, 'manage')}>···</button>;
}
function Summary({ plan }) { return <p className="pj-summary">{plan.dates}<span>·</span>{plan.saved ? `${plan.saved} places saved` : 'No saved places yet'}</p>; }
function Entry({ plan, onOpen, onEdit }) {
  return <article className="pj-entry"><PlanVisual plan={plan} /><div className="pj-entry-body"><div className="pj-card-top"><Stage plan={plan}/><span className="pj-time">{plan.when}</span><Menu plan={plan} onEdit={onEdit}/></div><h3><button onClick={() => onOpen(plan)}>{plan.title}</button></h3><p className="pj-destination">{plan.destination}</p><Summary plan={plan}/><button className="pj-text-action" onClick={() => onOpen(plan)}>{cta(plan)} <span>↗</span></button></div></article>;
}
export function VariantA({ plans, onOpen, onEdit }) {
  const [first, ...rest] = plans;
  if (!first) return null;
  return <div className="pj-journal"><section className="pj-feature"><PlanVisual plan={first} large/><div className="pj-feature-body"><div className="pj-card-top"><span className="pj-kicker">PICK UP WHERE YOU LEFT OFF</span><Menu plan={first} onEdit={onEdit}/></div><div className="pj-inline"><Stage plan={first}/><span className="pj-time">Active {first.when.toLowerCase()}</span></div><h2>{first.title}</h2><p className="pj-feature-description">{first.description}</p><Summary plan={first}/><Journey plan={first}/><div className="pj-feature-bottom"><p>{first.next}</p><button className="pj-primary" onClick={() => onOpen(first)}>{cta(first)} <span>↗</span></button></div></div></section>{rest.length > 0 && <><div className="pj-section-heading"><h2>The rest of your journeys</h2><span>{rest.length} {rest.length === 1 ? 'plan' : 'plans'} to come back to</span></div><div className="pj-entry-grid">{rest.map(plan => <Entry key={plan.id} plan={plan} onOpen={onOpen} onEdit={onEdit}/>)}</div></>}</div>;
}
function PreviewDialog({ value, onClose, onUpdate, onDelete }) {
  const ref = useRef(null), [name, setName] = useState(value.plan.title);
  const {plan, mode} = value;
  useEffect(() => { const prior = document.activeElement; ref.current.showModal(); return () => prior?.isConnected && prior.focus(); }, []);
  function advance() {
    const generated = plan.destinationConfirmed;
    const next = { ...plan, stage: generated ? 1 : 0, generated, destinationConfirmed: true, destination: 'Yakushima, Japan', dates: generated ? '7 days · Dates undecided' : plan.dates, next: generated ? 'Your canvas is ready to revisit. Continue shaping your Yakushima trip.' : 'Yakushima is confirmed. Continue research before generating your plan.' };
    if (next.source === 'automatic') next.title = titleFor(next);
    onUpdate(next); setName(next.title);
  }
  return <dialog ref={ref} className="pj-dialog" onCancel={onClose} aria-labelledby="pj-dialog-title"><button className="pj-dialog-close" onClick={onClose} aria-label="Close preview">×</button><p className="pj-kicker">SIMULATED TRIP · CHANGES RESET ON RELOAD</p><Stage plan={plan}/><h2 id="pj-dialog-title">{plan.title}</h2><p className="pj-destination">{plan.destination}</p><Journey plan={plan}/>{mode === 'manage' ? <form onSubmit={e => { e.preventDefault(); if(name.trim()) { onUpdate({...plan,title:name.trim(),source:'manual'}); onClose(); } }}><label htmlFor="pj-name">Trip name</label><input id="pj-name" value={name} onChange={e=>setName(e.target.value)} maxLength={120} required/><p className="pj-next">Your own name stays yours, even as the trip takes shape.</p><div className="pj-dialog-actions"><button className="pj-primary" type="submit">Save name</button><button className="pj-delete" type="button" onClick={()=>{onDelete(plan.id);onClose();}}>Delete sample trip</button></div></form> : <>{plan.generated && <PlanVisual plan={plan} large/>}<p className="pj-next">{plan.next}</p><div className="pj-demo-box"><strong>Try the naming behavior</strong><p>{plan.source==='manual' ? 'Custom name protected. Progress will never overwrite it.' : 'Automatic name. It evolves at meaningful planning milestones.'}</p><button className="pj-secondary" disabled={plan.generated} onClick={advance}>{plan.generated ? 'Canvas generated' : !plan.destinationConfirmed ? 'Simulate confirming Yakushima' : 'Simulate generating a 7-day plan'}</button></div></>}<p className="pj-dialog-foot">Preview only. No real plan is opened, renamed, or deleted.</p></dialog>;
}
function PrototypeSwitcher({ theme, toggleTheme, empty, toggleEmpty }) {
  return <div className="pj-switcher"><span><small>SELECTED DIRECTION · REFINED</small><strong>A · Travel journal</strong></span><i/><button onClick={toggleTheme} aria-label="Toggle preview theme">{theme==='dark'?'☀':'☾'}</button><button onClick={toggleEmpty}>{empty?'Show trips':'Empty state'}</button></div>;
}
export function PlansJournalPrototype() {
  const variant = 'A';
  const [plans,setPlans] = useState(samples), [query,setQuery] = useState(''), [filter,setFilter] = useState('All plans'), [dialog,setDialog] = useState(null);
  const [notice,setNotice] = useState(''), [empty,setEmpty] = useState(false);
  const {theme,setTheme} = useAppearance();
  const filtered=(empty ? [] : plans).filter(p=>(filter==='All plans'||stages[p.stage]===filter)&&`${p.title} ${p.destination}`.toLowerCase().includes(query.toLowerCase()));
  const Component=VariantA;
  function newPlan(){const plan={...samples[2],id:`new-${Date.now()}`,title:'New trip',description:'A new idea, ready to take shape.',when:'Just now',next:'Start with the kind of holiday you have in mind.'};setPlans(p=>[plan,...p]);setEmpty(false);setFilter('All plans');setQuery('');setNotice('Sample trip created. Open it to try its first automatic name.');}
  return <main id="plans-main" className={`pj-root pj-variant-${variant}`}>
    <div className="pj-page-heading"><div><p className="pj-kicker">A LITTLE CLOSER TO SOMEWHERE</p><h1>My plans<span>.</span></h1><p>Ideas worth coming back to. Journeys taking shape.</p></div><button className="pj-primary" onClick={newPlan}><span>＋</span> New plan</button></div>
    <div className="pj-toolbar"><div className="pj-filters" aria-label="Filter by planning stage">{['All plans',...stages].map(s=><button key={s} aria-pressed={filter===s} onClick={()=>setFilter(s)}>{s}{s==='All plans'&&<span>{empty?0:plans.length}</span>}</button>)}</div><label className="pj-search"><span aria-hidden="true">⌕</span><input aria-label="Find a trip" placeholder="Find a trip…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    {notice&&<p role="status" className="pj-notice">{notice}<button aria-label="Dismiss notice" onClick={()=>setNotice('')}>×</button></p>}
    {filtered.length ? <Component plans={filtered} onOpen={plan=>setDialog({plan,mode:'resume'})} onEdit={(plan,mode)=>setDialog({plan,mode})}/> : <section className="pj-empty"><span>↗</span><h2>{query||filter!=='All plans'?'No trips here just yet.':'Your next journey starts with an idea.'}</h2><p>{query||filter!=='All plans'?'Try a different search or planning stage.':'A city, a feeling, or simply a little time away.'}</p><button className="pj-primary" onClick={query||filter!=='All plans'?()=>{setQuery('');setFilter('All plans');}:newPlan}>{query||filter!=='All plans'?'Show all plans':'Start a plan'}</button></section>}
    <footer className="pj-footer"><span>At your pace. Always your plan.</span><button onClick={()=>setNotice('Recently deleted preview: no sample trips to restore. Real plans stay recoverable for 7 days.')}>Recently deleted ↗</button></footer>
    <div className="pj-prototype-tools"><PrototypeSwitcher theme={theme} toggleTheme={()=>setTheme(theme==='dark'?'light':'dark')} empty={empty} toggleEmpty={()=>setEmpty(!empty)}/><details className="pj-state"><summary>Sample data · changes reset on reload</summary><pre>{JSON.stringify({variant,filter,query,empty,photoFallbackSimulated:new URLSearchParams(location.search).get('photoState')==='unavailable',plans:plans.map(({id,title,stage,source,generated})=>({id,title,stage:stages[stage],source,generated}))},null,2)}</pre><button onClick={()=>{setPlans(samples);setEmpty(false);setNotice('');setQuery('');setFilter('All plans');}}>Reset sample trips</button></details></div>
    {dialog&&<PreviewDialog value={dialog} onClose={()=>setDialog(null)} onUpdate={plan=>{setPlans(list=>list.map(p=>p.id===plan.id?plan:p));setDialog(d=>({...d,plan}));}} onDelete={id=>{setPlans(list=>list.filter(p=>p.id!==id));setNotice('Sample trip removed. Reload to restore all sample trips.');}}/>}
  </main>;
}
