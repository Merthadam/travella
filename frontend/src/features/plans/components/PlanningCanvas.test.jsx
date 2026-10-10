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
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  const api = {
    canvas: vi.fn(async () => ({ revision: 1, context_revision: 1, snapshot: null })),
    researchContext: vi.fn(async () => ({ revision: 1, context: { finalDestination: 'Milan', travelers: 2 } })),
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

test('open card edits and unsent chat survive flight and stay navigation', async () => {
  const user = userEvent.setup(); const api = setup();
  await user.click(await screen.findByRole('button', { name: 'Edit details', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Date note' }), 'Unfinished date note');
  const message = screen.getByRole('textbox', { name: 'Message Travella' });
  expect(message.disabled).toBe(false);
  await user.type(message, 'Which airport is easiest?');
  expect(screen.getByRole('button', { name: 'Save plan', exact: true }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Explore flights' }));
  expect(screen.getByRole('region', { name: 'flights search' })).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Date note' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Stays', exact: true }));
  expect(screen.getByRole('region', { name: 'accommodation search' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: '← Back to canvas' }));
  expect(screen.getByRole('textbox', { name: 'Date note' }).value).toBe('Unfinished date note');
  expect(screen.getByRole('textbox', { name: 'Message Travella' }).value).toBe('Which airport is easiest?');
  await user.click(screen.getByRole('button', { name: 'Send ↑' }));
  await waitFor(() => expect(api.editCanvas).toHaveBeenCalledOnce());
  expect(await screen.findByText('You can compare airports for Milan.')).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Date note' }).value).toBe('Unfinished date note');
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
  await user.click(await screen.findByRole('button', { name: 'Edit details', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Message Travella' }), 'Help with this trip');
  await user.click(screen.getByRole('button', { name: 'Send ↑' }));
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  finish();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save plan', exact: true }).disabled).toBe(false));
  expect(screen.queryByRole('textbox', { name: 'Date note' })).toBeNull();
  expect(api.saveCanvas).not.toHaveBeenCalled();
});


test('adding an explicitly chosen activity preserves an independent open editor', async () => {
  const api = {
    canvas: async () => ({ revision: 1, context_revision: 1, snapshot: null }),
    researchContext: async () => ({ revision: 1, context: { finalDestination: 'Milan', travelers: 2 } }),
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
    researchContext: vi.fn(async () => ({ revision: 1, context: { finalDestination: 'Milan', travelers: 2 } })),
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
    researchContext: async () => ({ revision: 1, context: {} }),
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


test('Find places reopens and focuses the conversation without sending or saving', async () => {
  const user = userEvent.setup(); const api = setup();
  await user.click(await screen.findByRole('button', { name: 'Close plan chat' }));
  await user.click(screen.getByRole('button', { name: 'Find places' }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Message Travella' })));
  expect(api.editCanvas).not.toHaveBeenCalled();
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
