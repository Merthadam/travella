import { useEffect, useRef, useState } from 'react';
import { travelRequest } from './travelApi';
import { rememberStayReceipt, stayCheckoutUpdated } from './useStayBookingSync';
import { savedStayResult } from './stayReservation';
export function useStayCheckout({ planId, offerToken, recoveryToken, savedBooking, onBookingResult, onExpired }) {
  const [result, setResult] = useState(() => savedStayResult(savedBooking));
  const [busy, setBusy] = useState(Boolean(!savedBooking && (offerToken || recoveryToken)));
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(Boolean(recoveryToken && !savedBooking));
  const started = useRef(null), submitting = useRef(false), notified = useRef(null), callbacks = useRef({});
  callbacks.current = { onBookingResult, onExpired };
  function accept(value) {
    if (savedBooking && value.booking_id !== savedBooking.reference) throw new Error('This checkout does not match your saved stay.');
    setError(''); setResult(value); if (value.status !== 'review') rememberStayReceipt(planId, value.token);
    if (!value.sandbox || !value.booking_id || !['confirmed','cancelled','failed'].includes(value.status)) return;
    const id = JSON.stringify([value.booking_id, value.status, value.reservation]);
    if (notified.current === id) return;
    notified.current = id; callbacks.current.onBookingResult?.(planId, value);
  }
  function failed(error) { setError(error.message || 'Unable to check this reservation.'); if (error.status === 401) callbacks.current.onExpired?.(); }
  useEffect(() => {
    if (savedBooking || (!offerToken && !recoveryToken)) return;
    let live = true;
    if (!started.current) started.current = travelRequest(planId, recoveryToken ? 'sandbox/status' : 'sandbox/prebook', { token: recoveryToken || offerToken });
    started.current.then(value => { if (live) { accept(value); if (value.status !== 'review') setAttempted(true); } }).catch(error => { if (live) failed(error); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [planId, offerToken, recoveryToken, savedBooking]);
  useEffect(() => {
    if (!attempted || !result?.token || !['review','pending','not_found'].includes(result.status)) return;
    let live = true, timer, attempts = 0;
    async function poll() {
      if (!submitting.current) try { const value = await travelRequest(planId, 'sandbox/status', { token: result.token }); if (!live) return; accept(value); if (!['review','pending','not_found'].includes(value.status)) return; } catch (error) { if (live) failed(error); }
      if (live && ++attempts < 12) timer = setTimeout(poll, 5000);
    }
    timer = setTimeout(poll, 5000); return () => { live = false; clearTimeout(timer); };
  }, [planId, attempted, result?.status, result?.token]);
  async function perform(action, guests) {
    if (submitting.current || !result?.token) return;
    submitting.current = true; setBusy(true); setError('');
    if (action === 'book') { setAttempted(true); rememberStayReceipt(planId, result.token); }
    try {
      const value = await travelRequest(planId, `sandbox/${action}`, { token: result.token, ...(action === 'book' ? { confirm_mock: true, guests } : {}) });
      accept(value); return value;
    } catch (error) { failed(error); }
    finally { submitting.current = false; setBusy(false); window.dispatchEvent(new CustomEvent(stayCheckoutUpdated, { detail: planId })); }
  }
  return { result, busy, error, attempted, perform };
}
