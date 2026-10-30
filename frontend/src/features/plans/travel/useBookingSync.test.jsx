// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi, describe } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useBookingSync } from './useBookingSync';
import { flightCheckoutKey, flightCheckoutUpdated, stayCheckoutKey, stayCheckoutUpdated } from './bookingReceipts';
import { travelRequest } from './travelApi';

vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); vi.restoreAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe.each([
  { mode: 'flights', key: flightCheckoutKey, event: flightCheckoutUpdated, route: 'sandbox/flights/status' },
  { mode: 'stays', key: stayCheckoutKey, event: stayCheckoutUpdated, route: 'sandbox/status' },
])('$mode booking recovery', ({ mode, key, event, route }) => {
  const confirmed = { sandbox: true, ...(mode === 'flights' ? { mode } : {}), status: 'confirmed', booking_id: 'test-booking' };
  const receipt = (planId = 'p', token = 'opaque-receipt') => sessionStorage.setItem(key(planId), token);
  it.each(['confirmed', 'cancelled', 'failed'])('recovers a %s receipt on mount using status only', async status => {
    receipt();
    const result = { ...confirmed, status };
    travelRequest.mockResolvedValue(result);
    const notify = vi.fn();
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    expect(notify).toHaveBeenCalledExactlyOnceWith('p', result);
    expect(travelRequest).toHaveBeenCalledExactlyOnceWith('p', route, { token: 'opaque-receipt' });
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(travelRequest).toHaveBeenCalledTimes(1);
  });

  it('waits for an enabled canvas and a receipt before checking the provider', async () => {
    const notify = vi.fn();
    travelRequest.mockResolvedValue(confirmed);
    const view = renderHook(({ enabled }) => useBookingSync('p', mode, enabled, notify), { initialProps: { enabled: false } });
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(travelRequest).not.toHaveBeenCalled();
    await act(async () => view.rerender({ enabled: true }));
    expect(travelRequest).not.toHaveBeenCalled();
    receipt();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
  });

  it('polls pending reservations until confirmation, then stops', async () => {
    receipt();
    travelRequest.mockResolvedValueOnce({ ...confirmed, status: 'pending' })
      .mockResolvedValueOnce({ sandbox: true, status: 'pending' })
      .mockResolvedValueOnce(confirmed);
    const notify = vi.fn();
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    expect(notify).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(notify).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(travelRequest).toHaveBeenCalledTimes(3);
    expect(travelRequest.mock.calls.every(([, requestedRoute]) => requestedRoute === route)).toBe(true);
  });

  it('ignores a late response from a previous Plan while recovering the current Plan independently', async () => {
    receipt('p', 'first-receipt');
    receipt('next', 'next-receipt');
    const previous = deferred();
    const nextResult = { ...confirmed, booking_id: 'next-stay' };
    travelRequest.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(nextResult);
    const notify = vi.fn();
    const view = renderHook(({ planId }) => useBookingSync(planId, mode, true, notify), { initialProps: { planId: 'p' } });
    await act(async () => view.rerender({ planId: 'next' }));
    await act(async () => previous.resolve(confirmed));
    expect(notify).toHaveBeenCalledExactlyOnceWith('next', nextResult);
    expect(travelRequest.mock.calls).toEqual([
      ['p', route, { token: 'first-receipt' }],
      ['next', route, { token: 'next-receipt' }],
    ]);
  });

  it('ignores a response after unmount and removes focus and receipt listeners', async () => {
    receipt();
    const pending = deferred();
    travelRequest.mockReturnValue(pending.promise);
    const notify = vi.fn();
    const view = renderHook(() => useBookingSync('p', mode, true, notify));
    view.unmount();
    await act(async () => pending.resolve(confirmed));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new CustomEvent(event, { detail: 'p' }));
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(notify).not.toHaveBeenCalled();
    expect(travelRequest).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled polling when leaving the canvas', async () => {
    receipt();
    travelRequest.mockResolvedValue({ ...confirmed, status: 'pending' });
    const view = renderHook(() => useBookingSync('p', mode, true, vi.fn()));
    await act(async () => {});
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(travelRequest).toHaveBeenCalledTimes(1);
  });

  it('preserves saved state after a network error and recovers on focus without overlapping requests', async () => {
    receipt();
    const retry = deferred();
    travelRequest.mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(retry.promise).mockResolvedValueOnce({ sandbox: true, status: 'review' });
    const notify = vi.fn();
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    expect(notify).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new Event('focus')));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(travelRequest).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve(confirmed));
    expect(travelRequest).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
  });

  it('recovers a receipt that arrives after returning to the canvas, only for its own Plan', async () => {
    const notify = vi.fn();
    travelRequest.mockResolvedValue(confirmed);
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    receipt();
    await act(async () => window.dispatchEvent(new CustomEvent(event, { detail: 'another-plan' })));
    expect(travelRequest).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new CustomEvent(event, { detail: 'p' })));
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
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    expect(notify).not.toHaveBeenCalled();
  });

  it('retries temporarily missing results only for stays', async () => {
    receipt();
    travelRequest.mockResolvedValueOnce({ sandbox: true, status: 'not_found' }).mockResolvedValueOnce(confirmed);
    const notify = vi.fn();
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(travelRequest).toHaveBeenCalledTimes(mode === 'stays' ? 2 : 1);
    expect(notify).toHaveBeenCalledTimes(mode === 'stays' ? 1 : 0);
  });

  it('queues one check for receipt updates during an active request and ignores the replaced receipt', async () => {
    receipt('p', 'old-receipt');
    const previous = deferred();
    const notify = vi.fn();
    travelRequest.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(confirmed);
    await act(async () => renderHook(() => useBookingSync('p', mode, true, notify)));
    receipt('p', 'new-receipt');
    await act(async () => {
      window.dispatchEvent(new CustomEvent(event, { detail: 'p' }));
      window.dispatchEvent(new CustomEvent(event, { detail: 'p' }));
    });
    expect(travelRequest).toHaveBeenCalledTimes(1);
    await act(async () => previous.resolve({ ...confirmed, booking_id: 'old-booking' }));
    expect(travelRequest).toHaveBeenCalledTimes(2);
    expect(travelRequest).toHaveBeenLastCalledWith('p', route, { token: 'new-receipt' });
    expect(notify).toHaveBeenCalledExactlyOnceWith('p', confirmed);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(travelRequest).toHaveBeenCalledTimes(2);
  });

  it('limits automatic polling to 12 checks and permits a fresh focus retry', async () => {
    receipt();
    travelRequest.mockResolvedValue({ sandbox: true, status: 'pending' });
    await act(async () => renderHook(() => useBookingSync('p', mode, true, vi.fn())));
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(travelRequest).toHaveBeenCalledTimes(12);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(travelRequest).toHaveBeenCalledTimes(13);
  });

  it('uses the latest callback without restarting the request', async () => {
    receipt();
    const pending = deferred(), first = vi.fn(), next = vi.fn();
    travelRequest.mockReturnValue(pending.promise);
    const view = renderHook(({ notify }) => useBookingSync('p', mode, true, notify), { initialProps: { notify: first } });
    view.rerender({ notify: next });
    await act(async () => pending.resolve(confirmed));
    expect(first).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledExactlyOnceWith('p', confirmed);
    expect(travelRequest).toHaveBeenCalledTimes(1);
  });

  it('ignores in-flight results and update events when disabled', async () => {
    receipt();
    const pending = deferred(), notify = vi.fn();
    travelRequest.mockReturnValue(pending.promise);
    const view = renderHook(({ enabled }) => useBookingSync('p', mode, enabled, notify), { initialProps: { enabled: true } });
    view.rerender({ enabled: false });
    await act(async () => {
      window.dispatchEvent(new CustomEvent(event, { detail: 'p' }));
      pending.resolve(confirmed);
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(notify).not.toHaveBeenCalled();
    expect(travelRequest).toHaveBeenCalledTimes(1);
  });

  it('does not request status when session storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
    await act(async () => renderHook(() => useBookingSync('p', mode, true, vi.fn())));
    expect(travelRequest).not.toHaveBeenCalled();
  });
});

it('requires a flight result to identify its mode', async () => {
  sessionStorage.setItem(flightCheckoutKey('p'), 'receipt');
  travelRequest.mockResolvedValue({ sandbox: true, status: 'confirmed', booking_id: 'stay-booking' });
  const notify = vi.fn();
  await act(async () => renderHook(() => useBookingSync('p', 'flights', true, notify)));
  expect(notify).not.toHaveBeenCalled();
});

it('ignores the previous mode response when switching modes on the same Plan', async () => {
  sessionStorage.setItem(flightCheckoutKey('p'), 'flight-receipt');
  sessionStorage.setItem(stayCheckoutKey('p'), 'stay-receipt');
  const previous = deferred(), notify = vi.fn();
  const stay = { sandbox: true, status: 'confirmed', booking_id: 'stay-booking' };
  travelRequest.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(stay);
  const view = renderHook(({ mode }) => useBookingSync('p', mode, true, notify), { initialProps: { mode: 'flights' } });
  await act(async () => view.rerender({ mode: 'stays' }));
  await act(async () => previous.resolve({ ...stay, mode: 'flights', booking_id: 'flight-booking' }));
  expect(notify).toHaveBeenCalledExactlyOnceWith('p', stay);
  expect(travelRequest.mock.calls).toEqual([
    ['p', 'sandbox/flights/status', { token: 'flight-receipt' }],
    ['p', 'sandbox/status', { token: 'stay-receipt' }],
  ]);
});
