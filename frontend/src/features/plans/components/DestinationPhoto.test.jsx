import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DestinationPhoto, loadDestinationPhoto } from './DestinationPhoto';
import { loadGoogleMaps } from '../../../lib/googleMaps';
vi.mock('../../../lib/googleMaps', () => ({ getGoogleMapsApiKey: () => 'configured', loadGoogleMaps: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function provider({ ambiguous = false } = {}) {
  const geocode = vi.fn(async () => ({ results: ambiguous ? [{ place_id: 'a' }, { place_id: 'b' }] : [{ place_id: 'destination-id' }] }));
  const fetchFields = vi.fn(async () => {});
  const getURI = vi.fn(() => 'https://example.test/photo.jpg');
  const Place = vi.fn(function () { this.fetchFields = fetchFields; this.displayName = 'Lisbon'; this.photos = [{ getURI, authorAttributions: [{ displayName: 'Contributor', uri: 'https://maps.google.com/maps/contrib/1' }] }]; });
  loadGoogleMaps.mockResolvedValue({ libraries: { geocoding: { Geocoder: class { geocode = geocode; } }, places: { Place } } });
  return { Place, geocode, fetchFields };
}
test('research never requests a photo; generation resolves the exact destination with credits', async () => {
  const mocks = provider(); const view = render(<DestinationPhoto destination="Lisbon" generated={false}/>);
  expect(loadGoogleMaps).not.toHaveBeenCalled();
  view.rerender(<DestinationPhoto destination="Lisbon" generated/>);
  expect(await screen.findByRole('img', { name: 'Destination photo of Lisbon' })).toBeTruthy();
  expect(mocks.Place).toHaveBeenCalledWith({ id: 'destination-id' });
  expect(mocks.fetchFields).toHaveBeenCalledWith({ fields: ['photos', 'displayName'] });
  expect(screen.getByRole('link', { name: 'Contributor' }).href).toBe('https://maps.google.com/maps/contrib/1');
});
test('ambiguous destinations never substitute a different place', async () => {
  const { Place } = provider({ ambiguous: true });
  expect(await loadDestinationPhoto('Ambiguous')).toBeNull();
  expect(Place).not.toHaveBeenCalled();
});
test('failed image displays a stable honest placeholder', async () => {
  provider(); render(<DestinationPhoto destination="Lisbon" generated/>);
  fireEvent.error(await screen.findByRole('img'));
  expect(screen.getByText('A destination photo isn’t available yet.')).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});
test('a late photo cannot replace the new destination', async () => {
  let resolve; loadGoogleMaps.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const view = render(<DestinationPhoto destination="Old destination" generated/>);
  await waitFor(() => expect(loadGoogleMaps).toHaveBeenCalled());
  provider(); view.rerender(<DestinationPhoto destination="Lisbon" generated/>);
  await screen.findByRole('img', { name: 'Destination photo of Lisbon' });
  resolve({ libraries: { geocoding: { Geocoder: class { async geocode() { return { results: [] }; } } }, places: {} } });
  await waitFor(() => expect(screen.getByRole('img', { name: 'Destination photo of Lisbon' })).toBeTruthy());
});


test('island and municipality names are retried only with a shared country', async () => {
  const { geocode } = provider();
  const exact = { place_id: 'island', address_components: [{ types: ['country'], long_name: 'Japan' }] };
  geocode.mockResolvedValueOnce({ results: [exact, { ...exact, place_id: 'town' }] }).mockResolvedValueOnce({ results: [exact] });
  expect(await loadDestinationPhoto('Yakushima')).not.toBeNull();
  expect(geocode.mock.calls.map(([query]) => query.address)).toEqual(['Yakushima', 'Yakushima, Japan']);
});
