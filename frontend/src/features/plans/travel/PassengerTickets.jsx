import React, { useEffect, useRef, useState } from 'react';
import { travelRequest } from './travelApi';
import { downloadPassengerTicket, validateTicketRecords } from './flightTickets';

export function PassengerTickets({ planId, summary }) {
  const [records, setRecords] = useState(null), [loading, setLoading] = useState(false);
  const [error, setError] = useState(''), [downloaded, setDownloaded] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function load() {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setDownloaded(''); setRecords(null);
    try {
      const value = await travelRequest(planId, 'sandbox/flights/tickets', { booking_id: summary.reference }, controller.signal);
      if (!controller.signal.aborted) setRecords(validateTicketRecords(value, summary));
    } catch (e) {
      if (!controller.signal.aborted) setError(e.status === 401 ? 'Your session expired. Sign in again to load ticket records.' : 'Ticket records could not be loaded. Your saved itinerary is still available.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function download(index) {
    try {
      downloadPassengerTicket(summary, records, index);
      setDownloaded(`Passenger ${records.tickets[index].passenger_index + 1} ticket record download started.`);
    } catch { setError('This ticket record could not be downloaded. Reload the ticket records and try again.'); }
  }
  return <section className="passenger-tickets" aria-label="Passenger tickets" aria-busy={loading}>
    <h3>Passenger tickets</h3>
    <p>Get a separate ticket record for each traveler.</p>
    {error && <p role="alert" className="flight-error">{error}</p>}
    {loading && <p role="status">Loading ticket records…</p>}
    {records?.status === 'confirmed' && Array.from({ length: records.passenger_count }, (_, passengerIndex) => {
      const tickets = records.tickets.map((ticket, index) => ({ ...ticket, index })).filter(t => t.passenger_index === passengerIndex);
      return <div className="passenger-ticket" key={passengerIndex}>
        <strong>Passenger {passengerIndex + 1}{tickets[0] ? ` · ${tickets[0].passenger_name}` : ''}</strong>
        {!tickets.length && <p>No ticket record supplied yet.</p>}
        {tickets.map(ticket => <div key={ticket.index}><p>Ticket {ticket.ticket_number} · {ticket.status}</p>
          {ticket.status === 'issued' ? <button type="button" className="flight-secondary" onClick={() => download(ticket.index)}>Download passenger {passengerIndex + 1} ticket record</button> : <p>This ticket is not issued; download is unavailable.</p>}
        </div>)}
      </div>;
    })}
    {records && records.status !== 'confirmed' && <p role="status">{records.status === 'cancelled' ? 'This booking is cancelled. Ticket downloads are unavailable.' : 'The booking is not confirmed yet. Check again later for ticket records.'}</p>}
    <button type="button" className="flight-secondary" disabled={loading} onClick={load}>{loading ? 'Loading tickets…' : error ? 'Retry ticket records' : records ? 'Refresh ticket records' : 'Load passenger tickets'}</button>
    <small>Travella-generated HTML · printable as PDF. Not an airline-original document or boarding pass. Sandbox only.</small>
    {downloaded && <p role="status">{downloaded}</p>}
  </section>;
}
