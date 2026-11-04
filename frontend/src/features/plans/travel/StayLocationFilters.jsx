import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasDestinationMap, CanvasMapContext } from '../components/CanvasDestinationMap';
import { StayDestination } from './StayDestination';
import { travelRequest } from './travelApi';
import { emptyStayLocation, hasCoordinates, locationSummary, togglePlace } from './stayLocation';
import './stay-location.css';

const categoryNames = { activity: 'Activities', food: 'Food & drink', other: 'Other places', stay: 'Saved stays', airport: 'Airports' };
export function StayLocationFilters({ value = emptyStayLocation(), onChange, places = [], hotels = [], mentions = [], destination, country, planId, active, loading, dirty, onApply, onExpired }) {
  const [query, setQuery] = useState(''), [inspected, setInspected] = useState(null);
  const [showMentions, setShowMentions] = useState(false), [showHotels, setShowHotels] = useState(true);
  const [lookupError, setLookupError] = useState(''), [resolving, setResolving] = useState(false);
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), [planId, country, active]);
  const ids = value.saved_place_ids;
  const groups = Object.entries(categoryNames).map(([key, label]) => ({ key, label, items: places.filter(p => p.category === key) })).filter(g => g.items.length);
  const selected = places.filter(p => ids.includes(p.id)).map(p => ({ id: p.id, name: p.name, latitude: p.position?.lat ?? null, longitude: p.position?.lng ?? null, source: 'saved_place', category: p.category }));
  const references = value.anchors.filter(a => a.source === 'provider_place' && value.reference_place_ids.includes(a.id));
  const layers = useMemo(() => {
    const map = new Map();
    for (const place of selected.concat(references)) map.set(`place-${place.id}`, { ...place, mapId: `place-${place.id}`, layer: 'Selected place' });
    if (showMentions) for (const mention of mentions) {
      const saved = mention.source === 'saved_place' ? places.find(p => p.id === mention.id) : null;
      if (mention.source === 'saved_place' && !saved) continue;
      const place = saved ? { ...mention, name: saved.name, latitude: saved.position?.lat ?? null, longitude: saved.position?.lng ?? null, category: saved.category } : mention;
      if (!map.has(`place-${place.id}`)) map.set(`place-${place.id}`, { ...place, mapId: `place-${place.id}`, layer: 'Mentioned in chat' });
    }
    if (showHotels) for (const hotel of hotels) map.set(`hotel-${hotel.id}`, { ...hotel, mapId: `hotel-${hotel.id}`, layer: 'Hotel', category: 'stay' });
    return [...map.values()];
  }, [JSON.stringify(selected), JSON.stringify(references), mentions, places, hotels, showMentions, showHotels]);
  const pins = useMemo(() => layers.filter(hasCoordinates).map(p => ({ id: p.mapId, name: `${p.layer}: ${p.name}`, category: p.category || 'activity', position: { lat: p.latitude, lng: p.longitude } })), [layers]);
  const detail = layers.find(p => p.mapId === inspected);
  const count = ids.length + value.reference_place_ids.length;
  const missing = ids.filter(id => !places.some(p => p.id === id));
  function toggle(id) { onChange(togglePlace(value, 'saved_place_ids', id)); }
  function toggleReference(id) {
    if (!value.reference_place_ids.includes(id) && value.reference_place_ids.length >= 3) { setLookupError('Remove a reference before adding another.'); return; }
    const mention = mentions.find(p => p.id === id && p.source === 'provider_place');
    const next = togglePlace(value, 'reference_place_ids', id);
    onChange({ ...next, anchors: !next.reference_place_ids.includes(id) ? value.anchors.filter(a => a.id !== id) : mention && !value.anchors.some(a => a.id === id) ? [...value.anchors, mention] : value.anchors });
  }
  async function addReference(place) {
    if (!place || value.reference_place_ids.includes(place.place_id)) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setResolving(true); setLookupError('');
    try {
      const response = await travelRequest(planId, 'places/detail', { place_id: place.place_id }, controller.signal);
      if (controller.signal.aborted) return;
      if (!hasCoordinates(response.place)) throw new Error('No coordinates');
      onChange(previous => { const current = previous || emptyStayLocation(); return { ...current, reference_place_ids: [...new Set([...current.reference_place_ids, place.place_id])].slice(0, 3), anchors: [...current.anchors.filter(a => a.id !== place.place_id), response.place] }; });
      setQuery('');
    } catch (error) { if (controller.signal.aborted) return; setLookupError('This reference could not be located. Choose another place or retry.'); if (error.status === 401) onExpired?.(); }
    finally { if (pending.current === controller) setResolving(false); }
  }
  return <section className="stay-location" aria-label="Hotel location preferences">
    <div className="stay-location-heading"><h3>Stay near what matters</h3>{count > 0 && <button type="button" className="ds-text-button" onClick={() => onChange(emptyStayLocation())}>Clear places</button>}</div>
    <section className="stay-location-map" aria-label="Accommodation area map"><h4>Your places & stays</h4>{dirty && hotels.length > 0 && <small>Draft places with your previous search results.</small>}
      <div className="stay-map-layers"><label><input type="checkbox" checked={showHotels} onChange={e => setShowHotels(e.target.checked)}/>Hotels</label>{mentions.length > 0 && <label><input type="checkbox" checked={showMentions} onChange={e => setShowMentions(e.target.checked)}/>Mentioned in chat ({mentions.length})</label>}</div>
      <CanvasMapContext.Provider value={{}}><CanvasDestinationMap destination={destination} final places={pins} selectedId={inspected} onSelect={setInspected} active={active}/></CanvasMapContext.Provider>
      <details><summary>Inspect map places ({layers.length})</summary>{layers.map(p => <button type="button" key={p.mapId} className="ds-text-button stay-map-list-item" onClick={() => setInspected(p.mapId)}>{p.name} · {p.layer}{!hasCoordinates(p) && ' · location unavailable'}</button>)}</details>
      {detail && <div className="stay-map-detail"><strong>{detail.name}</strong><small>{detail.layer}{!hasCoordinates(detail) && ' · location unavailable'}</small>{detail.layer === 'Hotel' ? <p>{locationSummary(detail)}</p> : <button type="button" className="ds-text-button" onClick={() => detail.source === 'saved_place' ? toggle(detail.id) : toggleReference(detail.id)}>{(detail.source === 'saved_place' ? ids : value.reference_place_ids).includes(detail.id) ? 'Remove from search' : 'Include in search'}</button>}<button type="button" className="ds-text-button" onClick={() => setInspected(null)}>Close place details</button></div>}
    </section>
    <p>Choose any mix of places, or select a whole category.</p>
    <details open><summary>Your saved places {count > 0 && `· ${count} selected`}</summary>
      {!places.length && <p>No saved places yet. Choose a landmark below, or save activities to your Plan.</p>}
      {groups.map(group => <fieldset key={group.key}><legend><label><input type="checkbox" checked={group.items.every(p => ids.includes(p.id))} onChange={event => onChange({ ...value, saved_place_ids: event.target.checked ? [...new Set([...ids, ...group.items.map(p => p.id)])] : ids.filter(id => !group.items.some(p => p.id === id)) })}/>{group.label}</label></legend>
        {group.items.map(place => <label className="stay-location-place" key={place.id}><input type="checkbox" checked={ids.includes(place.id)} onChange={() => toggle(place.id)}/><span>{place.name}</span></label>)}
      </fieldset>)}
      {missing.map(id => <p key={id}>A selected place was removed. <button type="button" onClick={() => toggle(id)}>Remove unavailable place</button></p>)}
    </details>
    <details><summary>City center, landmark or neighborhood</summary><p>Choose a named reference point. Neighborhood distances are measured from that point.</p>
      <StayDestination query={query} setQuery={setQuery} value={null} onChange={addReference} country={country} planId={planId} active={active && value.reference_place_ids.length < 3 && !resolving} onExpired={onExpired} scope="reference" label="Find a location reference"/>
      {resolving && <p role="status">Locating reference…</p>}{lookupError && <p role="alert">{lookupError}</p>}
      {value.reference_place_ids.length >= 3 && <p>Up to three additional references per search.</p>}
    </details>
    {references.length > 0 && <ul className="stay-location-references">{references.map(p => <li key={p.id}>{p.name}<button type="button" className="ds-text-button" aria-label={`Remove ${p.name}`} onClick={() => toggleReference(p.id)}>×</button></li>)}</ul>}
    {count > 0 && <><label>Location preference<select value={value.matching} onChange={e => onChange({ ...value, matching: e.target.value })}><option value="prefer_nearby">Prefer nearby overall</option><option value="within_each">Within distance of every place</option></select></label>
      {value.matching === 'within_each' && <label>Maximum distance to each place<select value={value.radius_m} onChange={e => onChange({ ...value, radius_m: Number(e.target.value) })}>{[...new Set([500,1000,2000,5000,10000,20000,50000,value.radius_m])].sort((a,b) => a-b).map(m => <option key={m} value={m}>{m < 1000 ? `${m} m` : `${m/1000} km`}</option>)}</select></label>}
      <p>{value.matching === 'within_each' ? 'Every selected place must be within your limit.' : 'Ranks available hotels by average distance. Each selected place counts equally.'} Straight-line distances, not travel times.</p></>}
    <button type="button" className="ds-button primary" disabled={loading || resolving || !!missing.length} onClick={onApply}>{loading ? 'Searching…' : 'Apply location & search'}</button>
    {dirty && <small>Changes apply when you search.</small>}

  </section>;
}
