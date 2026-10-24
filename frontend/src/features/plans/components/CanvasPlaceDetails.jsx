import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../lib/googleMaps';
import { websiteUrl } from '../../../design-system/schemas';

const providerPin = /^google_[a-f0-9]{32}$/;

// Resolve the saved provider identity, never just the closest name match.
// Editorial text is saved verbatim with its provider identity and attribution.
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
    return { website: website.success ? website.data : null, placeId: candidate.id,
      summary: typeof candidate.editorialSummary === 'string' ? candidate.editorialSummary : null,
      language: candidate.editorialSummaryLanguageCode || undefined };
  }
  return null;
}

export function CanvasPlaceDetails({ place, destination, disabled, onAction, actions }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const pending = useRef(null);
  const key = JSON.stringify([place.id, place.name, destination, place.position, attempt]);
  const eligible = providerPin.test(place.id);
  const savedDetails = place.googleDetails;
  useEffect(() => {
    if (!eligible || savedDetails) return;
    let alive = true;
    if (pending.current?.key !== key) pending.current = { key, promise: loadSavedPlaceDetails(place, destination) };
    pending.current.promise.then(details => { if (alive) setResult({ key, details }); }, () => { if (alive) setResult({ key, error: true }); });
    return () => { alive = false; };
  }, [key, eligible, savedDetails]);
  const current = result?.key === key ? result : null;
  const details = savedDetails || current?.details;
  const website = place.website || current?.details?.website;
  const mapsUrl = `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: `${place.position.lat},${place.position.lng}`, ...(details?.placeId ? { query_place_id: details.placeId } : {}) })}`;
  useEffect(() => {
    if (!disabled && !savedDetails && current?.details) {
      const { summary, language, placeId, website: fetchedWebsite } = current.details;
      onAction('set_place_details', { id: place.id, details: { summary, language: language ?? null, placeId }, ...(!place.website && fetchedWebsite ? { website: fetchedWebsite } : {}) });
    }
  }, [disabled, place.id, place.website, savedDetails, current, onAction]);
  return <>
    {eligible && !savedDetails && !current && <p role="status">Loading Google Maps details…</p>}
    {!savedDetails && current?.error && <p role="status">Couldn’t load Google Maps details. <button className="ds-text-button" onClick={() => setAttempt(value => value + 1)}>Retry details</button></p>}
    {details?.summary && <div className="places-provider-description"><p lang={details.language || undefined}>{details.summary}</p><span className="places-note-label">Description from Google Maps</span></div>}
    {(savedDetails || (current && !current.error)) && !website && <p className="places-note-label">{details ? 'No website listed on Google Maps.' : 'Google Maps details unavailable for this place.'}</p>}
    <div className="places-actions places-detail-actions">{website && <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${place.name} website`}>Website ↗</a>}<a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${place.name} in Google Maps`}>Google Maps ↗</a>{actions}</div>
  </>;
}
