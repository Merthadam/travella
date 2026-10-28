export async function travelRequest(planId, action, criteria, signal) {
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
    const failure = await response.json().catch(() => ({}));
    const specific = { invalid_services: 'These seats or bags are unavailable. Review your selections.', checkout_changed: 'Your checkout changed. Check its status and review the latest total.', checkout_busy: 'Your checkout is being updated. Check its status shortly.' };
    const message = specific[failure.code] || (
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
              : "We couldn’t finish this search. Please try again.");
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json();
}
