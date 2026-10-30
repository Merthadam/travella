export const flightCheckoutUpdated = 'travella:flight-checkout-updated';
export const stayCheckoutUpdated = 'travella:stay-checkout-updated';
export const flightCheckoutKey = planId => `travella:mock-flight:${planId}`;
export const stayCheckoutKey = planId => `travella:mock-checkout:${planId}`;

function readReceipt(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export const readFlightReceipt = planId => readReceipt(flightCheckoutKey(planId));
export const readStayReceipt = planId => readReceipt(stayCheckoutKey(planId));

export function rememberStayReceipt(planId, token) {
  if (!token) return;
  try { sessionStorage.setItem(stayCheckoutKey(planId), token); } catch { /* Optional tab recovery. */ }
}
