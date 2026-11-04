import { webcrypto } from 'node:crypto';
import { beforeEach, expect, test, vi } from 'vitest';
import { bookingLocationInput, resolveBookingLocations, resolveExistingLocation } from './bookingLocations';
import { mapSchema } from '../../../design-system/schemas';
import { travelRequest } from './travelApi';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
vi.mock('../../onboarding/catalogs', () => ({ loadAirports: async () => [
  { code: 'MXP', name: 'Milan Malpensa Airport', lat: 45.63, lng: 8.72, country: 'IT' },
  { code: 'LIN', name: 'Milan Linate Airport', lat: 45.44, lng: 9.27, country: 'IT' },
] }));
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.clearAllMocks(); });
const hotel = { hotelId: 'lp1', name: 'Central Hotel', address: '12 Main Street', position: { lat: 45.46, lng: 9.18 } };
const resolve = input => resolveBookingLocations('plan', 'stays', input);

test('known property coordinates require no lookup and zero is a valid coordinate', async () => {
  const [location] = await resolve({ ...hotel, position: { lat: 0, lng: 0 } });
  expect(location).toMatchObject({ source: { provider: 'liteapi', id: 'lp1' }, position: { lat: 0, lng: 0 }, category: 'stay' });
  expect(travelRequest).not.toHaveBeenCalled();
  expect((await resolve(hotel))[0].id).toBe(location.id);
});
test('missing coordinates use exact hotel detail; wrong identity, bad coordinates and failures remain unavailable', async () => {
  travelRequest.mockResolvedValueOnce({ status: 'ready', hotel: { hotel_id: 'lp1', latitude: 45, longitude: 9 } });
  expect((await resolve({ ...hotel, position: null }))[0].position).toEqual({ lat: 45, lng: 9 });
  travelRequest.mockResolvedValueOnce({ status: 'ready', hotel: { hotel_id: 'other', latitude: 45, longitude: 9 } });
  expect((await resolve({ ...hotel, position: null }))[0].position).toBeNull();
  travelRequest.mockResolvedValueOnce({ status: 'ready', hotel: { hotel_id: 'lp1', latitude: 999, longitude: 9 } });
  expect((await resolve({ ...hotel, position: null }))[0].position).toBeNull();
  travelRequest.mockRejectedValueOnce(new Error('unavailable'));
  expect((await resolve({ ...hotel, position: null }))[0].position).toBeNull();
});
test('only actual destination endpoints become airport candidates, with repeated airport deduplicated', async () => {
  const summary = { itinerary: { outbound: [{ origin: 'BUD', destination: 'VIE' }, { origin: 'VIE', destination: 'MXP' }], inbound: [{ origin: 'LIN', destination: 'BUD' }] } };
  expect((await resolveBookingLocations('p', 'flights', bookingLocationInput('flights', summary))).map(x => x.source.id)).toEqual(['MXP', 'LIN']);
  expect(await resolveBookingLocations('p', 'flights', { arrival: 'MXP', departure: 'MXP' })).toHaveLength(1);
  expect(await resolveBookingLocations('p', 'flights', bookingLocationInput('flights', { destination: 'MIL' }))).toEqual([]);
});
test('exact identity reuses edited pin; close similar legacy pins require review and distant names do not match', async () => {
  const [location] = await resolve(hotel);
  const pin = { id: 'existing', name: hotel.name, category: 'activity', position: hotel.position, description: 'My note' };
  expect(resolveExistingLocation([pin], location)).toEqual({ exact: null, candidates: [pin] });
  expect(resolveExistingLocation([{ ...pin, position: { lat: 10, lng: 10 } }], location).candidates).toEqual([]);
  const edited = { ...pin, source: location.source, position: { lat: 10, lng: 10 } };
  expect(resolveExistingLocation([edited], location).exact).toBe(edited);
});
test('duplicate provider identities and category mismatches cannot enter a canvas', async () => {
  const [location] = await resolve(hotel);
  const pin = { id: location.id, name: location.name, category: location.category, position: location.position, source: location.source, description: '' };
  const map = pins => ({ status: 'ready', destination: 'Milan', final: true, pins });
  expect(mapSchema.safeParse(map([pin])).success).toBe(true);
  expect(mapSchema.safeParse(map([pin, { ...pin, id: 'second' }])).success).toBe(false);
  expect(mapSchema.safeParse(map([{ ...pin, category: 'food' }])).success).toBe(false);
});
test('an exact saved pin remains viewable without querying unavailable hotel details', async () => {
  const known = { source: { provider: 'liteapi', id: 'lp1' }, position: { lat: 45.1, lng: 9.1 } };
  const [location] = await resolveBookingLocations('p', 'stays', { ...hotel, position: null }, undefined, [known]);
  expect(location.position).toEqual(known.position); expect(travelRequest).not.toHaveBeenCalled();
});

test('legacy receipts without property identity use manual fallback instead of an unusable association', () => {
  const legacy = { id: 'old', name: hotel.name, category: 'stay', position: hotel.position };
  expect(resolveExistingLocation([legacy], { ...hotel, source: null })).toEqual({ exact: null, candidates: [] });
});
