import React, { useEffect, useState } from 'react';
import { bookingLocationInput, resolveBookingLocations, resolveExistingLocation, sameLocation, locationKey } from './bookingLocations';
import './confirmation-map.css';

export function ConfirmationMapActions({ planId, mode, summary, actions }) {
  const input = JSON.stringify(bookingLocationInput(mode, summary));
  const key = `${planId}:${mode}:${summary.reference}:${input}`;
  const [resolution, setResolution] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [review, setReview] = useState(null);
  const [added, setAdded] = useState(null);
  const [error, setError] = useState('');
  const enabled = Boolean(actions);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setReview(null); setAdded(null); setError('');
    resolveBookingLocations(planId, mode, JSON.parse(input), controller.signal, actions.pins).then(locations => {
      if (!controller.signal.aborted) setResolution({ key, locations });
    }).catch(err => {
      if (!controller.signal.aborted) {
        if (err.status === 401) actions?.onExpired?.();
        setResolution({ key, error: true, locations: [] });
      }
    });
    return () => controller.abort();
  }, [key, attempt, enabled]);
  if (!actions) return null;
  const current = resolution?.key === key ? resolution : null;
  const pins = actions.pins || [], savedPins = actions.savedPins || [];
  function add(location, existingId, separate = false) {
    const outcome = actions.add(mode, summary.reference, location, { existingId, separate });
    if (outcome.error) setError(outcome.error);
    else { setAdded(locationKey(location.source)); setReview(null); setError(''); }
  }
  return <section className="confirmation-map" aria-label="Your trip map">
    <h3>Your trip map</h3><p>Keep your places easy to find.</p>
    {!current && <p role="status">Finding your location…</p>}
    {current?.locations.map(location => {
      const { exact, candidates } = resolveExistingLocation(pins, location);
      const persisted = exact && savedPins.find(pin => pin.id === exact.id && sameLocation(pin, location));
      const reviewing = review === locationKey(location.source);
      const full = pins.length >= 50;
      return <div className="confirmation-map-place" key={locationKey(location.source) || 'unavailable'}>
        <small>{location.label}</small><strong>{location.name}</strong><span>{location.address}</span>
        {persisted ? <><small role="status">{added === locationKey(location.source) ? 'Added to trip map' : 'Already on your trip map'}</small><button className="flight-secondary" type="button" onClick={() => actions.view(exact.id)}>View on trip map →</button></>
          : exact ? <p role="status">{actions.saveError ? 'This place has not been saved yet.' : 'Saving to trip map…'}</p>
          : candidates.length && !reviewing ? <button className="flight-secondary" type="button" onClick={() => setReview(locationKey(location.source))}>Review matching place</button>
          : reviewing ? <div className="confirmation-map-matches"><p>This may already be on your map. Choose the matching place to keep its saved position and details.</p>
            {candidates.map(pin => <div key={pin.id}><strong>{pin.name}</strong><small>{pin.position.lat.toFixed(4)}, {pin.position.lng.toFixed(4)}{pin.description ? ` · ${pin.description}` : ''}</small><button type="button" className="flight-secondary" disabled={actions.busy || Boolean(actions.saveError)} onClick={() => add(location, pin.id)}>Use this saved place</button></div>)}
            {location.position && location.source && <button className="flight-text-button" type="button" disabled={actions.busy || full || Boolean(actions.saveError)} onClick={() => add(location, undefined, true)}>Add as a separate place</button>}
            <button className="flight-text-button" type="button" onClick={() => setReview(null)}>Close review</button>
          </div>
          : location.position && location.source ? <button className="flight-secondary" type="button" disabled={actions.busy || full || Boolean(actions.saveError)} onClick={() => add(location)}>Add to trip map</button>
          : <><p>Location unavailable. Find the exact place on your trip map.</p><button className="flight-text-button" type="button" onClick={() => actions.view()}>Open trip map</button></>}
        {!exact && full && <p>Your map has 50 places. Remove a place before adding another.</p>}
      </div>;
    })}
    {current && !current.locations.length && <><p>Location unavailable. Find the exact place on your trip map.</p><button className="flight-text-button" type="button" onClick={() => actions.view()}>Open trip map</button></>}
    {current?.error && <button type="button" className="flight-text-button" onClick={() => setAttempt(value => value + 1)}>Retry location</button>}
    {error && <p role="alert">{error}</p>}
    {actions.saveError && <div role="alert"><p>{actions.saveError}</p>{actions.conflict ? <button className="flight-text-button" type="button" onClick={() => actions.view()}>Review latest plan</button> : <button className="flight-text-button" type="button" disabled={actions.saving} onClick={actions.retry}>Retry saving</button>}</div>}
  </section>;
}
