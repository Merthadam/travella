import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';
import { CanvasDestinationMap, CanvasMapContext } from './CanvasDestinationMap';
import { loadGoogleMaps } from '../../../lib/googleMaps';

vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
beforeEach(() => {
  localStorage.clear(); vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('changing appearance preserves the explored map view without changing plan places', async () => {
  const maps = [];
  const remove = vi.fn();
  const onSelect = vi.fn();
  const destination = { geometry: { viewport: {}, location: { lat: 47.1, lng: 14.1 } } };
  loadGoogleMaps.mockResolvedValue({
    maps: {}, libraries: {
      maps: { Map: class {
        constructor(_, options) {
          this.options = options;
          this.fitBounds = vi.fn();
          this.addListener = () => ({ remove });
          this.getCenter = () => ({ toJSON: () => ({ lat: 47.1, lng: 14.1 }) });
          this.getZoom = () => 13;
          maps.push(this);
        }
      } },
      marker: { AdvancedMarkerElement: class {} },
      geocoding: { Geocoder: class { geocode() { return Promise.resolve({ results: [destination] }); } } },
    },
  });
  render(<AppearanceProvider><CanvasDestinationMap destination="Kreischberg" final places={[]} onSelect={onSelect} /></AppearanceProvider>);
  await waitFor(() => expect(maps[0]?.fitBounds).toHaveBeenCalledOnce());
  expect(maps[0].options.colorScheme).toBe('LIGHT');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'travella.theme', newValue: 'dark' })));
  await waitFor(() => expect(maps).toHaveLength(2));
  expect(maps[1].options).toMatchObject({ colorScheme: 'DARK', center: { lat: 47.1, lng: 14.1 }, zoom: 13 });
  expect(maps[1].fitBounds).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
});

function mapRuntime(geocode) {
  const fitBounds = vi.fn();
  loadGoogleMaps.mockResolvedValue({ maps: {}, libraries: {
    maps: { Map: class {
      fitBounds = fitBounds;
      addListener() { return { remove() {} }; }
      getCenter() { return { toJSON: () => ({ lat: 45.46, lng: 9.19 }) }; }
      getZoom() { return 11; }
    } }, marker: { AdvancedMarkerElement: class {} },
    geocoding: { Geocoder: class { geocode = geocode; } },
  } });
  return fitBounds;
}

test('a stated candidate frames only the local map, once its hidden container becomes visible', async () => {
  let width = 0; let resize;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { resize = callback; } observe() {} disconnect = disconnect; });
  const viewport = { north: 45.53, south: 45.39, west: 9.04, east: 9.28 };
  const geocode = vi.fn(async () => ({ results: [{ types: ['locality'], geometry: { bounds: viewport, viewport: { north: 46, south: 45, west: 8, east: 10 }, location: {} } }] }));
  const fitBounds = mapRuntime(geocode); const onSelect = vi.fn();
  const { getByText } = render(<AppearanceProvider><CanvasMapContext.Provider value={{ destinationHint: 'Milan' }}><CanvasDestinationMap destination="" final={false} places={[]} onSelect={onSelect} /></CanvasMapContext.Provider></AppearanceProvider>);
  await waitFor(() => expect(resize).toBeTypeOf('function'));
  expect(geocode).toHaveBeenCalledWith({ address: 'Milan' });
  expect(fitBounds).not.toHaveBeenCalled();
  act(() => { width = 600; resize(); });
  expect(fitBounds).toHaveBeenCalledExactlyOnceWith(viewport, 24);
  act(() => resize());
  expect(fitBounds).toHaveBeenCalledOnce();
  expect(getByText('Exploring Milan. Your final destination is still yours to choose.')).toBeTruthy();
  expect(onSelect).not.toHaveBeenCalled();
});

test('chosen destination overrides a hint and stale geocoding cannot recenter a newer destination', async () => {
  let finishMilan;
  const paris = { geometry: { viewport: { north: 49, south: 48, west: 2, east: 3 }, location: {} } };
  const geocode = vi.fn(({ address }) => address === 'Milan' ? new Promise(resolve => { finishMilan = resolve; }) : Promise.resolve({ results: [paris] }));
  const fitBounds = mapRuntime(geocode);
  const view = destination => <AppearanceProvider><CanvasMapContext.Provider value={{ destinationHint: 'Milan' }}><CanvasDestinationMap destination={destination} final={Boolean(destination)} places={[]} onSelect={() => {}} /></CanvasMapContext.Provider></AppearanceProvider>;
  const { rerender } = render(view(''));
  await waitFor(() => expect(finishMilan).toBeTypeOf('function'));
  rerender(view('Paris'));
  await waitFor(() => expect(fitBounds).toHaveBeenCalledExactlyOnceWith(paris.geometry.viewport, 24));
  await act(async () => finishMilan({ results: [{ geometry: { viewport: {}, location: {} } }] }));
  expect(fitBounds).toHaveBeenCalledOnce();
});

test('failed destination lookup stays recoverable and frames only after a successful retry', async () => {
  const viewport = { north: 46, south: 45, west: 9, east: 10 };
  const geocode = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ results: [{ geometry: { viewport, location: {} } }] });
  const fitBounds = mapRuntime(geocode);
  const { findByRole } = render(<AppearanceProvider><CanvasDestinationMap destination="Milan" final places={[]} onSelect={() => {}} /></AppearanceProvider>);
  const retry = await findByRole('button', { name: 'Retry map' });
  expect(fitBounds).not.toHaveBeenCalled();
  act(() => retry.click());
  await waitFor(() => expect(fitBounds).toHaveBeenCalledExactlyOnceWith(viewport, 24));
});

test('saved pins fit together once, selecting a pin does not refit, and show all reframes', async () => {
  const markers = []; const fitBounds = vi.fn(); const panTo = vi.fn(); const onSelect = vi.fn();
  const places = [{ id: 'castle', name: 'Castle', category: 'activity', position: { lat: 45.47, lng: 9.18 } }, { id: 'park', name: 'Park', category: 'activity', position: { lat: 45.48, lng: 9.17 } }];
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  loadGoogleMaps.mockResolvedValue({ maps: { LatLngBounds: class { extend() {} } }, libraries: {
    maps: { Map: class { fitBounds = fitBounds; panTo = panTo; addListener() { return { remove() {} }; } getCenter() { return { toJSON: () => places[0].position }; } getZoom() { return 14; } } },
    marker: { AdvancedMarkerElement: class { constructor(options) { Object.assign(this, options); markers.push(this); } addListener(_, fn) { this.select = fn; return { remove() {} }; } } },
    geocoding: { Geocoder: class { async geocode() { return { results: [{ geometry: { viewport: {}, location: {} } }] }; } } },
  } });
  const view = (selectedId, fitRequest = 0) => <AppearanceProvider><CanvasDestinationMap destination="Milan" final places={places} selectedId={selectedId} onSelect={onSelect} fitRequest={fitRequest}/></AppearanceProvider>;
  const { rerender } = render(view(null));
  await waitFor(() => expect(markers).toHaveLength(2));
  expect(fitBounds).toHaveBeenCalledOnce();
  expect(markers[0].title).toBe('Inspect Castle');
  expect(markers[0].content.textContent).toBe('');
  act(() => markers[0].select()); expect(onSelect).toHaveBeenCalledWith('castle');
  rerender(view('castle'));
  expect(panTo).toHaveBeenCalledWith(places[0].position);
  expect(fitBounds).toHaveBeenCalledOnce();
  rerender(view(null, 1));
  expect(fitBounds).toHaveBeenCalledTimes(2);
});
