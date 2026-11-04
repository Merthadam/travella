import { z } from 'zod';

export const locationAnchorSchema = z.object({ id: z.string().min(1).max(255), name: z.string().min(1).max(120), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), source: z.enum(['saved_place', 'provider_place']) }).strict();
export const stayLocationSchema = z.object({ saved_place_ids: z.array(z.string().min(1).max(255)).max(50), reference_place_ids: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,255}$/)).max(3), matching: z.enum(['prefer_nearby','within_each']), radius_m: z.number().int().min(100).max(50000), anchors: z.array(locationAnchorSchema).max(53).default([]) }).strict();
export const emptyStayLocation = () => ({ saved_place_ids: [], reference_place_ids: [], matching: 'prefer_nearby', radius_m: 2000, anchors: [] });
export const distanceLabel = meters => meters == null ? 'Distance unavailable' : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
export const locationSummary = item => item.distance_mean_m == null ? 'Distance unavailable' : `${distanceLabel(item.distance_mean_m)} average · ${distanceLabel(item.distance_max_m)} farthest · straight line`;
export function togglePlace(location, field, id) {
  const ids = location[field];
  return { ...location, [field]: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
}
export const hasCoordinates = place => Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude);
export function distanceToAnchor(hotel, anchor) {
  if (!hasCoordinates(hotel) || !hasCoordinates(anchor)) return null;
  const rad = value => value * Math.PI / 180;
  const a = rad(hotel.latitude), b = rad(anchor.latitude);
  const h = Math.sin((b - a) / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(rad(anchor.longitude - hotel.longitude) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
