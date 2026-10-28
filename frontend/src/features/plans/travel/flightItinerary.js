import { flightItinerarySchema } from '../../../design-system/schemas';

// Build the durable receipt field by field. Never copy a provider response or PII.
export function flightBookingSummary(result) {
  const flight = result.flight;
  const summary = { reference: result.booking_id, origin: flight?.outbound?.segments[0]?.origin,
    destination: flight?.outbound?.segments.at(-1)?.destination,
    departureDate: flight?.outbound?.segments[0]?.departure_at?.slice(0, 10), returnDate: flight?.inbound?.segments[0]?.departure_at?.slice(0, 10) };
  const segments = leg => leg?.segments.map(s => ({ origin: s.origin, destination: s.destination, departureAt: s.departure_at, arrivalAt: s.arrival_at, airline: (s.airline || '').slice(0, 100), flightNumber: (s.flight_number || '').slice(0, 40) }));
  const parsed = flightItinerarySchema.safeParse({ outbound: segments(flight?.outbound), inbound: segments(flight?.inbound),
    passengerCount: result.passenger_count, amount: flight?.price?.amount, currency: flight?.price?.currency,
    baggage: (flight?.baggage_summary || '').slice(0, 500), fareConditions: (flight?.cancellation_summary || '').slice(0, 1000), confirmationCode: (result.confirmation_code || '').slice(0, 100), extras: (result.selected_services || []).map(s => ({ kind: s.kind, label: s.label.slice(0, 200), segmentIndex: s.segment_index, passengerIndex: s.passenger_index, quantity: s.quantity, amount: s.price.amount, currency: s.price.currency })) });
  if (parsed.success) summary.itinerary = parsed.data;
  return summary;
}

export function formatFlightPrice(price) {
  if (price?.amount == null || !price.currency || !Number.isFinite(Number(price.amount))) return 'Price unavailable';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency }).format(Number(price.amount)); }
  catch { return `${price.amount} ${price.currency}`; }
}

export function savedFlightResult(summary) {
  if (!summary) return null;
  const itinerary = summary.itinerary;
  const leg = (segments, origin, destination, date) => ({ segments: segments?.map(s => ({ origin: s.origin, destination: s.destination, departure_at: s.departureAt, arrival_at: s.arrivalAt, airline: s.airline, flight_number: s.flightNumber })) || [{ origin, destination, departure_at: date, arrival_at: '', flight_number: '' }] });
  return { sandbox: true, mode: 'flights', status: 'confirmed', booking_id: summary.reference, confirmation_code: itinerary?.confirmationCode,
    selected_services: (itinerary?.extras || []).map(s => ({ kind: s.kind, label: s.label, segment_index: s.segmentIndex, passenger_index: s.passengerIndex, quantity: s.quantity, price: { amount: s.amount, currency: s.currency } })), passenger_count: itinerary?.passengerCount, flight: { outbound: leg(itinerary?.outbound, summary.origin, summary.destination, summary.departureDate), inbound: leg(itinerary?.inbound, summary.destination, summary.origin, summary.returnDate), airlines: [],
      price: { amount: itinerary?.amount, currency: itinerary?.currency }, baggage_summary: itinerary?.baggage, cancellation_summary: itinerary?.fareConditions } };
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function itineraryDocument(summary) {
  const result = savedFlightResult(summary);
  const sections = [['Outbound', result.flight.outbound], ['Return', result.flight.inbound]].map(([label, leg]) => `<section><h2>${label}</h2>${leg.segments.map(s => `<p><strong>${escape(s.origin)} → ${escape(s.destination)}</strong><br>${escape(s.departure_at.replace('T', ' '))} → ${escape(s.arrival_at ? s.arrival_at.replace('T', ' ') : 'Arrival time not saved')}<br>${escape(s.airline)} ${escape(s.flight_number)}</p>`).join('')}</section>`).join('');
  const extras = (result.selected_services || []).map(s => `<p>Passenger ${s.passenger_index + 1} · ${escape(s.quantity)} × ${escape(s.label)} (${escape(formatFlightPrice({ ...s.price, amount: Number(s.price.amount) * s.quantity }))})</p>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Travella — Test flight itinerary</title><style>body{font:16px/1.6 system-ui;color:#243e34;max-width:760px;margin:40px auto;padding:24px}h1{font:42px Georgia}h2{font-size:20px}section{border-top:1px solid #ddd;padding:12px 0}.test{border:1px solid #b75d39;padding:12px;color:#813a23}small{color:#56625b}@media print{body{margin:0}}</style></head><body><p>TRAVELLA · FLIGHT ITINERARY</p><h1>${escape(summary.origin)} ⇄ ${escape(summary.destination)}</h1><p class="test">SANDBOX TEST ONLY — NOT VALID FOR TRAVEL. No real ticket or charge. This is not a boarding pass.</p><p>Test booking reference: <strong>${escape(summary.reference)}</strong>${result.confirmation_code ? `<br>Test airline confirmation: ${escape(result.confirmation_code)}` : ''}</p>${sections}<section><h2>Selected seats &amp; baggage</h2>${extras || '<p>No extras selected.</p>'}</section><section><p>Travelers: ${escape(result.passenger_count ?? 'Count not saved')}<br>Total: ${escape(formatFlightPrice(result.flight.price))}</p><p>Baggage: ${escape(result.flight.baggage_summary || 'Allowance not supplied.')}</p><p>Fare conditions: ${escape(result.flight.cancellation_summary || 'Detailed fare conditions not supplied.')}</p></section><small>All times are local to each airport. This document records a sandbox confirmation, not a live status check. No passenger names, contact, birth date, document or payment details are included.</small></body></html>`;
}

export function downloadItinerary(summary) {
  const url = URL.createObjectURL(new Blob([itineraryDocument(summary)], { type: 'text/html' }));
  const link = document.createElement('a'); link.href = url; link.download = 'travella-test-flight-itinerary.html'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
