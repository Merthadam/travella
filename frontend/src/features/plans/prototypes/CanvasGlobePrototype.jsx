// THROWAWAY: three loading layouts on the authenticated /plans route.
// ?prototype=canvas-globe&variant=A|B|C. Counts/events are simulated; no Plan writes.
import React, { useEffect, useState } from 'react';
import './canvas-globe-prototype.css';

const variants = { A: 'Quiet canvas', B: 'Full focus', C: 'Visible progress' };
const sampleItems = ['Alfama lanes', 'A riverside walk', 'A morning in Belém', 'A local food stop', 'A sunset viewpoint', 'A museum afternoon', 'A garden escape', 'A rainy-day idea', 'Getting around', 'Useful local links', 'Neighbourhood notes', 'Your destination map'];
const readVariant = () => Object.hasOwn(variants, new URLSearchParams(location.search).get('variant')) ? new URLSearchParams(location.search).get('variant') : 'A';

function Globe({ large = false }) {
  return <div className={`cg-globe ${large ? 'cg-globe-large' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="81" className="cg-sphere" />
      <g className="cg-latitudes"><ellipse cx="100" cy="100" rx="81" ry="25" /><path d="M33 55 Q100 86 167 55 M33 145 Q100 114 167 145" /><path d="M19 100H181" /></g>
      <g className="cg-longitude cg-longitude-one"><ellipse cx="100" cy="100" rx="61" ry="81" /></g>
      <g className="cg-longitude cg-longitude-two"><ellipse cx="100" cy="100" rx="61" ry="81" /></g>
      <path className="cg-axis" d="M100 19V181" />
      <circle cx="139" cy="66" r="8" className="cg-location-halo" /><circle cx="139" cy="66" r="3.5" className="cg-location" />
    </svg>
  </div>;
}

function Counter({ count, prominent = false }) {
  return <div className={`cg-counter ${prominent ? 'cg-counter-prominent' : ''}`} aria-live="polite" aria-atomic="true"><span key={count} className="cg-count">{count.toString().padStart(2, '0')}</span><span>items ready</span></div>;
}

function Cancel({ onCancel }) { return <button className="cg-cancel" onClick={onCancel}>Cancel generation <span aria-hidden="true">↗</span></button>; }

export function VariantA({ count, onCancel }) {
  return <section className="cg-loading cg-variant-a" aria-label="Building your Lisbon plan" aria-busy="true">
    <div className="cg-centered"><Globe /><p className="cg-eyebrow">A LITTLE LISBON, ALL YOURS</p><h2>Building your<br />Lisbon plan<span className="cg-ellipsis">…</span></h2><p className="cg-description">Bringing the details together.</p><Counter count={count} /><p className="cg-unlock-note">Your canvas will open when everything is ready.</p><Cancel onCancel={onCancel} /></div>
  </section>;
}

export function VariantB({ count, onCancel }) {
  return <section className="cg-loading cg-variant-b" aria-label="Building your Lisbon plan" aria-busy="true">
    <div className="cg-focus-meta"><span>YOUR NEXT CHAPTER</span><span>Lisbon, Portugal <i>↗</i></span></div>
    <div className="cg-focus-content"><div className="cg-focus-globe"><Globe large /><span className="cg-coordinate">38.72° N &nbsp; 9.14° W</span></div><div className="cg-focus-copy"><p className="cg-eyebrow">FROM AN IDEA TO YOUR ITINERARY</p><h2>Lisbon is<br />taking shape.</h2><p className="cg-description">Building your Lisbon plan…</p><Counter count={count} prominent /><p className="cg-unlock-note">Everything opens together, when it’s ready.</p></div></div>
    <div className="cg-focus-footer"><span><i className="cg-live-dot" />Putting your plan together</span><Cancel onCancel={onCancel} /></div>
  </section>;
}

export function VariantC({ count, onCancel }) {
  const groups = [{ name: 'Places & experiences', total: 8, ready: Math.min(count, 8) }, { name: 'Local know-how', total: 3, ready: Math.max(0, Math.min(count - 8, 3)) }, { name: 'Destination map', total: 1, ready: Math.max(0, count - 11) }];
  return <section className="cg-loading cg-variant-c" aria-label="Building your Lisbon plan" aria-busy="true">
    <div className="cg-split-title"><p className="cg-eyebrow">YOUR LISBON PLAN</p><h2>A few things<br />coming together.</h2><p className="cg-description">Building your Lisbon plan…</p></div>
    <div className="cg-split-progress"><div className="cg-split-globe"><Globe /><Counter count={count} prominent /></div><div className="cg-receipts" aria-label="Completed item groups"><p className="cg-eyebrow">READY SO FAR</p>{groups.map(group => <div className="cg-receipt" key={group.name}><span className={group.ready === group.total ? 'cg-check cg-checked' : 'cg-check'} aria-hidden="true">{group.ready === group.total ? '✓' : '·'}</span><span>{group.name}</span><b>{group.ready || '—'}</b></div>)}<p>These are coming together behind the scenes.<br />You can explore them when the canvas opens.</p></div></div>
    <div className="cg-split-footer"><span><i className="cg-live-dot" />{count < 8 ? 'Adding places and experiences' : count < 11 ? 'Gathering local know-how' : 'Preparing the destination map'}</span><Cancel onCancel={onCancel} /></div>
  </section>;
}

function SampleCanvas({ background = false, onOpen }) {
  return <div className={`cg-sample-canvas ${background ? 'cg-sample-background' : ''}`} inert={background ? true : undefined} aria-hidden={background || undefined}>
    <div className="cg-ready-heading"><p className="cg-eyebrow">{background ? 'YOUR EXISTING PLAN' : 'READY TO EXPLORE'}</p><h2>A little time in Lisbon.</h2><p>{background ? 'Your saved canvas stays here while the new version is built.' : 'Your canvas is ready. Start wherever curiosity takes you.'}</p></div>
    <div className="cg-sample-grid">{['Explore the city', 'Make yourself at home', 'A little local know-how'].map((title, index) => <button key={title} className="cg-sample-card" onClick={() => onOpen?.(title)}><div className={`cg-card-art cg-card-art-${index}`}><span>{['↗', '⌂', '✳'][index]}</span></div><small>{['PLACES & EXPERIENCES', 'NEIGHBOURHOODS', 'GOOD TO KNOW'][index]}</small><h3>{title}</h3><p>{['Winding lanes, waterside walks, and a view worth the climb.', 'Find your rhythm in the neighbourhoods of Lisbon.', 'Small details to help your days feel effortless.'][index]}</p><span className="cg-card-link">Explore <span>↗</span></span></button>)}</div>
    <p className="cg-sample-disclaimer">Sample canvas for this prototype. Nothing has been saved.</p>
  </div>;
}

function PrototypeSwitcher({ variant, cycle }) {
  return <nav className="cg-switcher" aria-label="Prototype variants"><span className="cg-switcher-tag">PROTOTYPE</span><button onClick={() => cycle(-1)} aria-label="Previous variant">←</button><span><b>{variant}</b> {variants[variant]}</span><button onClick={() => cycle(1)} aria-label="Next variant">→</button><small>{'ABC'.indexOf(variant) + 1} / 3</small></nav>;
}

export function CanvasGlobePrototype() {
  const [variant, setVariant] = useState(readVariant);
  const [count, setCount] = useState(4);
  const [status, setStatus] = useState('generating');
  const [playing, setPlaying] = useState(false);
  const [regenerate, setRegenerate] = useState(false);
  const [still, setStill] = useState(false);
  const [detail, setDetail] = useState(null);
  function reset() { setCount(0); setStatus('generating'); setPlaying(false); setDetail(null); }
  function finish() { setCount(sampleItems.length); setStatus('complete'); setPlaying(false); }
  function addItem() { setCount(value => Math.min(value + 1, sampleItems.length)); }
  function cycle(direction) {
    setVariant(current => {
      const next = 'ABC'[('ABC'.indexOf(current) + direction + 3) % 3];
      const url = new URL(location.href); url.searchParams.set('variant', next); history.replaceState(history.state, '', url); return next;
    });
  }
  useEffect(() => {
    const key = event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
    };
    const pop = () => setVariant(readVariant());
    window.addEventListener('keydown', key); window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('popstate', pop); };
  }, []);
  useEffect(() => { if (count >= sampleItems.length && status === 'generating') finish(); }, [count, status]);
  useEffect(() => {
    if (!playing || status !== 'generating') return;
    const timer = setInterval(addItem, 1600); return () => clearInterval(timer);
  }, [playing, status]);
  const cancel = () => { setPlaying(false); setStatus('cancelled'); };
  const loading = status === 'generating';
  const Variant = { A: VariantA, B: VariantB, C: VariantC }[variant];
  return <main id="plans-main" className={`cg-prototype cg-layout-${variant} ${still ? 'cg-still' : ''}`}>
    <div className="cg-demo-tools" aria-label="Prototype simulation controls"><div className="cg-demo-caption"><b>DESIGN PREVIEW</b><span>Simulated progress · no Plan changes</span></div><div className="cg-demo-actions"><button onClick={() => setPlaying(value => !value)} disabled={!loading}>{playing ? 'Pause demo' : 'Run demo'}</button><button onClick={addItem} disabled={!loading}>+1 item</button><button onClick={finish} disabled={!loading}>Finish</button><button onClick={reset}>Replay</button><button onClick={() => { setStatus('error'); setPlaying(false); }} disabled={!loading}>Simulate error</button></div><div className="cg-demo-options"><label><input type="checkbox" checked={regenerate} onChange={e => setRegenerate(e.target.checked)} />Regeneration</label><label><input type="checkbox" checked={still} onChange={e => setStill(e.target.checked)} />Reduced motion</label></div></div>
    <div className="cg-trip-bar"><div><span className="cg-trip-icon">↗</span><span><b>Lisbon, at your pace</b><small>Lisbon, Portugal · Destination confirmed</small></span></div><span className="cg-trip-status">{loading ? 'Building your canvas' : status === 'complete' ? 'Canvas ready' : 'Generation paused'}</span></div>
    <div className="cg-workspace">
      <aside className="cg-chat" aria-label="Sample planning conversation"><div className="cg-chat-title"><span>Conversation</span><span aria-hidden="true">↙</span></div><div className="cg-chat-history"><p className="cg-chat-date">YOUR TRIP, TAKING SHAPE</p><div className="cg-chat-user">Lisbon it is. A few days of good food, neighbourhood walks, and time to slow down.</div><div className="cg-chat-answer"><span className="cg-agent-mark">✳</span><p>Lisbon is confirmed. I’ll bring your ideas together into a canvas you can explore and edit.</p></div><div className="cg-chat-confirm"><span>✓</span><div><b>Ready to build</b><small>Lisbon · food & culture · relaxed pace</small></div></div><p className="cg-chat-footnote">Your destination is set. Now the details can fall into place.</p></div><div className="cg-chat-composer"><span>{loading ? 'Your plan is being built…' : 'Keep shaping your trip…'}</span><span aria-hidden="true">↑</span></div><small className="cg-chat-preview-note">Sample conversation</small></aside>
      <div className="cg-canvas-region">
        <div className="cg-canvas-top"><span>Planning canvas</span><span>{regenerate ? 'Updating your plan' : 'Your ideas, all in one place'}</span></div>
        <div className="cg-stage">
          {loading && regenerate && <SampleCanvas background />}
          {loading ? <Variant count={count} onCancel={cancel} /> : status === 'complete' ? <SampleCanvas onOpen={setDetail} /> : <section className="cg-stopped"><Globe /><p className="cg-eyebrow">{status === 'error' ? 'A SMALL PAUSE' : 'YOU’RE IN CONTROL'}</p><h2>{status === 'error' ? 'Let’s try that again.' : 'Generation cancelled.'}</h2><p>{status === 'error' ? 'We couldn’t finish your canvas. Your destination is still Lisbon.' : 'Your destination is still Lisbon. Build your canvas whenever you’re ready.'}</p>{regenerate && <p>Your existing plan is unchanged.</p>}<button className="cg-retry" onClick={() => { reset(); setPlaying(true); }}>{status === 'error' ? 'Try again' : 'Build my plan'}</button></section>}
        </div>
      </div>
    </div>
    <div className="cg-state" role="status">Simulated · {variants[variant]} · {status} · {count} items ready · {playing ? 'running' : 'paused'} · {regenerate ? 'regeneration' : 'first generation'} · {still ? 'reduced motion' : 'system motion'}</div>
    {detail && <div className="cg-detail-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="cg-detail-title"><p className="cg-eyebrow">INTERACTION PREVIEW</p><h2 id="cg-detail-title">{detail}</h2><p>This card is now interactive. In the real canvas, this opens your plan’s details.</p><p>Prototype only. No data has been saved.</p><button autoFocus className="cg-retry" onClick={() => setDetail(null)}>Back to canvas</button></section></div>}
    {import.meta.env.DEV && <PrototypeSwitcher variant={variant} cycle={cycle} />}
  </main>;
}
