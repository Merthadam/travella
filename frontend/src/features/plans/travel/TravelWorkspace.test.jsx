import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TravelWorkspace } from './TravelWorkspace';
import { draftTravelFacts } from './CanvasTravel';

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
