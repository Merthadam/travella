import React from "react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TravelSearch, filterResults } from "./TravelSearch";
import { travelRequest } from "./travelApi";
vi.mock("./travelApi", () => ({ travelRequest: vi.fn() }));
const searchRequest = vi.fn();
beforeEach(() => {
  travelRequest.mockImplementation((plan, action, criteria, signal) =>
    action === "places"
      ? Promise.resolve({
          places: [{ place_id: "rome-place", name: "Rome", address: "Italy" }],
        })
      : searchRequest(plan, action, criteria, signal),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const hotel = (name) => ({
  id: name,
  hotel_id: name,
  name,
  rooms: [{ id: "room", refundable: null }],
  price: { amount: "100", currency: "EUR" },
});
const response = (name) => ({
  results: [hotel(name)],
  sandbox: true,
  searched_at: new Date().toISOString(),
  notices: [],
});
const props = {
  planId: "plan-1",
  mode: "accommodation",
  active: true,
  initialData: { map: { destination: "Rome" } },
};
async function fill() {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Destination country"), "IT");
  await user.click(await screen.findByRole("button", { name: "Rome Italy" }));
  await user.selectOptions(screen.getByLabelText("Guest nationality"), "HU");
  fireEvent.change(screen.getByLabelText("Check-in"), {
    target: { value: "2027-11-13" },
  });
  fireEvent.change(screen.getByLabelText("Check-out"), {
    target: { value: "2027-11-16" },
  });
  return user;
}
test("explicit submit sends room criteria, shows sandbox totals and retains last results on failure", async () => {
  searchRequest
    .mockResolvedValueOnce(response("First hotel"))
    .mockRejectedValueOnce(new Error("Search failed"));
  render(<TravelSearch {...props} />);
  expect(travelRequest).not.toHaveBeenCalled();
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  expect(await screen.findByText("First hotel")).toBeTruthy();
  expect(screen.getByText("Sandbox results")).toBeTruthy();
  expect(searchRequest.mock.calls[0][2]).toMatchObject({
    destination: { city: "Rome", country_code: "IT", place_id: "rome-place" },
    rooms: [{ adults: 2, children_ages: [] }],
    guest_nationality: "HU",
  });
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("First hotel")).toBeTruthy();
});
test("a late response after leaving cannot replace a later search", async () => {
  let finishOld;
  searchRequest
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(response("Current hotel"));
  const view = render(<TravelSearch {...props} />);
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  view.rerender(<TravelSearch {...props} active={false} />);
  view.rerender(<TravelSearch {...props} />);
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  await screen.findByText("Current hotel");
  await act(async () => {
    finishOld(response("Obsolete hotel"));
  });
  expect(screen.queryByText("Obsolete hotel")).toBeNull();
  expect(screen.getByText("Current hotel")).toBeTruthy();
});
test("confirmed airport choices are required even when both text inputs are filled", async () => {
  render(<TravelSearch {...props} mode="flights" />);
  fireEvent.change(screen.getByLabelText("From airport"), {
    target: { value: "BUD" },
  });
  fireEvent.change(screen.getByLabelText("To airport"), {
    target: { value: "FCO" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Search flights" }).closest("form"),
  );
  expect(
    await screen.findByText("Choose both airports from the suggestions."),
  ).toBeTruthy();
  expect(travelRequest).not.toHaveBeenCalled();
});
test("editing a selected city or its country requires selecting a destination again", async () => {
  render(<TravelSearch {...props} />);
  const user = await fill();
  fireEvent.change(screen.getByLabelText("Destination or ski area"), {
    target: { value: "Wien" },
  });
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Choose a destination from the suggestions",
  );
  expect(searchRequest).not.toHaveBeenCalled();
  await user.click(await screen.findByRole("button", { name: "Rome Italy" }));
  await user.selectOptions(screen.getByLabelText("Destination country"), "AT");
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  expect(searchRequest).not.toHaveBeenCalled();
});
test("filters exclude unknowns and sort missing prices last without mutating the response", () => {
  const unknown = hotel("Unknown");
  unknown.price.amount = null;
  const known = hotel("Known");
  known.rooms[0].refundable = true;
  known.stars = 4;
  known.review_score = 8;
  const data = [unknown, known];
  expect(
    filterResults(data, { stay: true, sort: "price" }).map((x) => x.id),
  ).toEqual(["Known", "Unknown"]);
  expect(
    filterResults(data, {
      stay: true,
      refundable: true,
      stars: "4",
      rating: "8",
    }).map((x) => x.id),
  ).toEqual(["Known"]);
  expect(data[0]).toBe(unknown);
});
