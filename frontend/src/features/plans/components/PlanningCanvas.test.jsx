import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningCanvas } from './PlanningCanvas';
import { usePlanningCanvas } from '../usePlanningCanvas';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';

vi.mock('./CanvasDestinationMap', async () => {
  const { createContext } = await import('react');
  return { CanvasMapContext: createContext({}), CanvasDestinationMap: () => <div>Destination map</div>, searchCanvasPlaces: vi.fn() };
});
vi.mock('../travel/TravelSearch', () => ({
  useTravelCapabilities: () => ({ capabilities: { hotels: true, flights: true, sandbox: true } }),
  TravelSearch: ({ mode, active }) => <section hidden={!active} aria-label={`${mode} search`}>Search {mode}</section>,
}));
beforeEach(() => {
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
  await user.click(await screen.findByRole('button', { name: 'Add place', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Place name' }), 'Unfinished place');
  const message = screen.getByRole('textbox', { name: 'Message your travel companion' });
  expect(message.disabled).toBe(false);
  await user.type(message, 'Which airport is easiest?');
  expect(screen.getByRole('button', { name: 'Save plan', exact: true }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Explore flights' }));
  expect(screen.getByRole('region', { name: 'flights search' })).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Place name' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Stays', exact: true }));
  expect(screen.getByRole('region', { name: 'accommodation search' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: '← Back to canvas' }));
  expect(screen.getByRole('textbox', { name: 'Place name' }).value).toBe('Unfinished place');
  expect(screen.getByRole('textbox', { name: 'Message your travel companion' }).value).toBe('Which airport is easiest?');
  await user.click(screen.getByRole('button', { name: 'Send ↑' }));
  await waitFor(() => expect(api.editCanvas).toHaveBeenCalledOnce());
  expect(await screen.findByText('You can compare airports for Milan.')).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Place name' }).value).toBe('Unfinished place');
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
  await user.click(await screen.findByRole('button', { name: 'Add place', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Message your travel companion' }), 'Help with this trip');
  await user.click(screen.getByRole('button', { name: 'Send ↑' }));
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  finish();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save plan', exact: true }).disabled).toBe(false));
  expect(screen.queryByRole('textbox', { name: 'Place name' })).toBeNull();
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
