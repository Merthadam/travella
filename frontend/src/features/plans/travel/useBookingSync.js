import { useEffect, useRef } from 'react';
import { travelRequest } from './travelApi';
import { flightCheckoutUpdated, stayCheckoutUpdated, readFlightReceipt, readStayReceipt } from './bookingReceipts';

const policies = {
  flights: { route: 'sandbox/flights/status', readReceipt: readFlightReceipt, event: flightCheckoutUpdated, retry: ['pending'] },
  stays: { route: 'sandbox/status', readReceipt: readStayReceipt, event: stayCheckoutUpdated, retry: ['pending', 'not_found'] },
};

// Receipts belong to the Plan, so recovery continues after the checkout closes.
export function useBookingSync(planId, mode, enabled, onBookingResult) {
  const callback = useRef(onBookingResult);
  callback.current = onBookingResult;
  useEffect(() => {
    if (!enabled) return;
    const policy = policies[mode];
    let live = true, timer, running = false, rerun = false, attempts = 0;

    async function check() {
      if (!live) return;
      if (running) { rerun = true; return; }
      clearTimeout(timer);
      const token = policy.readReceipt(planId);
      if (!token) return;
      running = true;
      try {
        const result = await travelRequest(planId, policy.route, { token });
        if (!live) return;
        // Ignore results for a receipt that was replaced during this request.
        if (token !== policy.readReceipt(planId)) { rerun = true; return; }
        if (result.sandbox && result.booking_id && (mode !== 'flights' || result.mode === 'flights') && ['confirmed', 'cancelled', 'failed'].includes(result.status)) {
          callback.current?.(planId, result);
        } else if (policy.retry.includes(result.status) && ++attempts < 12) {
          timer = setTimeout(check, 5000);
        }
      } catch {
        // Preserve the saved card. Focus or a checkout update can retry the lookup.
      } finally {
        running = false;
        if (rerun && live) { rerun = false; void check(); }
      }
    }

    const refresh = () => { attempts = 0; void check(); };
    const updated = event => { if (event.detail === planId) refresh(); };
    void check();
    window.addEventListener('focus', refresh);
    window.addEventListener(policy.event, updated);
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(policy.event, updated);
    };
  }, [planId, mode, enabled]);
}
