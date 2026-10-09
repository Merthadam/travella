export async function travelRequest(planId, action, criteria, signal) {
  const write = action.endsWith("/search");
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
        : response.status === 422
          ? "Check your travel dates, countries and traveler ages."
          : response.status === 429
            ? "Too many searches. Please wait a minute and try again."
            : "We couldn’t finish this search. Please try again.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json();
}
