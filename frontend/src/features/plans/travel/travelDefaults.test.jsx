import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { destinationCountry, preferredAirport } from './travelDefaults';
import { loadGoogleMaps } from '../../../lib/googleMaps';
import { initialWorkspace, useTravelWorkspace } from './useTravelWorkspace';
import { travelRequest } from './travelApi';
import { bindTravelRecoveryScope, clearCanvasViews, writeTravelWorkspace } from '../canvasViewState';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
const profile = { home_city: { name: 'Budapest', country_code: 'HU' }, default_airport: 'BUD', citizenships: ['AT'] };
const data = { map: { destination: 'Milan' }, essentials: { dates: { start: '2027-03-04', end: '2027-03-09' }, travelers: 2 } };
const milan = [{ iata: 'MXP', name: 'Malpensa', city: 'Milan', country_code: 'IT' }, { iata: 'MIL', name: 'Milan - All Airports', city: 'Milan', country_code: 'IT' }, { iata: 'LIN', name: 'Linate', city: 'Milan', country_code: 'IT' }, { iata: 'BGY', name: 'Bergamo', city: 'Bergamo', country_code: 'IT' }];
const budapest = [{ iata: 'BUD', name: 'Budapest Airport', city: 'Budapest', country_code: 'HU' }];
const params = { owner: 'test', planId: 'defaults-plan', topic: 'flights', initialData: data, travelerProfile: profile };
afterEach(() => { cleanup(); clearCanvasViews(); bindTravelRecoveryScope(null); vi.resetAllMocks(); });

test('seeds profile country, nationality and fixed dates without making a search', async () => {
  travelRequest.mockImplementation(async (_id, _action, { q }) => ({ airports: q === 'Milan' ? milan : budapest }));
  const { result } = renderHook(() => useTravelWorkspace(params));
  await waitFor(() => expect(result.current.state.draftCriteria.destination?.iata).toBe('MIL'));
  expect(result.current.state.draftCriteria).toMatchObject({ origin: { iata: 'BUD' }, country: 'HU', nationality: 'AT', start: '2027-03-04', end: '2027-03-09' });
  expect(result.current.state.draftCriteria.destination.label).toContain('All airports');
  expect(result.current.state.draftDirty).toBe(false);
  expect(travelRequest.mock.calls.every(call => call[1] === 'airports')).toBe(true);
});

test('Milan as home base prefers every city airport over preferred MXP', () => {
  expect(preferredAirport(milan, 'Milan', 'IT', 'MXP')?.iata).toBe('MIL');
  expect(preferredAirport(milan, 'Milan, Italy')?.iata).toBe('MIL');
  expect(preferredAirport([...budapest, { ...budapest[0], iata: 'XYZ', country_code: 'US' }], 'Budapest')).toBeNull();
  expect(preferredAirport(milan.filter(a => a.iata !== 'MIL'), 'Milan')).toBeNull();
});

test('late lookups cannot overwrite an edited or cleared airport', async () => {
  const pending = {};
  travelRequest.mockImplementation((_id, _action, { q }) => new Promise(resolve => { pending[q] = resolve; }));
  const { result } = renderHook(() => useTravelWorkspace(params));
  act(() => { result.current.setDraft('origin', { iata: 'VIE', label: 'Vienna (VIE)' }); result.current.setDraft('destination', null); });
  await act(async () => { pending.Budapest({ airports: budapest }); pending.Milan({ airports: milan }); });
  expect(result.current.state.draftCriteria.origin.iata).toBe('VIE');
  expect(result.current.state.draftCriteria.destination).toBeNull();
});

test('old plan lookup cannot seed the next plan', async () => {
  const pending = [];
  travelRequest.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const { result, rerender } = renderHook(({ planId }) => useTravelWorkspace({ ...params, planId }), { initialProps: { planId: 'first' } });
  rerender({ planId: 'second' });
  await act(async () => pending.slice(0, 2).forEach(resolve => resolve({ airports: milan })));
  expect(result.current.state.planId).toBe('second');
  expect(result.current.state.draftCriteria.destination).toBeNull();
});

test('recovered manual departure wins on remount and profile refresh', async () => {
  bindTravelRecoveryScope('a'.repeat(32));
  travelRequest.mockResolvedValue({ airports: [] });
  const first = renderHook(() => useTravelWorkspace(params));
  act(() => first.result.current.setDraft('origin', { iata: 'VIE', label: 'Vienna (VIE)' }));
  first.unmount();
  const { result } = renderHook(() => useTravelWorkspace({ ...params, travelerProfile: { ...profile, home_city: { name: 'Milan', country_code: 'IT' } } }));
  await act(async () => {});
  expect(result.current.state.draftCriteria.origin.iata).toBe('VIE');
  expect(result.current.state.draftCriteria.country).toBe('HU');
});

test('late profile arrival seeds blanks but preserves changed nationality', async () => {
  travelRequest.mockResolvedValue({ airports: [] });
  const { result, rerender } = renderHook(({ travelerProfile }) => useTravelWorkspace({ ...params, travelerProfile, topic: 'stays' }), { initialProps: { travelerProfile: null } });
  act(() => result.current.setDraft('nationality', 'DE'));
  rerender({ travelerProfile: profile });
  expect(result.current.state.draftCriteria.nationality).toBe('DE');
  expect(result.current.state.draftCriteria.country).toBe(''); // Stay destination is not home country.
});

test('missing citizenship falls back to home country and flexible dates remain blank', () => {
  const state = initialWorkspace({ ...params, topic: 'stays', travelerProfile: { ...profile, citizenships: [] }, initialData: { ...data, essentials: { dates: { ...data.essentials.dates, flexible: true } } } });
  expect(state.draftCriteria).toMatchObject({ nationality: 'HU', country: '', start: '', end: '' });
});

test('failed and empty lookup leaves selection editable and forwards session expiry', async () => {
  const onExpired = vi.fn();
  travelRequest.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));
  const { result } = renderHook(() => useTravelWorkspace({ ...params, onExpired }));
  await waitFor(() => expect(onExpired).toHaveBeenCalled());
  expect(result.current.state.draftCriteria.origin).toBeNull();
  act(() => result.current.setDraft('origin', { iata: 'VIE', label: 'Vienna (VIE)' }));
  expect(result.current.state.draftCriteria.origin.iata).toBe('VIE');
});


test('qualified Plan city uses a clean lookup and country-qualified selection', async () => {
  travelRequest.mockImplementation(async (_id, _action, { q }) => ({ airports: q === 'Milan' ? milan : budapest }));
  const { result } = renderHook(() => useTravelWorkspace({ ...params, initialData: { ...data, map: { destination: 'Milan, Italy' } } }));
  await waitFor(() => expect(result.current.state.draftCriteria.destination?.iata).toBe('MIL'));
  expect(travelRequest.mock.calls.some(call => call[2].q === 'Milan')).toBe(true);
});

const geocodedCountry = code => ({ address_components: [{ types: ['country'], short_name: code }] });
function mockGeocoder(geocode) {
  loadGoogleMaps.mockResolvedValue({ libraries: { geocoding: { Geocoder: class { geocode = geocode; } } } });
}

test('stay destination country resolves from Plan without a profile or flight provider', async () => {
  mockGeocoder(vi.fn().mockResolvedValue({ results: [geocodedCountry('IT')] }));
  const { result } = renderHook(() => useTravelWorkspace({ ...params, topic: 'stays', travelerProfile: null }));
  await waitFor(() => expect(result.current.state.draftCriteria.country).toBe('IT'));
  expect(result.current.state.draftCriteria.nationality).toBe('');
  expect(result.current.state.draftDirty).toBe(false);
  expect(travelRequest).not.toHaveBeenCalled();
});

test('qualified destination country resolves without geocoding', async () => {
  expect(await destinationCountry('Milan, Italy')).toBe('IT');
  expect(await destinationCountry('Milan, IT')).toBe('IT');
  expect(loadGoogleMaps).not.toHaveBeenCalled();
});

test.each(['Lisbon, Portugal', 'Lisbon, PT', ' Lisbon , Portugal '])('stay default separates city and country from %s', async destination => {
  const initialData = { ...data, map: { destination } };
  const { result } = renderHook(() => useTravelWorkspace({ ...params, topic: 'stays', initialData }));
  await waitFor(() => expect(result.current.state.draftCriteria.country).toBe('PT'));
  expect(result.current.state.draftCriteria.city).toBe('Lisbon');
  expect(result.current.state.draftCriteria.place).toBeNull();
  expect(result.current.state.draftDirty).toBe(false);
  expect(initialData.map.destination).toBe(destination);
  expect(loadGoogleMaps).not.toHaveBeenCalled();
});

test.each([false, true])('recovered qualified default is repaired only when untouched (dirty=%s)', async draftDirty => {
  const owner = 'c'.repeat(32);
  bindTravelRecoveryScope(owner);
  const options = { ...params, owner, topic: 'stays', initialData: { ...data, map: { destination: 'Lisbon, Portugal' } } };
  const saved = initialWorkspace(options);
  saved.draftCriteria = { ...saved.draftCriteria, city: 'Lisbon, Portugal', country: 'PT' };
  saved.draftDirty = draftDirty;
  writeTravelWorkspace(owner, options.planId, 'stays', saved);
  const { result } = renderHook(() => useTravelWorkspace(options));
  await act(async () => {});
  expect(result.current.state.draftCriteria.city).toBe(draftDirty ? 'Lisbon, Portugal' : 'Lisbon');
  expect(result.current.state.draftCriteria.country).toBe('PT');
});

test.each([
  { results: [] }, { results: [geocodedCountry('IT'), geocodedCountry('US')] },
  { results: [{ ...geocodedCountry('IT'), partial_match: true }] }, { results: [geocodedCountry('XX')] },
])('unresolved or ambiguous geocoding leaves the destination country blank: %j', async ({ results }) => {
  mockGeocoder(vi.fn().mockResolvedValue({ results }));
  expect(await destinationCountry('Unknown city')).toBe('');
});

test.each(['country', 'city'])('late destination lookup respects edited %s', async field => {
  let resolve;
  const geocode = vi.fn(() => new Promise(done => { resolve = done; }));
  mockGeocoder(geocode);
  const { result } = renderHook(() => useTravelWorkspace({ ...params, topic: 'stays' }));
  await waitFor(() => expect(geocode).toHaveBeenCalled());
  act(() => result.current.setDraft(field, field === 'country' ? 'AT' : 'Vienna'));
  await act(async () => resolve({ results: [geocodedCountry('IT')] }));
  expect(result.current.state.draftCriteria.country).toBe(field === 'country' ? 'AT' : '');
});

test('manual destination country survives reload and failed lookup stays editable', async () => {
  bindTravelRecoveryScope('b'.repeat(32));
  mockGeocoder(vi.fn().mockRejectedValue(new Error('unavailable')));
  const first = renderHook(() => useTravelWorkspace({ ...params, topic: 'stays' }));
  await act(async () => {});
  expect(first.result.current.state.draftCriteria.country).toBe('');
  act(() => first.result.current.setDraft('country', 'AT'));
  first.unmount();
  mockGeocoder(vi.fn().mockResolvedValue({ results: [geocodedCountry('IT')] }));
  const second = renderHook(() => useTravelWorkspace({ ...params, topic: 'stays' }));
  await act(async () => {});
  expect(second.result.current.state.draftCriteria.country).toBe('AT');
});

test('late country response cannot cross Plan boundaries', async () => {
  const pending = [];
  const geocode = vi.fn(() => new Promise(resolve => pending.push(resolve)));
  mockGeocoder(geocode);
  const { result, rerender } = renderHook(({ planId }) => useTravelWorkspace({ ...params, topic: 'stays', planId }), { initialProps: { planId: 'first' } });
  await waitFor(() => expect(pending).toHaveLength(1));
  rerender({ planId: 'second' });
  await act(async () => pending[0]({ results: [geocodedCountry('IT')] }));
  expect(result.current.state.draftCriteria.country).toBe('');
});
