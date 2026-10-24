// THROWAWAY: three single-canvas layouts on authenticated /plans?prototype=single-canvas&variant=A|B|C.
// Fictional sample trip and schematic map. All changes stay in component memory.
import React, { useEffect, useState } from 'react';
import './single-canvas-prototype.css';

const names = { A: 'Map-led', B: 'Places-led', C: 'Balanced split' };
const places = [
  { id: 'alfama', name: 'A wander through Alfama', type: 'Neighbourhood', time: 'A slow morning', mark: '01', x: 67, y: 42, symbol: '⌂', tone: 'peach', description: 'Leave room to get a little lost. Steep lanes, tiled façades and small squares make this a lovely place to explore on foot.' },
  { id: 'graca', name: 'Sunset above Graça', type: 'Viewpoint', time: 'An unhurried evening', mark: '02', x: 68, y: 25, symbol: '☀', tone: 'purple', description: 'Keep an evening free for a hilltop view. Pair it with your Alfama wander if you feel like a longer walk.' },
  { id: 'market', name: 'Lunch near the waterfront', type: 'Food & drink', time: 'Whenever you’re hungry', mark: '03', x: 33, y: 65, symbol: '◒', tone: 'green', description: 'A flexible lunch stop near the river. Explore the surrounding streets before choosing somewhere to eat.' },
  { id: 'belem', name: 'A little time in Belém', type: 'Culture', time: 'Half a day', mark: '04', x: 13, y: 72, symbol: '▥', tone: 'sand', description: 'Set aside a slower half-day for the riverfront and architecture. Travel time and opening hours would be checked in the real experience.' },
  { id: 'garden', name: 'Jardim da Estrela', type: 'Garden', time: 'A quiet afternoon', mark: '05', x: 26, y: 31, symbol: '✳', tone: 'green', description: 'An example suggestion for a quieter break under the trees. This preview does not perform live research.' },
];
const initialVariant = () => names[new URLSearchParams(location.search).get('variant')] ? new URLSearchParams(location.search).get('variant') : 'A';

function Map({ ui }) {
  return <section className="sc-map" aria-label="Illustrative Lisbon map">
    <svg className="sc-map-art" viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><pattern id="sc-blocks" width="78" height="63" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="78" height="63" fill="var(--ds-map-land)"/><rect x="8" y="8" width="61" height="46" rx="7" fill="var(--sc-block)"/><path d="M0 0H78M0 0V63" stroke="var(--ds-map-road)" strokeWidth="7"/></pattern></defs>
      <rect width="1000" height="760" fill="url(#sc-blocks)"/>
      <path d="M-80 740 Q250 510 430 590 T1080 430 L1100 850H-80Z" fill="var(--ds-map-water)"/>
      <path d="M-80 731 Q250 501 430 581 T1080 421" stroke="var(--ds-map-road)" fill="none" strokeWidth="14"/>
      <path d="M180 0Q420 260 430 581M0 430Q400 440 730 80M1000 120Q750 530 100 610" stroke="var(--ds-map-road)" strokeWidth="15" fill="none"/>
      <path d="M180 0Q420 260 430 581M0 430Q400 440 730 80" stroke="var(--sc-road-line)" strokeWidth="2" fill="none"/>
      <path d="M180 185L300 153L331 240L233 286L183 250Z M730 77L817 108L792 213L721 197Z M505 305L570 296L591 357L520 375Z" fill="var(--ds-map-park)" stroke="var(--ds-map-road)" strokeWidth="7"/>
      <g className="sc-map-labels"><text x="400" y="330">BAIXA</text><text x="695" y="370">ALFAMA</text><text x="647" y="135">GRAÇA</text><text x="155" y="130">ESTRELA</text><text x="135" y="525">BELÉM</text><text x="275" y="480">CAIS DO SODRÉ</text><text x="640" y="660" className="sc-river">Rio Tejo</text></g>
    </svg>
    <div className="sc-map-top"><span>Lisbon <small>Portugal</small></span><span className="sc-map-key">● {ui.saved.length} places in your draft</span></div>
    {places.filter(p => ui.saved.includes(p.id) || ui.suggestion && p.id === 'garden').map(p => <button key={p.id} className={`sc-pin ${ui.selected === p.id ? 'is-selected' : ''} ${!ui.saved.includes(p.id) ? 'is-suggestion' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, "--sc-pin-fraction": p.x / 100 }} aria-label={`Show ${p.name} on canvas`} aria-pressed={ui.selected === p.id} onClick={() => ui.setSelected(p.id)}>{p.mark}</button>)}
    <span className="sc-map-caption">Illustrative map · positions are schematic</span>
    {ui.selected && <PlaceDetail ui={ui} />}
  </section>;
}

function PlaceDetail({ ui }) {
  const place = places.find(p => p.id === ui.selected);
  return <section className="sc-place-detail" aria-label="Place details"><button className="sc-close" onClick={() => ui.setSelected(null)} aria-label="Close place details">×</button><p className="sc-eyebrow">{place.type} · {ui.saved.includes(place.id) ? 'In your draft' : 'Suggestion'}</p><h3>{place.name}</h3><p>{place.description}</p><div className="sc-detail-bottom"><span>{place.time}</span>{ui.saved.includes(place.id) ? <button onClick={() => { ui.setChat(true); ui.setChatText(`Help me refine ${place.name.toLowerCase()}`); }}>Discuss this place ↗</button> : <button className="sc-primary" onClick={() => ui.add(place.id)}>Add to draft</button>}</div></section>;
}

function PlaceList({ ui, editorial = false }) {
  return <section className={`sc-places ${editorial ? 'sc-editorial' : ''}`} aria-label="Your places">
    <div className="sc-section-heading"><div><p className="sc-eyebrow">ROOM FOR DISCOVERY</p><h2>{editorial ? 'A few good days in Lisbon.' : 'Your places'} <small>{ui.saved.length}</small></h2></div></div>
    {editorial && <p className="sc-editorial-intro">A collection to shape at your own pace. Nothing needs a time slot yet.</p>}
    <div className="sc-list">{places.filter(p => ui.saved.includes(p.id)).map(p => <button className={`sc-place ${ui.selected === p.id ? 'is-selected' : ''}`} key={p.id} onClick={() => ui.setSelected(p.id)}><span className={`sc-place-art sc-tone-${p.tone}`} aria-hidden="true">{p.symbol}</span><span className="sc-place-copy"><small>{p.mark} / {p.type}</small><strong>{p.name}</strong><span>{p.time}</span></span><span className="sc-place-arrow" aria-hidden="true">↗</span></button>)}</div>
    <button className="sc-discover" onClick={() => { ui.setChat(true); ui.suggest(); }}><span>＋</span> Find another place</button>
    {ui.saved.length === 0 && <p className="sc-empty">Your map is ready. Ask for a place that fits your trip.</p>}
  </section>;
}

function Chat({ ui, compact = false }) {
  return <aside className={`sc-chat ${compact ? 'sc-chat-floating' : ''}`} aria-label="Plan chat"><div className="sc-chat-title"><div><span className="sc-agent-icon">✧</span><strong>Plan together</strong></div><button onClick={() => ui.setChat(false)} aria-label="Close plan chat">×</button></div><div className="sc-chat-messages"><p className="sc-eyebrow">TRAVELLA</p><h3>What would make<br/>this trip more you?</h3><p>We can find a new place, rethink a choice, or fill in the details. Your canvas stays right here.</p>{ui.messages.map((message, index) => <p className="sc-user-message" key={index}>{message}</p>)}{ui.suggestion && <div className="sc-suggestion"><p className="sc-eyebrow">SAMPLE SUGGESTION</p><strong>Make room for a quiet afternoon.</strong><p>Jardim da Estrela could give your city days a softer pause.</p><button onClick={() => ui.setSelected('garden')}>View on canvas ↗</button><button className="sc-primary" disabled={ui.saved.includes('garden')} onClick={() => ui.add('garden')}>{ui.saved.includes('garden') ? 'Added to draft ✓' : 'Add garden to draft'}</button></div>}{!ui.suggestion && <button className="sc-prompt" onClick={ui.suggest}>Find a quieter spot ↗</button>}</div><form className="sc-composer" onSubmit={e => { e.preventDefault(); if (ui.chatText.trim()) { ui.setMessages(m => [...m, ui.chatText.trim()]); ui.setChatText(''); ui.suggest(); } }}><label htmlFor="sc-chat-input" className="sr-only">Ask about your trip</label><textarea id="sc-chat-input" value={ui.chatText} onChange={e => ui.setChatText(e.target.value)} placeholder="What are you thinking?" rows="2"/><div><small>Sample replies in this preview</small><button type="submit" aria-label="Send message" disabled={!ui.chatText.trim()}>↑</button></div></form></aside>;
}

function SupportPanel({ ui }) {
  if (!ui.panel) return null;
  return <section className="sc-support" aria-label={ui.panel}><button className="sc-close" onClick={() => ui.setPanel(null)} aria-label="Close supporting details">×</button><p className="sc-eyebrow">YOUR LISBON PLAN</p><h2>{ui.panel}</h2>
    {ui.panel === 'Trip details' ? <form onSubmit={e => { e.preventDefault(); ui.setTrip(ui.editTrip); ui.setDirty(true); ui.setPanel(null); ui.setNotice('Trip details updated in the preview draft.'); }}><label>Dates<input value={ui.editTrip.dates} onChange={e => ui.setEditTrip({ ...ui.editTrip, dates: e.target.value })}/></label><label>Travelers<input value={ui.editTrip.travelers} onChange={e => ui.setEditTrip({ ...ui.editTrip, travelers: e.target.value })}/></label><label>Budget<input value={ui.editTrip.budget} onChange={e => ui.setEditTrip({ ...ui.editTrip, budget: e.target.value })}/></label><p>Apply these exact values to the sample draft.</p><button className="sc-primary">Apply to draft</button></form>
    : ui.panel === 'Preferences' ? <><p>A slower pace, local food and time outdoors.</p><div className="sc-preferences">{['Slow mornings', 'Local food', 'Architecture', 'Green spaces'].map(t => <span key={t}>{t}</span>)}</div><button className="sc-primary" onClick={() => { ui.setPanel(null); ui.setChat(true); ui.setChatText('I’d like to change the pace of this trip'); }}>Refine with chat</button></>
    : ui.panel === 'Notes & sources' ? <><h3>Leave room between places</h3><p>Alfama and Graça can sit together in your plan. Belém is a separate outing.</p><h3>Before you go</h3><p>Check current opening hours and transport options before making commitments.</p><small>Illustrative notes only. A real plan would show the source and freshness beside each claim.</small></>
    : <><p>Travel choices stay alongside your places.</p><div className="sc-travel-row"><span>↗</span><div><strong>Return flights</strong><p>No flight selected</p></div></div><div className="sc-travel-row"><span>⌂</span><div><strong>Somewhere to stay</strong><p>No accommodation selected</p></div></div><button className="sc-primary" onClick={() => { ui.setPanel(null); ui.setChat(true); ui.setChatText('Help me explore where to stay in Lisbon'); }}>Explore with chat</button><p className="sc-footnote">Preview only · no live offers or bookings</p></>}
  </section>;
}

function Tools({ ui }) {
  return <nav className="sc-tools" aria-label="Canvas details">{['Preferences', 'Notes & sources', 'Travel'].map(label => <button key={label} aria-expanded={ui.panel === label} onClick={() => ui.setPanel(ui.panel === label ? null : label)}>{label}<span>＋</span></button>)}</nav>;
}
export function VariantA({ ui }) { return <div className="sc-workspace sc-layout-a"><Map ui={ui}/><div className="sc-map-collection"><PlaceList ui={ui}/><Tools ui={ui}/></div>{ui.chat && <Chat ui={ui} compact/>}<SupportPanel ui={ui}/></div>; }
export function VariantB({ ui }) { return <div className="sc-workspace sc-layout-b"><div className="sc-collection"><PlaceList ui={ui} editorial/><Tools ui={ui}/></div><div className="sc-map-column"><Map ui={ui}/><div className="sc-map-note"><span>↗</span><div><strong>See how your places fit together.</strong><p>Select a place to explore it here. There’s no fixed itinerary yet.</p></div></div></div>{ui.chat && <Chat ui={ui} compact/>}<SupportPanel ui={ui}/></div>; }
export function VariantC({ ui }) { return <div className={`sc-workspace sc-layout-c ${ui.chat ? 'with-chat' : ''}`}><div className="sc-collection"><PlaceList ui={ui}/><Tools ui={ui}/></div><Map ui={ui}/>{ui.chat && <Chat ui={ui}/>}<SupportPanel ui={ui}/></div>; }

export function SingleCanvasPrototype() {
  const [variant, setVariant] = useState(initialVariant);
  const [saved, setSaved] = useState(['alfama','graca','market','belem']);
  const [selected, setSelected] = useState(null);
  const [chat, setChat] = useState(false);
  const [panel, setPanel] = useState(null);
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState([]);
  const [suggestion, setSuggestion] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [trip, setTrip] = useState({ dates: '12–16 November', travelers: '2 adults', budget: '€1,800 total' });
  const [editTrip, setEditTrip] = useState(trip);
  function choose(value) { const url = new URL(location.href); url.searchParams.set('variant',value); history.replaceState(history.state,'',url); setVariant(value); setSelected(null); setPanel(null); setChat(value === 'C' && window.innerWidth > 850); }
  function cycle(delta) { choose('ABC'[('ABC'.indexOf(variant)+delta+3)%3]); }
  useEffect(() => { setChat(initialVariant() === 'C' && window.innerWidth > 850); }, []);
  useEffect(() => { const key = e => { if (e.target.closest('input,textarea,select,[contenteditable="true"]')) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); cycle(e.key === 'ArrowRight' ? 1 : -1); } if (e.key === 'Escape') { setPanel(null); setSelected(null); setChat(false); } }; const pop = () => setVariant(initialVariant()); window.addEventListener('keydown', key); window.addEventListener('popstate',pop); return () => { window.removeEventListener('keydown',key); window.removeEventListener('popstate',pop); }; }, [variant]);
  const ui = { saved,setSaved,selected,setSelected: id => { setSelected(id); if (id && (variant !== 'C' || window.innerWidth <= 850)) setChat(false); if (id && window.innerWidth <= 600) requestAnimationFrame(() => document.querySelector('.sc-map')?.scrollIntoView({ block: 'start' })); },chat,setChat,panel,setPanel,chatText,setChatText,messages,setMessages,suggestion,setSuggestion,dirty,setDirty,notice,setNotice,trip,setTrip,editTrip,setEditTrip,
    suggest: () => { setSuggestion(true); setNotice('Sample suggestion ready. Choose whether to add it.'); },
    add: id => { if (!saved.includes(id)) { setSaved([...saved,id]); setDirty(true); setNotice('Added to the sample draft. Choose Save plan to simulate saving.'); } },
  };
  const Layout = { A: VariantA, B: VariantB, C: VariantC }[variant];
  return <main id="plans-main" className={`sc-prototype sc-variant-${variant}`}><div className="sc-preview-note"><span>DESIGN PREVIEW</span> Sample Lisbon trip · simulated edits · nothing changes your saved Plans</div><header className="sc-trip-header"><div className="sc-trip-title"><span className="sc-destination-icon" aria-hidden="true">L</span><div><p className="sc-eyebrow">LISBON, PORTUGAL</p><h1>A little time in Lisbon</h1></div></div><button className="sc-trip-summary" onClick={() => { setEditTrip(trip); setPanel(panel === 'Trip details' ? null : 'Trip details'); }} aria-label="Edit trip details"><span>{trip.dates}</span><span>{trip.travelers}</span><span>{trip.budget}</span><span aria-hidden="true">⌄</span></button><div className="sc-trip-actions"><span className="sc-save-state">{dirty ? 'Unsaved changes' : 'Saved in preview'}</span><button className="sc-save sc-primary" disabled={!dirty} onClick={() => { setDirty(false); setNotice('Saved in this preview only. Reload resets the sample.'); }}>Save plan</button><button className={`sc-chat-toggle ${chat ? 'is-active' : ''}`} aria-expanded={chat} onClick={() => { setChat(!chat); setPanel(null); }}>✧ Chat</button></div></header><Layout ui={ui}/><div className="sc-feedback" role="status">{notice}</div><nav className="sc-switcher" aria-label="Prototype layouts"><span className="sc-switcher-label">LAYOUT</span><button onClick={() => cycle(-1)} aria-label="Previous layout">←</button>{Object.entries(names).map(([key,name]) => <button key={key} onClick={() => choose(key)} aria-pressed={variant===key}><b>{key}</b><span>{name}</span></button>)}<button onClick={() => cycle(1)} aria-label="Next layout">→</button><details className="sc-state"><summary>State</summary><pre>{JSON.stringify({variant,selected,panel,chat,trip,draftPlaces:saved,suggestion,dirty,persistence:'none',map:'schematic',chatReplies:'simulated'},null,2)}</pre><button onClick={() => { setSaved([]); setDirty(true); setSelected(null); setSuggestion(false); setNotice('Empty draft preview.'); }}>Try empty draft</button></details></nav></main>;
}
