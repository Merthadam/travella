// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useFlightBookingSync, flightCheckoutKey, flightCheckoutUpdated } from './useFlightBookingSync';
import { travelRequest } from './travelApi';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const confirmed = { sandbox: true, mode: 'flights', status: 'confirmed', booking_id: 'test-booking' };
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('recovers a confirmed receipt when returning from a closed checkout, using only status', async () => {
  const notify = vi.fn();
  travelRequest.mockResolvedValue(confirmed);
  const view = renderHook(({ enabled }) => useFlightBookingSync('p', enabled, notify), { initialProps: { enabled: false } });
  sessionStorage.setItem(flightCheckoutKey('p'), 'opaque-receipt');
  await act(async () => view.rerender({ enabled: true }));
  expect(notify).toHaveBeenCalledWith('p', confirmed);
  expect(travelRequest).toHaveBeenCalledExactlyOnceWith('p', 'sandbox/flights/status', { token: 'opaque-receipt' });
});
it('continues a pending checkout independently of the checkout dialog', async () => {
  sessionStorage.setItem(flightCheckoutKey('p'), 'receipt');
  travelRequest.mockResolvedValueOnce({ ...confirmed, status: 'pending' }).mockResolvedValueOnce(confirmed);
  const notify = vi.fn();
  await act(async () => renderHook(() => useFlightBookingSync('p', true, notify)));
  expect(notify).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(travelRequest).toHaveBeenCalledTimes(2);
});
it('reconciles on initial load, ignores obsolete Plan responses and isolates receipts', async () => {
  sessionStorage.setItem(flightCheckoutKey('p'), 'receipt');
  let resolve; travelRequest.mockReturnValue(new Promise(r => { resolve = r; }));
  const notify = vi.fn();
  const view = renderHook(({ planId }) => useFlightBookingSync(planId, true, notify), { initialProps: { planId: 'p' } });
  view.rerender({ planId: 'another-plan' });
  await act(async () => resolve(confirmed));
  expect(notify).not.toHaveBeenCalled();
  expect(travelRequest).toHaveBeenCalledTimes(1);
});
it('preserves card state on errors, retries on focus, and never claims unknown/non-sandbox results', async () => {
  sessionStorage.setItem(flightCheckoutKey('p'), 'receipt');
  travelRequest.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...confirmed, sandbox: false });
  const notify = vi.fn();
  await act(async () => renderHook(() => useFlightBookingSync('p', true, notify)));
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(travelRequest).toHaveBeenCalledTimes(2);
  expect(notify).not.toHaveBeenCalled();
});

it('checks a receipt that arrives after returning to the canvas during submission', async () => {
  const notify = vi.fn();
  sessionStorage.setItem(flightCheckoutKey('p'), 'prebook');
  travelRequest.mockResolvedValueOnce({ ...confirmed, status: 'ready_to_book' }).mockResolvedValueOnce(confirmed);
  await act(async () => renderHook(() => useFlightBookingSync('p', true, notify)));
  expect(notify).not.toHaveBeenCalled();
  sessionStorage.setItem(flightCheckoutKey('p'), 'booked');
  await act(async () => window.dispatchEvent(new CustomEvent(flightCheckoutUpdated, { detail: 'p' })));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
  expect(travelRequest).toHaveBeenLastCalledWith('p', 'sandbox/flights/status', { token: 'booked' });
});
