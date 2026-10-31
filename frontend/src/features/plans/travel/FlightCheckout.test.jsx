// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
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
  await screen.findByText(/No selectable seats returned/);
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

it('offers returned seats and baggage instead of disconnected steps', async () => {
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce({ ...ready, services: [
    { id: 'seat-12a', kind: 'seat', label: '12A', segment_index: 0, passenger_indexes: [0], price: { amount: '12', currency: 'EUR' } },
    { id: 'bag-20kg', kind: 'baggage', label: 'Checked bag · 20 kg', segment_index: 0, passenger_indexes: [0], price: { amount: '30', currency: 'EUR' } },
  ] });
  render(<FlightCheckout planId="p" offerToken="offer"/>); await reserve();
  expect(await screen.findByRole('button', { name: /12A/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to baggage →' }));
  expect(await screen.findByLabelText(/Checked bag · 20 kg/)).toBeTruthy();
});

it('applies selected seats, updates the total and preserves extras in the saved document', async () => {
  const seat = { id: 'seat', kind: 'seat', label: 'Seat 12A (BUD→FCO)', segment_index: 0, passenger_indexes: [0], price: { amount: '12', currency: 'EUR' } };
  const selected = { ...seat, passenger_index: 0, quantity: 1 };
  const changed = { ...ready, token: 'changed', services: [seat], selected_services: [selected], flight: { ...ready.flight, price: { amount: '187', currency: 'EUR' } } };
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce({ ...ready, services: [seat] }).mockResolvedValueOnce(changed);
  render(<FlightCheckout planId="p" offerToken="offer"/>); await reserve();
  fireEvent.click(await screen.findByRole('button', { name: /Seat 12A/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue to baggage →' }));
  await screen.findByRole('heading', { name: 'Check what you can bring.' });
  expect(travelRequest.mock.calls[2][2]).toEqual({ token: 'prebook', confirm_mock: true, selected_services: [{ id: 'seat', passenger_index: 0, quantity: 1 }] });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to review & pay →' }));
  expect(screen.getByRole('button', { name: 'Confirm test booking · €187.00' }).disabled).toBe(true);
  expect(screen.getByText(/Seat 12A/, { selector: 'li' })).toBeTruthy();
  const summary = flightBookingSummary({ ...changed, status: 'confirmed', booking_id: 'TEST' });
  expect(summary.itinerary.extras).toEqual([{ kind: 'seat', label: seat.label, segmentIndex: 0, passengerIndex: 0, quantity: 1, amount: '12', currency: 'EUR' }]);
  expect(itineraryDocument(summary)).toContain('Seat 12A');
});

it('mounts a prepared checkout with its final heading and itinerary, without verifying the token twice', () => {
  render(<FlightCheckout planId="p" offerToken="offer" initialReview={review}/>);
  expect(screen.getByRole('heading', { name: 'Book your flights to FCO.' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Review your flights.' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue to passengers →' }).disabled).toBe(false);
  expect(screen.queryByText('Verifying availability and the current fare…')).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('travella:mock-flight:p')).toBeNull();
});

it('keeps passenger country choices independent and submits only selected country codes', async () => {
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce(ready);
  render(<FlightCheckout planId="p" offerToken="offer"/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to passengers →' }));
  const nationality = screen.getByRole('combobox', { name: 'Nationality' });
  const issuer = screen.getByRole('combobox', { name: 'Passport issuing country' });
  expect(nationality.value).toBe('Hungary');
  fireEvent.click(nationality);
  expect(within(screen.getByRole('listbox', { name: 'Nationality choices' })).getAllByRole('option')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Next Nationality choices' }));
  expect(screen.getByText('Page 2 of 25')).toBeTruthy();
  fireEvent.change(nationality, { target: { value: 'Iceland' } });
  fireEvent.keyDown(nationality, { key: 'Enter' });
  expect(nationality.value).toBe('Iceland');
  expect(issuer.value).toBe('Hungary');
  fireEvent.click(issuer);
  fireEvent.change(issuer, { target: { value: 'no-such-country' } });
  expect(screen.getByText('No matches. Try another search.')).toBeTruthy();
  fireEvent.keyDown(issuer, { key: 'Escape' });
  expect(issuer.value).toBe('Hungary');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Reserve test fare & continue' }));
  await waitFor(() => expect(travelRequest).toHaveBeenCalledTimes(2));
  expect(travelRequest.mock.calls[1][2].passengers[0]).toMatchObject({ nationality: 'IS', document_issue_country: 'HU' });
  await screen.findByRole('button', { name: 'Continue to baggage →' });
  fireEvent.click(screen.getByRole('button', { name: /2\s*Passengers/ }));
  expect(screen.getByRole('combobox', { name: 'Nationality' }).matches(':disabled')).toBe(true);
});

it('shows inline errors after blur, blocks invalid submission and focuses the first invalid field', async () => {
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce(ready);
  render(<FlightCheckout planId="p" offerToken="offer"/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to passengers →' }));
  const name = screen.getByLabelText('Given name');
  fireEvent.change(name, { target: { value: '   ' } });
  expect(screen.queryByText('Enter a name.')).toBeNull();
  fireEvent.blur(name);
  expect(name.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(name.getAttribute('aria-describedby')).textContent).toBe('Enter a name.');
  fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '2020-01-01' } });
  const expiry = screen.getByLabelText('Passport valid until');
  expect(expiry.min).toBe('2027-02-08');
  fireEvent.change(expiry, { target: { value: '2027-02-07' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Reserve test fare & continue' }));
  expect(document.activeElement).toBe(name);
  expect(screen.getByText(/adult fare requires age 12/)).toBeTruthy();
  expect(screen.getByText(/Passport expiry must be after/)).toBeTruthy();
  expect(travelRequest).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Fill with test passengers' }));
  expect(screen.queryByText('Enter a name.')).toBeNull();
  expect(name.hasAttribute('aria-invalid')).toBe(false);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Reserve test fare & continue' }));
  await screen.findByText(/No selectable seats returned/);
  expect(travelRequest.mock.calls.filter(call => call[1].endsWith('/prebook'))).toHaveLength(1);
});

it('validates contact fields inline without a request and clears errors as they are corrected', async () => {
  travelRequest.mockResolvedValueOnce(review);
  render(<FlightCheckout planId="p" offerToken="offer"/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to passengers →' }));
  for (const [label, value] of [['Contact family name', ' '], ['Test email', 'real@domain.com'], ['Phone country code', '+36'], ['Test phone number', '123']]) {
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value } }); fireEvent.blur(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  }
  const input = screen.getByLabelText('Test email');
  fireEvent.change(input, { target: { value: 'test@example.com' } });
  expect(input.hasAttribute('aria-invalid')).toBe(false);
  expect(travelRequest).toHaveBeenCalledTimes(1);
});

it('returns an empty checkout to Flights without rendering the empty page', () => {
  const onEmpty = vi.fn();
  render(<FlightCheckout planId="p" onEmpty={onEmpty}/>);
  expect(onEmpty).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('region', { name: 'Flight checkout' })).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
});

it('waits for reservation recovery and keeps recovery failures visible instead of redirecting', async () => {
  let reject;
  travelRequest.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  const onEmpty = vi.fn();
  render(<FlightCheckout planId="p" recoveryToken="receipt" onEmpty={onEmpty}/>);
  expect(onEmpty).not.toHaveBeenCalled();
  reject(new Error('Unable to check reservation status.'));
  await screen.findByText('This flight could not be verified.');
  expect(onEmpty).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Return to flights' })).toBeTruthy();
});

it('completes travelers independently, opens the next section and preserves edits without reserving', () => {
  render(<FlightCheckout planId="p" initialReview={{ ...review, passenger_count: 2, passenger_ages: [30, 7] }}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to passengers →' }));
  expect(screen.getAllByLabelText('Given name')).toHaveLength(1);
  expect(screen.queryByLabelText('Test email')).toBeNull();
  fireEvent.change(screen.getByLabelText('Given name'), { target: { value: 'Robin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Done · next traveler →' }));
  expect(screen.getByRole('button', { name: /Robin Tester.*Complete.*Edit/ }).getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByLabelText('Given name').value).toBe('Sam');
  expect(screen.getByRole('button', { name: /Passenger 2 Child/ })).toBe(document.activeElement);
  fireEvent.click(screen.getByRole('button', { name: 'Done · booking contact →' }));
  expect(screen.queryByLabelText('Given name')).toBeNull();
  expect(screen.getByLabelText('Test email')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Robin Tester.*Edit/ }));
  expect(screen.getByLabelText('Given name').value).toBe('Robin');
  fireEvent.change(screen.getByLabelText('Given name'), { target: { value: 'Jamie' } });
  expect(screen.queryByRole('button', { name: /Robin Tester/ })).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
  expect(JSON.stringify(sessionStorage)).not.toMatch(/Robin|Sam|Jamie|TEST00000/);
});

it('opens and focuses invalid collapsed traveler and contact sections before reservation', () => {
  render(<FlightCheckout planId="p" initialReview={{ ...review, passenger_count: 2, passenger_ages: [30, 30] }}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to passengers →' }));
  fireEvent.change(screen.getByLabelText('Given name'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Done · next traveler →' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Given name'));
  expect(screen.getByText('Enter a name.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Passenger 2 Adult/ }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Reserve test fare & continue' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Given name'));
  expect(screen.getByLabelText('Given name').value).toBe('');
  fireEvent.change(screen.getByLabelText('Given name'), { target: { value: 'Alex' } });
  fireEvent.click(screen.getByRole('button', { name: /Booking contact One contact/ }));
  fireEvent.change(screen.getByLabelText('Test email'), { target: { value: 'bad@example.org' } });
  fireEvent.click(screen.getByRole('button', { name: /Passenger 2 Adult/ }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Reserve test fare & continue' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Test email'));
  expect(screen.getByLabelText('Test email').getAttribute('aria-invalid')).toBe('true');
  expect(travelRequest).not.toHaveBeenCalled();
});

it('keeps solo traveler and shared contact visible and resets consent on data changes', () => {
  render(<FlightCheckout planId="p" initialReview={review}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to passengers →' }));
  expect(screen.getByLabelText('Given name')).toBeTruthy();
  expect(screen.getByLabelText('Test email')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Done ·/ })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Family name'), { target: { value: 'Sample' } });
  expect(screen.getByRole('checkbox').checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Reserve test fare & continue' }).disabled).toBe(true);
});
