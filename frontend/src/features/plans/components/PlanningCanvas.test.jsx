import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningCanvas } from './PlanningCanvas';
import { usePlanningCanvas } from '../usePlanningCanvas';
import { travelRequest } from '../travel/travelApi';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';

vi.mock('../travel/travelApi', () => ({ travelRequest: vi.fn() }));
vi.mock('./CanvasDestinationMap', async () => {
  const { createContext } = await import('react');
  return { CanvasMapContext: createContext({}), CanvasDestinationMap: () => <div>Destination map</div> };
});
vi.mock('../travel/TravelSearch', () => ({
  useTravelCapabilities: () => ({ capabilities: { hotels: true, flights: true, sandbox: true } }),
  TravelSearch: ({ planId, mode, active, onBookingResult }) => <section hidden={!active} aria-label={`${mode} search`}>Search {mode}<button onClick={() => onBookingResult(planId, { sandbox: true, status: 'confirmed', booking_id: 'TEST123', hotel_name: 'Ski stay', check_in: '2027-02-03', check_out: '2027-02-07' })}>Complete mock stay</button></section>,
}));
beforeEach(() => {
  sessionStorage.clear(); vi.mocked(travelRequest).mockReset();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const confirmedFlights = { finalDestination: 'Milan', flights: 'needed', provenance: { finalDestination: { source: 'user_edit' }, flights: { source: 'user_edit', updated_at: '2026-10-16T10:00:00Z' } } };
function setup() {
  const api = {
    canvas: vi.fn(async () => ({ revision: 1, context_revision: 1, snapshot: null })),
    researchContext: vi.fn(async () => ({ revision: 1, context: { ...confirmedFlights, finalDestination: 'Milan', travelers: 2 } })),
    conversationMessages: vi.fn(async () => []),
    saveCanvas: vi.fn(), cancelAgentTurn: vi.fn(async () => {}),
    editCanvas: vi.fn(async (_selected, _draft, _message, _id, { onEvent }) => {
      onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: 'You can compare airports for Milan.' });
      onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_edit_result: { suggestions: [], add_ids: [], area: null } } });
      return { status: 'complete' };
    }),
  };
  render(<AppearanceProvider><PlanningCanvas selected={{ plan_id: 'test-plan', title: 'Test trip' }} api={api} /></AppearanceProvider>);
  return api;
}

test('confirmed no flights omits the card and travel navigation while keeping accommodation usable', async () => {
  const user = userEvent.setup();
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { ...confirmedFlights, flights: 'not-needed' } }),
    conversationMessages: async () => [],
  };
  render(<PlanningCanvas selected={{ plan_id: 'no-flights', title: 'Train trip' }} api={api}/>);
  await screen.findByRole('button', { name: 'Explore accommodation' });
  expect(screen.queryByRole('button', { name: 'Explore flights' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit dates', exact: true }));
  await user.type(screen.getByRole('textbox', { name: /Date note/ }), 'By train');
  await user.click(screen.getByRole('button', { name: 'Update dates' }));
  await user.click(screen.getByRole('button', { name: 'Explore accommodation' }));
  expect(screen.queryByRole('button', { name: 'Flights', exact: true })).toBeNull();
  expect(screen.getByRole('region', { name: 'accommodation search' })).toBeTruthy();
});

test('regenerating after a confirmed No removes the old flight and persists its absence', async () => {
  let context = { ...confirmedFlights }, stored = null, revision = 1;
  const api = {
    canvas: async () => ({ revision: 1, context_revision: revision, saved_context_revision: revision, snapshot: stored }),
    researchContext: async () => ({ revision, context }),
    saveCanvas: vi.fn(async (_plan, body) => { stored = structuredClone(body.snapshot); return { ...body, revision: 2 }; }),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'flight-change' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data.flights.need).toBe('needed');
  const generated = structuredClone(result.current.data); delete generated.flights;
  context = { ...confirmedFlights, flights: 'not-needed' }; revision = 2;
  api.generateCanvas = vi.fn(async (_plan, body, _id, { onEvent }) => {
    onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_draft: { generation_id: body.generation_id, context_revision: 2, components: generated, group_status: { themes: 'ready', research: 'ready' } } } });
    return { status: 'complete' };
  });
  await act(() => result.current.generate('all', 2));
  expect(result.current.data.flights).toBeUndefined();
  expect(result.current.valid).toBe(true);
  act(() => result.current.action('essentials', 'edit_essentials', { ...result.current.data.essentials, travelers: 3 }));
  expect(result.current.data.accommodation.subtitle).toBe('3 travelers');
  act(() => result.current.updateMockBooking('flight-change', { sandbox: true, mode: 'flights', status: 'confirmed', booking_id: 'old' }));
  expect(result.current.data.flights).toBeUndefined();
  await act(() => result.current.save());
  expect(result.current.dirty).toBe(false);
  expect(stored.components.flights).toBeUndefined();
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data.flights).toBeUndefined();
  expect(result.current.data.essentials.travelers).toBe(3);
});

test('confirming Yes adds flights even when essentials were edited while flights were absent', async () => {
  let context = { ...confirmedFlights, flights: 'not-needed' }, revision = 1;
  const api = {
    canvas: async () => ({ revision: 1, context_revision: revision, snapshot: null }),
    researchContext: async () => ({ revision, context }),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'add-flights' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.action('essentials', 'edit_essentials', { ...result.current.data.essentials, travelers: 3 }));
  const generated = structuredClone(result.current.data);
  generated.flights = { ...generated.accommodation, need: 'needed', subtitle: 'Travelers not set' };
  context = confirmedFlights; revision = 2;
  api.generateCanvas = vi.fn(async (_plan, body, _id, { onEvent }) => {
    onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_draft: { generation_id: body.generation_id, context_revision: 2, components: generated, group_status: { themes: 'ready', research: 'ready' } } } });
    return { status: 'complete' };
  });
  await act(() => result.current.generate('all', 2));
  expect(result.current.data.flights).toMatchObject({ need: 'needed', subtitle: '3 travelers' });
  expect(result.current.error).toBe('');
});

test('open card edits and unsent chat survive flight and stay navigation', async () => {
  const user = userEvent.setup(); const api = setup();
  await user.click(await screen.findByRole('button', { name: 'Add preference', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Preference' }), 'Unfinished preference');
  const message = screen.getByRole('textbox', { name: 'Message Travella' });
  expect(message.disabled).toBe(false);
  await user.type(message, 'Which airport is easiest?');
  expect(screen.queryByRole('button', { name: 'Save plan', exact: true })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Explore flights' }));
  expect(screen.getByRole('region', { name: 'flights search' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Explore flights' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Plan content' })).toBeNull();
  expect(screen.queryByRole('dialog', { name: 'Explore travel' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Preference' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Stays', exact: true }));
  expect(screen.getByRole('region', { name: 'accommodation search' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: '← Back to canvas' }));
  expect(screen.getByRole('textbox', { name: 'Preference' }).value).toBe('Unfinished preference');
  expect(screen.getByRole('textbox', { name: 'Message Travella' }).value).toBe('Which airport is easiest?');
  await user.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(api.editCanvas).toHaveBeenCalledOnce());
  expect(await screen.findByText('You can compare airports for Milan.')).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Preference' }).value).toBe('Unfinished preference');
  expect(api.saveCanvas).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Use dark mode' })).toBeNull();
});

test('cancelling an editor during a reply releases the save lock after the reply', async () => {
  const user = userEvent.setup(); const api = setup();
  let finish;
  api.editCanvas.mockImplementation((_selected, _draft, _message, _id, { onEvent }) => new Promise(resolve => {
    finish = () => {
      onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_edit_result: { suggestions: [], add_ids: [], area: null } } });
      resolve({ status: 'complete' });
    };
  }));
  await user.click(await screen.findByRole('button', { name: 'Add preference', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Message Travella' }), 'Help with this trip');
  await user.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  finish();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true));
  expect(screen.queryByRole('textbox', { name: 'Preference' })).toBeNull();
  expect(api.saveCanvas).not.toHaveBeenCalled();
});


test('adding an explicitly chosen activity preserves an independent open editor', async () => {
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { ...confirmedFlights, finalDestination: 'Milan', travelers: 2 } }),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  act(() => result.current.action('essentials', 'editor_state', { editing: true }));
  const essentials = result.current.data.essentials;
  let added;
  act(() => { added = result.current.addActivities([{ id: 'test-place', name: 'Chosen park', position: { lat: 45.47, lng: 9.18 }, reason: 'A quiet walk' }]); });
  expect(added).toBe(true);
  expect(result.current.editing).toBe(true);
  expect(result.current.data.map.pins.map(pin => pin.name)).toEqual(['Chosen park']);
  expect(result.current.data.essentials).toEqual(essentials);
});

const booking = { sandbox: true, status: 'confirmed', booking_id: 'TEST123', hotel_name: 'Ski stay', check_in: '2027-02-03', check_out: '2027-02-07', token: 'never-save-this', guests: ['never-save-guests'] };

test('confirmed checkout switches the real canvas card to a clearly labeled mock state', async () => {
  const user = userEvent.setup(); const api = setup();
  await user.click(await screen.findByRole('button', { name: 'Explore accommodation' }));
  await user.click(screen.getByRole('button', { name: 'Complete mock stay' }));
  await user.click(screen.getByRole('button', { name: '← Back to canvas' }));
  expect(await screen.findByText('Mock booked')).toBeTruthy();
  expect(screen.getByText('Ski stay')).toBeTruthy();
  expect(screen.getByText('Sandbox only · no real reservation or charge')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'View mock stay' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Explore flights' })).toBeTruthy();
  expect(api.saveCanvas).not.toHaveBeenCalled();
});

test('mock stay is explicitly saved, restored, and preserved through regeneration and trip edits', async () => {
  let stored = null;
  const api = {
    canvas: vi.fn(async () => ({ revision: 1, context_revision: 1, saved_context_revision: 1, snapshot: stored })),
    researchContext: vi.fn(async () => ({ revision: 1, context: { ...confirmedFlights, finalDestination: 'Milan', travelers: 2 } })),
    saveCanvas: vi.fn(async (_plan, body) => { stored = structuredClone(body.snapshot); return { ...body, revision: 2 }; }),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  const original = structuredClone(result.current.data);
  for (const status of ['review', 'pending', 'not_found', 'failed']) act(() => result.current.updateMockBooking('test-plan', { ...booking, status }));
  act(() => result.current.updateMockBooking('another-plan', booking));
  act(() => result.current.updateMockBooking('test-plan', { ...booking, sandbox: false }));
  expect(result.current.data).toEqual(original);
  act(() => result.current.updateMockBooking('test-plan', booking));
  expect(api.saveCanvas).not.toHaveBeenCalled();
  expect(result.current.data.flights).toEqual(original.flights);
  await act(() => result.current.save());
  expect(result.current.dirty).toBe(false);
  expect(JSON.stringify(stored)).not.toMatch(/never-save/);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data.accommodation.bookingStatus).toBe('mock-booked');
  api.generateCanvas = async (_plan, body, _id, { onEvent }) => {
    onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_draft: { generation_id: body.generation_id, context_revision: 1, components: original, group_status: { themes: 'ready', research: 'ready' } } } });
    return { status: 'complete' };
  };
  await act(() => result.current.generate());
  expect(result.current.data.accommodation.bookingStatus).toBe('mock-booked');
  act(() => result.current.action('essentials', 'edit_essentials', { ...original.essentials, travelers: 3 }));
  expect(result.current.data.accommodation.mockBooking.checkIn).toBe('2027-02-03');
  act(() => result.current.updateMockBooking('test-plan', { ...booking, booking_id: 'OTHER', status: 'cancelled' }));
  expect(result.current.data.accommodation.bookingStatus).toBe('mock-booked');
  act(() => result.current.updateMockBooking('test-plan', { ...booking, status: 'cancelled' }));
  expect(result.current.data.accommodation.bookingStatus).toBe('not-booked');
});

test('checkout finishing during Save remains an unsaved change instead of being lost', async () => {
  let finish;
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: {} }),
    saveCanvas: vi.fn((_plan, body) => new Promise(resolve => { finish = () => resolve({ ...body, revision: 2 }); })),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let saving;
  act(() => { saving = result.current.save(); });
  act(() => result.current.updateMockBooking('test-plan', booking));
  await act(async () => { finish(); await saving; });
  expect(result.current.data.accommodation.bookingStatus).toBe('mock-booked');
  expect(result.current.saved.components.accommodation.bookingStatus).toBe('not-booked');
  expect(result.current.dirty).toBe(true);
});

test('a single candidate is a transient map hint without choosing or saving the destination', async () => {
  let context = { candidates: ['Milan'], finalDestination: '' };
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context }),
    saveCanvas: vi.fn(),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.mapDestinationHint).toBe('Milan');
  expect(result.current.data.map).toMatchObject({ destination: '', final: false, pins: [] });
  expect(api.saveCanvas).not.toHaveBeenCalled();
  context = { candidates: ['Milan', 'Paris'], finalDestination: '' };
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.mapDestinationHint).toBe('');
});

test('confirmed mock flight saves independently of a stay and survives reload and a concurrent save', async () => {
  let stored = null, finish;
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, saved_context_revision: 1, snapshot: stored }),
    researchContext: async () => ({ revision: 1, context: confirmedFlights }),
    saveCanvas: vi.fn((_plan, body) => new Promise(resolve => { finish = () => { stored = structuredClone(body.snapshot); resolve({ ...body, revision: 2 }); }; })),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const flight = { sandbox:true, mode:'flights', status:'confirmed', booking_id:'TEST_FLIGHT', token:'never-save-this', flight:{ outbound:{segments:[{origin:'BUD',destination:'FCO',departure_at:'2027-02-03T10:00:00'}]}, inbound:{segments:[{departure_at:'2027-02-07T10:00:00'}]} } };
  let saving;
  act(() => { saving = result.current.save(); });
  act(() => result.current.updateMockBooking('test-plan', flight));
  await act(async () => { finish(); await saving; });
  expect(result.current.data.flights.bookingStatus).toBe('mock-booked');
  expect(result.current.saved.components.flights.bookingStatus).toBe('not-booked');
  expect(result.current.dirty).toBe(true);
  act(() => { saving = result.current.save(); });
  await act(async () => { finish(); await saving; });
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data.flights.mockBooking).toEqual({reference:'TEST_FLIGHT',origin:'BUD',destination:'FCO',departureDate:'2027-02-03',returnDate:'2027-02-07'});
  expect(result.current.data.accommodation.bookingStatus).toBe('not-booked');
  expect(JSON.stringify(stored)).not.toContain('never-save-this');
});


test('returning to the canvas recovers a flight booked in a closed checkout and renders its booked card', async () => {
  const user = userEvent.setup(); const api = setup();
  await user.click(await screen.findByRole('button', { name: 'Explore flights' }));
  sessionStorage.setItem('travella:mock-flight:test-plan', 'opaque-receipt');
  travelRequest.mockResolvedValue({ sandbox: true, mode: 'flights', status: 'confirmed', booking_id: 'FLIGHT-TEST', flight: { outbound: { segments: [{ origin: 'BUD', destination: 'FCO', departure_at: '2027-02-03T10:00:00' }] }, inbound: { segments: [{ departure_at: '2027-02-07T10:00:00' }] } } });
  await user.click(screen.getByRole('button', { name: '← Back to canvas' }));
  expect(await screen.findByRole('button', { name: 'View mock flight' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'BUD ↔ FCO' })).toBeTruthy();
  expect(screen.getByText('Mock booked')).toBeTruthy();
  expect(screen.getByText('Not booked')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Explore accommodation' })).toBeTruthy();
  expect(api.saveCanvas).not.toHaveBeenCalled();
});




test('undo restores a removed place at its original position and stays unsaved', async () => {
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { finalDestination: 'Milan' } }),
    saveCanvas: vi.fn(),
  };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  act(() => result.current.addActivities([
    { id: 'castle', name: 'Castle', position: { lat: 45.47, lng: 9.18 }, reason: 'Courtyard' },
    { id: 'park', name: 'Park', position: { lat: 45.48, lng: 9.17 }, reason: 'Walk' },
  ]));
  const pin = result.current.data.map.pins[0];
  act(() => result.current.action('map', 'remove_pin', { id: pin.id }));
  act(() => result.current.action('map', 'restore_pin', { pin, index: 0 }));
  expect(result.current.data.map.pins.map(p => p.id)).toEqual(['castle', 'park']);
  act(() => result.current.action('map', 'restore_pin', { pin, index: 0 }));
  expect(result.current.data.map.pins).toHaveLength(2);
  expect(result.current.dirty).toBe(true);
  expect(api.saveCanvas).not.toHaveBeenCalled();
});

test('manual full generation requires review and does not start on cancellation', async () => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  const user = userEvent.setup(); const api = setup();
  api.generateCanvas = vi.fn(async () => ({ status: 'stopped' }));
  const trigger = await screen.findByRole('button', { name: 'Generate plan', exact: true });
  await waitFor(() => expect(trigger.disabled).toBe(false));
  await user.click(trigger);
  expect((await screen.findByRole('dialog', { name: 'Ready to generate your plan?' })).textContent).toContain('Milan');
  expect(api.generateCanvas).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Keep editing', exact: true }));
  expect(api.generateCanvas).not.toHaveBeenCalled();
  await user.click(trigger);
  await user.click(await screen.findByRole('button', { name: 'Confirm & generate' }));
  await waitFor(() => expect(api.generateCanvas).toHaveBeenCalledOnce());
  expect(api.generateCanvas.mock.calls[0][1].context_revision).toBe(1);
});

test('generation rejects details changed after the traveler reviewed them', async () => {
  const api = { canvas: vi.fn(async () => ({ revision: 1, context_revision: 1, snapshot: null })), researchContext: vi.fn(async () => ({ revision: 2, context: { finalDestination: 'Milan' } })), generateCanvas: vi.fn(), cancelAgentTurn: vi.fn(async () => {}) };
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'test-plan' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.generate('all', 1));
  expect(api.generateCanvas).not.toHaveBeenCalled();
  expect(result.current.error).toContain('Trip details changed after your review');
});

test('folding chat preserves its draft and restores keyboard focus without saving or sending', async () => {
  const user = userEvent.setup(); const api = setup();
  const message = await screen.findByRole('textbox', { name: 'Message Travella' });
  await waitFor(() => expect(message.disabled).toBe(false));
  // A2UI mounts its cards asynchronously; wait for the complete workspace.
  await screen.findByRole('region', { name: 'Your places' });
  await user.type(message, 'Keep this question for later');
  expect(message.value).toBe('Keep this question for later');
  await user.click(screen.getByRole('button', { name: 'Collapse plan chat' }));
  expect(screen.queryByRole('textbox', { name: 'Message Travella' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Plan content' }).tabIndex).toBe(0);
  const expand = screen.getByRole('button', { name: 'Expand plan chat' });
  await waitFor(() => expect(document.activeElement).toBe(expand));
  expect(expand.getAttribute('aria-expanded')).toBe('false');
  await user.keyboard('{Enter}');
  expect(screen.getByRole('textbox', { name: 'Message Travella' }).value).toBe('Keep this question for later');
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Collapse plan chat' })));
  expect(api.editCanvas).not.toHaveBeenCalled();
  expect(api.saveCanvas).not.toHaveBeenCalled();
});

function streamFixture() {
  let emit, finish;
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { ...confirmedFlights, finalDestination: 'Milan' } }),
    conversationMessages: async () => [],
    cancelAgentTurn: vi.fn(async () => {}),
    saveCanvas: vi.fn(),
    generateCanvas: vi.fn((_plan, body, _id, { onEvent }) => new Promise(resolve => {
      emit = (components, groups, overrides = {}) => onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_draft: { generation_id: body.generation_id, context_revision: 1, components, group_status: groups, ...overrides } } });
      finish = resolve;
    })),
  };
  return { api, emit: (...args) => emit(...args), finish: (...args) => finish(...args) };
}
const generatedTheme = { status: 'ready', items: [{ id: 'walks', kind: 'theme', text: 'Quiet walks', source: 'Conversation' }] };

test('full generation hides the mounted workspace until the terminal result and reveals an editable unsaved canvas', async () => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  const user = userEvent.setup(); const stream = streamFixture();
  render(<PlanningCanvas selected={{ plan_id: 'loader', title: 'Loader test' }} api={stream.api}/>);
  const trigger = await screen.findByRole('button', { name: 'Generate plan', exact: true });
  await waitFor(() => expect(trigger.disabled).toBe(false));
  const input = screen.getByRole('textbox', { name: 'Message Travella' });
  await waitFor(() => expect(input.disabled).toBe(false));
  await user.type(input, 'Keep this unsent question');
  expect(input.value).toBe('Keep this unsent question');
  await user.click(trigger);
  await user.click(await screen.findByRole('button', { name: 'Confirm & generate' }));
  await waitFor(() => expect(stream.api.generateCanvas).toHaveBeenCalledOnce());
  const loader = screen.getByRole('region', { name: 'Generating your plan' });
  const globe = loader.querySelector('svg');
  const workspace = document.querySelector('.canvas-workspace-body');
  expect(workspace.hidden).toBe(true);
  expect(workspace.hasAttribute('inert')).toBe(true);
  expect(screen.queryByRole('button', { name: 'Stop generation' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Message Travella' })).toBeNull();
  expect(loader.querySelector('.generation-counter').textContent).toBe('00items ready');
  act(() => stream.emit({ themes: generatedTheme }, { themes: 'ready', research: 'loading' }));
  expect(loader.querySelector('.generation-counter').textContent).toBe('01item ready');
  expect(loader.querySelector('[aria-current="step"]').textContent).toContain('Research');
  act(() => stream.emit({
    findings: { status: 'ready', items: [{ id: 'walk', title: 'Walking routes', summary: 'A quiet route', sources: [], certainty: 'uncertain' }] },
    links: { status: 'ready', items: [{ id: 'city', title: 'City guide', url: 'https://example.org/city', purpose: 'Plan your visit', category: 'official' }] },
  }, { themes: 'ready', research: 'ready' }));
  expect(loader.querySelector('.generation-counter').textContent).toBe('03items ready');
  expect(loader.querySelector('[aria-current="step"]').textContent).toContain('Canvas');
  expect(loader.querySelector('svg')).toBe(globe);
  expect(workspace.hidden).toBe(true);
  await act(async () => stream.finish({ status: 'complete' }));
  expect(screen.queryByRole('region', { name: 'Generating your plan' })).toBeNull();
  expect(workspace.hidden).toBe(false);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Plan content' })));
  expect(screen.getByRole('textbox', { name: 'Message Travella' }).value).toBe('Keep this unsent question');
  expect(screen.queryByRole('button', { name: 'Save plan', exact: true })).toBeNull();
  expect(stream.api.saveCanvas).not.toHaveBeenCalled();
});

test('progress ignores stale and invalid snapshots, does not double count, and resets after a failed run', async () => {
  const stream = streamFixture();
  const { result } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'progress' }, api: stream.api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let run;
  act(() => { run = result.current.generate(); });
  await waitFor(() => expect(stream.api.generateCanvas).toHaveBeenCalledOnce());
  act(() => stream.emit({ themes: generatedTheme }, { themes: 'ready' }, { generation_id: 'stale' }));
  act(() => stream.emit({ themes: generatedTheme }, { themes: 'ready' }, { context_revision: 9 }));
  act(() => stream.emit({ themes: { status: 'ready', items: 'invalid' } }, { themes: 'ready' }));
  expect(result.current.generationProgress.count).toBe(0);
  for (let i = 0; i < 2; i++) act(() => stream.emit({ themes: generatedTheme }, { themes: 'ready', research: 'loading' }));
  expect(result.current.generationProgress).toMatchObject({ count: 1, phase: 'research' });
  await act(async () => { stream.finish({ status: 'error' }); await run; });
  expect(result.current.activeGroup).toBeNull();
  expect(result.current.error).toContain('Generation could not finish');
  expect(result.current.data.themes.items).toHaveLength(1);
  expect(stream.api.cancelAgentTurn).toHaveBeenCalledOnce();
  act(() => { run = result.current.generate(); });
  expect(result.current.generationProgress).toMatchObject({ count: 0, phase: 'research' });
  await waitFor(() => expect(stream.api.generateCanvas).toHaveBeenCalledTimes(2));
  await act(async () => { stream.finish({ status: 'error' }); await run; });
});

test('the research handoff covers initial snapshot loading and releases the loader on a load error', async () => {
  let fail;
  const api = { canvas: () => new Promise((_resolve, reject) => { fail = reject; }), researchContext: async () => ({ revision: 1, context: confirmedFlights }), conversationMessages: async () => [] };
  render(<PlanningCanvas selected={{ plan_id: 'handoff' }} api={api} autoGenerate={{ revision: 1 }}/>);
  expect(screen.getByRole('region', { name: 'Generating your plan' })).toBeTruthy();
  expect(document.querySelector('.canvas-workspace-body').hidden).toBe(true);
  await act(async () => fail(new Error('Offline')));
  expect(screen.queryByRole('region', { name: 'Generating your plan' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry loading' })).toBeTruthy();
});

test('adding a food suggestion preserves its category in the saved canvas', async () => {
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { finalDestination: 'Milan' } }),
    saveCanvas: vi.fn(async (_plan, body) => ({ ...body, revision: 2 })),
  };
  const { result, unmount } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'food-plan' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.addActivities([{ id: 'cafe', name: 'Cafe', types: ['cafe', 'food', 'point_of_interest', 'establishment'], position: { lat: 45.47, lng: 9.18 }, reason: 'Coffee stop' }]));
  expect(result.current.data.map.pins[0].category).toBe('food');
  expect(api.saveCanvas).not.toHaveBeenCalled();
  await act(() => result.current.save());
  const saved = api.saveCanvas.mock.calls[0][1];
  expect(saved.snapshot.components.map.pins[0].category).toBe('food');
  unmount();
  api.canvas = async () => ({ ...saved, revision: 2, saved_context_revision: saved.context_revision });
  const restored = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'food-plan' }, api }));
  await waitFor(() => expect(restored.result.current.loading).toBe(false));
  expect(restored.result.current.data.map.pins[0].category).toBe('food');
});

test('provider summaries are saved with additions and later enrichment survives reload and undo', async () => {
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { finalDestination: 'Milan' } }),
    saveCanvas: vi.fn(async (_plan, body) => ({ ...body, revision: 2 })),
  };
  const { result, unmount } = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'saved-descriptions' }, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const provider = { id: 'google_' + 'a'.repeat(32), name: 'Garden', place_id: 'google-place', position: { lat: 45.47, lng: 9.18 }, editorial_summary: 'Original provider description.', editorial_summary_language: 'en' };
  act(() => result.current.addActivities([provider, { id: 'legacy', name: 'Legacy', position: provider.position }]));
  expect(result.current.data.map.pins[0].googleDetails).toEqual({ summary: provider.editorial_summary, language: 'en', placeId: provider.place_id });
  const metadata = { summary: null, language: null, placeId: 'legacy-provider-id' };
  act(() => result.current.action('map', 'set_place_details', { id: 'legacy', details: metadata, website: 'https://example.org' }));
  const enriched = result.current.data.map.pins[1];
  expect(enriched.googleDetails).toEqual(metadata);
  expect(result.current.data.links.items).toHaveLength(1);
  act(() => result.current.action('map', 'set_place_details', { id: 'legacy', details: { ...metadata, summary: 'Overwrite' } }));
  expect(result.current.data.map.pins[1].googleDetails.summary).toBeNull();
  act(() => result.current.action('map', 'remove_pin', { id: 'legacy' }));
  act(() => result.current.action('map', 'set_place_details', { id: 'legacy', details: metadata }));
  expect(result.current.data.map.pins).toHaveLength(1);
  act(() => result.current.action('map', 'restore_pin', { pin: enriched, index: 1 }));
  await act(() => result.current.save());
  const saved = api.saveCanvas.mock.calls[0][1];
  expect(saved.snapshot.components.map.pins[1].googleDetails).toEqual(metadata);
  unmount();
  api.canvas = async () => ({ ...saved, revision: 2, saved_context_revision: saved.context_revision });
  const restored = renderHook(() => usePlanningCanvas({ selected: { plan_id: 'saved-descriptions' }, api }));
  await waitFor(() => expect(restored.result.current.loading).toBe(false));
  expect(restored.result.current.data.map.pins[0].googleDetails.summary).toBe(provider.editorial_summary);
  expect(restored.result.current.data.map.pins[1].googleDetails).toEqual(metadata);
});
