import React, { useEffect, useRef, useState } from 'react';
import { countries } from '../../onboarding/catalogs';
import { useFlightCheckout } from './useFlightCheckout';
import { downloadItinerary, flightBookingSummary, formatFlightPrice } from './flightItinerary';
import './flight-checkout.css';
import { FlightExtras, ExtrasSummary, serviceChoices, sameChoices } from './FlightExtras';
import { FlightPayment } from './FlightPayment';

const steps = ['Your flights', 'Passengers', 'Seats', 'Baggage', 'Review & pay'];
const today = () => new Date().toISOString().slice(0, 10);
export function testPassengers(result) {
  const departure = result.flight.outbound.segments[0].departure_at.slice(0, 10);
  return Array.from({ length: result.passenger_count }, (_, index) => {
    const age = result.passenger_ages?.[index] ?? 30;
    const birth = `${Number(departure.slice(0, 4)) - age}-${departure.slice(5, 7)}-${String(Math.min(Number(departure.slice(8, 10)), 28)).padStart(2, '0')}`;
    return { first_name: ['Alex', 'Sam', 'Jamie', 'Robin', 'Casey', 'Taylor', 'Morgan', 'Jordan', 'Drew'][index], last_name: 'Tester', date_of_birth: birth > today() ? today() : birth,
      gender: 'M', nationality: result.country_code || 'US', document_issue_country: result.country_code || 'US', document_number: `TEST0000${index}`, document_expiry: `${Number(departure.slice(0, 4)) + 5}-12-31` };
  });
}
const testContact = () => ({ first_name: 'Alex', last_name: 'Tester', email: 'sandbox-guest@example.com', phone_country_code: '1', phone_number: '2025550123' });

export function FlightLeg({ leg, label }) {
  return <section className="flight-leg" aria-label={label}><h3>{label} <span>{leg.segments[0]?.departure_at.slice(0, 10)}</span></h3>
    {leg.segments.map((segment, index) => <div className="flight-segment" key={index}>
      <p className="flight-airline">{segment.airline || 'Airline'}{segment.flight_number ? ` · ${segment.flight_number}` : ''}</p>
      <div className="flight-route"><div><strong>{segment.departure_at.slice(11, 16) || '—'}</strong><b>{segment.origin}</b></div><div className="flight-route-line" aria-hidden="true">✈</div><div><strong>{segment.arrival_at?.slice(11, 16) || '—'}</strong><b>{segment.destination}</b></div></div>
      {segment.arrival_at && segment.arrival_at.slice(0, 10) !== segment.departure_at.slice(0, 10) && <p className="flight-muted">Arrives {segment.arrival_at.slice(0, 10)}</p>}
      {index < leg.segments.length - 1 && <p className="flight-connection">Connection at {segment.destination}</p>}
    </div>)}
  </section>;
}
function Summary({ result }) {
  const flight = result.flight;
  return <aside className="flight-summary" aria-label="Booking summary"><p className="flight-eyebrow">YOUR RETURN JOURNEY</p><h2>{flight.outbound.segments[0].origin} ⇄ {flight.outbound.segments.at(-1).destination}</h2><p>{result.passenger_count} passenger{result.passenger_count === 1 ? '' : 's'}</p>
    <FlightLeg leg={flight.outbound} label="Outbound"/><FlightLeg leg={flight.inbound} label="Return"/>
    <div className="flight-total"><span>Total · all passengers</span><strong>{formatFlightPrice(flight.price)}</strong></div>
    <p className="flight-muted">Provider total, including any confirmed seat and baggage selections.</p><p className="flight-muted">Sandbox only · no real ticket or charge.</p>
  </aside>;
}
function PassengerFields({ passengers, setPassengers, contact, setContact, result, locked }) {
  const update = (index, key, value) => setPassengers(old => old.map((p, i) => i === index ? { ...p, [key]: value } : p));
  const country = (p, index, key, label) => <label>{label}<select value={p[key]} onChange={e => update(index, key, e.target.value)}>{countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>;
  const contactField = (key, label, props = {}) => <label>{label}<input required autoComplete="off" {...props} value={contact[key]} onChange={e => setContact(old => ({ ...old, [key]: e.target.value }))}/></label>;
  if (locked && !passengers.length) return <p>Passenger and contact details were supplied when this test reservation was created. They are not stored in your Plan.</p>;
  return <fieldset disabled={locked} className="flight-passengers"><legend className="visually-hidden">Test passengers and contact</legend>
    {!locked && <button type="button" className="flight-text-button" onClick={() => { setPassengers(testPassengers(result)); setContact(testContact()); }}>Fill with test passengers</button>}
    {passengers.map((p, index) => <fieldset className="flight-person" key={index}><legend>Passenger {index + 1} <span>{(result.passenger_ages?.[index] ?? 30) >= 12 ? 'Adult' : result.passenger_ages[index] < 2 ? 'Infant' : 'Child'}</span></legend><div className="flight-fields">
      <label>Given name<input required autoComplete="off" maxLength={50} value={p.first_name} onChange={e => update(index, 'first_name', e.target.value)}/></label>
      <label>Family name<input required autoComplete="off" maxLength={50} value={p.last_name} onChange={e => update(index, 'last_name', e.target.value)}/></label>
      <label>Date of birth<input required type="date" autoComplete="off" max={today()} value={p.date_of_birth} onChange={e => update(index, 'date_of_birth', e.target.value)}/></label>
      <label>Gender on document<select value={p.gender} onChange={e => update(index, 'gender', e.target.value)}><option value="M">Male</option><option value="F">Female</option></select></label>
      {country(p, index, 'nationality', 'Nationality')}{country(p, index, 'document_issue_country', 'Passport issuing country')}
      <label>Test passport number<input required autoComplete="off" pattern="TEST[A-Z0-9]{4,16}" title="Use TEST followed by 4–16 letters or digits." value={p.document_number} onChange={e => update(index, 'document_number', e.target.value)}/></label>
      <label>Passport valid until<input required type="date" autoComplete="off" min={result.flight.inbound.segments[0].departure_at.slice(0, 10)} value={p.document_expiry} onChange={e => update(index, 'document_expiry', e.target.value)}/></label>
    </div></fieldset>)}
    <h3>Test booking contact</h3><div className="flight-fields">{contactField('first_name', 'Contact given name', { maxLength: 50 })}{contactField('last_name', 'Contact family name', { maxLength: 50 })}
      {contactField('email', 'Test email', { type: 'email', pattern: '[A-Za-z0-9._%+\\-]+@example\\.(com|test)', title: 'Use an example.com or example.test address.', maxLength: 120 })}
      {contactField('phone_country_code', 'Phone country code', { inputMode: 'numeric', pattern: '[1-9][0-9]{0,2}' })}{contactField('phone_number', 'Test phone number', { inputMode: 'numeric', pattern: '[0-9]{6,14}' })}
    </div><p className="flight-muted">Use fictional details. Test email must end in @example.com or @example.test. These details are sent for this sandbox booking and are not saved in your profile or Plan.</p>
  </fieldset>;
}

function Confirmation({ result, savedBooking, saveState, onBackToPlan }) {
  const [downloaded, setDownloaded] = useState(false);
  const summary = savedBooking || flightBookingSummary(result);
  const saved = saveState?.savedReference === result.booking_id;
  return <div className="flight-confirmation"><header><span className="flight-confirm-icon" aria-hidden="true">✓</span><p className="flight-eyebrow">SANDBOX CONFIRMATION</p><h1 tabIndex={-1}>Your test itinerary is ready.</h1><p>{savedBooking ? 'Your saved test booking document.' : 'LiteAPI confirmed this sandbox booking. No real ticket or charge.'}</p></header>
    <div className="flight-confirm-grid"><article className="flight-receipt" aria-label="Test flight itinerary"><div className="flight-receipt-heading"><span className="flight-eyebrow">TRAVELLA · FLIGHT ITINERARY</span><b>TEST ONLY</b></div><h2>{summary.origin} ⇄ {summary.destination}</h2><p>{summary.departureDate} – {summary.returnDate}</p>
      <div className="flight-reference"><span>Test booking reference</span><strong>{result.booking_id}</strong>{result.confirmation_code && <><span>Airline confirmation</span><strong>{result.confirmation_code}</strong></>}<small>Not valid for travel</small></div>
      <FlightLeg leg={result.flight.outbound} label="Outbound"/><FlightLeg leg={result.flight.inbound} label="Return"/>
      <dl className="flight-receipt-facts"><div><dt>Passengers</dt><dd>{result.passenger_count ?? 'Count not saved'}</dd></div><div><dt>Seats</dt><dd><ExtrasSummary values={result.selected_services} kind="seat"/></dd></div><div><dt>Test total</dt><dd>{formatFlightPrice(result.flight.price)}</dd></div><div><dt>Baggage</dt><dd>{result.flight.baggage_summary || 'Allowance not supplied.'}<ExtrasSummary values={result.selected_services} kind="baggage"/></dd></div><div><dt>Fare conditions</dt><dd>{result.flight.cancellation_summary || 'Detailed fare conditions not supplied.'}</dd></div></dl>
      <p className="flight-muted">All times are local to each airport. This sandbox receipt is not a ticket or boarding pass. It contains no passenger names, document, contact or payment details.</p>
    </article><aside><h2>Save your itinerary.</h2><p>Keep an offline copy with your travel documents.</p><button className="flight-primary" onClick={() => { downloadItinerary(summary); setDownloaded(true); }}>Download itinerary</button><small>HTML document · opens offline</small><button className="flight-secondary" onClick={() => window.print()}>Print / save as PDF</button>{downloaded && <p role="status">Itinerary download started.</p>}
      <div className="flight-save-status" role="status">{saved || (!saveState && savedBooking) ? 'Saved in your Plan’s Flights component.' : saveState?.error ? 'Your booking is confirmed, but the Plan could not be saved. Download your itinerary now; return to the Plan to retry saving.' : 'Your confirmed itinerary is being saved to the Plan.'}</div>
      <button className="flight-text-button" onClick={onBackToPlan}>Back to Plan →</button>
      {!summary.itinerary && <p className="flight-muted">This older booking has only a route and reference saved. Missing flight times and fare details are not reconstructed.</p>}
    </aside></div>
  </div>;
}

export function FlightCheckout(props) {
  const { planId, onClose, onBackToPlan, savedBooking, saveState } = props;
  const checkout = useFlightCheckout(props);
  const { result, busy: requestBusy, error, consent, setConsent, attempted, priceChanged, perform } = checkout;
  const [choices, setChoices] = useState([]), [paymentBusy, setPaymentBusy] = useState(false), [paymentReady, setPaymentReady] = useState(false);
  const payment = useRef(null), submitting = useRef(false);
  const busy = requestBusy || paymentBusy;
  useEffect(() => { if (result) setChoices(serviceChoices(result.selected_services)); }, [result?.token]);
  const [step, setStep] = useState(0), [reached, setReached] = useState(0), [passengers, setPassengers] = useState([]), [contact, setContact] = useState(testContact);
  const initialized = useRef(false), heading = useRef(null), reserved = useRef(false);
  useEffect(() => {
    if (!result || initialized.current) return;
    initialized.current = true;
    if (result.status === 'review' && !attempted) setPassengers(testPassengers(result));
    else { setStep(4); setReached(4); reserved.current = true; }
  }, [result]);
  useEffect(() => {
    const target = result?.status === 'confirmed' ? document.querySelector('.flight-confirmation h1') : heading.current;
    target?.focus({ preventScroll: true });
    target?.closest('.canvas-travel-screen')?.scrollTo?.({ top: 0 });
  }, [step, result?.status]);
  useEffect(() => { const previous = document.title; document.title = 'Travella — Flight checkout'; return () => { document.title = previous; }; }, []);
  useEffect(() => { setConsent(false); }, [passengers, contact]);
  const status = result?.status;
  const locked = reserved.current || (status && status !== 'review');
  const uncertain = attempted && status === 'review';
  function move(value) { setStep(value); setReached(old => Math.max(old, value)); setConsent(false); }
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    if (step === 1 && !locked) {
      if (!consent) return;
      const value = await perform('prebook', { passengers, contact });
      if (value?.status === 'ready_to_book') { reserved.current = true; move(2); }
    } else if (step === 2 || step === 3) {
      if (!sameChoices(choices, serviceChoices(result.selected_services))) {
        const value = await perform('services', { selected_services: choices });
        if (value?.status !== 'ready_to_book') return;
      }
      move(step + 1);
    } else if (step === 4 && consent && status === 'ready_to_book' && !submitting.current) {
      submitting.current = true; setPaymentBusy(true);
      try { if (!result.payment_secret || await payment.current?.authorize()) await perform('book'); }
      finally { submitting.current = false; setPaymentBusy(false); }
    }
    else move(step + 1);
  }
  return <section className="flight-checkout" aria-label="Flight checkout" aria-busy={busy}>
    <div className="flight-sandbox-banner"><b>SANDBOX CHECKOUT</b><span>Test booking · no real ticket or charge</span></div>
    <nav className="flight-checkout-nav"><button disabled={busy} className="flight-text-button" onClick={status === 'confirmed' ? onBackToPlan : onClose}>← {status === 'confirmed' ? 'Back to Plan' : 'Back to flights'}</button><span>{status === 'confirmed' ? 'YOUR ITINERARY' : 'FLIGHT CHECKOUT'}</span></nav>
    {error && <p className="flight-error" role="alert">{error}</p>}
    {status === 'confirmed' ? <Confirmation result={result} savedBooking={savedBooking} saveState={saveState} onBackToPlan={onBackToPlan}/> : <>
      <header className="flight-checkout-title"><p className="flight-eyebrow">YOUR RETURN JOURNEY</p><h1 ref={heading} tabIndex={-1}>Book your flights{result ? ` to ${result.flight.outbound.segments.at(-1).destination}` : ''}.</h1><p>Review the journey, add test passengers and confirm the final fare.</p></header>
      {busy && <p className="flight-loading" role="status">{result ? 'Checking your test reservation…' : 'Verifying availability and the current fare…'}</p>}
      {!result && !busy && <div className="flight-message"><h2>{error ? 'This flight could not be verified.' : 'Choose a flight to start checkout.'}</h2><p>{error ? 'Return to flights for a fresh offer.' : 'Passenger details are not retained after leaving. If a reservation was started, its status can be reopened from Flights in this tab.'}</p><button className="flight-secondary" onClick={onClose}>Return to flights</button></div>}
      {result && <><nav className="flight-steps" aria-label="Checkout steps">{steps.map((label, index) => <button key={label} disabled={busy || index > reached || uncertain || ['pending','unknown','failed','cancelled'].includes(status)} aria-current={index === step ? 'step' : undefined} onClick={() => move(index)}><span>{index + 1}</span>{label}</button>)}</nav>
        <div className="flight-checkout-grid"><div className="flight-step-panel">
          {priceChanged && <p className="flight-warning" role="alert">The provider updated the fare. Your current total is <b>{formatFlightPrice(result.flight.price)}</b>. Review it before confirming.</p>}
          {uncertain || ['pending','unknown','failed','cancelled'].includes(status) ? <div className="flight-message" role="status"><h2>{status === 'pending' ? 'Awaiting confirmation.' : ['failed','cancelled'].includes(status) ? `Test booking ${status}.` : 'Checking the reservation.'}</h2><p>{status === 'pending' ? 'LiteAPI is still confirming the test flight. Your Plan will update only after confirmation.' : ['failed','cancelled'].includes(status) ? 'This itinerary is not confirmed for this test booking.' : 'A reservation may have been started. Check its status before doing anything else; we will not create a second reservation.'}</p></div> : <form onSubmit={submit}>
            <fieldset disabled={busy} className="flight-step-content">
              {step === 0 && <><h2>Review your flights.</h2><p>Check the airports, dates, local times and fare conditions.</p><FlightLeg leg={result.flight.outbound} label="Outbound"/><FlightLeg leg={result.flight.inbound} label="Return"/><p className="flight-muted">{result.flight.cancellation_summary || 'Detailed fare conditions not supplied.'}</p></>}
              {step === 1 && <><h2>Passenger details.</h2><p>{locked ? 'These details are already attached to the test reservation.' : 'Use fictional passenger details for this sandbox booking.'}</p><PassengerFields passengers={passengers} setPassengers={setPassengers} contact={contact} setContact={setContact} result={result} locked={locked}/>{!locked && <label className="flight-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I confirm these test passengers and the itinerary at <b>{formatFlightPrice(result.flight.price)}</b>, and authorize a sandbox reservation.</span></label>}</>}
              {step === 2 && <><p className="flight-eyebrow">SEAT ASSIGNMENT</p><h2>Seats for your journey.</h2><FlightExtras key="seats" kind="seat" result={result} choices={choices} onChange={value => { setChoices(value); setReached(2); setConsent(false); }}/></>}
              {step === 3 && <><p className="flight-eyebrow">BAGGAGE ALLOWANCE</p><h2>Check what you can bring.</h2><div className="flight-included"><h3>Included with this fare</h3><p>{result.flight.baggage_summary || 'The provider did not supply a baggage allowance. Do not assume a cabin or checked bag is included.'}</p></div><FlightExtras key="bags" kind="baggage" result={result} choices={choices} onChange={value => { setChoices(value); setReached(3); setConsent(false); }}/></>}
              {step === 4 && <><h2>Review and pay.</h2><p>Confirm the provider’s final itinerary and total.</p><dl className="flight-review"><div><dt>Passengers</dt><dd>{passengers.length ? passengers.map(p => `${p.first_name} ${p.last_name}`).join(' · ') : `${result.passenger_count} test passengers supplied for this reservation`}</dd></div><div><dt>Seats</dt><dd><ExtrasSummary values={result.selected_services} kind="seat"/></dd></div><div><dt>Baggage</dt><dd>{result.flight.baggage_summary || 'Allowance not supplied.'}<ExtrasSummary values={result.selected_services} kind="baggage"/></dd></div><div><dt>Fare conditions</dt><dd>{result.flight.cancellation_summary || 'Detailed fare conditions not supplied.'}</dd></div></dl>{result.payment_secret ? <FlightPayment ref={payment} secret={result.payment_secret} onReady={setPaymentReady}/> : <div className="flight-payment"><h3>Existing test reservation</h3><p>This older reservation uses LiteAPI’s sandbox account payment. No real charge.</p></div>}<label className="flight-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I confirm this itinerary, its fare conditions and <b>{formatFlightPrice(result.flight.price)}</b> total for a test-only booking, and want its confirmation saved to my Plan.</span></label></>}
              <div className="flight-actions"><button type="button" className="flight-text-button" onClick={() => step ? move(step - 1) : onClose()}>← {step ? 'Back' : 'Back to flights'}</button><button type="submit" className="flight-primary" disabled={busy || (step === 4 && result.payment_secret && !paymentReady) || ((step === 1 && !locked || step === 4) && !consent)}>{busy ? (paymentBusy ? 'Authorizing test payment…' : 'Please wait…') : step === 4 ? `Confirm test booking · ${formatFlightPrice(result.flight.price)}` : step === 1 && !locked ? 'Reserve test fare & continue' : `Continue to ${steps[step + 1].toLowerCase()} →`}</button></div>
            </fieldset>
          </form>}
          {attempted && result.token && <button type="button" className="flight-text-button flight-status-button" disabled={busy} onClick={async () => { const value = await perform('status'); if (value?.status === 'ready_to_book') { reserved.current = true; move(4); } }}>Check booking status</button>}
        </div><Summary result={result}/></div>
      </>}
    </>}
  </section>;
}
