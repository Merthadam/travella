import { locationPositionSchema, locationSourceSchema } from '../../../design-system/schemas';
import { loadAirports } from '../../onboarding/catalogs';
import { travelRequest } from './travelApi';

export const locationKey = source => source ? `${source.provider}:${source.id}` : '';
export const sameLocation = (pin, location) => locationKey(pin?.source) === locationKey(location?.source) && Boolean(location?.source);
const position = value => { const result = locationPositionSchema.safeParse(value); return result.success ? result.data : null; };
const source = value => { const result = locationSourceSchema.safeParse(value); return result.success ? result.data : null; };

async function identify(value) {
  if (!value.source) return { ...value, id: null };
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(locationKey(value.source)));
  const suffix = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  return { ...value, id: `booking_${suffix}` };
}

// Only public location fields enter this function; keep reservation/guest documents out.
export function bookingLocationInput(mode, summary) {
  if (mode === 'stays') return { hotelId: summary?.reservation?.hotelId, name: summary?.hotelName,
    address: summary?.reservation?.address, position: summary?.reservation?.position };
  return { arrival: summary?.itinerary?.outbound?.at(-1)?.destination,
    departure: summary?.itinerary?.inbound?.[0]?.origin };
}

export async function resolveBookingLocations(planId, mode, input, signal, knownPins = []) {
  if (mode === 'stays') {
    const identity = source({ provider: 'liteapi', id: input.hotelId });
    let coordinates = position(input.position), address = input.address || '';
    const known = identity && knownPins.find(pin => sameLocation(pin, { source: identity }));
    if (!coordinates && known) coordinates = position(known.position);
    if (!coordinates && identity) {
      try {
        const result = await travelRequest(planId, 'hotels/detail', { hotel_id: identity.id }, signal);
        if (result.status === 'ready' && result.hotel?.hotel_id === identity.id) {
          coordinates = position({ lat: result.hotel.latitude, lng: result.hotel.longitude });
          address ||= result.hotel.address || '';
        }
      } catch (error) { if (signal?.aborted || error.status === 401) throw error; }
    }
    return [await identify({ source: identity, name: input.name || 'Your accommodation', address,
      position: coordinates, category: 'stay', label: 'Your stay' })];
  }
  const codes = [...new Set([input.arrival, input.departure].filter(code => /^[A-Z]{3}$/.test(code || '')))];
  if (!codes.length) return [];
  const airports = await loadAirports();
  return Promise.all(codes.map(code => {
    const airport = airports.find(item => item.code === code);
    return identify({ source: { provider: 'iata', id: code }, name: airport?.name || code,
      address: `${code}${airport?.country ? ` · ${airport.country}` : ''}`, category: 'airport',
      label: code === input.arrival ? (code === input.departure ? 'Arrival and return airport' : 'Arrival airport') : 'Return airport',
      position: position({ lat: airport?.lat, lng: airport?.lng }) });
  }));
}

const normalized = value => (value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function distance(a, b) {
  const radians = n => n * Math.PI / 180;
  const lat = radians(b.lat - a.lat), lng = radians(b.lng - a.lng);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function resolveExistingLocation(pins, location) {
  if (!location.source) return { exact: null, candidates: [] };
  const exact = pins.find(pin => sameLocation(pin, location));
  if (exact) return { exact, candidates: [] };
  const name = normalized(location.name);
  const candidates = pins.filter(pin => {
    if (pin.source || ![location.category, 'other', 'activity'].includes(pin.category)) return false;
    const existing = normalized(pin.name);
    const words = name.split(' ').filter(word => word.length > 2);
    const overlap = words.filter(word => existing.split(' ').includes(word)).length;
    const similar = name === existing || (words.length >= 2 && overlap / words.length >= 0.6);
    const sameCode = location.source?.provider === 'iata' && new RegExp(`\\b${location.source.id}\\b`, 'i').test(pin.name);
    if (!similar && !sameCode) return false;
    return !location.position || distance(pin.position, location.position) <= (location.category === 'airport' ? 3000 : 500);
  });
  return { exact: null, candidates };
}

// Return a complete new pin set or leave the draft untouched. Only a single,
// same-name nearby legacy place can be associated without a separate review.
export function mergeBookingLocations(pins, locations) {
  if (!locations.length) return null;
  const next = structuredClone(pins);
  for (const location of locations) {
    if (!location.source) return null;
    // Compatibility with the earlier single-stay pin. Its ID was reserved for
    // this Plan's confirmed hotel; retain traveler edits when attaching identity.
    const legacy = location.source.provider === 'liteapi' && next.find(pin => pin.id === 'booked_stay' && pin.category === 'stay' && !pin.source);
    if (legacy && !next.some(pin => sameLocation(pin, location))) legacy.source = { ...location.source };
    const { exact, candidates } = resolveExistingLocation(next, location);
    if (exact) continue;
    const matches = candidates.filter(pin => normalized(pin.name) === normalized(location.name) && location.position &&
      distance(pin.position, location.position) <= (location.category === 'airport' ? 3000 : 100));
    if (matches.length === 1) {
      matches[0].source = { ...location.source }; matches[0].category = location.category;
    } else {
      if (!location.position || !location.id || next.length >= 50) return null;
      next.push({ id: location.id, source: { ...location.source }, name: location.name.slice(0, 120),
        category: location.category, position: { ...location.position }, description: location.address.slice(0, 240) });
    }
  }
  return next;
}
