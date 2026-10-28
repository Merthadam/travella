import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TravelWorkspace } from './TravelWorkspace';
import { draftTravelFacts } from './CanvasTravel';
import { initialWorkspace, travelWorkspaceReducer, useTravelWorkspace } from './useTravelWorkspace';
import { emptyWorkspaceView, travelWorkspaceUpdateSchema } from './travelWorkspaceSchema';
import { plansApi } from '../../../plansApi';
import { filterResults, unknownFilterFacts } from './TravelSearch';
import { useTravelConversation } from './useTravelConversation';
import { bindTravelRecoveryScope, clearCanvasViews, readTravelWorkspace, writeTravelWorkspace } from '../canvasViewState';
import { TravelComparison, comparisonEntry } from './TravelComparison';

const chat = vi.hoisted(() => ({ active: true, loading: false, historyError: 'History unavailable', messages: [], snapshot: null, stop: vi.fn(() => new Promise(() => {})) }));
vi.mock('./useTravelConversation', async importOriginal => {
  const actual = await importOriginal();
  return { useTravelConversation: props => chat.real ? actual.useTravelConversation(props) : chat };
});
vi.mock('./TravelConversation', () => ({ TravelConversation: ({ onClose, chat: conversation, renderReferences }) => <><input aria-label="Unsent message"/><button onClick={onClose}>Close chat</button>{conversation.messages?.map(message => <div key={message.message_id}>{renderReferences?.(message)}</div>)}{chat.real && <button disabled={conversation.loading} onClick={() => conversation.send('Find stays')}>Send workspace search</button>}</> }));
const initialData = { map: { destination: 'Rome' } };
export function workspaceSnapshot(topic = 'stays', searchId = 'search-1') {
  const price = { amount: '100', currency: 'EUR', basis: topic === 'stays' ? 'stay' : 'party_return', estimated: true, excluded_taxes: [] };
  const leg = (from, to) => ({ stops: 0, duration_minutes: 120, segments: [{ origin: from, destination: to, departure_at: '2027-11-13T10:00:00Z', arrival_at: '2027-11-13T12:00:00Z', airline: 'Observed Air', operating_airline: null, flight_number: null, duration_minutes: 120, technical_stops: [] }] });
  const item = topic === 'stays' ? { id: 'option-1', hotel_id: 'hotel-1', name: searchId, address: 'Rome', image_url: null, stars: 4, review_score: 8, review_count: 10, facilities: [], price, rooms: [] } : { id: 'option-1', airlines: [searchId], price, outbound: leg('BUD', 'FCO'), inbound: leg('FCO', 'BUD'), baggage_summary: null, cabin_bag_included: null, refundable: null, cancellation_summary: null };
  const criteria = topic === 'stays' ? { destination: { city: 'Rome', country_code: 'IT', place_id: 'rome' }, check_in: '2027-11-13', check_out: '2027-11-16', rooms: [{ adults: 2, children_ages: [] }], guest_nationality: 'HU', currency: 'EUR', hotel_id: null } : { origin: 'BUD', destination: 'FCO', departure_date: '2027-11-13', return_date: '2027-11-16', adults: 2, children_ages: [], infant_ages: [], cabin_class: 'ECONOMY', country_code: 'HU', currency: 'EUR' };
  return { search_id: searchId, plan_id: 'plan-1', mode: topic, generation: 1, fingerprint: 'a'.repeat(64), draft_facts: draftTravelFacts(initialData), searched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600000).toISOString(), provider: 'LiteAPI', sandbox: true, returned_count: 1, truncated: false, notices: [], preview_ids: [item.id], search_only_dates: false, criteria, results: [item] };
}
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); HTMLDialogElement.prototype.close = vi.fn(function () { this.removeAttribute("open"); }); HTMLDialogElement.prototype.showModal = vi.fn(function () { this.setAttribute("open", ""); }); });
afterEach(() => { cleanup(); clearCanvasViews(); chat.real = false; chat.active = true; chat.snapshot = null; chat.messages = []; chat.loading = false; chat.historyError = 'History unavailable'; vi.unstubAllGlobals(); vi.clearAllMocks(); });

test('result pagination announces once and manual dismissal focuses the next card', async () => {
  const snapshot = workspaceSnapshot();
  snapshot.results = Array.from({ length: 25 }, (_, i) => ({ ...snapshot.results[0], id: `option-${i}`, name: `Stay ${i}` }));
  snapshot.returned_count = 25; snapshot.preview_ids = snapshot.results.slice(0, 3).map(item => item.id);
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={{}} mode="accommodation" active initialData={initialData} importedSnapshot={snapshot}/>);
  const dismiss = await screen.findAllByRole('button', { name: 'Dismiss from results' });
  expect(screen.getAllByRole('status').filter(el => el.textContent === '1–10 of 25')).toHaveLength(1);
  dismiss[0].focus(); fireEvent.click(dismiss[0]);
  await act(async () => new Promise(resolve => requestAnimationFrame(resolve)));
  expect(document.activeElement).toBe(dismiss[1]);
});

test('comparison uses compact airport-local times while retaining overnight dates and observed stops', () => {
  const snapshot = workspaceSnapshot('flights'); const item = snapshot.results[0];
  item.outbound.segments[0].departure_at = '2027-11-13T23:45:00+02:00'; item.outbound.segments[0].arrival_at = '2027-11-14T01:12:00+03:00';
  item.outbound.duration_minutes = 87; item.outbound.stops = 1;
  render(<TravelComparison entries={[{ snapshot, item, reference: { search_id: snapshot.search_id, option_id: item.id, room_id: null } }]} currentSearchId={snapshot.search_id} onClose={() => {}} onDetails={() => {}}/>);
  expect(screen.getByText(/1h 27m · 1 stop/)).toBeTruthy();
  expect(screen.getByText(/Direct · Local airport times/)).toBeTruthy();
  const region = screen.getByRole('region', { name: 'Option comparison' });
  expect(region.textContent).toContain('23:45'); expect(region.textContent).toContain('01:12'); expect(region.textContent).toContain('2027-11-14');
  expect(region.textContent).not.toContain('23:45:00'); expect(region.textContent).not.toContain('0 children'); expect(region.textContent).not.toContain('0 infants');
});

test('late history failure from a previous scope cannot expire or poison the current discussion', async () => {
  chat.real = true; let rejectOld;
  const onExpired = vi.fn();
  const api = { travelTopic: vi.fn(({ plan_id }, topic) => plan_id === 'old' ? new Promise((_, reject) => { rejectOld = reject; }) : Promise.resolve({ plan_id, topic, revision: 1, messages: [{ role: 'assistant', content: 'Current history' }] })), cancelAgentTurn: vi.fn(async () => ({})) };
  const { result, rerender } = renderHook(({ planId }) => useTravelConversation({ api, selected: { plan_id: planId }, topic: 'stays', visible: true, onExpired }), { initialProps: { planId: 'old' } });
  await waitFor(() => expect(rejectOld).toBeTruthy()); rerender({ planId: 'new' });
  await waitFor(() => expect(result.current.messages[0]?.content).toBe('Current history'));
  await act(async () => rejectOld(Object.assign(Error('expired previous owner'), { status: 401 })));
  expect(onExpired).not.toHaveBeenCalled(); expect(result.current.historyError).toBe(''); expect(result.current.loading).toBe(false);
});

test('scope switch revokes a run and late cancellation without leaving the next discussion active', async () => {
  chat.real = true; let cancel;
  const api = { travelTopic: vi.fn(async ({ plan_id }, topic) => ({ plan_id, topic, revision: 1, messages: [] })), travelTurn: vi.fn(() => new Promise(() => {})), cancelAgentTurn: vi.fn(() => new Promise(resolve => { cancel = resolve; })) };
  const { result, rerender } = renderHook(({ topic }) => useTravelConversation({ api, selected: { plan_id: 'plan-1' }, topic, visible: true }), { initialProps: { topic: 'stays' } });
  await waitFor(() => expect(result.current.loading).toBe(false)); act(() => { void result.current.send('Find stays'); });
  expect(result.current.active).toBe(true); rerender({ topic: 'flights' });
  await waitFor(() => expect(result.current.snapshot?.topic).toBe('flights'));
  expect(result.current.active).toBe(false);
  await act(async () => cancel({})); expect(result.current.snapshot.topic).toBe('flights');
});

test('changed saved trip facts revoke pending effects while retaining manual results and draft', () => {
  const stop = vi.fn();
  const { result, rerender } = renderHook(({ data }) => useTravelWorkspace({ planId: 'plan-1', topic: 'stays', initialData: data, onManualChange: stop }), { initialProps: { data: initialData } });
  act(() => result.current.importSnapshot(workspaceSnapshot(), 'first', ''));
  act(() => result.current.onWorkspaceRunStart({ run_id: 'run-1', brief_digest: 'b'.repeat(64) }));
  const before = result.current.state;
  const batch = { ...update(), instance_id: before.instanceId, base_revision: before.revision };
  rerender({ data: { map: { destination: 'Paris' } } });
  expect(stop).toHaveBeenCalledTimes(1); expect(result.current.state.snapshot).toBe(before.snapshot);
  expect(result.current.state.draftCriteria).toEqual(before.draftCriteria);
  act(() => expect(result.current.applyWorkspaceUpdate(batch)).toBe(false));
});

test('failed Stop preserves manual control and commit-wins history without replaying a revoked batch', async () => {
  chat.real = true; let finish;
  const updateWorkspace = vi.fn(), end = vi.fn();
  let committed = false;
  const api = { travelTopic: vi.fn(async () => ({ plan_id: 'plan-1', topic: 'stays', brief: { digest: 'b'.repeat(64) }, revision: committed ? 2 : 1, messages: committed ? [{ role: 'assistant', content: 'Committed reply' }] : [], locked: false })),
    travelTurn: vi.fn(() => new Promise(resolve => { finish = resolve; })), cancelAgentTurn: vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({}) };
  const { result } = renderHook(() => useTravelConversation({ api, selected: { plan_id: 'plan-1' }, topic: 'stays', visible: true, onWorkspaceUpdate: updateWorkspace, onWorkspaceRunEnd: end }));
  await waitFor(() => expect(result.current.loading).toBe(false)); act(() => { void result.current.send('sort'); });
  await act(async () => expect(await result.current.stop()).toBe(false));
  expect(end).toHaveBeenCalled(); expect(result.current.active).toBe(true);
  committed = true; await act(async () => finish({ status: 'complete', workspace_update: update() }));
  expect(updateWorkspace).not.toHaveBeenCalled();
  await act(async () => expect(await result.current.stop()).toBe(true));
  expect(result.current.messages[0].content).toBe('Committed reply'); expect(result.current.active).toBe(false);
});

test.each(['fresh', 'expired', 'edited', 'owner-change', 'foreign', 'detail'])('reload uses authorized references and never searches: %s', async outcome => {
  const owner = 'a'.repeat(32); bindTravelRecoveryScope(owner);
  const state = { ...initialWorkspace({ owner, planId: 'plan-1', topic: 'stays', initialData }), searchId: 'search-1', appliedCriteria: workspaceSnapshot().criteria, view: { ...emptyWorkspaceView(), sort: 'price' } };
  state.draftCriteria.city = 'Unsubmitted destination'; state.draftDirty = true;
  if (outcome === 'detail') state.detailsReference = { reference: { search_id: 'search-1', option_id: 'option-1', room_id: null } };
  expect(writeTravelWorkspace(owner, 'plan-1', 'stays', state)).toBe(true);
  let finish; fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useTravelWorkspace({ planId: 'plan-1', topic: 'stays', initialData }));
  expect(result.current.state.instanceId).not.toBe(state.instanceId);
  expect(result.current.state.snapshot).toBeNull(); expect(result.current.state.draftCriteria.city).toBe('Unsubmitted destination');
  await waitFor(() => expect(finish).toBeTruthy());
  if (outcome === 'edited') act(() => result.current.setDraft('city', 'Newer edit'));
  if (outcome === 'owner-change') act(() => bindTravelRecoveryScope('b'.repeat(32)));
  await act(async () => finish({ ok: outcome !== 'expired', status: outcome === 'expired' ? 409 : 200, json: async () => ({ ...workspaceSnapshot(), ...(outcome === 'foreign' ? { plan_id: 'other' } : {}) }) }));
  expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toContain('research/snapshot?'); expect(fetch.mock.calls[0][1].method).toBe('GET');
  if (['fresh', 'detail'].includes(outcome)) { expect(result.current.state.snapshot.search_id).toBe('search-1'); expect(result.current.state.view.sort).toBe('price'); expect(result.current.state.draftCriteria.city).toBe('Unsubmitted destination'); expect(result.current.state.inverse).toBeNull(); expect(result.current.state.detailsReference).toBeNull(); if (outcome === 'detail') expect(result.current.state.recoveredDetails.reference.option_id).toBe('option-1'); }
  else { expect(result.current.state.snapshot).toBeNull(); if (outcome === 'expired') expect(result.current.state.error).toMatch(/Search again/); if (outcome === 'edited') expect(result.current.state.draftCriteria.city).toBe('Newer edit'); }
  if (outcome === 'owner-change') expect(readTravelWorkspace(owner, 'plan-1', 'stays')).toBeNull();
});

test.each(['initial', 'changed', 'saved-facts'])('manual review receipt preserves initial hydration but invalidates changed brief: %s', async scenario => {
  chat.active = false;
  if (scenario === 'changed') chat.snapshot = { revision: 7, brief: { digest: 'before' } };
  const data = workspaceSnapshot('flights'), reference = { search_id: data.search_id, option_id: 'option-1', room_id: null };
  const option = { id: 'observed-fare', title: 'Exact return fare', reference, observed_at: new Date().toISOString(), facts: [], unknowns: [] };
  const receipt = { plan_id: 'plan-1', topic: 'flights', revision: 8, brief: { digest: 'after' }, comparison: { options: [option] }, shortlist: [], preferred: null };
  let finish;
  const api = { travelTurn: vi.fn(async () => ({ status: 'complete', travel_specialist_result: receipt })), prepareTravelChoice: vi.fn(() => new Promise(resolve => { finish = resolve; })) };
  const props = { selected: { plan_id: 'plan-1' }, api, mode: 'flights', active: true, initialData, importedSnapshot: data };
  const rendered = render(<TravelWorkspace {...props}/>);
  fireEvent.click(screen.getByRole('button', { name: 'View flight →' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose for trip' }));
  await waitFor(() => expect(finish).toBeTruthy());
  if (scenario === 'saved-facts') rendered.rerender(<TravelWorkspace {...props} initialData={{ map: { destination: 'Paris' } }}/>);
  await act(async () => finish({ revision: 8, challenge: 'exact-review' }));
  const confirm = screen.queryByRole('button', { name: 'Confirm choice · not booked' });
  if (scenario === 'initial') expect(confirm).toBeTruthy(); else expect(confirm).toBeNull();
});

test('ordinary followups use displayed exact room comparison across searches and clear on close', async () => {
  chat.real = true;
  const current = workspaceSnapshot('stays', 'main-search'), first = workspaceSnapshot('stays', 'rate-a'), second = workspaceSnapshot('stays', 'rate-b');
  for (const [snapshot, id] of [[first, 'room-a'], [second, 'room-b']]) snapshot.results[0].rooms = [{ id, name: id, total: { amount: '950', currency: 'EUR' }, excluded_taxes: [], refundable: true, board_name: null, cancellation_summary: null, cancellation_deadline: null, occupancy_summary: '2 adults' }];
  const refs = [first, second].map(s => ({ search_id: s.search_id, option_id: 'option-1', room_id: s.results[0].rooms[0].id }));
  const history = { plan_id: 'plan-1', topic: 'stays', revision: 4, brief: { digest: 'brief' }, messages: [{ message_id: 'old', comparison: { options: refs.map((reference, i) => ({ id: String(i), title: reference.room_id, reference })) } }] };
  const api = { travelTopic: vi.fn(async () => history), travelTurn: vi.fn(async () => ({ status: 'complete' })), cancelAgentTurn: vi.fn(async () => ({})) };
  fetch.mockImplementation(async url => ({ ok: true, json: async () => url.includes('rate-a') ? first : second }));
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={api} mode="accommodation" active initialData={initialData} importedSnapshot={current}/>);
  for (const ref of refs) {
    fireEvent.click(await screen.findByRole('button', { name: `View ${ref.room_id}` }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Compare room' }));
    await screen.findByText(`Exact room: ${ref.room_id}`);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Send workspace search' }));
  await waitFor(() => expect(api.travelTurn).toHaveBeenCalledTimes(1));
  expect(api.travelTurn.mock.calls[0][4].travelDiscussion).toEqual({ intent: 'discuss', options: refs });
  expect(api.travelTurn.mock.calls[0][4].workspaceContext.search_id).toBe('main-search');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send workspace search' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send workspace search' }));
  await waitFor(() => expect(api.travelTurn).toHaveBeenCalledTimes(2));
  expect(api.travelTurn.mock.calls[1][4].travelDiscussion).toBeUndefined();
});

test('manual exact fare review and confirmed receipt survive unavailable chat history', async () => {
  chat.active = false; chat.send = vi.fn(); chat.refresh = vi.fn(async () => { throw new Error('History unavailable'); });
  const data = workspaceSnapshot('flights'), reference = { search_id: data.search_id, option_id: 'option-1', room_id: null };
  const option = { id: 'observed-fare', title: 'Exact return fare', reference, price_label: 'EUR 100', observed_at: new Date().toISOString(), facts: ['Return fare for 2 adults'], unknowns: [], provider: 'LiteAPI' };
  const receipt = { plan_id: 'plan-1', topic: 'flights', revision: 8, comparison: { options: [option] }, shortlist: [], preferred: null, readiness: 'researching' };
  const committed = { ...receipt, revision: 9, preferred: option, shortlist: [option], readiness: 'ready' };
  const api = { travelTurn: vi.fn(async () => ({ status: 'complete', travel_specialist_result: receipt })), prepareTravelChoice: vi.fn(async () => ({ revision: 8, challenge: 'exact-review' })), commitTravelChoice: vi.fn(async () => committed) };
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={api} mode="flights" active initialData={initialData} importedSnapshot={data}/>);
  fireEvent.click(screen.getByRole('button', { name: 'View flight →' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose for trip' }));
  await waitFor(() => expect(api.prepareTravelChoice).toHaveBeenCalledWith({ plan_id: 'plan-1' }, 'flights', { action: 'prefer', evidence_id: 'observed-fare' }, 8));
  expect(chat.send).not.toHaveBeenCalled();
  expect(api.commitTravelChoice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm choice · not booked' }));
  expect(await screen.findByText('Ready · selected, not booked')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirm choice · not booked' })).toBeNull();
  expect(api.commitTravelChoice).toHaveBeenCalledTimes(1);
  const saved = screen.getByRole('region', { name: 'Preferred option' });
  expect(saved.closest('.travel-options-pane')).toBeTruthy();
  expect(within(saved).getByRole('button', { name: 'Remove choice' }).disabled).toBe(false);
  fireEvent.click(within(saved).getByRole('button', { name: 'Remove choice' }));
  await waitFor(() => expect(api.prepareTravelChoice).toHaveBeenLastCalledWith({ plan_id: 'plan-1' }, 'flights', { action: 'remove', evidence_id: 'observed-fare' }, 9));
});

test.each(['filter', 'inactive', 'same-property'])('exact room comparison respects %s changes', async change => {
  const snapshot = workspaceSnapshot('stays', 'original');
  snapshot.results[0].rooms = ['room-a', 'room-b'].map(id => ({ id, name: id, total: { amount: '950', currency: 'EUR' }, excluded_taxes: [], refundable: true, board_name: null, cancellation_summary: null, cancellation_deadline: null, occupancy_summary: '2 adults' }));
  chat.messages = [{ message_id: 'historical', comparison: { options: snapshot.results[0].rooms.map(room => ({ id: room.id, title: room.name, reference: { search_id: 'original', option_id: 'option-1', room_id: room.id } })) } }];
  fetch.mockResolvedValue({ ok: true, json: async () => snapshot });
  const props = { selected: { plan_id: 'plan-1' }, api: {}, mode: 'accommodation', active: true, initialData, importedSnapshot: snapshot };
  const rendered = render(<TravelWorkspace {...props}/>);
  fireEvent.click(screen.getByRole('button', { name: 'View room-a' }));
  const details = await screen.findByRole('dialog');
  expect(within(details).getByText(/Observed room offer · total stay/)).toBeTruthy();
  expect(within(details).queryByText(/Total for all rooms/)).toBeNull();
  let finish;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(within(details).getByRole('button', { name: 'Compare room' }));
  if (change === 'filter') fireEvent.change(screen.getByPlaceholderText('Any budget'), { target: { value: '700' } });
  if (change === 'inactive') rendered.rerender(<TravelWorkspace {...props} active={false}/>);
  await act(async () => finish({ ok: true, json: async () => snapshot }));
  if (change !== 'same-property') { expect(screen.queryByRole('region', { name: 'Option comparison' })).toBeNull(); return; }
  fireEvent.click(screen.getByRole('button', { name: 'View room-b' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Compare room' }));
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Option comparison' })).getAllByRole('article')).toHaveLength(2));
  expect(screen.getByText('Exact room: room-a')).toBeTruthy(); expect(screen.getByText('Exact room: room-b')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'View room-a' }));
  const reopened = await screen.findByRole('dialog');
  fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(within(reopened).getByRole('button', { name: 'Compare room' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }));
  await act(async () => finish({ ok: true, json: async () => snapshot }));
  expect(screen.queryByRole('region', { name: 'Option comparison' })).toBeNull();
});

test('opening a historical exact room keeps current inventory and never starts a supplier search', async () => {
  const original = workspaceSnapshot('stays', 'original'), present = workspaceSnapshot('stays', 'current');
  const room = { id: 'exact-room', name: 'Private apartment', total: { amount: '950', currency: 'EUR' }, excluded_taxes: [], refundable: true, board_name: null, cancellation_summary: null, cancellation_deadline: null, occupancy_summary: '2 adults, 0 children' };
  original.results[0].rooms = [room, { ...room, id: 'other-room', name: 'Other room', total: { amount: '100', currency: 'EUR' } }];
  chat.messages = [{ message_id: 'historical', comparison: { options: [{ id: 'old', title: 'Earlier private apartment', reference: { search_id: 'original', option_id: 'option-1', room_id: 'exact-room' } }] } }];
  fetch.mockResolvedValue({ ok: true, json: async () => original });
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={{}} mode="accommodation" active initialData={initialData} importedSnapshot={present}/>);
  fireEvent.change(screen.getByLabelText('Unsent message'), { target: { value: 'Keep this draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'View Earlier private apartment' }));
  const details = await screen.findByRole('dialog', { name: 'original' });
  expect(within(details).getByText('Private apartment')).toBeTruthy();
  expect(within(details).queryByText('Other room')).toBeNull();
  expect(within(details).getByText('Original observed offer · no availability refresh requested.')).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain('research/snapshot?search_id=original');
  expect(screen.getByLabelText('Unsent message').value).toBe('Keep this draft');
  expect(screen.getByRole('heading', { name: 'current' })).toBeTruthy();
  fireEvent.click(within(details).getByRole('button', { name: 'Close details' }));
  fetch.mockResolvedValue({ ok: false, status: 404 });
  fireEvent.click(screen.getByRole('button', { name: 'View Earlier private apartment' }));
  expect(await screen.findByText(/This earlier observation is no longer available/)).toBeTruthy();
  expect(fetch.mock.calls.every(([url]) => url.includes('research/snapshot?'))).toBe(true);
});

test.each(['review', 'challenge'])('switching away fences a delayed manual %s response', async stage => {
  chat.active = false;
  let resolveReview, resolveChallenge;
  const reference = { search_id: 'search-1', option_id: 'option-1', room_id: null };
  const receipt = { plan_id: 'plan-1', topic: 'flights', revision: 8, comparison: { options: [{ id: 'exact', title: 'Exact fare', reference }] } };
  const terminal = { status: 'complete', travel_specialist_result: receipt };
  const api = { travelTurn: vi.fn(() => stage === 'review' ? new Promise(resolve => { resolveReview = resolve; }) : Promise.resolve(terminal)), prepareTravelChoice: vi.fn(() => new Promise(resolve => { resolveChallenge = resolve; })), commitTravelChoice: vi.fn() };
  const props = { selected: { plan_id: 'plan-1' }, api, mode: 'flights', initialData, importedSnapshot: workspaceSnapshot('flights') };
  const view = render(<TravelWorkspace {...props} active/>);
  fireEvent.click(screen.getByRole('button', { name: 'View flight →' })); fireEvent.click(await screen.findByRole('button', { name: 'Choose for trip' }));
  await waitFor(() => expect(stage === 'review' ? resolveReview : resolveChallenge).toBeTypeOf('function'));
  view.rerender(<TravelWorkspace {...props} active={false}/>);
  await act(async () => stage === 'review' ? resolveReview(terminal) : resolveChallenge({ revision: 8, challenge: 'late' }));
  view.rerender(<TravelWorkspace {...props} active/>);
  expect(screen.queryByRole('button', { name: 'Confirm choice · not booked' })).toBeNull();
  expect(api.commitTravelChoice).not.toHaveBeenCalled();
  if (stage === 'review') expect(api.prepareTravelChoice).not.toHaveBeenCalled();
});

test('main comparison preserves selection order and facts when discussion fails or search changes', async () => {
  chat.send = vi.fn(async () => false);
  const data = workspaceSnapshot('flights');
  data.results = Array.from({ length: 4 }, (_, i) => ({ ...structuredClone(data.results[0]), id: `flight-${i}`, airlines: [`Carrier ${i}`] }));
  data.returned_count = 4; data.preview_ids = data.results.slice(0, 3).map(item => item.id);
  const view = render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={{}} mode="flights" active initialData={initialData} importedSnapshot={data}/>);
  fireEvent.click(screen.getByText('Close chat'));
  const boxes = screen.getAllByLabelText('Compare');
  fireEvent.click(boxes[2]); fireEvent.click(boxes[0]); fireEvent.click(boxes[1]);
  expect(chat.send).not.toHaveBeenCalled();
  expect(boxes[3].disabled).toBe(true);
  expect(screen.getByText('Compare up to three options. Remove one to add another.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Compare selected (3)' }));
  const comparison = await screen.findByRole('region', { name: 'Option comparison' });
  expect([...comparison.querySelectorAll('[data-comparison-option]')].map(node => node.dataset.comparisonOption)).toEqual(['flight-2', 'flight-0', 'flight-1']);
  expect(comparison.textContent).toContain('Return total for all travelers');
  expect(comparison.textContent).toContain('Source: LiteAPI');
  expect(screen.getByRole('button', { name: 'Browse flights' }).getAttribute('aria-pressed')).toBe('true');
  expect(await screen.findByRole('button', { name: 'Retry comparison discussion' })).toBeTruthy();
  expect(chat.send.mock.calls[0][1].options.map(ref => ref.option_id)).toEqual(['flight-2', 'flight-0', 'flight-1']);
  view.rerender(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={{}} mode="flights" active initialData={initialData} importedSnapshot={workspaceSnapshot('flights', 'new-search')} importRequest={1}/>);
  expect(within(screen.getByRole('region', { name: 'Option comparison' })).getByText('Earlier search · historical comparison')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Option comparison' }).textContent).toContain('Carrier 2');
});

test('comparison keeps exact room price and reference distinct from unlike property evidence', () => {
  const first = workspaceSnapshot('stays', 'room-search'), second = workspaceSnapshot('stays', 'property-search');
  const room = { id: 'apartment-rate', name: 'Private apartment', total: { amount: '950', currency: 'EUR' }, excluded_taxes: [], refundable: true };
  first.results[0].rooms = [room];
  second.criteria.check_in = '2027-11-14'; second.criteria.currency = 'USD'; second.results[0].price.currency = 'USD';
  const exact = { search_id: first.search_id, option_id: 'option-1', room_id: room.id };
  const choose = vi.fn();
  render(<TravelComparison entries={[comparisonEntry(first, exact), comparisonEntry(second, { search_id: second.search_id, option_id: 'option-1', room_id: null })]} currentSearchId={second.search_id} onDetails={vi.fn()} onChoose={choose} onClose={vi.fn()}/>);
  expect(screen.getByText('EUR 950')).toBeTruthy();
  expect(screen.getByText('Property comparison · no room selected')).toBeTruthy();
  expect(screen.getByText(/These totals are not directly comparable/)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Choose for trip' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Choose for trip' }));
  expect(choose).toHaveBeenCalledWith({ title: 'Private apartment', reference: exact });
});

test.each(['origin', 'actual currency'])('comparison flags different %s even when requested destination and currency match', difference => {
  const first = workspaceSnapshot('flights', 'first'), second = workspaceSnapshot('flights', 'second');
  if (difference === 'origin') second.criteria.origin = 'VIE';
  else second.results[0].price.currency = 'USD';
  render(<TravelComparison entries={[first, second].map(value => comparisonEntry(value, { search_id: value.search_id, option_id: 'option-1', room_id: null }))} currentSearchId="second" onClose={vi.fn()}/>);
  expect(screen.getByText(/These totals are not directly comparable/)).toBeTruthy();
});

test('manual review reports an actual lease rejection without preparing or saving a choice', async () => {
  chat.active = true; chat.stop.mockResolvedValueOnce(false); chat.send = vi.fn();
  const api = { travelTurn: vi.fn(async () => ({ status: 'error', message: 'Another reply is still finishing. Retry after it stops.' })), prepareTravelChoice: vi.fn(), commitTravelChoice: vi.fn() };
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={api} mode="flights" active initialData={initialData} importedSnapshot={workspaceSnapshot('flights')}/>);
  fireEvent.click(screen.getByRole('button', { name: 'View flight →' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose for trip' }));
  expect(await screen.findByText('Another reply is still finishing. Retry after it stops.')).toBeTruthy();
  expect(chat.stop).toHaveBeenCalled();
  expect(api.prepareTravelChoice).not.toHaveBeenCalled(); expect(api.commitTravelChoice).not.toHaveBeenCalled(); expect(chat.send).not.toHaveBeenCalled();
});

test.each(['stays', 'flights'])('manual %s filters retain labeled unknowns and sort missing prices last like host operations', topic => {
  const known = workspaceSnapshot(topic).results[0];
  const unknown = structuredClone(known); unknown.id = 'unknown'; unknown.price.amount = null;
  if (topic === 'stays') { known.rooms = [{ refundable: true }]; unknown.stars = null; unknown.review_score = null; unknown.rooms = [{ refundable: null }]; }
  else { known.refundable = true; known.cabin_bag_included = true; unknown.refundable = null; unknown.cabin_bag_included = null; unknown.outbound.stops = null; }
  const filters = { ...emptyWorkspaceView(), stay: topic === 'stays', budget: '100', refundable: true, sort: 'price', ...(topic === 'stays' ? { stars: '4', rating: '8' } : { direct: true, bag: true }) };
  expect(filterResults([unknown, known], filters).map(item => item.id)).toEqual(['option-1', 'unknown']);
  expect(unknownFilterFacts(unknown, filters)).toContain('total price');
  expect(unknownFilterFacts(known, filters)).toEqual([]);
  expect(unknown.price.amount).toBeNull();
});

test.each(['current', 'state-only', 'terminal-only', 'draft', 'sort', 'filter', 'compare', 'dismiss', 'manual', 'brief', 'failed', 'stop'])('real conversation delivers one committed batch and rejects %s races', async race => {
  chat.real = true;
  let finish, stream, eventId;
  const saved = { plan_id: 'plan-1', topic: 'stays', revision: 1, brief: { digest: 'b'.repeat(64) }, messages: [], notes: { items: [] }, shortlist: [], locked: false };
  const api = { travelTopic: vi.fn(async () => saved), cancelAgentTurn: vi.fn(async () => ({})),
    travelTurn: vi.fn((plan, topic, message, id, options) => { eventId = id; stream = options; return new Promise(resolve => { finish = resolve; }); }) };
  let stop;
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={api} mode="accommodation" active initialData={initialData}
    importedSnapshot={workspaceSnapshot('stays', 'old-search')} registerStop={(topic, fn) => { stop = fn; }}/>);
  await waitFor(() => expect(screen.getByText('Send workspace search').disabled).toBe(false));
  fireEvent.click(screen.getByText('Send workspace search'));
  await waitFor(() => expect(stream).toBeTruthy());
  expect(stream.workspaceContext).toMatchObject({ revision: 1, draft_dirty: false, search_id: 'old-search' });
  const batch = { ...update(), run_id: eventId, base_revision: stream.workspaceContext.revision, instance_id: stream.workspaceContext.instance_id };
  if (race !== 'terminal-only') await act(async () => stream.onEvent({ type: 'STATE_SNAPSHOT', snapshot: { workspace_update: batch } }));
  expect(screen.queryByRole('heading', { name: 'search-1' })).toBeNull();
  if (race === 'draft') fireEvent.change(screen.getByLabelText('Destination or ski area'), { target: { value: 'Paris' } });
  if (race === 'sort') fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price' } });
  if (race === 'filter') fireEvent.change(screen.getByLabelText('Minimum stars'), { target: { value: '5' } });
  if (race === 'compare') fireEvent.click(screen.getByLabelText('Compare'));
  if (race === 'dismiss') fireEvent.click(screen.getByRole('button', { name: 'Dismiss from results' }));
  if (race === 'manual') {
    fetch.mockResolvedValue({ ok: true, json: async () => workspaceSnapshot('stays', 'manual-search') });
    fireEvent.click(screen.getByRole('button', { name: 'Search stays' }));
  }
  if (race === 'brief') saved.brief = { digest: 'c'.repeat(64) };
  if (race === 'stop') await act(async () => stop());
  const composer = screen.getByLabelText('Unsent message');
  fireEvent.change(composer, { target: { value: 'Keep my draft' } }); composer.focus();
  const terminal = { type: 'TERMINAL', status: race === 'failed' ? 'error' : 'complete', ...(race !== 'state-only' ? { workspace_update: batch } : {}) };
  await act(async () => { stream.onEvent(terminal); finish(terminal); });
  if (['current', 'state-only', 'terminal-only'].includes(race)) {
    expect(await screen.findByRole('heading', { name: 'search-1' })).toBeTruthy();
    expect(document.activeElement).toBe(composer); expect(composer.value).toBe('Keep my draft');
    // Late duplicate delivery after the run ended cannot apply again.
    await act(async () => stream.onEvent({ type: 'STATE_SNAPSHOT', snapshot: { workspace_update: batch } }));
    expect(screen.getAllByRole('heading', { name: 'search-1' })).toHaveLength(1);
    expect(screen.getByText('Results updated. Your saved choices have not changed.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo workspace change' }));
    expect(screen.getByRole('heading', { name: 'old-search' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Undo workspace change' })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  } else expect(screen.queryByRole('heading', { name: 'search-1' })).toBeNull();
});

test('HTTP stream parser preserves the same strict workspace envelope in state and terminal and rejects foreign or extra data', async () => {
  const batch = update(), events = [];
  const context = { instance_id: 'instance-1', revision: 0, search_id: null, view: emptyWorkspaceView(), draft_dirty: false };
  const stream = value => ({ ok: true, body: new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode([
      { type: 'STATE_SNAPSHOT', snapshot: { workspace_update: value } },
      { type: 'TERMINAL', status: 'complete', workspace_update: value },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join(''))); controller.close();
  } }) });
  for (const value of [batch, { ...batch, plan_id: 'foreign' }, { ...batch, raw_payload: 'private' }, { ...batch, run_id: 'old' }]) {
    fetch.mockResolvedValueOnce(stream(value)); events.length = 0;
    const terminal = await plansApi.travelTurn({ plan_id: 'plan-1' }, 'stays', 'search', 'run-1', { workspaceContext: context, onEvent: event => events.push(event) });
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body).workspace_context).toEqual(context);
    expect(terminal.workspace_update).toEqual(value === batch ? batch : undefined);
    expect(events[0].snapshot.workspace_update).toEqual(terminal.workspace_update);
  }
  const calls = fetch.mock.calls.length;
  await expect(plansApi.travelTurn({ plan_id: 'plan-1' }, 'stays', 'search', 'run-1', { workspaceContext: { ...context, revision: Infinity }, onEvent: () => {} })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(calls);
});

test.each(['stays', 'flights'])('mounted %s manual HTTP search works with chat closed and unresolved cancellation; typing rejects late completion', async topic => {
  let finish;
  const fresh = workspaceSnapshot(topic, 'Fresh result');
  fetch.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => fresh }); }));
  render(<TravelWorkspace selected={{ plan_id: 'plan-1', owner_id: 'owner' }} api={{}} mode={topic === 'stays' ? 'accommodation' : 'flights'} active initialData={initialData} importedSnapshot={workspaceSnapshot(topic)}/>);
  fireEvent.click(screen.getByText('Close chat'));
  fireEvent.click(screen.getByRole('button', { name: topic === 'stays' ? 'Search stays' : 'Search flights' }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe(`/v1/agent/plans/plan-1/travel/${topic === 'stays' ? 'hotels' : 'flights'}/search`);
  expect(request.credentials).toBe('same-origin');
  expect(request.method).toBe('POST');
  fireEvent.change(screen.getByLabelText(topic === 'stays' ? 'Check-in' : 'Departure'), { target: { value: '2027-11-14' } });
  await act(async () => finish());
  expect(screen.queryByRole('heading', { name: 'Fresh result' })).toBeNull();
  expect(screen.getByLabelText(topic === 'stays' ? 'Check-in' : 'Departure').value).toBe('2027-11-14');
  fetch.mockResolvedValue({ ok: true, json: async () => fresh });
  fireEvent.click(screen.getByRole('button', { name: topic === 'stays' ? 'Search stays' : 'Search flights' }));
  expect(await screen.findByRole('heading', { name: 'Fresh result' })).toBeTruthy();
});

function authorized() {
  const state = initialWorkspace({ owner: 'owner', planId: 'plan-1', topic: 'stays', initialData, instanceId: 'instance-1' });
  return travelWorkspaceReducer(state, { type: 'run-start', authority: { run_id: 'run-1', brief_digest: 'b'.repeat(64) } });
}
function update() { return { action_id: 'action-1', plan_id: 'plan-1', topic: 'stays', instance_id: 'instance-1', base_revision: 0, run_id: 'run-1', brief_digest: 'b'.repeat(64), search_id: 'search-1', snapshot: workspaceSnapshot(), view: emptyWorkspaceView() }; }
test('dismiss and restore are exact local mutations with a fresh version-bound inverse', () => {
  const loaded = travelWorkspaceReducer(authorized(), { type: 'workspace-update', update: update() });
  const reference = { search_id: 'search-1', option_id: 'option-1', room_id: null };
  for (const invalid of [{ ...reference, option_id: 'foreign' }, { ...reference, search_id: 'old' }, { ...reference, room_id: 'invented' }])
    expect(travelWorkspaceReducer(loaded, { type: 'dismiss', reference: invalid })).toBe(loaded);
  const hidden = travelWorkspaceReducer(loaded, { type: 'dismiss', reference });
  expect(hidden.view.dismissed_ids).toEqual(['option-1']);
  expect(hidden.snapshot).toBe(loaded.snapshot);
  expect(travelWorkspaceReducer({ ...hidden, revision: hidden.revision + 1 }, { type: 'undo' }).view.dismissed_ids).toEqual(['option-1']);
  const restored = travelWorkspaceReducer(hidden, { type: 'restore', reference });
  expect(restored.view.dismissed_ids).toEqual([]);
  expect(restored.snapshot.searched_at).toBe(loaded.snapshot.searched_at);
  expect(travelWorkspaceReducer(hidden, { type: 'undo' }).view.dismissed_ids).toEqual([]);
  expect(travelWorkspaceReducer(hidden, { type: 'undo', now: Date.parse(hidden.snapshot.expires_at) + 1 }).inverse).toBeNull();
  const edited = travelWorkspaceReducer(hidden, { type: 'view', patch: { sort: 'price' } });
  expect(edited.inverse).toBeNull();
});

test('mounted dismissal and restore leave durable choices alone and make no requests', async () => {
  const api = { prepareTravelChoice: vi.fn(), commitTravelChoice: vi.fn() };
  render(<TravelWorkspace selected={{ plan_id: 'plan-1' }} api={api} mode="accommodation" active initialData={initialData} importedSnapshot={workspaceSnapshot()}/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Dismiss from results' }));
  expect(screen.queryByRole('heading', { name: 'search-1' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Restore search-1' }));
  expect(screen.getByRole('heading', { name: 'search-1' })).toBeTruthy();
  expect(api.prepareTravelChoice).not.toHaveBeenCalled(); expect(api.commitTravelChoice).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
test('atomic agent batch applies evidence and clean draft once with one inverse; never applies during hydration', () => {
  const state = authorized(), envelope = update();
  expect(travelWorkspaceUpdateSchema.safeParse(envelope).success).toBe(true);
  expect(travelWorkspaceReducer(state, { type: 'workspace-update', update: envelope, hydrating: true })).toBe(state);
  const next = travelWorkspaceReducer(state, { type: 'workspace-update', update: envelope });
  expect(next.snapshot.search_id).toBe('search-1');
  expect(next.draftCriteria.city).toBe('Rome');
  expect(next.appliedCriteria).toEqual(envelope.snapshot.criteria);
  expect(next.revision).toBe(1);
  expect(next.inverse.snapshot).toBeNull();
  expect(travelWorkspaceReducer(next, { type: 'workspace-update', update: envelope })).toBe(next);
  const undone = travelWorkspaceReducer(next, { type: 'undo' });
  expect(undone.snapshot).toBeNull(); expect(undone.revision).toBe(2); expect(undone.inverse).toBeNull();
});
test.each(['plan_id', 'topic', 'instance_id', 'base_revision', 'run_id', 'brief_digest', 'search_id'])('agent batch rejects stale %s', field => {
  const state = authorized(), envelope = update();
  envelope[field] = field === 'base_revision' ? 1 : field === 'topic' ? 'flights' : field === 'brief_digest' ? 'c'.repeat(64) : 'other';
  expect(travelWorkspaceReducer(state, { type: 'workspace-update', update: envelope })).toBe(state);
});
test('agent batch rejects changed owner, expired evidence, fabricated membership, extra fields and dirty drafts', () => {
  const state = authorized();
  for (const envelope of [ { ...update(), unexpected: true }, { ...update(), view: { ...emptyWorkspaceView(), dismissed_ids: ['invented'] } }, { ...update(), snapshot: { ...workspaceSnapshot(), searched_at: '2020-01-01T00:00:00Z', expires_at: '2020-01-01T00:10:00Z' } } ])
    expect(travelWorkspaceReducer(state, { type: 'workspace-update', update: envelope })).toBe(state);
  for (const changed of [{ ...state, owner: 'other-owner' }, { ...state, draftDirty: true }, travelWorkspaceReducer(state, { type: 'draft', field: 'start', value: '2027-11-14' }), travelWorkspaceReducer(state, { type: 'view', patch: { sort: 'price' } })])
    expect(travelWorkspaceReducer(changed, { type: 'workspace-update', update: update() })).toBe(changed);
});
test('opening details and scrolling preserve authority; revisions stay safe at integer boundary', () => {
  const state = authorized();
  const inspected = travelWorkspaceReducer(state, { type: 'details', value: { reference: { search_id: 'search-1', option_id: 'option-1', room_id: null } } });
  expect(inspected.revision).toBe(state.revision); expect(inspected.authority).toBe(state.authority);
  expect(travelWorkspaceReducer(inspected, { type: 'scroll' })).toBe(inspected);
  const wrapped = travelWorkspaceReducer({ ...state, revision: Number.MAX_SAFE_INTEGER }, { type: 'draft', field: 'city', value: 'Paris' });
  expect(wrapped.instanceId).not.toBe(state.instanceId); expect(wrapped.revision).toBe(0); expect(wrapped.authority).toBeNull();
});

test('manual registry completion loses to typing, and malformed or cross-Plan evidence preserves previous results', async () => {
  let finishRegistry;
  const first = workspaceSnapshot(), next = workspaceSnapshot('stays', 'next-search');
  const { result } = renderHook(() => useTravelWorkspace({ owner: 'owner', planId: 'plan-1', topic: 'stays', initialData }));
  act(() => result.current.importSnapshot(first, 'first'));
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ search_id: next.search_id, results: next.results }) })
    .mockImplementationOnce(() => new Promise(resolve => { finishRegistry = () => resolve({ ok: true, json: async () => next }); }));
  let pending;
  act(() => { pending = result.current.search(first.criteria); });
  await waitFor(() => expect(finishRegistry).toBeTypeOf('function'));
  expect(fetch.mock.calls[1][0]).toContain('/research/snapshot?search_id=next-search');
  act(() => result.current.setDraft('start', '2027-11-14'));
  await act(async () => { finishRegistry(); await pending; });
  expect(result.current.state.snapshot.search_id).toBe(first.search_id);
  for (const invalid of [{ ...next, plan_id: 'another-plan' }, { ...next, checkout_token: 'private' }, { ...next, results: [{ ...next.results[0], id: 'forged' }] }]) {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ search_id: next.search_id }) }).mockResolvedValueOnce({ ok: true, json: async () => invalid });
    await act(async () => result.current.search(first.criteria));
    expect(result.current.state.snapshot.search_id).toBe(first.search_id);
    expect(result.current.state.error).toContain('could not be verified');
  }
});

test('manual mutation revokes authority before cancellation callback; private checkout handles never enter shared state', async () => {
  const onManualChange = vi.fn(() => { expect(result.current.applyWorkspaceUpdate(envelope)).toBe(false); return new Promise(() => {}); });
  const { result } = renderHook(() => useTravelWorkspace({ owner: 'owner', planId: 'plan-1', topic: 'stays', initialData, onManualChange }));
  const envelope = { ...update(), instance_id: result.current.state.instanceId };
  act(() => result.current.onWorkspaceRunStart({ run_id: 'run-1', brief_digest: 'b'.repeat(64) }));
  act(() => result.current.setDraft('start', '2027-11-14'));
  expect(onManualChange).toHaveBeenCalledOnce();
  const snap = workspaceSnapshot();
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ search_id: snap.search_id, results: [{ ...snap.results[0], checkout_token: 'private-handle' }] }) }).mockResolvedValueOnce({ ok: true, json: async () => snap });
  await act(async () => result.current.search(snap.criteria));
  expect(JSON.stringify(result.current.state)).not.toContain('private-handle');
  expect(JSON.stringify(result.current.getWorkspaceContext())).not.toContain('private-handle');
  expect(result.current.getCheckoutToken({ search_id: snap.search_id, option_id: 'option-1' })).toBe('private-handle');
});

test('saved traveler count prefills bounded rooms and return-flight party; owner changes rotate instance and clear evidence', () => {
  const many = initialWorkspace({ planId: 'plan-1', topic: 'stays', initialData: { essentials: { travelers: 8 } } });
  expect(many.draftCriteria.rooms.map(room => room.adults)).toEqual([6, 2]);
  const { result, rerender } = renderHook(({ owner }) => useTravelWorkspace({ owner, planId: 'plan-1', topic: 'flights', initialData: { essentials: { travelers: 3 } } }), { initialProps: { owner: 'first' } });
  expect(result.current.state.draftCriteria.adults).toBe(3);
  const instance = result.current.state.instanceId;
  act(() => result.current.importSnapshot(workspaceSnapshot('flights'), 'first'));
  rerender({ owner: 'second' });
  expect(result.current.state.instanceId).not.toBe(instance); expect(result.current.state.snapshot).toBeNull();
});
