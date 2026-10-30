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

export function FlightDetails({ observation, detached, checkoutToken, booked, onClose, onRefresh, onDiscuss, onChoose, onCheckout }) {
  const { item, snapshot, historical } = observation;
  const [step, setStep] = useState(0);
  const [evidenceExpired, setEvidenceExpired] = useState(() => offerExpired(snapshot.expires_at));
  const dialog = useRef(null), panel = useRef(null), stepHeading = useRef(null);
  const first = item.outbound.segments[0], last = item.outbound.segments.at(-1);
  const route = `${first.origin} ⇄ ${last.destination}`;
  const dates = `${flightDate(first.departure_at)} – ${flightDate(item.inbound.segments[0].departure_at)}`;
  const airlines = item.airlines.join(' · ') || 'Airline unavailable';
  const canPlan = !evidenceExpired && Boolean(snapshot.search_id);
  const canCheckout = snapshot.sandbox && checkoutToken && !evidenceExpired;
  const needsSearch = evidenceExpired || !checkoutToken;

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previous?.isConnected) previous.focus?.(); };
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

  function move(next) {
    setStep(next);
    panel.current?.scrollTo?.({ top: 0 });
  }
  useEffect(() => { stepHeading.current?.focus({ preventScroll: true }); }, [step]);
  function currentAction(callback) {
    // Recheck at the event boundary as timers can be delayed in background tabs.
    if (offerExpired(snapshot.expires_at)) { setEvidenceExpired(true); return; }
    callback();
  }
  function attach(callback) {
    currentAction(() => {
      onClose();
      callback({ title: item.airlines.join(' / '), reference: { search_id: snapshot.search_id, option_id: item.id, room_id: null } });
    });
  }

  return createPortal(<dialog ref={dialog} className="flight-review-dialog" aria-labelledby="flight-review-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="flight-review-header">
      <div className="flight-review-eyebrow">FLIGHT REVIEW <span>{snapshot.sandbox ? 'LiteAPI sandbox' : 'LiteAPI results'}</span></div>
      <button type="button" className="flight-review-close" aria-label="Close details" onClick={onClose}>×</button>
      <h2 id="flight-review-title">{route}</h2><p>{dates} <span>·</span> {airlines}</p>
    </header>
    <nav className="flight-review-steps" aria-label="Flight review steps">
      <button type="button" aria-current={step === 0 ? 'step' : undefined} aria-controls="flight-review-panel" onClick={() => move(0)}><span>1</span>Your itinerary</button>
      <span className="flight-review-step-line" aria-hidden="true"/>
      <button type="button" aria-current={step === 1 ? 'step' : undefined} aria-controls="flight-review-panel" onClick={() => move(1)}><span>2</span>Fare & next step</button>
    </nav>
    <div ref={panel} id="flight-review-panel" className="flight-review-content" role="region" aria-labelledby="flight-review-step-title">
      <h3 ref={stepHeading} id="flight-review-step-title" className="flight-review-sr-only" tabIndex={-1}>{step === 0 ? 'Your itinerary' : 'Fare & next step'}</h3>
      {detached && <p className="flight-review-notice" role="status">Earlier search · inspecting its original observation. The main results have changed.</p>}
      {historical && <p className="flight-review-notice" role="status">Original observed offer · no availability refresh requested.</p>}
      {evidenceExpired && <p className="flight-review-notice" role="status">This offer has expired. Search again before choosing it.</p>}
      {step === 0 ? <>
        <ReviewLeg leg={item.outbound} label="Outbound"/><ReviewLeg leg={item.inbound} label="Return"/>
        <p className="flight-review-local">All times are local to each airport.</p>
      </> : <>
        <div className="flight-review-recap"><div><h3>{route}</h3><p>{dates} · {airlines}</p></div><button type="button" className="flight-review-text" onClick={() => move(0)}>Review itinerary</button></div>
        <section className="flight-review-terms" aria-label="Baggage and fare conditions"><h3>Included with this fare</h3><dl>
          <div><dt>Baggage</dt><dd>{item.baggage_summary || 'Baggage allowance not supplied.'}</dd></div>
          <div><dt>Changes & refunds</dt><dd>{refund(item.refundable)}<span>{item.cancellation_summary || 'Detailed fare conditions not supplied.'}</span></dd></div>
        </dl></section>
        {canPlan && (onChoose || onDiscuss) && <div className="flight-review-alternatives">
          {onChoose && <button type="button" className="flight-review-secondary" onClick={() => attach(onChoose)}>Choose for trip</button>}
          {onDiscuss && <button type="button" className="flight-review-text" onClick={() => attach(onDiscuss)}>Discuss flight <span aria-hidden="true">↗</span></button>}
        </div>}
        <p className="flight-review-boundary">{snapshot.sandbox ? 'Test checkout · no real ticket or charge' : 'Availability and prices can change.'}</p>
      </>}
      <p className="flight-review-observed">Observed {new Date(snapshot.searched_at).toLocaleString()} · {snapshot.sandbox ? 'Test inventory' : 'Provider results'}</p>
    </div>
    <footer className="flight-review-footer">
      <div className="flight-review-fare"><span>Return total</span><Price price={item.price} label="All travelers"/></div>
      <div className="flight-review-next">
        {step === 0 && !evidenceExpired ? <><button type="button" className="flight-review-primary" onClick={() => move(1)}>Review fare <span aria-hidden="true">→</span></button><small>Next: baggage, fare rules and checkout</small></> : needsSearch ? <><button type="button" className="flight-review-primary" aria-label="Search again to check current availability" disabled={!onRefresh} onClick={onRefresh}>Search again <span aria-hidden="true">→</span></button><small>Check current availability and fare</small></> : canCheckout ? <>
          <button type="button" className="flight-review-primary" aria-label={booked ? 'A flight is already booked in this Plan' : 'Continue to flight checkout'} disabled={booked || !onCheckout} onClick={() => currentAction(() => onCheckout({ offerToken: checkoutToken }))}>{booked ? 'Flight already booked' : 'Continue to checkout'}{!booked && <span aria-hidden="true">→</span>}</button>
          <small>{booked ? 'This Plan already has a flight booking' : 'Availability and price are checked again'}</small>
        </> : <small>Checkout is unavailable for this offer.</small>}
      </div>
    </footer>
  </dialog>, document.body);
}
