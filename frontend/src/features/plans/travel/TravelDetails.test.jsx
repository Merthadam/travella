import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FlightDetails } from './FlightDetails';
import { StayDetails } from './StayDetails';
import { travelRequest } from './travelApi';

vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
beforeEach(() => {
  travelRequest.mockReset();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const future = () => new Date(Date.now() + 600000).toISOString();
const room = (id = 'original-room') => ({ id, name: id, total: { amount: 100, currency: 'EUR' }, checkout_token: 'test-token' });
function observation(mode = 'stays') {
  const leg = { segments: [{ origin: 'BUD', destination: 'LIS', departure_at: '2027-05-12T10:00:00', arrival_at: '2027-05-12T12:00:00', technical_stops: [] }], duration_minutes: 120, stops: 0 };
  const item = mode === 'stays' ? { id: 'original-hotel', hotel_id: 'provider-hotel', name: 'Test hotel', rooms: [room(), room('other-room')] } : { id: 'flight', airlines: ['Test airline'], outbound: leg, inbound: leg };
  return { item, snapshot: { mode, search_id: 'original-search', sandbox: true, criteria: { check_in: '2027-05-12', check_out: '2027-05-17' }, searched_at: new Date().toISOString(), expires_at: future() }, reference: { search_id: 'original-search', option_id: item.id, room_id: null } };
}
function refresh({ rooms = [room('fresh-room')], expiresAt = future() } = {}) {
  return { search_id: 'fresh-search', searched_at: new Date().toISOString(), expires_at: expiresAt, results: [{ id: 'fresh-hotel', rooms }] };
}
function serve(availability) {
  travelRequest.mockImplementation(async (_plan, route) => route === 'hotels/detail' ? { hotel: { description: 'Fresh hotel description' } } : availability);
}

test('flight actions use the original exact reference and perform no hotel requests', async () => {
  const onClose = vi.fn(), onDiscuss = vi.fn(), onCheckout = vi.fn();
  render(<FlightDetails observation={observation('flights')} checkoutToken="test-token" onClose={onClose} onDiscuss={onDiscuss} onCheckout={onCheckout}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Discuss flight' }));
  expect(onDiscuss).toHaveBeenCalledWith({ title: 'Test airline', reference: { search_id: 'original-search', option_id: 'flight', room_id: null } });
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onDiscuss.mock.invocationCallOrder[0]);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Continue to flight checkout' })));
  expect(onCheckout).toHaveBeenCalledWith({ offerToken: 'test-token' }, expect.any(AbortSignal));
  expect(travelRequest).not.toHaveBeenCalled();
});

test.each(['expired', 'invalid'])('flight %s evidence hides choose/discuss/checkout', expiry => {
  const entry = observation('flights'); entry.snapshot.expires_at = expiry === 'expired' ? '2000-01-01' : 'invalid';
  render(<FlightDetails observation={entry} checkoutToken="test-token" onClose={vi.fn()} onChoose={vi.fn()} onDiscuss={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Discuss flight')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue to flight checkout' })).toBeNull();
});

test('flight recovery requires a new search and a booked flight cannot enter checkout', () => {
  const entry = observation('flights'), onRefresh = vi.fn();
  const view = render(<FlightDetails observation={entry} onClose={vi.fn()} onRefresh={onRefresh}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Search again to check current availability' }));
  expect(onRefresh).toHaveBeenCalledOnce();
  view.rerender(<FlightDetails observation={entry} booked checkoutToken="test-token" onClose={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.getByRole('button', { name: 'A flight is already booked in this Plan' }).disabled).toBe(true);
});

test('stay refresh replaces rooms, exact reference and expiry together', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  serve(pending);
  const onCompare = vi.fn(), onChoose = vi.fn(), onCheckout = vi.fn();
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onCompare={onCompare} onChoose={onChoose} onCheckout={onCheckout}/>);
  expect(screen.getByText('Refreshing hotel and room details…')).toBeTruthy();
  expect(screen.queryByText('original-room')).toBeNull();
  expect(screen.queryByText('Fresh hotel description')).toBeNull();
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Compare room')).toBeNull();
  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  expect(screen.queryByText('Continue to stay checkout')).toBeNull();
  await act(async () => resolve(refresh({ expiresAt: '2000-01-01' })));
  expect(screen.queryByText('original-room')).toBeNull();
  expect(screen.getByText('fresh-room')).toBeTruthy();
  expect(screen.getByText('Fresh hotel description')).toBeTruthy();
  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('false');
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Continue to stay checkout')).toBeNull();
  fireEvent.click(screen.getByText('Compare room'));
  expect(onCompare).toHaveBeenCalledWith({ title: 'Test hotel · fresh-room', reference: { search_id: 'fresh-search', option_id: 'fresh-hotel', room_id: 'fresh-room' } });
});

test('fresh room choose and checkout use refreshed identity and token', async () => {
  serve(refresh()); const onChoose = vi.fn(), onCheckout = vi.fn();
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onChoose={onChoose} onCheckout={onCheckout}/>);
  await screen.findByText('fresh-room');
  fireEvent.click(screen.getByText('Choose for trip'));
  expect(onChoose).toHaveBeenCalledWith({ title: 'Test hotel · fresh-room', reference: { search_id: 'fresh-search', option_id: 'fresh-hotel', room_id: 'fresh-room' } });
  fireEvent.click(screen.getByText('Continue to stay checkout'));
  expect(onCheckout).toHaveBeenCalledWith({ offerToken: 'test-token' });
});

test.each(['historical', 'room'])('stay %s observation does not refresh', kind => {
  const entry = observation();
  if (kind === 'historical') entry.historical = true;
  else entry.reference.room_id = 'original-room';
  const onDiscuss = vi.fn();
  render(<StayDetails planId="plan" observation={entry} detached onClose={vi.fn()} onDiscuss={onDiscuss}/>);
  expect(travelRequest).not.toHaveBeenCalled();
  expect(screen.getByText(/Original observed offer/)).toBeTruthy();
  expect(screen.getByText(/Earlier search/)).toBeTruthy();
  fireEvent.click(screen.getAllByText('Discuss room')[0]);
  expect(onDiscuss).toHaveBeenCalledWith({ title: 'Test hotel · original-room', reference: { search_id: 'original-search', option_id: 'original-hotel', room_id: 'original-room' } });
  if (kind === 'room') expect(screen.queryByText('other-room')).toBeNull();
});

test('failed refresh preserves original rooms and reference, reports auth expiry and retries to empty', async () => {
  travelRequest.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
  const onExpired = vi.fn(), onDiscuss = vi.fn();
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onExpired={onExpired} onDiscuss={onDiscuss}/>);
  await screen.findByRole('alert');
  expect(onExpired).toHaveBeenCalledOnce();
  fireEvent.click(screen.getAllByText('Discuss room')[0]);
  expect(onDiscuss.mock.calls[0][0].reference).toEqual({ search_id: 'original-search', option_id: 'original-hotel', room_id: 'original-room' });
  serve(refresh({ rooms: [] }));
  fireEvent.click(screen.getByText('Retry details'));
  await screen.findByText('No room offers are available for these dates.');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText('original-room')).toBeNull();
});

test('closing aborts a pending refresh, ignores its late auth failure and restores focus', async () => {
  let reject;
  travelRequest.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const onExpired = vi.fn(), onClose = vi.fn();
  const view = render(<StayDetails planId="plan" observation={observation()} onClose={onClose} onExpired={onExpired}/>);
  const signal = travelRequest.mock.calls[0][3];
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(onClose).toHaveBeenCalledOnce();
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(document.activeElement).toBe(trigger);
  await act(async () => reject(Object.assign(new Error('late'), { status: 401 })));
  expect(onExpired).not.toHaveBeenCalled();
  trigger.remove();
});

test('itinerary offers direct checkout and optional fare details without implicit actions', () => {
  const entry = observation('flights');
  entry.item.price = { amount: '762.80', currency: 'EUR', estimated: true, excluded_taxes: [{ amount: '8', currency: 'EUR', name: 'Airport tax' }] };
  const onChoose = vi.fn(), onCheckout = vi.fn();
  render(<FlightDetails observation={entry} checkoutToken="exact-token" onClose={vi.fn()} onChoose={onChoose} onCheckout={onCheckout}/>);
  expect(screen.getByRole('heading', { name: 'Outbound' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Return' })).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: 'Flight review steps' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Review fare' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Continue to flight checkout' }).disabled).toBe(false);
  fireEvent.click(screen.getByText('Baggage & fare conditions'));
  expect(screen.getByText('Baggage allowance not supplied.')).toBeTruthy();
  expect(screen.getByText('Cancellation terms unavailable')).toBeTruthy();
  expect(screen.getByText(/Estimated/)).toBeTruthy();
  expect(screen.getByText(/Airport tax/)).toBeTruthy();
  expect(onChoose).not.toHaveBeenCalled(); expect(onCheckout).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Choose for trip' }));
  expect(onChoose).toHaveBeenCalledWith({ title: 'Test airline', reference: { search_id: 'original-search', option_id: 'flight', room_id: null } });
});

test('an offer expiring during itinerary review removes actions and provides explicit recovery', () => {
  vi.useFakeTimers();
  const entry = observation('flights'); entry.snapshot.expires_at = new Date(Date.now() + 1000).toISOString();
  const onCheckout = vi.fn(), onRefresh = vi.fn();
  render(<FlightDetails observation={entry} checkoutToken="test-token" onClose={vi.fn()} onChoose={vi.fn()} onCheckout={onCheckout} onRefresh={onRefresh}/>);
  act(() => vi.advanceTimersByTime(1001));
  expect(screen.queryByRole('button', { name: 'Continue to flight checkout' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Choose for trip' })).toBeNull();
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Search again to check current availability' }));
  expect(onRefresh).toHaveBeenCalledOnce(); expect(onCheckout).not.toHaveBeenCalled();
});

test('checkout rechecks expiry even before its background timer can run', () => {
  vi.useFakeTimers();
  const entry = observation('flights'), onCheckout = vi.fn();
  render(<FlightDetails observation={entry} checkoutToken="test-token" onClose={vi.fn()} onCheckout={onCheckout}/>);
  vi.setSystemTime(Date.now() + 700000);
  fireEvent.click(screen.getByRole('button', { name: 'Continue to flight checkout' }));
  expect(onCheckout).not.toHaveBeenCalled();
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
});

test('flight modal Escape calls close and unmount restores its trigger', () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const onClose = vi.fn();
  const view = render(<FlightDetails observation={observation('flights')} onClose={onClose}/>);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(onClose).toHaveBeenCalledOnce();
  view.unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
});

test('live provider offers keep planning actions but cannot start sandbox checkout', () => {
  const entry = observation('flights'); entry.snapshot.sandbox = false;
  render(<FlightDetails observation={entry} checkoutToken="test-token" onClose={vi.fn()} onChoose={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.getByRole('button', { name: 'Choose for trip' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Continue to flight checkout' })).toBeNull();
  expect(screen.getByText('Checkout is unavailable for this offer.')).toBeTruthy();
  expect(screen.queryByText(/Test checkout/)).toBeNull();
});

test('checkout remains disabled when its integration is unavailable', () => {
  render(<FlightDetails observation={observation('flights')} checkoutToken="test-token" onClose={vi.fn()}/>);
  expect(screen.getByRole('button', { name: 'Continue to flight checkout' }).disabled).toBe(true);
});


test('checkout keeps itinerary visible and prevents duplicate entry while preparing, and aborts on close', async () => {
  let finish;
  const onCheckout = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<FlightDetails observation={observation('flights')} checkoutToken="exact-token" onClose={vi.fn()} onChoose={vi.fn()} onCheckout={onCheckout}/>);
  const button = screen.getByRole('button', { name: 'Continue to flight checkout' });
  fireEvent.click(button); fireEvent.click(button);
  expect(onCheckout).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('heading', { name: 'Outbound' })).toBeTruthy();
  expect(screen.getByText('Checking availability and the current fare…')).toBeTruthy();
  expect(button.disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Choose for trip' }).disabled).toBe(true);
  const signal = onCheckout.mock.calls[0][1];
  view.unmount(); expect(signal.aborted).toBe(true);
  await act(async () => finish(true));
});

test('checkout preparation failure stays in the itinerary and allows retry', async () => {
  const onCheckout = vi.fn().mockRejectedValueOnce(new Error('Fare unavailable')).mockResolvedValueOnce(false);
  render(<FlightDetails observation={observation('flights')} checkoutToken="exact-token" onClose={vi.fn()} onCheckout={onCheckout}/>);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Continue to flight checkout' })));
  expect(screen.getByRole('alert').textContent).toBe('Fare unavailable');
  expect(screen.getByRole('heading', { name: 'Outbound' })).toBeTruthy();
  const button = screen.getByRole('button', { name: 'Continue to flight checkout' });
  expect(button.disabled).toBe(false);
  await act(async () => fireEvent.click(button));
  expect(screen.getByRole('alert').textContent).toContain('Checkout could not open yet');
});
