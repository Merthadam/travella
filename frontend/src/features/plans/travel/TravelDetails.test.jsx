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
afterEach(cleanup);
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

test('flight actions use the original exact reference and perform no hotel requests', () => {
  const onClose = vi.fn(), onDiscuss = vi.fn(), onCheckout = vi.fn();
  render(<FlightDetails observation={observation('flights')} checkoutToken="test-token" onClose={onClose} onDiscuss={onDiscuss} onCheckout={onCheckout}/>);
  fireEvent.click(screen.getByText('Discuss flight'));
  expect(onDiscuss).toHaveBeenCalledWith({ title: 'Test airline', reference: { search_id: 'original-search', option_id: 'flight', room_id: null } });
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onDiscuss.mock.invocationCallOrder[0]);
  fireEvent.click(screen.getByText('Continue to flight checkout'));
  expect(onCheckout).toHaveBeenCalledWith({ offerToken: 'test-token' });
  expect(travelRequest).not.toHaveBeenCalled();
});

test.each(['expired', 'invalid'])('flight %s evidence hides choose/discuss/checkout', expiry => {
  const entry = observation('flights'); entry.snapshot.expires_at = expiry === 'expired' ? '2000-01-01' : 'invalid';
  render(<FlightDetails observation={entry} checkoutToken="test-token" onClose={vi.fn()} onChoose={vi.fn()} onDiscuss={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Discuss flight')).toBeNull();
  expect(screen.queryByText('Continue to flight checkout')).toBeNull();
});

test('flight recovery requires a new search and a booked flight cannot enter checkout', () => {
  const entry = observation('flights'), onRefresh = vi.fn();
  const view = render(<FlightDetails observation={entry} onClose={vi.fn()} onRefresh={onRefresh}/>);
  fireEvent.click(screen.getByText('Search again to check current availability'));
  expect(onRefresh).toHaveBeenCalledOnce();
  view.rerender(<FlightDetails observation={entry} booked checkoutToken="test-token" onClose={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.getByText('A flight is already booked in this Plan').disabled).toBe(true);
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
  expect(screen.queryByText('Continue to checkout')).toBeNull();
  await act(async () => resolve(refresh({ expiresAt: '2000-01-01' })));
  expect(screen.queryByText('original-room')).toBeNull();
  expect(screen.getByText('fresh-room')).toBeTruthy();
  expect(screen.getByText('Fresh hotel description')).toBeTruthy();
  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('false');
  expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Continue to checkout')).toBeNull();
  expect(screen.queryByText('Compare room')).toBeNull();
  expect(onCompare).not.toHaveBeenCalled();
});

test('fresh room has one checkout action using its refreshed token', async () => {
  serve(refresh()); const onChoose = vi.fn(), onCheckout = vi.fn();
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onChoose={onChoose} onCheckout={onCheckout}/>);
  await screen.findByText('fresh-room');
  expect(screen.queryByText('Choose for trip')).toBeNull();
  expect(screen.queryByText('Discuss room')).toBeNull();
  expect(screen.queryByText('Compare room')).toBeNull();
  fireEvent.click(screen.getByText('Continue to checkout'));
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
  expect(screen.getByText('original-room')).toBeTruthy();
  expect(onDiscuss).not.toHaveBeenCalled();
  if (kind === 'room') expect(screen.queryByText('other-room')).toBeNull();
});

test('failed refresh preserves original rooms and reference, reports auth expiry and retries to empty', async () => {
  travelRequest.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
  const onExpired = vi.fn(), onDiscuss = vi.fn();
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onExpired={onExpired} onDiscuss={onDiscuss}/>);
  await screen.findByRole('alert');
  expect(onExpired).toHaveBeenCalledOnce();
  expect(screen.getByText('original-room')).toBeTruthy();
  expect(onDiscuss).not.toHaveBeenCalled();
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


test('an open room offer loses checkout when it expires', async () => {
  vi.useFakeTimers();
  try {
    const entry = observation(); entry.historical = true;
    entry.snapshot.expires_at = new Date(Date.now() + 1000).toISOString();
    render(<StayDetails observation={entry} onClose={vi.fn()} onCheckout={vi.fn()}/>);
    expect(screen.getAllByText('Continue to checkout')).toHaveLength(2);
    await act(async () => vi.advanceTimersByTime(1001));
    expect(screen.queryByText('Continue to checkout')).toBeNull();
    expect(screen.getByText(/This offer has expired/)).toBeTruthy();
  } finally { vi.useRealTimers(); }
});

test.each(['booked', 'production', 'missing-token'])('%s stays do not expose checkout', async kind => {
  const entry = observation(); entry.historical = true;
  if (kind === 'production') entry.snapshot.sandbox = false;
  if (kind === 'missing-token') entry.item.rooms.forEach(room => { delete room.checkout_token; });
  render(<StayDetails observation={entry} booked={kind === 'booked'} onClose={vi.fn()} onCheckout={vi.fn()}/>);
  expect(screen.queryByText('Continue to checkout')).toBeNull();
});


test('photo gallery supports keyboard navigation and returning focus to its trigger', async () => {
  travelRequest.mockImplementation(async (_plan, route) => route === 'hotels/detail' ? { hotel: { images: [{ url: 'https://images.example.com/one.jpg', caption: 'Exterior' }, { url: 'https://images.example.com/two.jpg', caption: 'Lobby' }] } } : refresh());
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()}/>);
  await screen.findByText('fresh-room');
  const trigger = screen.getByRole('button', { name: 'View Test hotel photos' });
  trigger.focus(); fireEvent.click(trigger);
  const gallery = screen.getByRole('dialog', { name: 'Test hotel photos' });
  fireEvent.keyDown(gallery, { key: 'ArrowRight' });
  expect(screen.getByAltText('Lobby')).toBeTruthy();
  fireEvent.click(screen.getByText('← Back to rooms'));
  expect(screen.queryByRole('dialog', { name: 'Test hotel photos' })).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('room filters update counts, preserve exact checkout identity, and clear without refetching', async () => {
  const offers = [
    { ...room('room-only'), board_name: 'Room Only', refundable: true, total: { amount: '90', currency: 'EUR' } },
    { ...room('breakfast-flexible'), board_name: 'Breakfast Included', refundable: true, checkout_token: 'exact-breakfast-token', total: { amount: '120', currency: 'EUR' } },
    { ...room('breakfast-fixed'), board_name: 'Breakfast Included', refundable: false, total: { amount: '100', currency: 'EUR' } },
    { ...room('unknown'), board_name: null, refundable: null, total: { amount: null, currency: 'EUR' } },
  ];
  const entry = observation(); entry.snapshot.criteria.currency = 'EUR';
  serve(refresh({ rooms: offers })); const onCheckout = vi.fn();
  render(<StayDetails planId="plan" observation={entry} onClose={vi.fn()} onCheckout={onCheckout}/>);
  await screen.findByText('4 of 4 offers');
  const names = () => screen.getAllByRole('article').map(article => article.querySelector('h4').textContent);
  expect(names()).toEqual(['room-only', 'breakfast-fixed', 'breakfast-flexible', 'unknown']);
  fireEvent.change(screen.getByLabelText('Meal plan'), { target: { value: 'breakfast' } });
  expect(screen.getByText('2 of 4 offers')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Cancellation'), { target: { value: 'refundable' } });
  expect(screen.getByText('1 of 4 offers')).toBeTruthy();
  expect(screen.getByText(/Refundable offers may have fees/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
  expect(onCheckout).toHaveBeenCalledWith({ offerToken: 'exact-breakfast-token' });
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('4 of 4 offers')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'provider' } });
  expect(names()).toEqual(offers.map(room => room.name));
  expect(travelRequest).toHaveBeenCalledTimes(2);
});

test('no matching rooms offers a clear reset without pretending provider inventory is empty', async () => {
  serve(refresh({ rooms: [{ ...room(), board_name: 'Room Only', refundable: false }] }));
  render(<StayDetails planId="plan" observation={observation()} onClose={vi.fn()} onCheckout={vi.fn()}/>);
  await screen.findByText('1 of 1 offers');
  fireEvent.change(screen.getByLabelText('Cancellation'), { target: { value: 'refundable' } });
  expect(screen.getByText('0 of 1 offers')).toBeTruthy();
  expect(screen.getByText(/No room offers match these filters/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Continue to checkout' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('1 of 1 offers')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeTruthy();
});
