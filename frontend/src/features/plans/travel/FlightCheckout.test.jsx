// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FlightCheckout } from './FlightCheckout';
import { travelRequest } from './travelApi';
import { flightBookingSummary, itineraryDocument } from './flightItinerary';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const segment = { origin: 'BUD', destination: 'FCO', departure_at: '2027-02-03T10:00:00', arrival_at: '2027-02-03T12:00:00', flight_number: 'NT123', airline: 'Nuitée Air' };
const review = { sandbox: true, mode: 'flights', status: 'review', token: 'opaque-review', passenger_count: 1, passenger_ages: [30], country_code: 'HU', flight: { airlines: ['Nuitée Air'], price: { amount: '150', currency: 'EUR' }, outbound: { segments: [segment] }, inbound: { segments: [{ ...segment, origin: 'FCO', destination: 'BUD', departure_at: '2027-02-07T10:00:00', arrival_at: '2027-02-07T12:00:00' }] } } };
const ready = { ...review, status: 'ready_to_book', token: 'prebook', flight: { ...review.flight, price: { amount: '175', currency: 'EUR' } } };
const confirmed = { ...ready, status: 'confirmed', token: 'booked', booking_id: 'TEST' };
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
afterEach(cleanup);
async function reserve() {
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to passengers →' }));
  const button = await screen.findByRole('button', { name: 'Reserve test fare & continue' });
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(button);
}
async function reachPayment() {
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to baggage →' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to review & pay →' }));
}
it('collects transient test passengers, reconfirms the refreshed fare, and waits for provider readback', async () => {
  const notify = vi.fn();
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce(ready).mockResolvedValueOnce({ ...confirmed, status: 'pending' }).mockResolvedValueOnce(confirmed);
  render(<FlightCheckout planId="p" offerToken="offer" onBookingResult={notify}/>);
  await reserve();
  expect(travelRequest.mock.calls[1][2]).toMatchObject({ confirm_mock: true, passengers: [{ first_name: 'Alex', document_number: 'TEST00000' }], contact: { email: 'sandbox-guest@example.com' } });
  await screen.findByText('No seat-selection charge added');
  expect(screen.queryByRole('button', { name: /Seat 10/ })).toBeNull();
  await reachPayment();
  const confirm = screen.getByRole('button', { name: 'Confirm test booking · €175.00' });
  expect(confirm.disabled).toBe(true);
  expect(screen.queryByLabelText(/Card number/)).toBeNull();
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(confirm);
  await screen.findByText('Awaiting confirmation.'); expect(notify).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Check booking status' }));
  await screen.findByText('Your test itinerary is ready.');
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', expect.objectContaining({ status: 'confirmed', booking_id: 'TEST' }));
  expect(travelRequest.mock.calls.map(c => c[1])).toEqual(['sandbox/flights/verify', 'sandbox/flights/prebook', 'sandbox/flights/book', 'sandbox/flights/status']);
  expect(sessionStorage.getItem('travella:mock-flight:p')).toBe('booked');
  expect(JSON.stringify(sessionStorage)).not.toMatch(/Tester|TEST00000|sandbox-guest/);
});
it('recovers a lost prebook response without offering another reservation', async () => {
  travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('Unable to verify')).mockResolvedValueOnce({ ...review, status: 'unknown' });
  render(<FlightCheckout planId="p" offerToken="offer"/>); await reserve();
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Reserve test fare & continue' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check booking status' }));
  await screen.findByText('Checking the reservation.');
  expect(travelRequest.mock.calls.filter(c => c[1].endsWith('/prebook'))).toHaveLength(1);
});
it('allows fixing validation errors before any provider reservation was made', async () => {
  travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(Object.assign(new Error('Check test passengers'), { status: 422 }));
  render(<FlightCheckout planId="p" offerToken="offer"/>); await reserve();
  await screen.findByText('Check test passengers');
  expect(screen.getByRole('button', { name: 'Reserve test fare & continue' }).disabled).toBe(true);
  expect(screen.getByLabelText('Given name').disabled).toBe(false);
});
it('recovery resumes at final review without inventing or storing passenger details', async () => {
  travelRequest.mockResolvedValue(ready);
  render(<FlightCheckout planId="p" recoveryToken="receipt"/>);
  expect(await screen.findByRole('button', { name: 'Confirm test booking · €175.00' })).toBeTruthy();
  expect(screen.getByText('1 test passengers supplied for this reservation')).toBeTruthy();
  expect(travelRequest).toHaveBeenCalledExactlyOnceWith('p', 'sandbox/flights/status', { token: 'receipt' });
});
it('delivers confirmation after leaving a submitted checkout', async () => {
  const notify = vi.fn(); let finish;
  travelRequest.mockResolvedValueOnce(ready).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<FlightCheckout planId="p" recoveryToken="receipt" onBookingResult={notify}/>);
  const button = await screen.findByRole('button', { name: 'Confirm test booking · €175.00' });
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(button);
  await waitFor(() => expect(finish).toBeTypeOf('function')); view.unmount(); finish(confirmed);
  await waitFor(() => expect(notify).toHaveBeenCalledExactlyOnceWith('p', expect.objectContaining({ status: 'confirmed' })));
  expect(sessionStorage.getItem('travella:mock-flight:p')).toBe('booked');
});
it('polls pending bookings before exposing a confirmed document', async () => {
  const notify = vi.fn(); travelRequest.mockResolvedValueOnce({ ...confirmed, status: 'pending' }).mockResolvedValueOnce(confirmed);
  render(<FlightCheckout planId="p" recoveryToken="receipt" onBookingResult={notify}/>);
  await screen.findByText('Awaiting confirmation.');
  await screen.findByText('Your test itinerary is ready.', {}, { timeout: 6500 });
  expect(notify).toHaveBeenCalledOnce();
}, 8000);
it('reopens a durable itinerary without a browser token and exports only safe document fields', async () => {
  const summary = flightBookingSummary({ ...confirmed, passengers: [{ document: 'PRIVATE' }], contact: { email: 'PRIVATE' } });
  const back = vi.fn(); render(<FlightCheckout planId="p" savedBooking={summary} onBackToPlan={back}/>);
  expect(await screen.findByText('Your test itinerary is ready.')).toBeTruthy(); expect(travelRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to Plan →' })); expect(back).toHaveBeenCalledOnce();
  const html = itineraryDocument(summary);
  expect(html).toContain('NT123'); expect(html).toContain('175.00'); expect(html).toContain('NOT VALID FOR TRAVEL');
  expect(html).not.toMatch(/PRIVATE|opaque-review|prebook|booked|TEST00000|sandbox-guest/);
});
it('escapes provider strings in downloaded documents and supports old summary-only receipts', () => {
  const summary = { reference: '<script>bad</script>', origin: 'BUD', destination: 'FCO', departureDate: '2027-02-03', returnDate: '2027-02-07' };
  const html = itineraryDocument(summary); expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('Price unavailable');
});
