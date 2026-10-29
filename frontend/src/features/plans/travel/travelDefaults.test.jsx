import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { preferredAirport } from './travelDefaults';
import { initialWorkspace, useTravelWorkspace } from './useTravelWorkspace';
import { travelRequest } from './travelApi';
import { bindTravelRecoveryScope, clearCanvasViews } from '../canvasViewState';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
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
