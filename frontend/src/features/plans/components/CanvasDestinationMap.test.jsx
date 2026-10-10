import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';
import { CanvasDestinationMap } from './CanvasDestinationMap';
import { loadGoogleMaps } from '../../../lib/googleMaps';

vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', () => ({ matches: false })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

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
