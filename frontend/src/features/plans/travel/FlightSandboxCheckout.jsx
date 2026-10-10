import React, { useEffect, useRef, useState } from "react";
import { travelRequest } from "./travelApi";

import { flightCheckoutKey as key, flightCheckoutUpdated } from "./useFlightBookingSync";
function remember(planId, token) {
  try { sessionStorage.setItem(key(planId), token); window.dispatchEvent(new CustomEvent(flightCheckoutUpdated, { detail: planId })); } catch { /* Storage is optional. */ }
}
export function FlightMockRecovery({ planId, onOpen }) {
  let token;
  try { token = sessionStorage.getItem(key(planId)); } catch { /* Storage is optional. */ }
  return token ? <button type="button" onClick={() => onOpen(token)}>View last mock flight checkout</button> : null;
}
export function FlightSandboxCheckout({ planId, offerToken, recoveryToken, onClose, onBookingResult }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(Boolean(recoveryToken));
  const started = useRef(null);
  const submitting = useRef(false);
  const notified = useRef(null);
  function accept(value) {
    setResult(value);
    if (value.status !== "review") remember(planId, value.token);
    setConsent(false);
    // A submitted booking may finish after the details dialog has closed.
    // Deliver that result to the Plan even when this view is no longer mounted.
    if (!value.sandbox || !value.booking_id || !["confirmed", "cancelled", "failed"].includes(value.status)) return;
    const id = `${value.booking_id}:${value.status}`;
    if (notified.current === id || !onBookingResult) return;
    notified.current = id;
    onBookingResult(planId, value);
  }
  useEffect(() => {
    let live = true;
    if (!started.current) started.current = travelRequest(planId, `sandbox/flights/${recoveryToken ? "status" : "verify"}`, { token: recoveryToken || offerToken });
    started.current.then(value => { if (live) accept(value); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [planId, offerToken, recoveryToken]);
  useEffect(() => {
    if (result?.status !== "pending") return;
    let live = true, timer, attempts = 0;
    async function poll() {
      try {
        const value = await travelRequest(planId, "sandbox/flights/status", { token: result.token });
        if (!live) return;
        accept(value);
        if (value.status === "pending" && ++attempts < 12) timer = setTimeout(poll, 5000);
      } catch (e) { if (live) setError(e.message); }
    }
    timer = setTimeout(poll, 5000);
    return () => { live = false; clearTimeout(timer); };
  }, [planId, result?.status, result?.token]);
  async function perform(action) {
    if (submitting.current || !result) return;
    submitting.current = true; setBusy(true); setError("");
    if (action !== "status") { setAttempted(true); remember(planId, result.token); }
    try { accept(await travelRequest(planId, `sandbox/flights/${action}`, { token: result.token, ...(action !== "status" ? { confirm_mock: true } : {}) })); }
    catch (e) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  const flight = result?.flight;
  const status = result?.status;
  const review = status === "review" && !attempted;
  const ready = status === "ready_to_book";
  const confirmed = status === "confirmed";
  return <section className="mock-checkout" aria-busy={busy}>
    <h3>{confirmed ? "Mock flight booking confirmed" : "Sandbox flight checkout"}</h3>
    <p className="travel-note">Test only — no real ticket or charge. Fictional passengers and test documents are supplied automatically. Confirmed bookings update your canvas draft; choose Save plan to keep them.</p>
    {busy && <p role="status">{attempted ? "Checking the provider’s test reservation…" : "Verifying the flight and current fare…"}</p>}
    {error && <p role="alert">{error}</p>}
    {flight && <>
      <h4>{flight.outbound.segments[0].origin} ↔ {flight.outbound.segments.at(-1).destination}</h4>
      <p>{flight.outbound.segments[0].departure_at.slice(0, 10)} – {flight.inbound.segments[0].departure_at.slice(0, 10)} · {result.passenger_count} test passenger(s)</p>
      <p>{flight.airlines.join(" · ")}</p>
      {[['Outbound', flight.outbound], ['Return', flight.inbound]].map(([label, leg]) => <div key={label}><strong>{label}</strong>{leg.segments.map((segment, index) => <p key={index}>{segment.origin} {segment.departure_at.replace('T', ' ').slice(0, 16)} → {segment.destination} {segment.arrival_at.replace('T', ' ').slice(0, 16)} · {segment.flight_number}</p>)}</div>)}
      <small>All flight times are local to each airport.</small>
      <p><strong>{new Intl.NumberFormat(undefined, { style: "currency", currency: flight.price.currency }).format(Number(flight.price.amount))}</strong> return total for all travelers</p>
      <p>{flight.baggage_summary || "Baggage information unavailable."}</p>
      <p>{flight.cancellation_summary || "Detailed fare conditions unavailable."}</p>
      {confirmed && <div role="status"><p>LiteAPI confirmed this sandbox flight booking.</p><p>Test booking reference: <strong>{result.booking_id}</strong></p>{result.confirmation_code && <p>Test confirmation: {result.confirmation_code}</p>}</div>}
      {status === "pending" && <p role="status">LiteAPI is still confirming the mock flight. Your canvas will update only after confirmation. Check status shortly.</p>}
      {status === "unknown" && <p role="status">We cannot verify this checkout yet. A reservation may have been started. Check status; this flow will not create a second prebook.</p>}
      {["cancelled", "failed"].includes(status) && <p role="status">Mock flight booking {status}.</p>}
      {(review || ready) && <form onSubmit={e => { e.preventDefault(); if (consent) perform(review ? "prebook" : "book"); }}>
        <fieldset disabled={busy}>
          <legend>{review ? "Review the verified fare" : "Review the final test fare"}</legend>
          <p>{review ? "Continuing creates a test reservation with LiteAPI using fictional passenger details." : "The provider refreshed the itinerary and price above. Confirm these details to finish the mock booking with simulated payment."}</p>
          <label className="mock-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />I confirm this itinerary and price for a test-only booking.</label>
          <button type="submit" className="travel-primary" disabled={busy || !consent}>{review ? "Start mock flight reservation" : "Confirm mock flight booking"}</button>
        </fieldset>
      </form>}
      {attempted && <button type="button" disabled={busy} onClick={() => perform("status")}>Check mock flight status</button>}
    </>}
    <button type="button" disabled={busy} onClick={onClose}>Back to flight results</button>
    <small>You can reopen the last checkout in this tab for seven days. New submissions expire after 15 minutes. Sandbox airline availability varies; Nuitée Air is the provider’s test airline.</small>
  </section>;
}
