import { useEffect, useRef } from 'react';
import { travelRequest } from './travelApi';
export const stayCheckoutUpdated = 'travella:stay-checkout-updated';
export const stayCheckoutKey = planId => `travella:mock-checkout:${planId}`;
export function readStayReceipt(planId) { try { return sessionStorage.getItem(stayCheckoutKey(planId)); } catch { return null; } }
export function rememberStayReceipt(planId, token) {
  if (!token) return;
  try { sessionStorage.setItem(stayCheckoutKey(planId), token); } catch { /* Optional tab recovery. */ }
}
export function useStayBookingSync(planId, enabled, onBookingResult) {
  const callback = useRef(onBookingResult); callback.current = onBookingResult;
  useEffect(() => {
    if (!enabled) return;
    let live = true, timer, running = false, attempts = 0;
    async function check() {
      if (!live || running) return;
      const token = readStayReceipt(planId); if (!token) return;
      clearTimeout(timer); running = true;
      try {
        const result = await travelRequest(planId, 'sandbox/status', { token });
        if (!live) return;
        if (result.sandbox && result.booking_id && ['confirmed','cancelled','failed'].includes(result.status)) callback.current?.(planId, result);
        else if (++attempts < 12 && ['pending','not_found'].includes(result.status)) timer = setTimeout(check, 5000);
      } catch { /* Preserve saved data. Focus or checkout provides an explicit retry. */ }
      finally { running = false; }
    }
    const focus = () => { attempts = 0; void check(); };
    const updated = event => { if (event.detail === planId) focus(); };
    void check(); window.addEventListener('focus', focus); window.addEventListener(stayCheckoutUpdated, updated);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('focus', focus); window.removeEventListener(stayCheckoutUpdated, updated); };
  }, [planId, enabled]);
}
