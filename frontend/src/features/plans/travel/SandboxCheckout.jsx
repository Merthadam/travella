import React, { useEffect, useRef, useState } from "react";
import { travelRequest } from "./travelApi";

const storageKey = (planId) => `travella:mock-checkout:${planId}`;
function remember(planId, token) {
  try { sessionStorage.setItem(storageKey(planId), token); } catch { /* Tab storage may be disabled. */ }
}
function saved(planId) {
  try { return sessionStorage.getItem(storageKey(planId)); } catch { return null; }
}
export function MockBookingRecovery({ planId, onOpen }) {
  const token = saved(planId);
  return token ? <button type="button" onClick={() => onOpen(token)}>View last mock checkout</button> : null;
}
export function SandboxCheckout({ planId, offerToken, recoveryToken, onClose }) {
  const [review, setReview] = useState(null);
  const [guests, setGuests] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(Boolean(recoveryToken));
  const submitting = useRef(false);
  const started = useRef(null);
  const heading = useRef(null);
  useEffect(() => {
    let live = true;
    // Reuse the promise during React's effect replay; never create two prebooks.
    if (!started.current) started.current = travelRequest(planId,
      recoveryToken ? "sandbox/status" : "sandbox/prebook",
      { token: recoveryToken || offerToken });
    started.current.then((result) => {
      if (!live) return;
      setReview(result);
      setGuests(Array.from({ length: result.room_count }, () => ({ first_name: "Alex", last_name: "Tester" })));
      remember(planId, result.token);
    }).catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) { setBusy(false); heading.current?.focus(); } });
    return () => { live = false; };
  }, [planId, offerToken, recoveryToken]);
  async function perform(action) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    if (action === "sandbox/book") setAttempted(true);
    try {
      const result = await travelRequest(planId, action, {
        token: review.token,
        ...(action === "sandbox/book" ? { confirm_mock: true, guests } : {}),
      });
      setReview(result);
      remember(planId, result.token);
    } catch (e) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  const price = (money) => money?.amount != null && money.currency
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: money.currency }).format(Number(money.amount))
    : "Unavailable";
  const confirmed = review?.status === "confirmed";
  const terminal = ["confirmed", "cancelled", "failed"].includes(review?.status);
  return <section className="mock-checkout" aria-busy={busy}>
    <h3 ref={heading} tabIndex={-1}>{confirmed ? "Mock booking confirmed" : "Sandbox checkout"}</h3>
    <p className="travel-note">Test only — no real reservation or charge. Your Plan’s booking status stays unchanged.</p>
    {busy && <p role="status">{attempted ? "Checking your mock booking…" : "Refreshing price and room terms…"}</p>}
    {error && <p role="alert">{error}</p>}
    {review && <>
      <h4>{review.hotel_name}</h4>
      <p>{review.check_in} – {review.check_out} · {review.room_count} room(s)</p>
      <p>{review.room.name} · {review.room.board_name || "Meal plan unavailable"}</p>
      <p><strong>{price(review.total)}</strong> total for all rooms and nights</p>
      {review.room.excluded_taxes.map((tax, i) => <p key={i}>Pay at property: {price(tax)} {tax.name} (test information)</p>)}
      <p>{review.room.cancellation_summary || "Cancellation terms were not supplied."}</p>
      {review.terms && <details><summary>Provider terms</summary><p>{review.terms}</p></details>}
      {confirmed ? <div role="status"><p>LiteAPI confirmed this sandbox booking.</p><p>Test booking reference: <strong>{review.booking_id}</strong></p>
        {review.confirmation_code && <p>Test confirmation: {review.confirmation_code}</p>}</div>
        : terminal ? <p role="status">Mock booking {review.status}.</p>
        : <>
          {attempted && <p role="status">{review.status === "not_found" ? "No provider confirmation found yet. Check status before retrying." : "Confirmation is not yet verified. Check status before retrying."}</p>}
          <form onSubmit={(e) => { e.preventDefault(); if (agreed) perform("sandbox/book"); }}>
            <fieldset disabled={busy}>
              <legend>Fictional lead guest for each room</legend>
              <p>Use test names. A test email is supplied automatically; no card details are needed.</p>
              {guests.map((g, i) => <div className="mock-guest" key={i}>
                <label>Room {i + 1} first name<input required maxLength={50} value={g.first_name} onChange={(e) => setGuests(guests.map((v, j) => j === i ? { ...v, first_name: e.target.value } : v))} /></label>
                <label>Room {i + 1} last name<input required maxLength={50} value={g.last_name} onChange={(e) => setGuests(guests.map((v, j) => j === i ? { ...v, last_name: e.target.value } : v))} /></label>
              </div>)}
              <label className="mock-consent"><input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I confirm these details for a mock booking with no real reservation or charge.</label>
              <button type="submit" className="travel-primary" disabled={!agreed || busy}>{attempted ? "Retry same mock booking" : "Confirm mock booking"}</button>
            </fieldset>
          </form>
        </>}
      <button type="button" disabled={busy} onClick={() => perform("sandbox/status")}>Check mock booking status</button>
    </>}
    <button type="button" disabled={busy} onClick={onClose}>Back to room offers</button>
    <small>Last checkout can be reopened in this tab for seven days. Unsubmitted offers expire after 15 minutes.</small>
  </section>;
}
