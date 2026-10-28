import { afterEach, expect, test, vi } from 'vitest';
import * as travelApi from './travelApi';
const { travelRequest } = travelApi;
afterEach(() => vi.unstubAllGlobals());
const ok = body => ({ ok: true, json: async () => body });
test('filtered manual and room searches refresh catalogs and send exact provider IDs', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(ok({ items: [{ id: 201, name: 'Apartments' }] })).mockResolvedValueOnce(ok({ items: [{ id: 7, name: 'Kitchen' }] })).mockResolvedValueOnce(ok({ results: [] }));
  vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  const criteria = { hotel_id: 'chosen-hotel', hotel_type_ids: [201], facility_ids: [7], strict_facility_filtering: false, refundable_rates_only: true };
  await travelRequest('plan', 'hotels/search', criteria, signal);
  expect(fetch.mock.calls.map(([url]) => url.split('/travel/')[1])).toEqual(['hotels/catalog?kind=hotel_types', 'hotels/catalog?kind=facilities', 'hotels/search']);
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(criteria);
  expect(fetch.mock.calls.every(([, options]) => options.signal === signal)).toBe(true);
});
test('removed catalog IDs stop a filtered search instead of silently broadening it', async () => {
  const fetch = vi.fn().mockResolvedValue(ok({ items: [] })); vi.stubGlobal('fetch', fetch);
  await expect(travelRequest('plan', 'hotels/search', { hotel_type_ids: [201] })).rejects.toThrow('no longer available');
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('catalog failure prevents the rate request', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }); vi.stubGlobal('fetch', fetch);
  await expect(travelRequest('plan', 'hotels/search', { facility_ids: [7] })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('exact review uses host intent and terminal revision without history hydration or model chat', async () => {
  expect(travelApi.reviewExactTravelOption).toBeTypeOf('function');
  const selected = { plan_id: 'plan-1' }, reference = { search_id: 'search-1', option_id: 'stay-1', room_id: 'rate-2' };
  const receipt = { plan_id: 'plan-1', topic: 'stays', revision: 7, comparison: { options: [{ id: 'evidence-2', reference }] } };
  const api = { travelTurn: vi.fn(async () => ({ status: 'complete', travel_specialist_result: receipt })), travelTopic: vi.fn(() => { throw new Error('history unavailable'); }) };
  expect(await travelApi.reviewExactTravelOption(api, selected, 'stays', reference)).toBe(receipt);
  expect(api.travelTurn.mock.calls[0][4].travelDiscussion).toEqual({ intent: 'review', options: [reference] });
  expect(api.travelTopic).not.toHaveBeenCalled();
  await expect(travelApi.reviewExactTravelOption(api, selected, 'stays', { ...reference, room_id: null })).rejects.toThrow(/room/);
  api.travelTurn.mockResolvedValue({ status: 'error', message: 'Active lease' });
  await expect(travelApi.reviewExactTravelOption(api, selected, 'stays', reference)).rejects.toThrow('Active lease');
});
