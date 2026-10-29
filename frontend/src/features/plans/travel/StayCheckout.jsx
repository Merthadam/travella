import React, { useEffect, useRef, useState } from 'react';
import { useStayCheckout } from './useStayCheckout';
import { stayBookingSummary, formatStayPrice, formatStayGuest, stayGuestAssignmentNote, downloadStayConfirmation } from './stayReservation';
import './flight-checkout.css';
import './stay-checkout.css';

const steps = ['Review stay', 'Guests', 'Review & pay'];
export function StayRooms({ reservation }) {
  return <>{reservation?.rooms.map(room => <section className="stay-room" key={room.room}>
    <h3>Room {room.room} · {room.name}</h3><p>{room.board || 'Meal plan not supplied'} · {room.occupancy || 'Occupancy details not supplied'}</p>
    <p>{room.cancellation || 'Cancellation terms were not supplied.'}</p>
    <p>Cancellation deadline: {room.cancellationDeadline || 'Not supplied'}</p>
    {room.excludedTaxes.map((tax, index) => <p key={index}>Pay at property: {tax.name} · {formatStayPrice(tax)}</p>)}
  </section>)}</>;
}
function Summary({ result }) {
  return <aside className="flight-summary"><p className="flight-eyebrow">YOUR STAY</p><h2>{result.hotel_name}</h2><p>{result.reservation?.address || 'Address not supplied'}</p><p>{result.check_in} – {result.check_out}</p><p>{result.room_count} room(s) · {Math.round((Date.parse(result.check_out) - Date.parse(result.check_in)) / 86400000)} nights</p><div className="flight-total"><span>Total</span><strong>{formatStayPrice(result.reservation?.total || result.total)}</strong></div><p>Total for all rooms and nights. Any excluded taxes are shown with each room.</p><p className="flight-muted">LiteAPI sandbox · no real reservation or charge.</p></aside>;
}
function Confirmation({ result, savedBooking, saveState, onBackToPlan }) {
  const [downloaded, setDownloaded] = useState(false);
  const receipt = useRef(null), printDetails = useRef(null);
  function preparePrint() {
    if (printDetails.current) return;
    printDetails.current = [...(receipt.current?.querySelectorAll('details') || [])].map(element => ({ element, open: element.open }));
    printDetails.current.forEach(({ element }) => { element.open = true; });
  }
  function restorePrint() {
    printDetails.current?.forEach(({ element, open }) => { element.open = open; });
    printDetails.current = null;
  }
  useEffect(() => {
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', restorePrint);
    return () => { window.removeEventListener('beforeprint', preparePrint); window.removeEventListener('afterprint', restorePrint); restorePrint(); };
  }, []);
  function print() {
    preparePrint();
    try { window.print(); } catch (error) { restorePrint(); throw error; }
  }
  const summary = savedBooking || stayBookingSummary(result), r = summary.reservation;
  const saved = saveState?.savedReference === summary.reference || (!saveState && savedBooking);
  return <div className="flight-confirmation"><header><span className="flight-confirm-icon">✓</span><p className="flight-eyebrow">LITEAPI SANDBOX CONFIRMATION</p><h1 tabIndex={-1}>Your test stay is confirmed.</h1><p>Keep your reservation details together, ready to reopen from your Plan.</p></header>
    <div className="flight-confirm-grid"><article ref={receipt} className="flight-receipt"><div className="flight-receipt-heading"><span className="flight-eyebrow">TRAVELLA · STAY CONFIRMATION</span><b>TEST ONLY</b></div><h2>{summary.hotelName}</h2><p>{r?.address || 'Address not supplied'}</p><p>{summary.checkIn} – {summary.checkOut}</p>
      <div className="flight-reference"><span>Test booking reference</span><strong>{summary.reference}</strong><span>Hotel confirmation</span><strong>{r?.confirmationCode || 'Not supplied'}</strong><small>Not valid for check-in</small></div>
      <h3 className="stay-guests-heading">Guests</h3>{r?.guests.length ? r.guests.map((g, i) => <p key={i}>{formatStayGuest(g)}</p>) : <p>Guest names were not returned or saved.</p>}
      {r?.guests.some(g => g.room == null) && <p className="flight-warning">{stayGuestAssignmentNote}</p>}
      <StayRooms reservation={r}/><dl className="flight-receipt-facts"><div><dt>Total for the stay</dt><dd>{formatStayPrice(r?.total)}</dd></div><div><dt>Payment status</dt><dd>{r?.paymentStatus || 'Not supplied'}</dd></div></dl>
      {r?.terms && <details><summary>Provider terms</summary><p className="stay-terms">{r.terms}</p></details>}
      <p className="flight-muted">Price source: {r?.priceSource || 'Not saved'}. Room terms source: {r?.roomSource || 'Not saved'}. Generated from LiteAPI evidence; this is not an original supplier voucher or a live status check. Cancellation inside Travella is not available.</p>
      {!r && <p className="flight-muted">This older booking contains only the property, dates and reference. Missing details have not been reconstructed.</p>}
    </article><aside><h2>Keep your confirmation.</h2><p>Download an offline copy with the guest names and reservation details.</p><button className="flight-primary" onClick={() => { downloadStayConfirmation(summary); setDownloaded(true); }}>Download confirmation</button><small>HTML document · opens offline</small><button className="flight-secondary" onClick={print}>Print / save as PDF</button>{downloaded && <p role="status">Confirmation download started.</p>}
      <div className="flight-save-status" role="status">{saved ? 'Saved in your Plan’s Stays component.' : saveState?.error ? 'Your reservation is confirmed, but the Plan could not be saved. Download your confirmation now; return to the Plan to retry saving.' : 'Your confirmed reservation is being saved to the Plan.'}</div><button className="flight-text-button" onClick={onBackToPlan}>Back to Plan →</button>
    </aside></div></div>;
}
export function StayCheckout(props) {
  const { onClose, onBackToPlan, savedBooking, saveState } = props;
  const { result, busy, error, attempted, perform } = useStayCheckout(props);
  const [step, setStep] = useState(0), [reached, setReached] = useState(0), [guests, setGuests] = useState([]), [consent, setConsent] = useState(false);
  const initialized = useRef(false), heading = useRef(null);
  useEffect(() => { if (result && !initialized.current) { initialized.current = true; setGuests(Array.from({ length: result.room_count || 1 }, (_, i) => ({ first_name: ['Alex','Sam','Jamie','Robin'][i], last_name: 'Tester' }))); } }, [result]);
  useEffect(() => { const target = result?.status === 'confirmed' ? document.querySelector('.stay-checkout .flight-confirmation h1') : heading.current; target?.focus({ preventScroll: true }); target?.closest('.canvas-travel-screen')?.scrollTo?.({ top: 0 }); }, [step, result?.status]);
  useEffect(() => { const previous = document.title; document.title = 'Travella — Stay checkout'; return () => { document.title = previous; }; }, []);
  const locked = attempted || (result && result.status !== 'review');
  function move(value) { setStep(value); setReached(old => Math.max(old, value)); setConsent(false); }
  async function submit(event) { event.preventDefault(); if (busy || locked) return; if (step < 2) move(step + 1); else if (consent) { setConsent(false); await perform('book', guests); } }
  return <section className="flight-checkout stay-checkout" aria-label="Stay checkout" aria-busy={busy}>
    <div className="flight-sandbox-banner"><b>SANDBOX CHECKOUT</b><span>Test booking · no real reservation or charge</span></div>
    <nav className="flight-checkout-nav"><button className="flight-text-button" onClick={result?.status === 'confirmed' ? onBackToPlan : onClose}>← {result?.status === 'confirmed' ? 'Back to Plan' : 'Back to stays'}</button><span>{result?.status === 'confirmed' ? 'YOUR STAY CONFIRMATION' : 'STAY CHECKOUT'}</span></nav>
    {error && <p className="flight-error" role="alert">{error}</p>}
    {result?.status === 'confirmed' ? <Confirmation result={result} savedBooking={savedBooking} saveState={saveState} onBackToPlan={onBackToPlan}/> : <>
      <header className="flight-checkout-title"><p className="flight-eyebrow">YOUR PLACE TO STAY</p><h1 ref={heading} tabIndex={-1}>Book your stay.</h1><p>Review the room, add your test guests and confirm the final total.</p></header>
      {busy && <p className="flight-loading" role="status">{attempted ? 'Confirming your test reservation…' : 'Checking availability, price and room terms…'}</p>}
      {!result && !busy && <div className="flight-message"><h2>{error ? 'This stay could not be verified.' : 'Choose a room to start checkout.'}</h2><p>Return to stays for a current offer. Unsubmitted guest details are not retained after leaving.</p><button className="flight-secondary" onClick={onClose}>Return to stays</button></div>}
      {result && <><nav className="flight-steps" aria-label="Checkout steps">{steps.map((label, index) => <button key={label} disabled={busy || locked || index > reached} aria-current={index === step ? 'step' : undefined} onClick={() => move(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <div className="flight-checkout-grid"><div className="flight-step-panel">
        {result.price_changed && !locked && <p className="flight-warning" role="alert">LiteAPI updated the price. Review the current total of {formatStayPrice(result.total)} and the room terms before confirming.</p>}
        {locked ? <div className="flight-message" role="status"><h2>{['failed','cancelled'].includes(result.status) ? `Test booking ${result.status}.` : result.status === 'not_found' ? 'Reservation status is unresolved.' : 'Awaiting reservation confirmation.'}</h2><p>{['failed','cancelled'].includes(result.status) ? 'This stay is not confirmed for check-in.' : result.status === 'not_found' ? 'LiteAPI has not returned a reservation for this submission. This does not confirm whether the booking succeeded or failed. Check its status again; if it remains unresolved, provider support may be needed. We will not submit another booking.' : 'The provider may still be processing this reservation. We will check its status without submitting another booking.'}</p></div> : <form onSubmit={submit}><fieldset disabled={busy} className="flight-step-content">
          {step === 0 && <><h2>Review your stay.</h2><p>{result.hotel_name} · {result.check_in} – {result.check_out}</p><StayRooms reservation={result.reservation}/>{result.terms && <details><summary>Provider terms</summary><p className="stay-terms">{result.terms}</p></details>}</>}
          {step === 1 && <><h2>Guest details.</h2><p>Enter a fictional lead guest for each room. The first guest is the booking holder. A test email is supplied automatically.</p>{guests.map((g, i) => <fieldset className="flight-person" key={i}><legend>Room {i + 1} · Lead guest</legend><div className="flight-fields"><label>First name<input required maxLength={50} pattern=".*\S.*" value={g.first_name} onChange={e => { setConsent(false); setGuests(old => old.map((v, j) => i === j ? { ...v, first_name: e.target.value } : v)); }}/></label><label>Last name<input required maxLength={50} pattern=".*\S.*" value={g.last_name} onChange={e => { setConsent(false); setGuests(old => old.map((v, j) => i === j ? { ...v, last_name: e.target.value } : v)); }}/></label></div></fieldset>)}</>}
          {step === 2 && <><h2>Review and pay.</h2><p>Confirm the selected room, guest names and provider terms.</p><dl className="flight-review">{guests.map((g,i) => <div key={i}><dt>Room {i + 1} guest</dt><dd>{g.first_name} {g.last_name}</dd></div>)}</dl><StayRooms reservation={result.reservation}/><div className="flight-payment"><span className="flight-badge">TEST PAYMENT</span><h3>LiteAPI sandbox payment</h3><p>This booking uses LiteAPI’s sandbox account payment. No card details or real charge.</p><strong>{formatStayPrice(result.total)}</strong><p>Total for all rooms and nights.</p></div><label className="flight-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I confirm this stay, its guests and terms at <b>{formatStayPrice(result.total)}</b> for a test-only booking, and want its confirmation and guest names saved to my Plan.</span></label></>}
          <div className="flight-actions"><button type="button" className="flight-text-button" onClick={() => step ? move(step - 1) : onClose()}>← {step ? 'Back' : 'Back to stays'}</button><button className="flight-primary" type="submit" disabled={busy || (step === 2 && !consent)}>{step === 2 ? `Confirm test booking · ${formatStayPrice(result.total)}` : `Continue to ${steps[step + 1].toLowerCase()} →`}</button></div>
        </fieldset></form>}
        {attempted && result.token && <button className="flight-text-button flight-status-button" disabled={busy} onClick={() => perform('status')}>Check reservation status</button>}
      </div><Summary result={result}/></div></>}
    </>}
  </section>;
}
