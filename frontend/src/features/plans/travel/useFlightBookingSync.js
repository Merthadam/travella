import { useEffect, useRef } from 'react';
import { travelRequest } from './travelApi';

export const flightCheckoutUpdated = 'travella:flight-checkout-updated';
export const flightCheckoutKey = planId => `travella:mock-flight:${planId}`;

// The receipt belongs to the Plan, not the checkout dialog. Returning to the
// canvas (or reloading it) must recover confirmation even after that dialog closed.
export function useFlightBookingSync(planId, enabled, onBookingResult) {
  const callback = useRef(onBookingResult);
  callback.current = onBookingResult;
  useEffect(() => {
    if (!enabled) return;
    let live = true, timer, running = false, rerun = false, attempts = 0;
    async function check() {
      if (!live) return;
      if (running) { rerun = true; return; }
      clearTimeout(timer);
      let token;
      try { token = sessionStorage.getItem(flightCheckoutKey(planId)); } catch { return; }
      if (!token) return;
      running = true;
      try {
        const result = await travelRequest(planId, 'sandbox/flights/status', { token });
        if (!live) return;
        if (result.sandbox && result.mode === 'flights' && result.booking_id && ['confirmed', 'cancelled', 'failed'].includes(result.status)) {
          callback.current?.(planId, result);
        } else if (result.status === 'pending' && ++attempts < 12) {
          timer = setTimeout(check, 5000);
        }
      } catch {
        // Keep the existing card on lookup failure. Focus/return retries, and the
        // checkout retains its explicit status check and provider error message.
      } finally {
        running = false;
        if (rerun && live) { rerun = false; void check(); }
      }
    }
    const focus = () => { attempts = 0; void check(); };
    const updated = event => { if (event.detail === planId) focus(); };
    void check();
    window.addEventListener('focus', focus);
    window.addEventListener(flightCheckoutUpdated, updated);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('focus', focus); window.removeEventListener(flightCheckoutUpdated, updated); };
  }, [planId, enabled]);
}
