import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmationMapActions } from './ConfirmationMapActions';
import { resolveBookingLocations } from './bookingLocations';
vi.mock('./bookingLocations', async original => ({ ...await original(), resolveBookingLocations: vi.fn() }));
const location = { id: 'booking_one', source: { provider: 'liteapi', id: 'lp1' }, name: 'Central Hotel', address: '12 Main Street', position: { lat: 45, lng: 9 }, category: 'stay', label: 'Your stay' };
const pin = { ...location, description: 'My own note' };
const summary = { reference: 'TEST', hotelName: location.name, reservation: { hotelId: 'lp1', position: location.position } };
const props = actions => ({ planId: 'p', mode: 'stays', summary, actions });
const actions = () => ({ pins: [], savedPins: [], add: vi.fn(() => ({ id: pin.id })), view: vi.fn(), retry: vi.fn() });
beforeEach(() => { vi.clearAllMocks(); resolveBookingLocations.mockResolvedValue([location]); });
afterEach(cleanup);

test('render does not add; success is withheld until saved snapshot acknowledges the pin', async () => {
  const a = actions(); const { rerender } = render(<ConfirmationMapActions {...props(a)}/>);
  const add = await screen.findByRole('button', { name: 'Add to trip map' });
  expect(a.add).not.toHaveBeenCalled(); fireEvent.click(add);
  expect(a.add).toHaveBeenCalledWith('stays', 'TEST', location, { existingId: undefined, separate: false });
  rerender(<ConfirmationMapActions {...props({ ...a, pins: [pin], busy: true })}/>);
  expect(screen.getByText('Saving to trip map…')).toBeTruthy(); expect(screen.queryByText('Added to trip map')).toBeNull();
  rerender(<ConfirmationMapActions {...props({ ...a, pins: [pin], savedPins: [pin] })}/>);
  expect(screen.getByText('Added to trip map')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'View on trip map →' })); expect(a.view).toHaveBeenCalledWith(pin.id);
});
test('reopened exact place offers View without another add', async () => {
  const a = { ...actions(), pins: [pin], savedPins: [pin] }; render(<ConfirmationMapActions {...props(a)}/>);
  await screen.findByText('Already on your trip map'); expect(screen.queryByRole('button', { name: 'Add to trip map' })).toBeNull(); expect(a.add).not.toHaveBeenCalled();
});
test('possible existing place requires explicit review and selection', async () => {
  const legacy = { ...pin, id: 'legacy', source: undefined }; const a = { ...actions(), pins: [legacy], savedPins: [legacy] };
  render(<ConfirmationMapActions {...props(a)}/>); fireEvent.click(await screen.findByRole('button', { name: 'Review matching place' }));
  expect(a.add).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Use this saved place' }));
  expect(a.add).toHaveBeenCalledWith('stays', 'TEST', location, { existingId: 'legacy', separate: false });
});
test('save failure keeps pending location unsaved and offers retry', async () => {
  const a = { ...actions(), pins: [pin], saveError: 'Your changes could not be saved.' };
  render(<ConfirmationMapActions {...props(a)}/>); await screen.findByText('This place has not been saved yet.');
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' })); expect(a.retry).toHaveBeenCalledOnce(); expect(screen.queryByText('Added to trip map')).toBeNull();
});
test('unavailable location and pin limit never offer an enabled add', async () => {
  resolveBookingLocations.mockResolvedValueOnce([{ ...location, position: null }]);
  const a = actions(); const view = render(<ConfirmationMapActions {...props(a)}/>);
  await screen.findByRole('button', { name: 'Open trip map' }); expect(screen.queryByRole('button', { name: 'Add to trip map' })).toBeNull(); view.unmount();
  render(<ConfirmationMapActions {...props({ ...a, pins: Array.from({ length: 50 }, (_, i) => ({ ...pin, id: String(i), source: { provider: 'liteapi', id: `other${i}` } })) })}/>);
  expect((await screen.findByRole('button', { name: 'Add to trip map' })).disabled).toBe(true);
});
test('late location lookup cannot show an old plan location after navigation', async () => {
  let finish; resolveBookingLocations.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const a = actions(); const { rerender } = render(<ConfirmationMapActions {...props(a)}/>);
  rerender(<ConfirmationMapActions {...props(a)} planId="different"/>);
  await screen.findByText('Central Hotel');
  await act(async () => { finish([{ ...location, name: 'Old plan place' }]); });
  expect(screen.queryByText('Old plan place')).toBeNull();
});
