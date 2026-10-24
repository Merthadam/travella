import React, { useEffect, useRef, useState } from 'react';
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../../lib/googleMaps';
import './destination-photo.css';

function safeLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export async function loadDestinationPhoto(destination) {
  const { libraries } = await loadGoogleMaps({ libraries: ['geocoding', 'places'] });
  const geocoder = new libraries.geocoding.Geocoder();
  let { results = [] } = await geocoder.geocode({ address: destination });
  // An island and its municipality can share a name. Add only country context
  // agreed by every exact result, then require an unambiguous provider match.
  if (results.length > 1 && results.every(result => !result.partial_match)) {
    const countries = results.map(result => result.address_components?.find(part => part.types.includes('country'))?.long_name);
    if (countries[0] && countries.every(country => country === countries[0]) && !destination.toLocaleLowerCase().includes(countries[0].toLocaleLowerCase())) {
      ({ results = [] } = await geocoder.geocode({ address: `${destination}, ${countries[0]}` }));
    }
  }
  if (results.length !== 1 || results[0].partial_match || !results[0].place_id) return null;
  const place = new libraries.places.Place({ id: results[0].place_id });
  await place.fetchFields({ fields: ['photos', 'displayName'] });
  const photo = place.photos?.[0];
  return photo ? { uri: photo.getURI({ maxWidth: 1000, maxHeight: 800 }), authors: photo.authorAttributions || [], name: place.displayName || destination } : null;
}

// Provider photo objects and URLs live only for this mounted destination.
export function DestinationPhoto({ destination, generated, className = '' }) {
  const host = useRef(null), pending = useRef(null);
  const [visible, setVisible] = useState(false), [result, setResult] = useState(null);
  const eligible = Boolean(generated && destination);
  const current = result?.destination === destination ? result : null;
  useEffect(() => {
    if (!eligible || visible || !host.current) return;
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '100px' });
    observer.observe(host.current); return () => observer.disconnect();
  }, [eligible, visible]);
  useEffect(() => {
    if (!eligible || !visible) return;
    let alive = true;
    setResult(null);
    if (!getGoogleMapsApiKey()) { setResult({ destination, photo: null }); return; }
    const timer = setTimeout(() => { alive = false; setResult({ destination, photo: null }); }, 12000);
    if (pending.current?.destination !== destination) pending.current = { destination, promise: loadDestinationPhoto(destination).catch(() => null) };
    pending.current.promise.then(photo => { if (alive) { clearTimeout(timer); setResult({ destination, photo }); } });
    return () => { alive = false; clearTimeout(timer); };
  }, [eligible, destination, visible]);
  const photo = eligible && current?.photo;
  const loading = eligible && !current;
  return <figure ref={host} className={`destination-photo ${className}`} data-photo-state={!generated ? 'research' : photo ? 'ready' : loading ? 'loading' : 'unavailable'}>
    {photo ? <><img src={photo.uri} alt={`Destination photo of ${photo.name}`} onError={() => setResult({ destination, photo: null })}/><figcaption><span>Google Maps</span>{photo.authors.map((author, i) => <span key={i}>{safeLink(author.uri) ? <a href={safeLink(author.uri)} target="_blank" rel="noopener noreferrer">{author.displayName || 'Photo contributor'}</a> : author.displayName || 'Photo contributor'}</span>)}</figcaption></> : <div className="destination-photo-placeholder"><svg viewBox="0 0 60 60" aria-hidden="true"><path d="m10 17 13-5 14 6 13-5v31l-13 5-14-6-13 5Zm13-5v31m14-25v31"/><circle cx="30" cy="29" r="4"/></svg><strong>{!generated ? 'A journey taking shape' : loading ? 'Finding your destination photo…' : 'A place to look forward to'}</strong><span>{!generated ? 'A destination photo appears once your plan is generated and saved.' : loading ? destination : 'A destination photo isn’t available yet.'}</span></div>}
  </figure>;
}
