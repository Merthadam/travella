import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { StayDestination } from "./StayDestination";
import { travelRequest } from "./travelApi";
vi.mock("./travelApi", () => ({ travelRequest: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

test("an obsolete destination lookup cannot overwrite newer suggestions", async () => {
  vi.useFakeTimers();
  let finishOld;
  travelRequest
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce({
      places: [{ place_id: "salzburg", name: "Salzburg", address: "Austria" }],
    });
  const props = {
    query: "Wien",
    country: "AT",
    planId: "plan-1",
    active: true,
    value: null,
    setQuery: vi.fn(),
    onChange: vi.fn(),
  };
  const view = render(<StayDestination {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  view.rerender(<StayDestination {...props} query="Salzburg" />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(screen.getByRole("button", { name: "Salzburg Austria" })).toBeTruthy();
  await act(async () => {
    finishOld({
      places: [{ place_id: "vienna", name: "Wien", address: "Austria" }],
    });
  });
  expect(screen.queryByRole("button", { name: "Wien Austria" })).toBeNull();
  expect(screen.getByRole("button", { name: "Salzburg Austria" })).toBeTruthy();
});
