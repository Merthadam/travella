import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePlanningCanvas } from './usePlanningCanvas';

afterEach(cleanup);
const selected = { plan_id: 'automatic-draft' };
function fixture() {
  let stored = null, revision = 1;
  const context = { finalDestination: 'Milan', flights: 'needed', accommodation: 'needed', travelers: 2,
    provenance: { finalDestination: { source: 'user_edit' }, flights: { source: 'user_edit' } } };
  const api = {
    canvas: vi.fn(async () => ({ revision, context_revision: 1, saved_context_revision: 1, snapshot: structuredClone(stored) })),
    researchContext: vi.fn(async () => ({ revision: 1, context })),
    cancelAgentTurn: vi.fn(async () => {}),
    saveCanvas: vi.fn(async (_plan, body) => { stored = structuredClone(body.snapshot); return { ...body, revision: ++revision }; }),
  };
  return { api, stored: () => stored };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 450));
const editTravelers = result => act(() => result.current.action('essentials', 'edit_essentials', {
  ...result.current.data.essentials, travelers: 4, dates: { start: '2027-05-10', end: '2027-05-17', note: 'Spring trip', flexible: false }, budget: { label: '€2000', noFixedBudget: false },
}));

test('reading a canvas makes no write; all completed draft sections persist automatically and reload exactly', async () => {
  const { api, stored } = fixture();
  const { result } = renderHook(() => usePlanningCanvas({ selected, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(settle);
  expect(api.saveCanvas).not.toHaveBeenCalled();
  expect(result.current.dirty).toBe(false);
  editTravelers(result);
  act(() => {
    result.current.action('themes', 'add_theme', { id: 'walks', kind: 'theme', text: 'Quiet walks' });
    result.current.action('findings', 'add_finding', { id: 'note', title: 'Research note', summary: 'Check transport', sources: [], certainty: 'uncertain' });
    result.current.action('links', 'add_link', { id: 'city', title: 'City', url: 'https://example.org/city', purpose: 'Visit planning', category: 'official' });
    result.current.addActivities([{ id: 'park', name: 'Park', position: { lat: 45.47, lng: 9.18 }, reason: 'A walk' }]);
    result.current.updateMockBooking(selected.plan_id, { sandbox: true, status: 'confirmed', booking_id: 'TEST-STAY', hotel_name: 'Test hotel', check_in: '2027-05-10', check_out: '2027-05-17' });
    result.current.updateMockBooking(selected.plan_id, { sandbox: true, mode: 'flights', status: 'confirmed', booking_id: 'TEST-FLIGHT', flight: { outbound: { segments: [{ origin: 'LHR', destination: 'MXP', departure_at: '2027-05-10T10:00:00' }] }, inbound: { segments: [{ departure_at: '2027-05-17T10:00:00' }] } } });
  });
  await waitFor(() => expect(result.current.dirty).toBe(false));
  expect(api.saveCanvas).toHaveBeenCalledOnce();
  const expected = structuredClone(result.current.data);
  expect(stored().components).toEqual(expected);
  expect(expected.essentials).toMatchObject({ travelers: 4, budget: { label: '€2000' }, dates: { start: '2027-05-10' } });
  expect(expected.flights.bookingStatus).toBe('mock-booked');
  expect(expected.accommodation.bookingStatus).toBe('mock-booked');
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual(expected);
});

test('open editors and active chat defer automatic persistence until both finish', async () => {
  const { api } = fixture();
  const { result, rerender } = renderHook(({ busy }) => usePlanningCanvas({ selected, api, externalBusy: busy }), { initialProps: { busy: false } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.action('essentials', 'editor_state', { editing: true }));
  editTravelers(result);
  await act(settle);
  expect(api.saveCanvas).not.toHaveBeenCalled();
  rerender({ busy: true });
  act(() => result.current.action('essentials', 'editor_state', { editing: false }));
  await act(settle);
  expect(api.saveCanvas).not.toHaveBeenCalled();
  rerender({ busy: false });
  await waitFor(() => expect(result.current.dirty).toBe(false));
  expect(api.saveCanvas).toHaveBeenCalledOnce();
});

test('generated content waits for the stream to settle and then persists all sections', async () => {
  const { api, stored } = fixture();
  let finish;
  api.generateCanvas = vi.fn((_plan, body, _id, { onEvent }) => new Promise(resolve => {
    onEvent({ type: 'STATE_SNAPSHOT', snapshot: { canvas_draft: { generation_id: body.generation_id, context_revision: 1,
      components: { themes: { status: 'ready', items: [{ id: 'theme', kind: 'theme', text: 'Culture', source: 'Conversation' }] }, findings: { status: 'ready', items: [{ id: 'fact', title: 'Museum', summary: 'Check hours', sources: [], certainty: 'uncertain' }] }, links: { status: 'ready', items: [{ id: 'url', title: 'Museum', url: 'https://example.org/museum', purpose: 'Hours', category: 'official' }] } },
      group_status: { themes: 'ready', research: 'ready' } } } });
    finish = () => resolve({ status: 'complete' });
  }));
  const { result } = renderHook(() => usePlanningCanvas({ selected, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let generating;
  act(() => { generating = result.current.generate(); });
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  await act(settle);
  expect(api.saveCanvas).not.toHaveBeenCalled();
  await act(async () => { finish(); await generating; });
  await waitFor(() => expect(result.current.dirty).toBe(false));
  expect(stored().components.themes.items[0].text).toBe('Culture');
  expect(stored().components.findings.items[0].title).toBe('Museum');
  expect(stored().components.links.items[0].title).toBe('Museum');
});

test('failed automatic saves stop, retain all edits, and retry the same request before persisting newer edits', async () => {
  const { api, stored } = fixture();
  api.saveCanvas.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => usePlanningCanvas({ selected, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  editTravelers(result);
  await waitFor(() => expect(result.current.saveError).toContain('Keep this page open'));
  await act(settle);
  expect(api.saveCanvas).toHaveBeenCalledOnce();
  expect(result.current.dirty).toBe(true);
  act(() => result.current.action('themes', 'add_theme', { id: 'new', kind: 'theme', text: 'Newer edit' }));
  await act(() => result.current.save());
  expect(api.saveCanvas.mock.calls[1]).toEqual(api.saveCanvas.mock.calls[0]);
  await waitFor(() => expect(result.current.dirty).toBe(false));
  expect(api.saveCanvas).toHaveBeenCalledTimes(3);
  expect(stored().components.themes.items[0].text).toBe('Newer edit');
  expect(stored().components.essentials.travelers).toBe(4);
});

test('a checkout update during persistence is automatically queued behind the first write', async () => {
  const { api, stored } = fixture();
  let finish;
  api.saveCanvas.mockImplementationOnce((_plan, body) => new Promise(resolve => { finish = () => resolve({ ...body, revision: 2 }); }));
  const { result } = renderHook(() => usePlanningCanvas({ selected, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  editTravelers(result);
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  act(() => result.current.updateMockBooking(selected.plan_id, { sandbox: true, status: 'confirmed', booking_id: 'TEST-NEW', hotel_name: 'New stay', check_in: '2027-05-10', check_out: '2027-05-17' }));
  await act(async () => finish());
  await waitFor(() => expect(result.current.dirty).toBe(false));
  expect(api.saveCanvas).toHaveBeenCalledTimes(2);
  expect(api.saveCanvas.mock.calls[1][0].revision).toBe(2);
  expect(stored().components.accommodation.mockBooking.reference).toBe('TEST-NEW');
});

test('revision conflicts retain local edits and never overwrite or retry automatically', async () => {
  const { api } = fixture();
  api.saveCanvas.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }));
  const { result } = renderHook(() => usePlanningCanvas({ selected, api }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  editTravelers(result);
  await waitFor(() => expect(result.current.conflict).toBe(true));
  await act(settle);
  await act(() => result.current.save());
  expect(api.saveCanvas).toHaveBeenCalledOnce();
  expect(result.current.data.essentials.travelers).toBe(4);
  expect(result.current.dirty).toBe(true);
});
