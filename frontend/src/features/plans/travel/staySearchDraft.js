import { staySearchCriteriaSchema } from './CanvasTravel';

// A bounded copy of the current form, sent only when the traveler submits chat.
// Incomplete fields must remain incomplete; empty child ages are never age zero.
export function staySearchDraft(draft, now = Date.now()) {
  if (draft.rooms?.some(room => room.adults === '' || room.children_ages.some(age => age === ''))) return null;
  const start = Date.parse(draft.start), end = Date.parse(draft.end);
  const today = Date.parse(new Date(now).toISOString().slice(0, 10));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < today || end <= start || end - start > 30 * 86400000 || end > today + 730 * 86400000) return null;
  const location = draft.stayLocation;
  const parsed = staySearchCriteriaSchema.safeParse({
    destination: { city: draft.place?.name || draft.city, country_code: draft.country, place_id: draft.place?.place_id || null },
    check_in: draft.start, check_out: draft.end,
    rooms: draft.rooms?.map(room => ({ adults: Number(room.adults), children_ages: room.children_ages.map(Number) })),
    guest_nationality: draft.nationality, currency: draft.currency, hotel_id: null,
    ...draft.stayFilters,
    location: location?.saved_place_ids.length || location?.reference_place_ids.length ? { ...location, anchors: [] } : null,
  });
  if (!parsed.success || parsed.data.rooms.reduce((n, room) => n + room.adults + room.children_ages.length, 0) > 16) return null;
  return parsed.data;
}
