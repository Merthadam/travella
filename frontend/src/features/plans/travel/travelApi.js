import { requestId } from '../../../plansApi';

export async function reviewExactTravelOption(api, selected, topic, reference, signal) {
  if (!reference?.search_id || !reference.option_id || (topic === 'stays' && !reference.room_id)) throw new Error('Choose an exact room or fare before reviewing.');
  const terminal = await api.travelTurn(selected, topic, 'Review this option for my trip.', requestId(), {
    signal, onEvent() {}, travelDiscussion: { intent: 'review', options: [reference] },
  });
  const receipt = terminal.travel_specialist_result;
  const options = receipt?.comparison?.options;
  const observed = options?.[0]?.reference;
  if (terminal.status !== 'complete' || receipt?.plan_id !== selected.plan_id || receipt.topic !== topic || !Number.isSafeInteger(receipt.revision) || options?.length !== 1 ||
      observed?.search_id !== reference.search_id || observed?.option_id !== reference.option_id || (observed?.room_id ?? null) !== (reference.room_id ?? null)) {
    throw new Error(terminal.message || 'This exact option could not be reviewed. Search again and retry.');
  }
  return receipt;
}

export async function travelRequest(planId, action, criteria, signal) {
  // The connector validates selected IDs against its scoped, expiring catalog.
  // Refresh it explicitly before every filtered rate request, including room details.
  if (action === "hotels/search") {
    for (const [field, kind] of [["hotel_type_ids", "hotel_types"], ["facility_ids", "facilities"]]) {
      if (!criteria?.[field]?.length) continue;
      const catalog = await travelRequest(planId, "hotels/catalog", { kind }, signal);
      if (!Array.isArray(catalog.items) || !criteria[field].every(id => catalog.items.some(item => item.id === id))) {
        throw new Error("A selected search filter is no longer available. Remove it and choose again.");
      }
    }
  }
  const write = action.endsWith("/search") || action.startsWith("sandbox/");
  const query = !write && criteria ? `?${new URLSearchParams(criteria)}` : "";
  const response = await fetch(
    `/v1/agent/plans/${encodeURIComponent(planId)}/travel/${action}${query}`,
    {
      method: write ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: write
        ? { "Content-Type": "application/json", "X-Travella-Request": "1" }
        : {},
      ...(write ? { body: JSON.stringify(criteria) } : {}),
    },
  );
  if (!response.ok) {
    const message =
      response.status === 401
        ? "Your session expired. Sign in again."
        : response.status === 403
          ? "Mock checkout is available only with a sandbox key."
          : response.status === 409
            ? "This offer expired. Close checkout and search again."
            : response.status === 422
          ? "Check your travel dates, countries and traveler ages."
          : response.status === 429
            ? "Too many searches. Please wait a minute and try again."
            : action.startsWith("sandbox/")
              ? "Couldn’t verify the mock booking. Check its status before trying again."
              : "We couldn’t finish this search. Please try again.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json();
}
