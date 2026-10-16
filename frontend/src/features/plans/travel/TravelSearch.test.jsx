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
import { draftTravelFacts, TravelPhoto, safeTravelImage } from './CanvasTravel';
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
async function chooseCountry(user, label, name) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.type(screen.getByRole('combobox', { name: label }), name);
  await user.click(screen.getByRole('option', { name }));
}
async function fill() {
  const user = userEvent.setup();
  await chooseCountry(user, "Destination country", "Italy");
  await user.click(await screen.findByRole("button", { name: "Rome Italy" }));
  await chooseCountry(user, "Guest nationality", "Hungary");
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
  await chooseCountry(user, "Destination country", "Austria");
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

function imported(mode='accommodation', id='import-1') {
  const stay=mode==='accommodation';
  const price={amount:'700',currency:'USD',basis:stay?'stay':'party_return',estimated:true,excluded_taxes:[]};
  const leg=(from,to,day)=>({stops:0,duration_minutes:120,segments:[{origin:from,destination:to,departure_at:day+'T10:00:00+02:00',arrival_at:day+'T12:00:00+02:00',airline:'Observed Air',operating_airline:null,flight_number:null,duration_minutes:120,technical_stops:[]}]});
  const item=stay ? {id,hotel_id:'observed-hotel',name:id,address:'Lisbon',image_url:'https://photos.example.com/hotel.jpg',stars:4,review_score:8.5,review_count:22,facilities:['Wi-Fi'],price,rooms:[]} : {id,price,airlines:[id],outbound:leg('BUD','LIS','2027-11-13'),inbound:leg('LIS','BUD','2027-11-16'),baggage_summary:null,cabin_bag_included:null,refundable:null,cancellation_summary:null};
  return {search_id:id,mode:stay?'stays':'flights',plan_id:props.planId,generation:1,fingerprint:'a'.repeat(64),draft_facts:draftTravelFacts(props.initialData),searched_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString(),provider:'LiteAPI',sandbox:true,returned_count:1,truncated:false,notices:[],preview_ids:[id],search_only_dates:true,results:[item],criteria:stay ? {destination:{city:'Lisbon',country_code:'PT',place_id:null},check_in:'2027-11-13',check_out:'2027-11-16',rooms:[{adults:2,children_ages:[7]}],guest_nationality:'HU',currency:'USD',hotel_id:null} : {origin:'BUD',destination:'LIS',departure_date:'2027-11-13',return_date:'2027-11-16',adults:2,children_ages:[7],infant_ages:[1],cabin_class:'BUSINESS',currency:'USD',country_code:'HU'}};
}

test.each(['accommodation','flights'])('new %s import defeats an older manual response; same identity and expiry cannot overwrite manual continuation',async(mode)=>{
  let resolveOld;
  const first=imported(mode), next=imported(mode,'import-2');
  if(mode==='flights') {
    next.criteria.origin='VIE';next.results[0].outbound.segments[0].origin='VIE';next.results[0].inbound.segments[0].destination='VIE';
  }
  searchRequest.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce({...next,results:[{...next.results[0],id:'manual',name:'Manual current',airlines:['Manual current']}]});
  const view=render(<TravelSearch {...props} mode={mode} importedSnapshot={first}/>);
  await screen.findByRole('heading',{name:'import-1'});
  expect(travelRequest).not.toHaveBeenCalled();
  const stay=mode==='accommodation', button=stay?'Search stays':'Search flights', start=stay?'Check-in':'Departure';
  expect(screen.getByLabelText(start).value).toBe('2027-11-13');
  expect(screen.getByLabelText('Currency').value).toBe('USD');
  if(stay) {
    expect(screen.getByLabelText('Destination or ski area').value).toBe('Lisbon');
    expect(screen.getByLabelText('Destination country').value).toBe('Portugal');
    expect(screen.getByLabelText('Guest nationality').value).toBe('Hungary');
  } else {
    expect(screen.getByLabelText('From airport').value).toBe('BUD');
    expect(screen.getByLabelText('To airport').value).toBe('LIS');
    expect(screen.getByLabelText('Cabin').value).toBe('BUSINESS');
    expect(screen.getByLabelText('Country of residence').value).toBe('Hungary');
  }
  fireEvent.submit(screen.getByRole('button',{name:button}).closest('form'));
  expect(searchRequest.mock.calls[0][2]).toEqual(stay ? {...first.criteria,hotel_id:undefined} : first.criteria);
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={next}/>);
  await screen.findByRole('heading',{name:'import-2'});
  if(!stay)expect(screen.getByLabelText('From airport').value).toBe('VIE');
  expect(searchRequest.mock.calls[0][3].aborted).toBe(true);
  await act(async()=>resolveOld({...first,results:[{...first.results[0],name:'Obsolete',airlines:['Obsolete']}]}));
  expect(screen.queryByRole('heading',{name:'Obsolete'})).toBeNull();
  fireEvent.change(screen.getByLabelText(start),{target:{value:'2027-11-14'}});
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...next}}/>);
  expect(screen.getByLabelText(start).value).toBe('2027-11-14');
  fireEvent.submit(screen.getByRole('button',{name:button}).closest('form'));
  await screen.findByRole('heading',{name:'Manual current'});
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...next,expires_at:new Date(Date.now()-1).toISOString()}} importReason="These results have expired."/>);
  expect(screen.getByRole('heading',{name:'Manual current'})).toBeTruthy();
  expect(screen.queryByText('These results have expired.')).toBeNull();
  expect(searchRequest).toHaveBeenCalledTimes(2);
});

test('stay import uses observed hotel ID and search criteria only after View rooms',async()=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  const s=imported();
  searchRequest.mockImplementation(async(_plan,action)=>action==='hotels/detail'?{hotel:{address:'Lisbon',facilities:[]}}:{results:[]});
  render(<TravelSearch {...props} importedSnapshot={s}/>);
  await screen.findByRole('heading',{name:s.search_id});
  fireEvent.click(screen.getByLabelText('Compare'));
  expect(screen.getByText('Your comparison (1/3)')).toBeTruthy();
  expect(travelRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'View rooms →'}));
  await screen.findByText('No room offers are available for these dates.');
  expect(searchRequest.mock.calls.map(x=>x[1])).toEqual(['hotels/detail','hotels/search']);
  expect(searchRequest.mock.calls[0][2]).toEqual({hotel_id:'observed-hotel'});
  expect(searchRequest.mock.calls[1][2]).toEqual({...s.criteria,hotel_id:'observed-hotel'});
});

test('token-free flight details require explicit search before normal mock checkout becomes eligible',async()=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  const s=imported('flights');
  searchRequest.mockResolvedValue({...s,results:[{...s.results[0],checkout_token:'manual-only-token'}]});
  render(<TravelSearch {...props} mode="flights" importedSnapshot={s}/>);
  await screen.findByRole('heading',{name:s.search_id});
  fireEvent.click(screen.getByRole('button',{name:'View flight →'}));
  expect(screen.queryByRole('button',{name:'Try mock flight booking'})).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Search again to check current availability'}));
  await waitFor(()=>expect(searchRequest).toHaveBeenCalledTimes(1));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Search flights'}).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'View flight →'}));
  expect(screen.getByRole('button',{name:'Try mock flight booking'})).toBeTruthy();
  expect(searchRequest.mock.calls.map(x=>x[1])).toEqual(['flights/search']);
});

test.each(['foreign','wrong_mode','expired','superseded'])('invalid %s import exposes no offers and makes no requests',async(kind)=>{
  const s=imported();
  if(kind==='foreign')s.plan_id='another-plan';
  if(kind==='expired')s.expires_at=new Date(Date.now()-1).toISOString();
  render(<TravelSearch {...props} mode={kind==='wrong_mode'?'flights':'accommodation'} importedSnapshot={s} importReason={kind==='superseded'?'Replaced by newer search':''}/>);
  await screen.findByText(/These results are no longer available/);
  expect(screen.queryByRole('heading',{name:s.search_id})).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
});

test('photo failure and unsafe URLs show an accessible honest fallback',()=>{
  const view=render(<TravelPhoto url="https://photos.example.com/hotel.jpg" name="Observed hotel"/>);
  const image=screen.getByRole('img',{name:'Observed hotel, hotel photo'});
  expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
  fireEvent.error(image);
  expect(screen.getByText('Photo unavailable')).toBeTruthy();
  for(const url of ['http://example.com/a.jpg','https://user:secret@example.com/a.jpg','https://example.com/a?token=x','https://example.com/a#secret','https://127.0.0.1/a','https://[::1]/a','https://photos.internal/a','https://example.com:8443/a']) {
    expect(safeTravelImage(url)).toBeNull();
    view.rerender(<TravelPhoto url={url} name="Observed hotel"/>);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Photo unavailable')).toBeTruthy();
  }
});

test('changing Plan on a mounted search removes a previous Plan import',async()=>{
  const s=imported();const view=render(<TravelSearch {...props} importedSnapshot={s}/>);
  await screen.findByRole('heading',{name:s.search_id});
  view.rerender(<TravelSearch {...props} planId="other-plan" importedSnapshot={s}/>);
  await screen.findByText(/These results are no longer available/);
  expect(screen.queryByRole('heading',{name:s.search_id})).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
});


test.each(['accommodation', 'flights'])('%s paginates ten at a time, preserves comparisons, and resets after sorting/filtering/import', async (mode) => {
  const data = imported(mode);
  data.results = Array.from({length: 23}, (_, i) => ({...data.results[0], id: `option-${i + 1}`, ...(mode === 'accommodation' ? {name: `Option ${i + 1}`} : {airlines: [`Option ${i + 1}`]}), price: {...data.results[0].price, amount: String(i + 1)}}));
  data.returned_count = 23; data.preview_ids = ['option-1', 'option-2', 'option-3'];
  const user = userEvent.setup();
  const view = render(<TravelSearch {...props} mode={mode} importedSnapshot={data} />);
  const cards = () => view.container.querySelectorAll('.travel-result');
  expect(cards()).toHaveLength(10);
  await user.click(screen.getAllByLabelText('Compare')[0]);
  await user.click(screen.getAllByRole('button', {name: 'Next results pages'})[0]);
  expect(cards()).toHaveLength(10);
  expect(cards()[0].dataset.optionId).toBe('option-11');
  expect(screen.getByText('Your comparison (1/3)')).toBeTruthy();
  await user.click(screen.getAllByRole('button', {name: 'Next results pages'})[0]);
  expect(cards()).toHaveLength(3);
  expect(screen.getAllByRole('button', {name: 'Next results pages'})[0].disabled).toBe(true);
  await user.selectOptions(screen.getByLabelText('Sort by'), 'price');
  expect(cards()[0].dataset.optionId).toBe('option-1');
  expect(screen.getAllByLabelText('Compare')[0].checked).toBe(true);
  await user.click(screen.getAllByRole('button', {name: 'Next results pages'})[0]);
  fireEvent.change(screen.getByLabelText('Maximum total (USD)'), {target: {value: '2'}});
  expect(cards()).toHaveLength(2);
  expect(cards()[0].dataset.optionId).toBe('option-1');
  fireEvent.change(screen.getByLabelText('Maximum total (USD)'), {target: {value: '0'}});
  expect(screen.getByText('No options match these filters.')).toBeTruthy();
  expect(screen.queryByRole('navigation', {name: 'results pages'})).toBeNull();
  await user.click(screen.getAllByRole('button', {name: 'Reset filters'})[0]);
  await user.click(screen.getAllByRole('button', {name: 'Next results pages'})[0]);
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...data, search_id: 'new-search'}} />);
  expect(cards()[0].dataset.optionId).toBe('option-1');
  expect(screen.queryByText('Your comparison (1/3)')).toBeNull();
  expect(travelRequest).not.toHaveBeenCalled();
});
