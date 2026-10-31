import React from "react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  within,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TravelSearch, filterResults } from "./TravelSearch";
import { travelRequest } from "./travelApi";
import { draftTravelFacts, TravelPhoto, safeTravelImage, travelSnapshotSchema } from './CanvasTravel';
import { bindTravelRecoveryScope, clearCanvasViews, writeTravelWorkspace } from '../canvasViewState';
import { draftFromCriteria, initialWorkspace } from './useTravelWorkspace';
vi.mock("./travelApi", () => ({ travelRequest: vi.fn() }));
const searchRequest = vi.fn();
const catalogRequest = vi.fn();
beforeEach(() => {
  const registered = new Map();
  catalogRequest.mockResolvedValue({ items: [] });
  travelRequest.mockImplementation(async (plan, action, criteria, signal) => {
    if (action === 'hotels/catalog') return catalogRequest(criteria);
    if (action === 'research/snapshot') return registered.get(criteria.search_id);
    if (action === 'places') return {
          places: [{ place_id: "rome-place", name: "Rome", address: "Italy" }],
        };
    const result = await searchRequest(plan, action, criteria, signal);
    if (action.endsWith('/search') && result?.search_id) {
      const safe = structuredClone(result);
      safe.results = safe.results.map(({ checkout_token, ...item }) => item);
      registered.set(result.search_id, safe);
    }
    return result;
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const hotel = (name) => ({
  id: name,
  hotel_id: name,
  name,
  address: null, image_url: null, stars: null, review_score: null, review_count: null, facilities: [],
  rooms: [{ id: 'room', name: 'Observed room', refundable: null, board_name: null, cancellation_summary: null, cancellation_deadline: null, total: { amount: '100', currency: 'EUR' }, excluded_taxes: [], occupancy_summary: null }],
  price: { amount: "100", currency: "EUR", basis: 'stay', estimated: true, excluded_taxes: [] },
});
const response = (name) => ({
  ...imported('accommodation', name),
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
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
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
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
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
test("filters retain unknowns and sort missing prices last without mutating the response", () => {
  const unknown = hotel("Unknown");
  unknown.price.amount = null;
  unknown.rooms[0].refundable = null;
  unknown.stars = null;
  unknown.review_score = null;
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
      sort: "provider",
    }).map((x) => x.id),
  ).toEqual(["Unknown", "Known"]);
  expect(data[0]).toBe(unknown);
});

function imported(mode='accommodation', id='import-1') {
  const stay=mode==='accommodation';
  const price={amount:'700',currency:'USD',basis:stay?'stay':'party_return',estimated:true,excluded_taxes:[]};
  const leg=(from,to,day)=>({stops:0,duration_minutes:120,segments:[{origin:from,destination:to,departure_at:day+'T10:00:00+02:00',arrival_at:day+'T12:00:00+02:00',airline:'Observed Air',operating_airline:null,flight_number:null,duration_minutes:120,technical_stops:[]}]});
  const item=stay ? {id,hotel_id:'observed-hotel',name:id,address:'Lisbon',image_url:'https://photos.example.com/hotel.jpg',stars:4,review_score:8.5,review_count:22,facilities:['Wi-Fi'],price,rooms:[]} : {id,price,airlines:[id],outbound:leg('BUD','LIS','2027-11-13'),inbound:leg('LIS','BUD','2027-11-16'),baggage_summary:null,cabin_bag_included:null,refundable:null,cancellation_summary:null};
  return {search_id:id,mode:stay?'stays':'flights',plan_id:props.planId,generation:1,fingerprint:'a'.repeat(64),draft_facts:draftTravelFacts(props.initialData),searched_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString(),provider:'LiteAPI',sandbox:true,returned_count:1,truncated:false,notices:[],preview_ids:[id],search_only_dates:true,results:[item],criteria:stay ? {destination:{city:'Lisbon',country_code:'PT',place_id:null},check_in:'2027-11-13',check_out:'2027-11-16',rooms:[{adults:2,children_ages:[7]}],guest_nationality:'HU',currency:'USD',hotel_id:null} : {origin:'BUD',destination:'LIS',departure_date:'2027-11-13',return_date:'2027-11-16',adults:2,children_ages:[7],infant_ages:[1],cabin_class:'BUSINESS',currency:'USD',country_code:'HU'}};
}

test('flight traveler picker sends exact counts, age selections and the existing cabin after Done', async () => {
  const data = imported('flights');
  searchRequest.mockImplementation(async (_plan, action, criteria) => action === 'flights/search'
    ? { ...imported('flights', 'family-search'), criteria }
    : undefined);
  render(<TravelSearch {...props} mode="flights" importedSnapshot={data}/>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Travelers.*4 travelers/i }));
  expect(screen.getByLabelText('Child 1 age').value).toBe('7');
  expect(screen.getByLabelText('Infant 1 age').value).toBe('1');
  await user.click(screen.getByRole('button', { name: 'Add adult' }));
  await user.click(screen.getByRole('button', { name: 'Add child' }));
  await user.selectOptions(screen.getByLabelText('Child 2 age'), '5');
  await user.click(screen.getByRole('button', { name: 'Add infant' }));
  await user.selectOptions(screen.getByLabelText('Infant 2 age'), '0');
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: /Travelers.*7 travelers/i }).getAttribute('aria-expanded')).toBe('false');
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Search flights' }));
  await screen.findByRole('heading', { name: 'family-search' });
  expect(searchRequest.mock.calls.find(call => call[1] === 'flights/search')[2]).toEqual({
    ...data.criteria, adults: 3, children_ages: [7, 5], infant_ages: [1, 0],
  });
});

test.each(['child', 'infant'])('closed flight picker exposes a missing %s age before searching', async kind => {
  const data = imported('flights');
  data.criteria.children_ages = [];
  data.criteria.infant_ages = [];
  render(<TravelSearch {...props} mode="flights" importedSnapshot={data}/>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Travelers.*2 travelers/i }));
  await user.click(screen.getByRole('button', { name: `Add ${kind}` }));
  await user.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: /Travelers.*3 travelers/i }).getAttribute('aria-expanded')).toBe('false');
  await user.click(screen.getByRole('button', { name: 'Search flights' }));
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  const label = `${kind[0].toUpperCase()}${kind.slice(1)} 1 age`;
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(label)));
  expect(screen.getByRole('button', { name: /Travelers.*3 travelers/i }).getAttribute('aria-expanded')).toBe('true');
});

test('flight traveler edits recover on remount with their exact ages and cabin', async () => {
  bindTravelRecoveryScope('f'.repeat(32));
  try {
    const recoveryProps = { ...props, planId: 'flight-traveler-recovery', mode: 'flights' };
    const view = render(<TravelSearch {...recoveryProps}/>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Travelers.*2 travelers/i }));
    await user.click(screen.getByRole('button', { name: 'Add child' }));
    await user.selectOptions(screen.getByLabelText('Child 1 age'), '8');
    await user.click(screen.getByRole('button', { name: 'Add infant' }));
    await user.selectOptions(screen.getByLabelText('Infant 1 age'), '0');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.selectOptions(screen.getByLabelText('Cabin'), 'PREMIUM_ECONOMY');
    view.unmount();
    render(<TravelSearch {...recoveryProps}/>);
    await user.click(screen.getByRole('button', { name: /Travelers.*4 travelers/i }));
    expect(screen.getByLabelText('Child 1 age').value).toBe('8');
    expect(screen.getByLabelText('Infant 1 age').value).toBe('0');
    expect(screen.getByLabelText('Cabin').value).toBe('PREMIUM_ECONOMY');
    expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  } finally {
    cleanup();
    clearCanvasViews();
  }
});

test('an incomplete adult count recovered from the old flight form cannot submit zero adults', async () => {
  const owner = 'e'.repeat(32), planId = 'flight-traveler-incomplete-recovery';
  bindTravelRecoveryScope(owner);
  try {
    const state = initialWorkspace({ owner, planId, topic: 'flights', initialData: props.initialData });
    state.draftCriteria = { ...state.draftCriteria, ...draftFromCriteria(imported('flights').criteria, 'flights'), adults: '', children: [], infants: [] };
    state.draftDirty = true;
    expect(writeTravelWorkspace(owner, planId, 'flights', state)).toBe(true);
    render(<TravelSearch {...props} planId={planId} mode="flights"/>);
    expect(screen.getByRole('button', { name: /Travelers.*0 travelers/i })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Search flights' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Choose at least one adult');
    expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  } finally {
    cleanup();
    clearCanvasViews();
  }
});

test.each(['accommodation','flights'])('new %s import defeats an older manual response; same identity and expiry cannot overwrite manual continuation',async(mode)=>{
  let resolveOld;
  const first=imported(mode), next=imported(mode,'import-2');
  if(mode==='flights') {
    next.criteria.origin='VIE';next.results[0].outbound.segments[0].origin='VIE';next.results[0].inbound.segments[0].destination='VIE';
  }
  searchRequest.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce({...next,preview_ids:['manual'],results:[{...next.results[0],id:'manual',...(mode === 'accommodation' ? {name:'Manual current'} : {airlines:['Manual current']})}]});
  const view=render(<TravelSearch {...props} mode={mode} importedSnapshot={first}/>);
  await screen.findByRole('heading',{name:'import-1'});
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
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
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={next} importRequest={1}/>);
  await screen.findByRole('heading',{name:'import-2'});
  if(!stay)expect(screen.getByLabelText('From airport').value).toBe('VIE');
  expect(searchRequest.mock.calls[0][3].aborted).toBe(true);
  await act(async()=>resolveOld({...first,results:[{...first.results[0],name:'Obsolete',airlines:['Obsolete']}]}));
  expect(screen.queryByRole('heading',{name:'Obsolete'})).toBeNull();
  fireEvent.change(screen.getByLabelText(start),{target:{value:'2027-11-14'}});
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...next}} importRequest={1}/>);
  expect(screen.getByLabelText(start).value).toBe('2027-11-14');
  fireEvent.submit(screen.getByRole('button',{name:button}).closest('form'));
  await screen.findByRole('heading',{name:'Manual current'});
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...next,expires_at:new Date(Date.now()-1).toISOString()}} importRequest={1} importReason="These results have expired."/>);
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
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'View rooms →'}));
  await screen.findByText('No room offers are available for these dates.');
  expect(searchRequest.mock.calls.map(x=>x[1])).toEqual(['hotels/detail','hotels/search']);
  expect(searchRequest.mock.calls[0][2]).toEqual({hotel_id:'observed-hotel'});
  expect(searchRequest.mock.calls[1][2]).toEqual({...s.criteria,hotel_id:'observed-hotel'});
});

test.each(['complete', 'closed', 'failed', 'expired-session', 'left-workspace'])('manual checkout preparation %s keeps the original view until ready',async(outcome)=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  const s=imported('flights');
  const review = {sandbox:true,mode:'flights',status:'review',token:'verified-token',flight:s.results[0]};
  let finish, fail;
  searchRequest.mockImplementation(async (_plan, action) => action === 'flights/search'
    ? {...s,results:[{...s.results[0],checkout_token:'manual-only-token'}]}
    : new Promise((resolve,reject) => {finish=resolve;fail=reject;}));
  const onFlightCheckout = vi.fn(), onExpired = vi.fn();
  const view = render(<TravelSearch {...props} mode="flights" importedSnapshot={s} onFlightCheckout={onFlightCheckout} onExpired={onExpired}/>);
  await screen.findByRole('heading',{name:s.search_id});
  fireEvent.click(screen.getByRole('button',{name:'View flight →'}));
  expect(screen.queryByRole('button',{name:'Continue to flight checkout'})).toBeNull();
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Search again to check current availability'}));
  await waitFor(()=>expect(searchRequest).toHaveBeenCalledTimes(1));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Search flights'}).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'View flight →'}));
  expect(onFlightCheckout).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button',{name:'Cancel fare check'}).disabled).toBe(false);
  expect(searchRequest.mock.calls.map(x=>x[1])).toEqual(['flights/search', 'sandbox/flights/verify']);
  expect(searchRequest.mock.calls[1][2]).toEqual({token:'manual-only-token'});
  const signal = searchRequest.mock.calls[1][3];
  if (outcome === 'closed' || outcome === 'left-workspace') {
    if (outcome === 'closed') fireEvent.click(screen.getByRole('button', {name:'Cancel fare check'}));
    else view.rerender(<TravelSearch {...props} mode="flights" active={false} importedSnapshot={s} onFlightCheckout={onFlightCheckout} onExpired={onExpired}/>);
    expect(signal.aborted).toBe(true);
    await act(async () => finish(review));
    expect(onFlightCheckout).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  } else if (outcome === 'failed' || outcome === 'expired-session') {
    await act(async () => fail(Object.assign(new Error('Verification failed'), {status:outcome === 'expired-session' ? 401 : 503})));
    expect(onFlightCheckout).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Verification failed');
    expect(screen.getByRole('button',{name:'View flight →'}).disabled).toBe(false);
    expect(onExpired).toHaveBeenCalledTimes(outcome === 'expired-session' ? 1 : 0);
    fireEvent.click(screen.getByRole('button',{name:'View flight →'}));
    await act(async () => finish(review));
    expect(onFlightCheckout).toHaveBeenCalledTimes(1);
  } else {
    await act(async () => finish(review));
    expect(onFlightCheckout).toHaveBeenCalledWith({offerToken:'manual-only-token',initialReview:review},signal);
    expect(screen.queryByRole('dialog')).toBeNull();
  }
});

test.each(['foreign','wrong_mode','expired','superseded'])('invalid %s import exposes no offers and makes no requests',async(kind)=>{
  const s=imported();
  if(kind==='foreign')s.plan_id='another-plan';
  if(kind==='expired')s.expires_at=new Date(Date.now()-1).toISOString();
  render(<TravelSearch {...props} mode={kind==='wrong_mode'?'flights':'accommodation'} importedSnapshot={s} importReason={kind==='superseded'?'Replaced by newer search':''}/>);
  await screen.findByText(/These results are no longer available/);
  expect(screen.queryByRole('heading',{name:s.search_id})).toBeNull();
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
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
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
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
  view.rerender(<TravelSearch {...props} mode={mode} importedSnapshot={{...data, search_id: 'new-search'}} importRequest={1} />);
  expect(cards()[0].dataset.optionId).toBe('option-1');
  expect(screen.queryByText('Your comparison (1/3)')).toBeNull();
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
});


test("manual hotel detail keeps browsing and exposes no room discussion or offer tokens", async () => {
  const onDiscuss = vi.fn();
  const data = response("Courtyard apartment");
  data.search_id = "manual-search-1";
  data.results[0].checkout_token = "private-offer-token";
  searchRequest.mockImplementation(async (_plan, action) => action === 'hotels/detail' ? { hotel: { facilities: [] } } : data);
  render(<TravelSearch {...props} onDiscuss={onDiscuss} />);
  const user = await fill();
  await user.click(screen.getByRole("button", { name: "Search stays" }));
  await user.click(await screen.findByRole("button", { name: 'View rooms →' }));
  await screen.findByText('Observed room');
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByRole('button', { name: 'Discuss room' })).toBeNull();
  expect(onDiscuss).not.toHaveBeenCalled();
  expect(dialog.textContent).not.toContain('private-offer-token');
  await user.click(within(dialog).getByRole('button', { name: 'Close details' }));
  expect(screen.getByRole('button', { name: /View rooms/ })).toBeTruthy();
  expect(searchRequest.mock.calls.map(call => call[1])).toEqual(['hotels/search', 'hotels/detail', 'hotels/search']);
});

test('provider-backed apartment and amenity filters apply to new searches and can be cleared', async () => {
  catalogRequest.mockImplementation(criteria => Promise.resolve({ items: criteria.kind === 'hotel_types' ? [{ id: 201, name: 'Apartments' }, { id: 202, name: 'Hotels' }] : [{ id: 7, name: 'Kitchen' }, { id: 8, name: 'Pool' }] }));
  searchRequest.mockResolvedValue(response('Filtered apartment'));
  render(<TravelSearch {...props}/>);
  const user = await fill();
  await user.click(screen.getByText('Property type, amenities & cancellation'));
  await user.click(await screen.findByRole('button', { name: 'Apartments' }));
  await user.click(screen.getByRole('button', { name: 'Hotels' }));
  for (const name of ['Kitchen', 'Pool']) await user.click(screen.getByRole('button', { name }));
  await user.selectOptions(screen.getByLabelText('Amenity matching'), 'any');
  await user.click(screen.getByLabelText('Search refundable rates only'));
  await user.click(screen.getByRole('button', { name: 'Search stays' }));
  await screen.findByText('Filtered apartment');
  expect(screen.queryByText('Property type 201')).toBeNull();
  expect(screen.getByLabelText('Applied search constraints').textContent).toContain('Apartments');
  const request = searchRequest.mock.calls.find(call => call[1] === 'hotels/search')[2];
  expect(request).toMatchObject({ hotel_type_ids: [201, 202], facility_ids: [7, 8], strict_facility_filtering: false, refundable_rates_only: true });
  await user.click(screen.getByRole('button', { name: 'Clear search filters' }));
  await user.click(screen.getByRole('button', { name: 'Search stays' }));
  const last = searchRequest.mock.calls.filter(call => call[1] === 'hotels/search').at(-1)[2];
  expect(last.hotel_type_ids).toBeUndefined(); expect(last.facility_ids).toBeUndefined(); expect(last.refundable_rates_only).toBeUndefined();
});

test('flight metadata survives strict browser projection and cards show carrier and evidence scope', () => {
  const data = imported('flights');
  Object.assign(data.results[0].outbound.segments[0], { marketing_code: 'OA', marketing_logo: 'https://assets.nuitee.flights/airlines/OA.svg', operating_code: 'OP', operating_logo: null, operating_airline: 'Operating Air' });
  Object.assign(data.results[0].inbound.segments[0], { airline: 'Return Air', marketing_code: 'RA', marketing_logo: null });
  expect(travelSnapshotSchema.safeParse(data).success).toBe(true);
  render(<TravelSearch {...props} mode="flights" importedSnapshot={data}/>);
  expect(screen.getByRole('img', { name: 'Observed Air logo' })).toBeTruthy();
  expect(screen.getByText('Return Air')).toBeTruthy();
  const card = document.querySelector('.travel-result');
  expect(card.textContent).toContain('2 adults · 1 child · 1 infant');
  expect(card.textContent).toContain('Source: LiteAPI');
  expect(card.textContent).toContain('Cancellation terms unavailable');
  expect(card.textContent).toContain('Local airport times');
});

test('stay cards distinguish property amenities and unknown room or distance evidence', () => {
  render(<TravelSearch {...props} importedSnapshot={imported()}/>);
  const card = document.querySelector('.travel-result');
  expect(card.textContent).toContain('3 nights · 1 room · 2 adults · 1 child');
  expect(card.textContent).toContain('Property amenities: Wi-Fi');
  expect(card.textContent).toContain('Room amenities not supplied');
  expect(card.textContent).toContain('Distance unavailable');
  expect(card.textContent).toContain('Source: LiteAPI');
});

test('catalog failure offers retry and keeps ordinary manual search available', async () => {
  catalogRequest.mockRejectedValue(new Error('Unavailable'));
  searchRequest.mockResolvedValue(response('Hotel'));
  render(<TravelSearch {...props}/>);
  const user = await fill();
  await user.click(screen.getByText('Property type, amenities & cancellation'));
  expect(await screen.findByRole('button', { name: 'Retry filters' })).toBeTruthy();
  expect(screen.queryByRole('searchbox', { name: 'Search property types' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Search stays' }));
  expect(await screen.findByText('Hotel')).toBeTruthy();
});

test('manual continuation preserves property and amenity filters imported from agent results', async () => {
  const data = imported();
  Object.assign(data.criteria, { hotel_type_ids: [201], facility_ids: [7], strict_facility_filtering: false, refundable_rates_only: true });
  searchRequest.mockResolvedValue(response('Apartment continuation'));
  render(<TravelSearch {...props} importedSnapshot={data}/>);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Search stays' }));
  await screen.findByText('Apartment continuation');
  expect(searchRequest.mock.calls.find(call => call[1] === 'hotels/search')[2]).toMatchObject({ hotel_type_ids: [201], facility_ids: [7], strict_facility_filtering: false, refundable_rates_only: true });
});

test('refresh keeps applied criteria and observation time visible; empty success preserves exact constraints', async () => {
  let complete;
  const first = imported();
  searchRequest.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  render(<TravelSearch {...props} importedSnapshot={first}/>);
  fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2027-11-14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search stays' }));
  expect(screen.getByText(/Updating results/)).toBeTruthy();
  expect(screen.getByText(/2027-11-13/)).toBeTruthy();
  const checked = screen.getByText(/Checked /).textContent;
  await act(async () => complete({ ...first, results: [], preview_ids: [], returned_count: 0 }));
  expect(screen.getByText('No availability for this search.')).toBeTruthy();
  expect(screen.getByLabelText('Check-in').value).toBe('2027-11-14');
  expect(screen.getByText(/Checked /).textContent).toBe(checked);
  expect(screen.getByRole('button', { name: 'Edit search' })).toBeTruthy();
});

test('new results retain open detail original full identity and mark detached evidence', async () => {
  HTMLDialogElement.prototype.close = vi.fn(); HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  const first = imported('flights'), next = imported('flights', 'new-search');
  next.results[0].id = first.results[0].id; next.preview_ids = [first.results[0].id];
  next.criteria.origin = 'VIE';
  const onChoose = vi.fn();
  searchRequest.mockResolvedValue(next);
  render(<TravelSearch {...props} mode="flights" importedSnapshot={first} onChoose={onChoose}/>);
  fireEvent.click(screen.getByRole('button', { name: /View flight/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Search flights' }));
  await screen.findByRole('heading', { name: 'new-search' });
  expect(screen.getByText(/Earlier search.*original observation/)).toBeTruthy();
  const dialog = document.querySelector('dialog');
  expect(dialog.textContent).toContain('import-1');
  expect(dialog.textContent).not.toContain('Choose for trip');
  expect(dialog.textContent).not.toContain('Discuss flight');
  expect(onChoose).not.toHaveBeenCalled();
});

test('view-only filters and sort perform no supplier request and exclude confirmed violations', async () => {
  render(<TravelSearch {...props} importedSnapshot={imported()}/>);
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price' } });
  fireEvent.change(screen.getByLabelText('Minimum stars'), { target: { value: '5' } });
  expect(screen.getByText('No options match these filters.')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Reset filters' })[0]);
  expect(screen.getByRole('heading', { name: 'import-1' })).toBeTruthy();
  expect(travelRequest.mock.calls.filter(([, action]) => action !== 'hotels/catalog')).toHaveLength(0);
});

test('delayed Trip import cannot replace a manual search made after its navigation request', async () => {
  const view = render(<TravelSearch {...props} importRequest={1}/>);
  searchRequest.mockResolvedValue(response('Newer manual result'));
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Search stays' }));
  await screen.findByRole('heading', { name: 'Newer manual result' });
  view.rerender(<TravelSearch {...props} importRequest={1} importedSnapshot={imported()}/>);
  expect(screen.getByRole('heading', { name: 'Newer manual result' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'import-1' })).toBeNull();
  view.rerender(<TravelSearch {...props} importRequest={2} importedSnapshot={imported()}/>);
  expect(screen.getByRole('heading', { name: 'import-1' })).toBeTruthy();
});
