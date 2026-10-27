// Throwaway refinement D: one small whole-trip briefing on the existing canvas.
// Plan details are illustrative. Destination facts link to official tourism sources.
import React, { useEffect, useRef, useState } from 'react';
import './trip-brief-prototype.css';

const cityGuide = 'https://www.visitportugal.com/en/content/lisbon-in-a-day';
const foodGuide = 'https://www.visitportugal.com/en/destinos/lisboa-regiao/196876';
const pastryGuide = 'https://www.visitlisboa.com/en/p/lisbon-flavours/specialties/pastel-de-nata';

function Source({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span><span className="tb-sr"> (opens in a new tab)</span></a>;
}

export function TripBriefPrototype() {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState('ready');
  const root = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => root.current?.scrollIntoView({ block: 'start', behavior: 'instant' }), 200);
    return () => clearTimeout(timer);
  }, []);
  function toggleDetails() {
    if (expanded) {
      setExpanded(false);
      requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
    } else setExpanded(true);
  }
  return <div className="te-prototype tb-prototype" ref={root} data-trip-essentials-prototype>
    <div className="te-preview-label"><span>DESIGN PREVIEW</span><p>Lisbon example · Sample plan details, with linked destination sources.</p></div>
    <section className="tb-card" aria-labelledby="tb-title">
      <header className="tb-heading"><h2 id="tb-title">Your trip, in brief</h2><span>Lisbon</span></header>
      {phase === 'ready' ? <>
        <p className="tb-intro">Food, culture and an unhurried pace shape this Lisbon trip. A quiet base and time to wander matter most, with Belém already on the list and the wider plan still taking shape.</p>
        <ul className="tb-highlights">
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>To explore.</strong> Belém brings together riverfront monuments and museums—a possible focus for a culture-filled afternoon. <Source href={cityGuide}>City guide</Source></p></li>
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>Local flavour.</strong> Fish dishes and pastéis de nata are part of the city’s food story, with plenty of inspiration for café stops. <Source href={foodGuide}>Food guide</Source></p></li>
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>Getting around.</strong> Expect hills. Mixing walks with public transport could suit the relaxed pace of this trip. <Source href={cityGuide}>Explore Lisbon</Source></p></li>
        </ul>
        <div id="tb-more" className="tb-more" hidden={!expanded}>
          <div><h3>The shape of your trip</h3><p>This example brings together a preference for food and culture, a quiet place to stay, and one saved stop: Belém Tower. Flights and accommodation are still open in the sample plan. There’s room for the trip to develop as you find more places you like.</p></div>
          <div><h3>A little more local context</h3><p>Belém’s cultural sights include the Jerónimos Monastery, the Coach Museum and Belém Tower. They offer possibilities for the area; opening times and entry for your travel dates have not been checked. <Source href={cityGuide}>About the area</Source></p><p>A pastel de nata with a bica—the local name for an espresso—is one simple café pairing to try. <Source href={pastryGuide}>Visit Lisboa’s pastry guide</Source></p></div>
          <p className="tb-provenance">Destination context from Visit Portugal and Visit Lisboa. How it fits this trip is an editorial suggestion; the sample plan remains unchanged.</p>
        </div>
        <footer className="tb-footer"><button ref={toggle} type="button" className="tb-disclosure" aria-expanded={expanded} aria-controls="tb-more" onClick={toggleDetails}>{expanded ? 'Show less' : 'Read more'}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={expanded ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'}/></svg></button><span>A little context for the whole trip</span></footer>
      </> : <div className="tb-placeholder" role="status"><p>{phase === 'generating' ? 'Bringing your trip into focus…' : 'Your trip is still taking shape.'}</p><span>{phase === 'generating' ? 'Gathering the useful details into a short summary.' : 'A short summary will appear here once there’s more to bring together.'}</span>{phase === 'generating' && <div className="tb-skeleton" aria-hidden="true"><span/><span/></div>}</div>}
    </section>
    <div className="te-review-controls"><label>Preview state<select value={phase} onChange={event => { setPhase(event.target.value); setExpanded(false); }}><option value="ready">Ready</option><option value="generating">Generating</option><option value="empty">Empty</option></select></label><span>Illustrative briefing · no changes to your plan</span></div>
    <details className="te-state tb-state"><summary>Prototype details</summary><pre>{JSON.stringify({ direction: 'D — Compact briefing', phase, expanded, planContent: 'illustrative', destinationSources: 'official tourism websites', persistence: 'none', modelCalls: 0 }, null, 2)}</pre></details>
  </div>;
}
