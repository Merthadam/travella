// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PassengerTickets } from './PassengerTickets';
import { travelRequest } from './travelApi';
import { passengerTicketDocument } from './flightTickets';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const summary = { reference: 'book', origin: 'BUD', destination: 'FCO', departureDate: '2026-11-06', returnDate: '2026-11-09', itinerary: { passengerCount: 2, confirmationCode: 'AIRLINE', outbound: [], inbound: [], extras: [{ passengerIndex: 0, quantity: 1, label: 'Seat 1A' }, { passengerIndex: 1, quantity: 1, label: 'Seat 2B' }] } };
const records = { sandbox: true, provider: 'LiteAPI', booking_id: 'book', status: 'confirmed', passenger_count: 2, issued_at: '2026-11-03T12:00:00Z', tickets: [{ passenger_index: 0, passenger_name: 'Alex Tester', ticket_number: 'TICKET-A', status: 'issued' }, { passenger_index: 1, passenger_name: 'Sam Tester', ticket_number: 'TICKET-B', status: 'issued' }] };
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('loads only on explicit action and downloads each passenger separately', async () => {
  travelRequest.mockResolvedValue(records);
  const blobs = [];
  vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:test'; }), revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    render(<PassengerTickets planId="plan" summary={summary}/>);
    expect(travelRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Download passenger 1 ticket record' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download passenger 2 ticket record' }));
    expect(blobs).toHaveLength(2); expect(click).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toContain('Passenger 2');
    expect(travelRequest).toHaveBeenCalledWith('plan', 'sandbox/flights/tickets', { booking_id: 'book' }, expect.any(AbortSignal));
  } finally { click.mockRestore(); vi.unstubAllGlobals(); }
});
it('keeps missing tickets unavailable and preserves explicit passenger association', async () => {
  travelRequest.mockResolvedValue({ ...records, tickets: records.tickets.slice(1) });
  render(<PassengerTickets planId="plan" summary={summary}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
  expect(await screen.findByText('No ticket record supplied yet.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Download passenger 1 ticket record' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Download passenger 2 ticket record' })).toBeTruthy();
});
it('handles loading, failure and retry without submitting any booking', async () => {
  let reject;
  travelRequest.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(records);
  render(<PassengerTickets planId="plan" summary={summary}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
  expect(screen.getByRole('button', { name: 'Loading tickets…' }).disabled).toBe(true);
  reject(new Error('offline'));
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retry ticket records' }));
  expect(await screen.findByRole('button', { name: 'Download passenger 1 ticket record' })).toBeTruthy();
});
it.each(['pending', 'cancelled'])('does not offer downloads for a %s booking', async status => {
  travelRequest.mockResolvedValue({ ...records, status });
  render(<PassengerTickets planId="plan" summary={summary}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
  await screen.findByRole('button', { name: 'Refresh ticket records' });
  expect(screen.queryByRole('button', { name: /Download passenger/ })).toBeNull();
});
it('rejects a response for a different booking', async () => {
  travelRequest.mockResolvedValue({ ...records, booking_id: 'other' });
  render(<PassengerTickets planId="plan" summary={summary}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: /Download passenger/ })).toBeNull();
});
it('aborts pending ticket lookup on unmount', async () => {
  travelRequest.mockReturnValue(new Promise(() => {}));
  const view = render(<PassengerTickets planId="plan" summary={summary}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Load passenger tickets' }));
  const signal = travelRequest.mock.calls[0][3]; view.unmount(); expect(signal.aborted).toBe(true);
});
it('isolates each document, escapes provider content and excludes private fields', () => {
  const value = { ...records, tickets: [{ ...records.tickets[0], passenger_name: '<img src=x onerror=alert(1)>', passport: 'PRIVATE' }, records.tickets[1]], contact: 'PRIVATE' };
  const html = passengerTicketDocument(summary, value, 0);
  expect(html).toContain('&lt;img'); expect(html).not.toContain('<img');
  for (const forbidden of ['PRIVATE', 'Sam Tester', 'TICKET-B', 'Seat 2B']) expect(html).not.toContain(forbidden);
  expect(html).toContain('TICKET-A'); expect(html).toContain('Seat 1A');
  expect(html).toContain('NOT VALID FOR TRAVEL'); expect(html).toContain('not an airline-original');
  expect(() => passengerTicketDocument(summary, { ...records, tickets: [{ ...records.tickets[0], status: 'void' }] }, 0)).toThrow();
});
