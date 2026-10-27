import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TravelWorkspace } from './TravelWorkspace';
import { draftTravelFacts } from './CanvasTravel';
import { initialWorkspace, travelWorkspaceReducer, useTravelWorkspace } from './useTravelWorkspace';
import { emptyWorkspaceView, travelWorkspaceUpdateSchema } from './travelWorkspaceSchema';

const chat = vi.hoisted(() => ({ active: true, loading: false, historyError: 'History unavailable', messages: [], snapshot: null, stop: vi.fn(() => new Promise(() => {})) }));
vi.mock('./useTravelConversation', () => ({ useTravelConversation: () => chat }));
vi.mock('./TravelConversation', () => ({ TravelConversation: ({ onClose }) => <button onClick={onClose}>Close chat</button> }));
const initialData = { map: { destination: 'Rome' } };
export function workspaceSnapshot(topic = 'stays', searchId = 'search-1') {
  const price = { amount: '100', currency: 'EUR', basis: topic === 'stays' ? 'stay' : 'party_return', estimated: true, excluded_taxes: [] };
  const leg = (from, to) => ({ stops: 0, duration_minutes: 120, segments: [{ origin: from, destination: to, departure_at: '2027-11-13T10:00:00Z', arrival_at: '2027-11-13T12:00:00Z', airline: 'Observed Air', operating_airline: null, flight_number: null, duration_minutes: 120, technical_stops: [] }] });
  const item = topic === 'stays' ? { id: 'option-1', hotel_id: 'hotel-1', name: searchId, address: 'Rome', image_url: null, stars: 4, review_score: 8, review_count: 10, facilities: [], price, rooms: [] } : { id: 'option-1', airlines: [searchId], price, outbound: leg('BUD', 'FCO'), inbound: leg('FCO', 'BUD'), baggage_summary: null, cabin_bag_included: null, refundable: null, cancellation_summary: null };
  const criteria = topic === 'stays' ? { destination: { city: 'Rome', country_code: 'IT', place_id: 'rome' }, check_in: '2027-11-13', check_out: '2027-11-16', rooms: [{ adults: 2, children_ages: [] }], guest_nationality: 'HU', currency: 'EUR', hotel_id: null } : { origin: 'BUD', destination: 'FCO', departure_date: '2027-11-13', return_date: '2027-11-16', adults: 2, children_ages: [], infant_ages: [], cabin_class: 'ECONOMY', country_code: 'HU', currency: 'EUR' };
  return { search_id: searchId, plan_id: 'plan-1', mode: topic, generation: 1, fingerprint: 'a'.repeat(64), draft_facts: draftTravelFacts(initialData), searched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600000).toISOString(), provider: 'LiteAPI', sandbox: true, returned_count: 1, truncated: false, notices: [], preview_ids: [item.id], search_only_dates: false, criteria, results: [item] };
}
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); HTMLDialogElement.prototype.close = vi.fn(); HTMLDialogElement.prototype.showModal = vi.fn(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

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
