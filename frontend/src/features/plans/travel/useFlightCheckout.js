import { useEffect, useRef, useState } from 'react';
import { travelRequest } from './travelApi';
import { flightCheckoutKey, flightCheckoutUpdated } from './useFlightBookingSync';
import { savedFlightResult } from './flightItinerary';

export function readFlightReceipt(planId) {
  try { return sessionStorage.getItem(flightCheckoutKey(planId)); } catch { return null; }
}
function remember(planId, token) {
  if (!token) return;
  try { sessionStorage.setItem(flightCheckoutKey(planId), token); } catch { /* Optional recovery. */ }
  window.dispatchEvent(new CustomEvent(flightCheckoutUpdated, { detail: planId }));
}

export function useFlightCheckout({ planId, offerToken, recoveryToken, savedBooking, onBookingResult, onExpired }) {
  const [result, setResult] = useState(() => savedFlightResult(savedBooking));
  const [busy, setBusy] = useState(Boolean(offerToken || recoveryToken));
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(Boolean(recoveryToken));
  const [priceChanged, setPriceChanged] = useState(false);
  const started = useRef(null), submitting = useRef(false), notified = useRef(null), latest = useRef(result);
  const callbacks = useRef({ onBookingResult, onExpired }); callbacks.current = { onBookingResult, onExpired };
  function accept(value) {
    // A stale receipt from this tab must never replace another saved booking.
    if (savedBooking && value.booking_id !== savedBooking.reference) throw new Error('This checkout does not match the saved itinerary. Your saved document is still available.');
    if (latest.current?.flight?.price && JSON.stringify(latest.current.flight.price) !== JSON.stringify(value.flight?.price)) setPriceChanged(true);
    latest.current = value; setResult(value); setConsent(false);
    if (value.status !== 'review') remember(planId, value.token);
    if (!value.sandbox || !value.booking_id || !['confirmed', 'cancelled', 'failed'].includes(value.status)) return;
    const id = `${value.booking_id}:${value.status}`;
    if (notified.current === id) return;
    notified.current = id;
    callbacks.current.onBookingResult?.(planId, value);
  }
  function failed(e) { setError(e.message || 'Unable to check this booking. Try checking its status.'); if (e.status === 401) callbacks.current.onExpired?.(); }
  useEffect(() => {
    if (!offerToken && !recoveryToken) return;
    let live = true;
    if (!started.current) started.current = travelRequest(planId, `sandbox/flights/${recoveryToken ? 'status' : 'verify'}`, { token: recoveryToken || offerToken });
    started.current.then(value => { if (live) accept(value); }).catch(e => { if (live) failed(e); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [planId, offerToken, recoveryToken]);
  useEffect(() => {
    if (result?.status !== 'pending') return;
    let live = true, timer, attempts = 0;
    async function poll() {
      if (submitting.current) { timer = setTimeout(poll, 5000); return; }
      try {
        const value = await travelRequest(planId, 'sandbox/flights/status', { token: result.token });
        if (!live) return;
        accept(value);
        if (value.status === 'pending' && ++attempts < 12) timer = setTimeout(poll, 5000);
      } catch (e) { if (live) failed(e); }
    }
    timer = setTimeout(poll, 5000);
    return () => { live = false; clearTimeout(timer); };
  }, [planId, result?.status, result?.token]);
  async function perform(action, payload = {}) {
    if (submitting.current || !result?.token) return null;
    submitting.current = true; setBusy(true); setError(''); setConsent(false);
    if (action !== 'status') { setAttempted(true); remember(planId, result.token); }
    try {
      const value = await travelRequest(planId, `sandbox/flights/${action}`, { token: result.token, ...(action !== 'status' ? { confirm_mock: true } : {}), ...payload });
      // Keep confirmation delivery alive if the user left while submitting.
      accept(value); return value;
    } catch (e) { if (action === 'services') { setResult(old => ({ ...old, status: 'unknown' })); setConsent(false); } if (action === 'prebook' && e.status === 422) setAttempted(false); failed(e); return null; }
    finally { submitting.current = false; setBusy(false); }
  }
  return { result, busy, error, consent, setConsent, attempted, priceChanged, perform };
}
