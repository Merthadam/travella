// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useStayBookingSync, stayCheckoutKey, stayCheckoutUpdated } from './useStayBookingSync';
import { travelRequest } from './travelApi';

vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));

const confirmed = { sandbox: true, status: 'confirmed', booking_id: 'test-stay' };
const receipt = (planId = 'p', token = 'opaque-receipt') => sessionStorage.setItem(stayCheckoutKey(planId), token);
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each(['confirmed', 'cancelled', 'failed'])('recovers a %s receipt on mount using status only', async status => {
  receipt();
  const result = { ...confirmed, status };
  travelRequest.mockResolvedValue(result);
  const notify = vi.fn();
  await act(async () => renderHook(() => useStayBookingSync('p', true, notify)));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', result);
  expect(travelRequest).toHaveBeenCalledExactlyOnceWith('p', 'sandbox/status', { token: 'opaque-receipt' });
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(travelRequest).toHaveBeenCalledTimes(1);
});

it('waits for an enabled canvas and a receipt before checking the provider', async () => {
  const notify = vi.fn();
  travelRequest.mockResolvedValue(confirmed);
  const view = renderHook(({ enabled }) => useStayBookingSync('p', enabled, notify), { initialProps: { enabled: false } });
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(travelRequest).not.toHaveBeenCalled();
  await act(async () => view.rerender({ enabled: true }));
  expect(travelRequest).not.toHaveBeenCalled();
  receipt();
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
});

it('polls pending and temporarily missing reservations until confirmation, then stops', async () => {
  receipt();
  travelRequest.mockResolvedValueOnce({ ...confirmed, status: 'pending' })
    .mockResolvedValueOnce({ sandbox: true, status: 'not_found' })
    .mockResolvedValueOnce(confirmed);
  const notify = vi.fn();
  await act(async () => renderHook(() => useStayBookingSync('p', true, notify)));
  expect(notify).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(notify).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(travelRequest).toHaveBeenCalledTimes(3);
  expect(travelRequest.mock.calls.every(([, route]) => route === 'sandbox/status')).toBe(true);
});

it('ignores a late response from a previous Plan while recovering the current Plan independently', async () => {
  receipt('p', 'first-receipt');
  receipt('next', 'next-receipt');
  const previous = deferred();
  const nextResult = { ...confirmed, booking_id: 'next-stay' };
  travelRequest.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(nextResult);
  const notify = vi.fn();
  const view = renderHook(({ planId }) => useStayBookingSync(planId, true, notify), { initialProps: { planId: 'p' } });
  await act(async () => view.rerender({ planId: 'next' }));
  await act(async () => previous.resolve(confirmed));
  expect(notify).toHaveBeenCalledExactlyOnceWith('next', nextResult);
  expect(travelRequest.mock.calls).toEqual([
    ['p', 'sandbox/status', { token: 'first-receipt' }],
    ['next', 'sandbox/status', { token: 'next-receipt' }],
  ]);
});

it('ignores a response after unmount and removes focus and receipt listeners', async () => {
  receipt();
  const pending = deferred();
  travelRequest.mockReturnValue(pending.promise);
  const notify = vi.fn();
  const view = renderHook(() => useStayBookingSync('p', true, notify));
  view.unmount();
  await act(async () => pending.resolve(confirmed));
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new CustomEvent(stayCheckoutUpdated, { detail: 'p' }));
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(notify).not.toHaveBeenCalled();
  expect(travelRequest).toHaveBeenCalledTimes(1);
});

it('cancels scheduled polling when leaving the canvas', async () => {
  receipt();
  travelRequest.mockResolvedValue({ ...confirmed, status: 'pending' });
  const view = renderHook(() => useStayBookingSync('p', true, vi.fn()));
  await act(async () => {});
  view.unmount();
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(travelRequest).toHaveBeenCalledTimes(1);
});

it('preserves saved state after a network error and recovers on focus without overlapping requests', async () => {
  receipt();
  const retry = deferred();
  travelRequest.mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(retry.promise);
  const notify = vi.fn();
  await act(async () => renderHook(() => useStayBookingSync('p', true, notify)));
  expect(notify).not.toHaveBeenCalled();
  await act(async () => window.dispatchEvent(new Event('focus')));
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(travelRequest).toHaveBeenCalledTimes(2);
  await act(async () => retry.resolve(confirmed));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
});

it('recovers a receipt that arrives after returning to the canvas, only for its own Plan', async () => {
  const notify = vi.fn();
  travelRequest.mockResolvedValue(confirmed);
  await act(async () => renderHook(() => useStayBookingSync('p', true, notify)));
  receipt();
  await act(async () => window.dispatchEvent(new CustomEvent(stayCheckoutUpdated, { detail: 'another-plan' })));
  expect(travelRequest).not.toHaveBeenCalled();
  await act(async () => window.dispatchEvent(new CustomEvent(stayCheckoutUpdated, { detail: 'p' })));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
});

it.each([
  { ...confirmed, sandbox: false },
  { ...confirmed, booking_id: null },
  { ...confirmed, status: 'review' },
])('does not save an unverified reservation result: %j', async result => {
  receipt();
  travelRequest.mockResolvedValue(result);
  const notify = vi.fn();
  await act(async () => renderHook(() => useStayBookingSync('p', true, notify)));
  expect(notify).not.toHaveBeenCalled();
});
