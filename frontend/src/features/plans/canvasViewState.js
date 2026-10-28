// Browser-tab view preferences only. Durable plan content is owned by the CRUD API.
import { z } from 'zod';
import { travelReferenceSchema, travelWorkspaceViewSchema } from './travel/travelWorkspaceSchema';
const prefix = 'travella.canvas-view.v1:';
const travelPrefix = 'travella.travel-view.v1:', scopeKey = 'travella.recovery-scope.v1';
const travelFallback = new Map(), scopeListeners = new Set();
let verifiedScope = null;
const scopePattern = /^[a-f0-9]{32}$/;
const text = z.string().max(240), id = z.string().min(1).max(100);
const age = z.union([z.number().int().min(0).max(17), z.string().max(2).regex(/^\d{0,2}$/)]);
const draftRoom = z.object({ adults: z.union([z.number().int().min(1).max(6), z.string().max(1).regex(/^[1-6]$/)]), children_ages: z.array(age).max(4) }).strict();
const filters = z.object({ hotel_type_ids: z.array(z.number().int().positive()).max(10), facility_ids: z.array(z.number().int().positive()).max(10), strict_facility_filtering: z.boolean(), refundable_rates_only: z.boolean() }).strict();
const airport = z.object({ iata: z.string().regex(/^[A-Z]{3}$/), label: text }).strict().nullable();
const draftSchema = z.object({ city: text, place: z.object({ name: text.optional(), place_id: z.string().max(255).nullish() }).strict().nullable(), country: z.string().max(2), nationality: z.string().max(2), start: z.string().max(10), end: z.string().max(10), rooms: z.array(draftRoom).max(4), adults: z.union([z.number().int().min(1).max(16), z.string().max(2).regex(/^[0-9]{0,2}$/)]), children: z.array(age).max(8), infants: z.array(age).max(8), origin: airport, destination: airport, cabin: z.enum(['ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST']), currency: z.enum(['EUR','USD','GBP','HUF','CAD','AUD','JPY','CHF']), stayFilters: filters }).strict();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/), country = z.string().regex(/^[A-Z]{2}$/), currency = draftSchema.shape.currency;
const stayCriteria = z.object({ destination: z.object({ city: z.string().min(2).max(120), country_code: country, place_id: z.string().max(255).nullable() }).strict(), check_in: date, check_out: date, rooms: z.array(z.object({ adults: z.number().int().min(1).max(6), children_ages: z.array(z.number().int().min(0).max(17)).max(4) }).strict()).min(1).max(4), guest_nationality: country, currency, hotel_id: id.nullable(), hotel_type_ids: filters.shape.hotel_type_ids.optional(), facility_ids: filters.shape.facility_ids.optional(), strict_facility_filtering: z.boolean().optional(), refundable_rates_only: z.boolean().optional() }).strict();
const flightCriteria = z.object({ origin: z.string().regex(/^[A-Z]{3}$/), destination: z.string().regex(/^[A-Z]{3}$/), departure_date: date, return_date: date, adults: z.number().int().min(1).max(9), children_ages: z.array(z.number().int().min(2).max(11)).max(8), infant_ages: z.array(z.number().int().min(0).max(1)).max(8), cabin_class: draftSchema.shape.cabin, currency, country_code: country }).strict();
const recordSchema = z.object({ version: z.literal(1), owner: z.string().regex(scopePattern), planId: id, topic: z.enum(['stays','flights']), draftCriteria: draftSchema, draftDirty: z.boolean(), appliedCriteria: z.union([stayCriteria, flightCriteria]).nullable(), searchId: id.nullable(), view: travelWorkspaceViewSchema, detailsReference: travelReferenceSchema.nullable() }).strict().superRefine((record, ctx) => {
  if (record.appliedCriteria && !(record.topic === 'stays' ? stayCriteria : flightCriteria).safeParse(record.appliedCriteria).success ||
      (record.topic === 'stays' ? record.view.direct || record.view.bag || record.view.airline : record.view.stars || record.view.rating) ||
      record.view.comparison_refs.some(ref => ref.search_id !== record.searchId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recovery scope mismatch' });
});
export const getTravelRecoveryScope = () => verifiedScope;
export function subscribeTravelRecovery(listener) { scopeListeners.add(listener); return () => scopeListeners.delete(listener); }
export function bindTravelRecoveryScope(value) {
  const next = typeof value === 'string' && scopePattern.test(value) ? value : null;
  let previous = verifiedScope;
  try { previous ||= sessionStorage.getItem(scopeKey); } catch { /* memory only */ }
  const changed = previous !== next;
  if (changed) clearCanvasViews();
  verifiedScope = next;
  if (next) { try { sessionStorage.setItem(scopeKey, next); } catch { /* memory only */ } }
  return changed;
}
const travelKey = (owner, planId, topic) => owner === verifiedScope && scopePattern.test(owner || '') && id.safeParse(planId).success && ['stays','flights'].includes(topic) ? `${travelPrefix}${owner}:${encodeURIComponent(planId)}:${topic}` : null;
function trimRecords() {
  while (fallback.size + travelFallback.size > 60) {
    if (fallback.size) fallback.delete(fallback.keys().next().value); else travelFallback.delete(travelFallback.keys().next().value);
  }
  try { const keys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix) || key.startsWith(travelPrefix)); while (keys.length > 60) sessionStorage.removeItem(keys.shift()); } catch { /* memory only */ }
}
export function readTravelWorkspace(owner, planId, topic) {
  const key = travelKey(owner, planId, topic); if (!key) return null;
  try {
    let raw;
    try { raw = sessionStorage.getItem(key); } catch { raw = travelFallback.get(key); }
    if (!raw || new TextEncoder().encode(raw).length > 32768) return null;
    const value = recordSchema.parse(JSON.parse(raw));
    return value.owner === owner && value.planId === planId && value.topic === topic ? value : null;
  } catch { return null; }
}
export function writeTravelWorkspace(owner, planId, topic, state) {
  const key = travelKey(owner, planId, topic); if (!key) return false;
  const place = state.draftCriteria?.place;
  const parsed = recordSchema.safeParse({ version: 1, owner, planId, topic, draftCriteria: { ...state.draftCriteria, place: place ? { name: place.name, place_id: place.place_id } : null }, draftDirty: state.draftDirty, appliedCriteria: state.appliedCriteria, searchId: state.searchId, view: state.view, detailsReference: state.detailsReference?.reference || state.recoveredDetails?.reference || state.recovery?.detailsReference || null });
  if (!parsed.success) return false;
  const raw = JSON.stringify(parsed.data); if (new TextEncoder().encode(raw).length > 32768) return false;
  travelFallback.set(key, raw);
  try { sessionStorage.setItem(key, raw); } catch { /* memory only */ }
  trimRecords(); return true;
}
export function forgetTravelWorkspace(planId) {
  const suffix = `:${encodeURIComponent(planId)}:`;
  for (const key of travelFallback.keys()) if (key.includes(suffix)) travelFallback.delete(key);
  try { Object.keys(sessionStorage).filter(key => key.startsWith(travelPrefix) && key.includes(suffix)).forEach(key => sessionStorage.removeItem(key)); } catch { /* memory only */ }
}
const fallback = new Map();
export function readCanvasView(key) {
  if (!key) return {};
  try {
    const value = JSON.parse(sessionStorage.getItem(prefix + key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return fallback.get(key) || {}; }
}
export function writeCanvasView(key, patch) {
  if (!key) return;
  const value = { ...readCanvasView(key), ...patch };
  fallback.set(key, value);
  try {
    sessionStorage.setItem(prefix + key, JSON.stringify(value));
  } catch { /* View still works with storage disabled. */ }
  trimRecords();
}
export function clearCanvasViews() {
  fallback.clear();
  travelFallback.clear(); verifiedScope = null;
  try { Object.keys(sessionStorage).filter(key => key.startsWith(prefix) || key.startsWith(travelPrefix) || key === scopeKey).forEach(key => sessionStorage.removeItem(key)); } catch { /* Storage may be disabled. */ }
  scopeListeners.forEach(listener => listener());
}
export function validViewport(value) {
  return value && Number.isFinite(value.center?.lat) && Math.abs(value.center.lat) <= 90 &&
    Number.isFinite(value.center?.lng) && Math.abs(value.center.lng) <= 180 &&
    Number.isFinite(value.zoom) && value.zoom >= 0 && value.zoom <= 24;
}

export function forgetCanvasView(key) {
  fallback.delete(key);
  forgetTravelWorkspace(key);
  try { sessionStorage.removeItem(prefix + key); } catch { /* Storage may be disabled. */ }
}
