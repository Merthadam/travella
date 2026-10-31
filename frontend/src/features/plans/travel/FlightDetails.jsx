import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Price, duration, refund } from './TravelPresentation';
import { offerExpired } from './TravelDetailsDialog';
import './flight-review.css';

// Format the date portion alone: supplier times belong to their airport's zone.
function flightDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const day = value?.slice(0, 10);
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { ...options, timeZone: 'UTC' }) : 'Date unavailable';
}
const time = value => value?.slice(11, 16) || '—';

function ReviewLeg({ leg, label }) {
  const first = leg.segments[0], last = leg.segments.at(-1);
  return <article className="flight-review-leg">
    <div className="flight-review-leg-heading"><h3>{label}</h3><span>{flightDate(first.departure_at, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
    <div className="flight-review-route">
      <div><strong>{time(first.departure_at)}</strong><span>{first.origin}</span></div>
      <div className="flight-review-route-middle"><span>{duration(leg.duration_minutes)}</span><div className="flight-review-route-rule" aria-hidden="true"><i/><i/></div><span>{leg.stops == null ? 'Stops unavailable' : leg.stops === 0 ? 'Direct' : `${leg.stops} stop${leg.stops === 1 ? '' : 's'}`}</span></div>
      <div><strong>{time(last.arrival_at)}</strong><span>{last.destination}</span></div>
    </div>
    {last.arrival_at.slice(0, 10) !== first.departure_at.slice(0, 10) && <p className="flight-review-local">Arrives {flightDate(last.arrival_at)}</p>}
    <details><summary>{label} flight details</summary><div className="flight-review-segments">{leg.segments.map((segment, index) => <p key={index}>
      {segment.origin} → {segment.destination} · {time(segment.departure_at)}–{time(segment.arrival_at)} · {segment.flight_number || segment.airline || 'Airline unavailable'}
      {(segment.operating_airline || segment.operating_code) && ` · Operated by ${segment.operating_airline || segment.operating_code}`}
      {segment.technical_stops?.length > 0 && ` · Technical stops: ${segment.technical_stops.join(', ')}`}
    </p>)}</div></details>
  </article>;
}

export function FlightDetails({ observation, detached, checkoutToken, booked, onClose, onRefresh, onCheckout }) {
  const { item, snapshot, historical } = observation;
  const [evidenceExpired, setEvidenceExpired] = useState(() => offerExpired(snapshot.expires_at));
  const dialog = useRef(null), checkoutRequest = useRef(null);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const first = item.outbound.segments[0], last = item.outbound.segments.at(-1);
  const route = `${first.origin} ⇄ ${last.destination}`;
  const dates = `${flightDate(first.departure_at)} – ${flightDate(item.inbound.segments[0].departure_at)}`;
  const airlines = item.airlines.join(' · ') || 'Airline unavailable';
  const canCheckout = snapshot.sandbox && checkoutToken && !evidenceExpired;
  const needsSearch = evidenceExpired || !checkoutToken;

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { checkoutRequest.current?.abort(); if (previous?.isConnected) previous.focus?.(); };
  }, []);
  useEffect(() => {
    let timer;
    function check() {
      const expired = offerExpired(snapshot.expires_at);
      setEvidenceExpired(expired);
      if (!expired) timer = setTimeout(check, Math.min(Date.parse(snapshot.expires_at) - Date.now(), 2147483647));
    }
    check();
    return () => clearTimeout(timer);
  }, [snapshot.expires_at]);

  async function startCheckout() {
    if (checkoutRequest.current) return;
    if (offerExpired(snapshot.expires_at)) { setEvidenceExpired(true); return; }
    const controller = new AbortController();
    checkoutRequest.current = controller;
    setPreparingCheckout(true); setCheckoutError('');
    try {
      const opened = await onCheckout({ offerToken: checkoutToken }, controller.signal);
      if (!controller.signal.aborted && opened === false) setCheckoutError('Checkout could not open yet. Please try again.');
    } catch (error) {
      if (!controller.signal.aborted) setCheckoutError(error.message || 'Unable to verify this fare. Please try again.');
    } finally {
      if (!controller.signal.aborted) { checkoutRequest.current = null; setPreparingCheckout(false); }
    }
  }

  return createPortal(<dialog ref={dialog} className="flight-review-dialog" aria-busy={preparingCheckout} aria-labelledby="flight-review-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="flight-review-header">
      <div className="flight-review-eyebrow">FLIGHT REVIEW <span>{snapshot.sandbox ? 'LiteAPI sandbox' : 'LiteAPI results'}</span></div>
      <button type="button" className="flight-review-close" aria-label="Close details" onClick={onClose}>×</button>
      <h2 id="flight-review-title">{route}</h2><p>{dates} <span>·</span> {airlines}</p>
    </header>
    <div className="flight-review-content" role="region" aria-label="Flight itinerary and fare">
      {detached && <p className="flight-review-notice" role="status">Earlier search · inspecting its original observation. The main results have changed.</p>}
      {historical && <p className="flight-review-notice" role="status">Original observed offer · no availability refresh requested.</p>}
      {evidenceExpired && <p className="flight-review-notice" role="status">This offer has expired. Search again before continuing.</p>}
      <ReviewLeg leg={item.outbound} label="Outbound"/><ReviewLeg leg={item.inbound} label="Return"/>
      <p className="flight-review-local">All times are local to each airport.</p>
      <details className="flight-review-terms"><summary>Baggage & fare conditions</summary><dl>
        <div><dt>Baggage</dt><dd>{item.baggage_summary || 'Baggage allowance not supplied.'}</dd></div>
        <div><dt>Changes & refunds</dt><dd>{refund(item.refundable)}<span>{item.cancellation_summary || 'Detailed fare conditions not supplied.'}</span></dd></div>
      </dl></details>
      <p className="flight-review-boundary">{snapshot.sandbox ? 'Test checkout · no real ticket or charge' : 'Availability and prices can change.'}</p>
      {checkoutError && <p className="flight-review-notice" role="alert">{checkoutError}</p>}
      <p className="flight-review-observed">Observed {new Date(snapshot.searched_at).toLocaleString()} · {snapshot.sandbox ? 'Test inventory' : 'Provider results'}</p>
    </div>
    <footer className="flight-review-footer">
      <div className="flight-review-fare"><span>Return total</span><Price price={item.price} label="All travelers"/></div>
      <div className="flight-review-next">
        {needsSearch ? <><button type="button" className="flight-review-primary" aria-label="Search again to check current availability" disabled={!onRefresh} onClick={onRefresh}>Search again <span aria-hidden="true">→</span></button><small>Check current availability and fare</small></> : canCheckout ? <>
          <button type="button" className="flight-review-primary" aria-label={booked ? 'A flight is already booked in this Plan' : 'Continue to flight checkout'} disabled={booked || !onCheckout || preparingCheckout} onClick={startCheckout}>{booked ? 'Flight already booked' : 'Continue to checkout'}{!booked && <span aria-hidden="true">→</span>}</button>
          <small role={preparingCheckout ? 'status' : undefined}>{booked ? 'This Plan already has a flight booking' : preparingCheckout ? 'Checking availability and the current fare…' : 'Availability and price are checked again'}</small>
        </> : <small>Checkout is unavailable for this offer.</small>}
      </div>
    </footer>
  </dialog>, document.body);
}
