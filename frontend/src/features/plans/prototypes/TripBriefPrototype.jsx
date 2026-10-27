// Throwaway refinement D: one small whole-trip briefing on the existing canvas.
// Plan details are illustrative. Resources are selected for this sample trip.
import React, { useEffect, useRef, useState } from 'react';
import './trip-brief-prototype.css';

const cityGuide = 'https://www.visitportugal.com/en/content/lisbon-in-a-day';
const foodGuide = 'https://www.visitportugal.com/en/destinos/lisboa-regiao/196876';
const museumVisit = 'https://www.mncoches.gov.pt/en/visita';
const metroGuide = 'https://www.metrolisboa.pt/en/travel/using-the-metro/';
const busPlanner = 'https://www.carris.pt/en/travel/planear-viagem/';

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
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>To explore.</strong> The Coach Museum in Belém could fit your interest in culture alongside the place you’ve saved. <Source href={museumVisit}>Visitor information</Source></p></li>
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>Local flavour.</strong> Fish dishes and pastéis de nata are part of the city’s food story, with plenty of inspiration for café stops. <Source href={foodGuide}>Food guide</Source></p></li>
          <li><span className="tb-dot" aria-hidden="true"/><p><strong>Getting around.</strong> Mix walks with public transport at your own pace. The Metro’s guide explains tickets and using the network. <Source href={metroGuide}>Metro guide</Source></p></li>
        </ul>
        <div id="tb-more" className="tb-more" hidden={!expanded}>
          <div><h3>The shape of your trip</h3><p>This example brings together a preference for food and culture, a quiet place to stay, and one saved stop: Belém Tower. Flights and accommodation are still open in the sample plan. There’s room for the trip to develop as you find more places you like.</p></div>
          <div><h3>A little more local context</h3><p>Belém’s cultural sights include the Jerónimos Monastery, the Coach Museum and Belém Tower. They offer possibilities for the area; opening times and entry for your travel dates have not been checked. <Source href={cityGuide}>About the area</Source></p><p>For your Belém plans, use CARRIS to look up bus and tram journeys from your eventual base. Its planner accepts your origin, destination, date and time. <Source href={busPlanner}>Plan a bus or tram journey</Source></p></div>
          <p className="tb-provenance">Official tourism, transport and attraction sources, selected for this sample trip. Suggestions aren’t saved places; routes and availability for your dates still need checking.</p>
        </div>
        <footer className="tb-footer"><button ref={toggle} type="button" className="tb-disclosure" aria-expanded={expanded} aria-controls="tb-more" onClick={toggleDetails}>{expanded ? 'Show less' : 'Read more'}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={expanded ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'}/></svg></button><span>A little context for the whole trip</span></footer>
      </> : <div className="tb-placeholder" role="status"><p>{phase === 'generating' ? 'Bringing your trip into focus…' : 'Your trip is still taking shape.'}</p><span>{phase === 'generating' ? 'Gathering the useful details into a short summary.' : 'A short summary will appear here once there’s more to bring together.'}</span>{phase === 'generating' && <div className="tb-skeleton" aria-hidden="true"><span/><span/></div>}</div>}
    </section>
    <div className="te-review-controls"><label>Preview state<select value={phase} onChange={event => { setPhase(event.target.value); setExpanded(false); }}><option value="ready">Ready</option><option value="generating">Generating</option><option value="empty">Empty</option></select></label><span>Illustrative briefing · no changes to your plan</span></div>
    <details className="te-state tb-state"><summary>Prototype details</summary><pre>{JSON.stringify({ direction: 'D — Compact briefing', phase, expanded, planContent: 'illustrative', destinationSources: 'official tourism, transport and attraction websites', sourceSelection: 'manually tailored to sample food/culture brief and saved Belém stop', persistence: 'none', modelCalls: 0 }, null, 2)}</pre></details>
  </div>;
}
