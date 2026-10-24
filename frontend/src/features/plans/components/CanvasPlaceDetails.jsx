import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../lib/googleMaps';
import { websiteUrl } from '../../../design-system/schemas';

const providerPin = /^google_[a-f0-9]{32}$/;

// Resolve the saved provider identity, never just the closest name match.
// Editorial text stays transient and is displayed verbatim, with attribution.
export async function loadSavedPlaceDetails(place, destination) {
  if (!providerPin.test(place.id)) return null;
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  const { places = [] } = await libraries.places.Place.searchByText({
    textQuery: `${place.name}${destination ? ` in ${destination}` : ''}`,
    locationBias: { center: place.position, radius: 1000 },
    fields: ['id'], maxResultCount: 5,
  });
  for (const candidate of places) {
    if (!candidate.id) continue;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate.id));
    const id = 'google_' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
    if (id !== place.id) continue;
    await candidate.fetchFields({ fields: ['websiteURI', 'editorialSummary', 'editorialSummaryLanguageCode'] });
    const website = websiteUrl.safeParse(candidate.websiteURI);
    return { website: website.success ? website.data : null,
      summary: typeof candidate.editorialSummary === 'string' ? candidate.editorialSummary : null,
      language: candidate.editorialSummaryLanguageCode || undefined };
  }
  return null;
}

export function CanvasPlaceDetails({ place, destination, disabled, onAction }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const pending = useRef(null);
  const key = JSON.stringify([place.id, place.name, destination, place.position, attempt]);
  const eligible = providerPin.test(place.id);
  useEffect(() => {
    if (!eligible) return;
    let alive = true;
    if (pending.current?.key !== key) pending.current = { key, promise: loadSavedPlaceDetails(place, destination) };
    pending.current.promise.then(details => { if (alive) setResult({ key, details }); }, () => { if (alive) setResult({ key, error: true }); });
    return () => { alive = false; };
  }, [key, eligible]);
  const current = result?.key === key ? result : null;
  const website = place.website || current?.details?.website;
  useEffect(() => {
    if (!disabled && !place.website && current?.details?.website) onAction('set_place_website', { id: place.id, website: current.details.website });
  }, [disabled, place.id, place.website, current, onAction]);
  return <>
    {website && <p><a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${place.name} website`}>Website ↗</a></p>}
    {eligible && !current && <p role="status">Loading Google Maps details…</p>}
    {current?.error && <p role="status">Couldn’t load Google Maps details. <button className="ds-text-button" onClick={() => setAttempt(value => value + 1)}>Retry details</button></p>}
    {current?.details?.summary && <div className="places-provider-description"><span className="places-note-label">Description from Google Maps</span><p lang={current.details.language}>{current.details.summary}</p></div>}
    {current && !current.error && !website && <p className="places-note-label">{current.details ? 'No website listed on Google Maps.' : 'Google Maps details unavailable for this place.'}</p>}
  </>;
}
