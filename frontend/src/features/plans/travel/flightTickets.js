import { z } from 'zod';

const ticketSchema = z.object({
  passenger_index: z.number().int().min(0).max(8),
  passenger_name: z.string().min(1).max(240),
  ticket_number: z.string().min(1).max(100),
  status: z.string().min(1).max(40),
});
const recordsSchema = z.object({
  sandbox: z.literal(true), provider: z.literal('LiteAPI'), booking_id: z.string().min(1).max(100),
  status: z.enum(['confirmed', 'pending', 'cancelled']), passenger_count: z.number().int().min(1).max(9),
  issued_at: z.string().max(40).nullable(), tickets: z.array(ticketSchema).max(90),
});

export function validateTicketRecords(value, summary) {
  const records = recordsSchema.parse(value);
  if (records.booking_id !== summary.reference || (summary.itinerary?.passengerCount != null && records.passenger_count !== summary.itinerary.passengerCount)
      || records.tickets.some(t => t.passenger_index >= records.passenger_count)) throw new Error('Ticket records do not match this booking.');
  return records;
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function passengerTicketDocument(summary, value, ticketIndex) {
  const records = validateTicketRecords(value, summary), ticket = records.tickets[ticketIndex];
  if (records.status !== 'confirmed' || ticket?.status !== 'issued') throw new Error('An issued ticket record is not available.');
  const itinerary = summary.itinerary;
  const legs = [['Outbound', itinerary?.outbound], ['Return', itinerary?.inbound]].map(([label, segments]) => `<section><h2>${label}</h2>${segments?.length ? segments.map(s => `<p><strong>${escape(s.origin)} → ${escape(s.destination)}</strong><br>${escape(s.departureAt)} → ${escape(s.arrivalAt)}<br>${escape(s.airline)} ${escape(s.flightNumber)}</p>`).join('') : '<p>Detailed flight times were not saved. Refer to your booking.</p>'}</section>`).join('');
  const extras = (itinerary?.extras || []).filter(s => s.passengerIndex === ticket.passenger_index).map(s => `<p>${escape(s.quantity)} × ${escape(s.label)}</p>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Travella — Passenger ${ticket.passenger_index + 1} ticket record</title><style>body{font:16px/1.6 system-ui;color:#243e34;max-width:760px;margin:40px auto;padding:24px;overflow-wrap:anywhere}h1{font:36px Georgia}h2{font-size:20px}section{border-top:1px solid #ddd;padding:12px 0}.test{border:1px solid #b75d39;padding:12px;color:#813a23}dt{font-weight:600}dd{margin:0 0 12px}small{color:#56625b}@media print{body{margin:0}}</style></head><body><p>TRAVELLA · PASSENGER TICKET RECORD</p><h1>${escape(ticket.passenger_name)}</h1><p class="test">SANDBOX TEST ONLY — NOT VALID FOR TRAVEL. No real ticket or charge. This is not a boarding pass.</p><dl><dt>Passenger</dt><dd>${ticket.passenger_index + 1} · ${escape(ticket.passenger_name)}</dd><dt>Provider ticket number</dt><dd>${escape(ticket.ticket_number)}</dd><dt>Ticket status</dt><dd>${escape(ticket.status)}</dd><dt>Issued at</dt><dd>${escape(records.issued_at || 'Not supplied')}</dd><dt>Booking reference</dt><dd>${escape(records.booking_id)}</dd><dt>Airline confirmation</dt><dd>${escape(itinerary?.confirmationCode || 'Not saved')}</dd></dl><h2>${escape(summary.origin)} ⇄ ${escape(summary.destination)}</h2><p>${escape(summary.departureDate)} – ${escape(summary.returnDate)}</p>${legs}${extras ? `<section><h2>This passenger’s seats and baggage</h2>${extras}</section>` : ''}<small>Travella-generated record from LiteAPI ticket data, not an airline-original document or live status check. All flight times are local. Passport, contact and payment details are excluded. Open this file offline; use your browser’s Print command to save as PDF.</small></body></html>`;
}

export function downloadPassengerTicket(summary, records, ticketIndex) {
  const html = passengerTicketDocument(summary, records, ticketIndex);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `travella-test-passenger-${records.tickets[ticketIndex].passenger_index + 1}-ticket-${ticketIndex + 1}.html`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
