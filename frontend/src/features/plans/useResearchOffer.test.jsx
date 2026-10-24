import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useResearchOffer } from './useResearchOffer';
import { emptyTripContext } from './components/TripBrief';

afterEach(cleanup);
const ready = () => ({ revision: 4, context: { ...emptyTripContext(), finalDestination: 'Lisbon', flexibleDates: true, travelers: 2, flights: 'not-needed', provenance: { flights: { source: 'user_edit' } } }, locked: false, readiness: { eligible: true, reasons: [] }, deferred: false, offer: { id: 'offer-1', revision: 4, status: 'available', message_id: 'assistant-1' } });
function fixture() {
  let snapshot = ready();
  const api = {
    researchOffer: vi.fn(async () => structuredClone(snapshot)),
    researchOfferAction: vi.fn(async (_plan, { action }, revision) => {
      if (revision !== snapshot.revision) throw Object.assign(new Error('Conflict'), { status: 409 });
      snapshot = { ...snapshot, deferred: action === 'defer' || snapshot.deferred, offer: { ...snapshot.offer, revision, status: action === 'defer' ? 'deferred' : 'review' } };
      return { ...structuredClone(snapshot), research_entry_receipt: action === 'confirm' ? 'receipt' : null };
    }),
    updateResearchContext: vi.fn(async (_plan, changes) => {
      snapshot = { ...snapshot, revision: 5, context: { ...snapshot.context, flights: changes[0].value, provenance: { ...snapshot.context.provenance, flights: { source: 'user_edit' } } } };
      return structuredClone(snapshot);
    }),
  };
  return { api, change: patch => { snapshot = { ...snapshot, ...patch }; } };
}

test('readiness and deferral never generate; deferred manual review stays available after reload', async () => {
  const { api } = fixture();
  const first = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(first.result.current.eligible).toBe(true));
  await act(async () => first.result.current.defer(first.result.current.snapshot.offer));
  expect(first.result.current.snapshot.deferred).toBe(true);
  first.unmount();
  const second = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(second.result.current.eligible).toBe(true));
  expect(second.result.current.readiness).toContain('keep researching');
  let review;
  await act(async () => { review = await second.result.current.requestReview(); });
  expect(review.deferred).toBe(true);
  expect(api.researchOfferAction.mock.calls.map(call => call[1].action)).toEqual(['defer', 'request_review']);
});

test('unchanged already-confirmed flights still revalidate the current revision', async () => {
  const { api, change } = fixture();
  const { result } = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(result.current.eligible).toBe(true));
  let review; await act(async () => { review = await result.current.requestReview(); });
  change({ revision: 5 });
  await act(async () => { await expect(result.current.confirm(review, 'not-needed')).rejects.toThrow('details changed'); });
  expect(api.updateResearchContext).not.toHaveBeenCalled();
  expect(api.researchOfferAction.mock.calls.map(call => call[1].action)).toEqual(['request_review']);
});

test('explicit flight change binds only its exact update then obtains a confirmation receipt', async () => {
  const { api } = fixture();
  const { result } = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(result.current.eligible).toBe(true));
  let review; await act(async () => { review = await result.current.requestReview(); });
  let receipt; await act(async () => { receipt = await result.current.confirm(review, 'needed'); });
  expect(receipt.research_entry_receipt).toBe('receipt');
  expect(api.researchOfferAction.mock.calls.map(call => [call[1].action, call[2]])).toEqual([['request_review', 4], ['request_review', 5], ['confirm', 5]]);
});

test('a concurrent destination change returned with a flight update cannot be silently confirmed', async () => {
  const { api } = fixture();
  api.updateResearchContext.mockResolvedValue({ ...ready(), revision: 5, context: { ...ready().context, finalDestination: 'Porto', flights: 'needed' } });
  const { result } = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(result.current.eligible).toBe(true));
  let review; await act(async () => { review = await result.current.requestReview(); });
  await act(async () => { await expect(result.current.confirm(review, 'needed')).rejects.toThrow('details changed'); });
  expect(api.researchOfferAction).toHaveBeenCalledTimes(1);
});

test('old Plan reads and in-flight review responses are discarded after switching Plans', async () => {
  const { api } = fixture(); let finish;
  const { result, rerender } = renderHook(({ plan }) => useResearchOffer(api, plan, 4, vi.fn()), { initialProps: { plan: 'first' } });
  await waitFor(() => expect(result.current.eligible).toBe(true));
  api.researchOffer.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let pending;
  act(() => { pending = result.current.requestReview(); });
  rerender({ plan: 'second' });
  await waitFor(() => expect(result.current.eligible).toBe(true));
  await act(async () => { finish({ ...ready(), revision: 99 }); expect(await pending).toBeNull(); });
  expect(result.current.snapshot.revision).toBe(4);
  expect(api.researchOfferAction).not.toHaveBeenCalled();
});

test('retry clears a failed readiness read and restores the eligible manual action', async () => {
  const { api } = fixture();
  api.researchOffer.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(result.current.error).toContain('Could not check'));
  expect(result.current.eligible).toBe(false);
  await act(async () => result.current.retry());
  expect(result.current.error).toBe('');
  expect(result.current.eligible).toBe(true);
});

test('missing readiness reasons tell the traveler what is still needed without treating the count as permission', async () => {
  const { api, change } = fixture();
  change({ readiness: { eligible: false, reasons: ['destination_required'] } });
  const { result } = renderHook(() => useResearchOffer(api, 'plan', 4, vi.fn()));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.eligible).toBe(false);
  expect(result.current.missingDetails).toEqual(['Confirm a destination.']);
});
