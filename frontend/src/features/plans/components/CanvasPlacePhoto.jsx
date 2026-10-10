import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../lib/googleMaps';

const providerPin = /^google_[a-f0-9]{32}$/;

// Saved pins retain the connector's hash of the Google Place ID. Resolve that
// exact identity, never a similarly named search result. Photos stay ephemeral.
export async function loadSavedPlacePhoto(place, destination) {
  if (!providerPin.test(place.id)) return null;
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  const { places = [] } = await libraries.places.Place.searchByText({
    textQuery: `${place.name}${destination ? ` in ${destination}` : ''}`,
    locationBias: { center: place.position, radius: 1000 },
    fields: ['id', 'photos'], maxResultCount: 5,
  });
  for (const candidate of places) {
    if (!candidate.id) continue;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate.id));
    const id = 'google_' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
    if (id !== place.id) continue;
    const photo = candidate.photos?.[0];
    return photo ? { uri: photo.getURI({ maxWidth: 240, maxHeight: 192 }), authors: photo.authorAttributions || [] } : null;
  }
  return null;
}

function safeLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

export function CanvasPlacePhoto({ place, destination, active }) {
  const host = useRef(null);
  const pending = useRef(null);
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState({ loading: true, photo: null });
  const key = JSON.stringify([place.id, place.name, destination, place.position.lat, place.position.lng]);
  const eligible = providerPin.test(place.id);

  useEffect(() => {
    if (!active || visible || !eligible || !host.current) return;
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [active, visible, eligible]);

  useEffect(() => {
    if (!visible || !eligible) return;
    let alive = true;
    setResult({ loading: true, photo: null });
    if (pending.current?.key !== key) pending.current = { key, promise: loadSavedPlacePhoto(place, destination).catch(() => null) };
    pending.current.promise.then(photo => { if (alive) setResult({ loading: false, photo }); });
    return () => { alive = false; };
  }, [visible, eligible, key]);

  if (!eligible || (!result.loading && !result.photo)) return null;
  const photo = result.photo;
  return <figure ref={host} className="places-photo">
    {photo ? <><img src={photo.uri} alt={place.name} width="80" height="64" loading="lazy" onError={() => setResult({ loading: false, photo: null })}/><figcaption><span>Google Maps</span>{photo.authors.map((author, index) => {
      const href = safeLink(author.uri);
      return <span className="places-photo-credit" key={index}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{author.displayName || 'Photo contributor'}</a> : author.displayName || 'Photo contributor'}</span>;
    })}</figcaption></> : <div className="places-photo-loading" aria-hidden="true"/>}
  </figure>;
}
