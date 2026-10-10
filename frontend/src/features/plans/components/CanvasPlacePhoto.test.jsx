import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CanvasPlacePhoto, loadSavedPlacePhoto } from './CanvasPlacePhoto';
import { loadGoogleMaps } from '../../../lib/googleMaps';
vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
const search = vi.fn();
const place = { id: '', name: 'Castle', position: { lat: 45.47, lng: 9.18 } };
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('right-provider-id'));
  place.id = 'google_' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  search.mockReset();
  loadGoogleMaps.mockResolvedValue({ libraries: { places: { Place: { searchByText: search } } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const photo = { getURI: vi.fn(() => 'https://example.com/photo.jpg'), authorAttributions: [{ displayName: 'Photo Author', uri: 'https://example.com/author' }] };

test('uses only the exact saved provider identity even when a similar place ranks first', async () => {
  search.mockResolvedValue({ places: [{ id: 'wrong-provider-id', photos: [photo] }, { id: 'right-provider-id', photos: [photo] }] });
  expect(await loadSavedPlacePhoto(place, 'Milan')).toEqual({ uri: 'https://example.com/photo.jpg', authors: photo.authorAttributions });
  search.mockResolvedValue({ places: [{ id: 'wrong-provider-id', photos: [photo] }] });
  expect(await loadSavedPlacePhoto(place, 'Milan')).toBeNull();
  expect(await loadSavedPlacePhoto({ ...place, id: 'manual-pin' }, 'Milan')).toBeNull();
});

test('loads only a visible list thumbnail, keeps attribution outside row controls, and hides broken images', async () => {
  let intersect;
  vi.stubGlobal('IntersectionObserver', class { constructor(fn) { intersect = fn; } observe() {} disconnect() {} });
  search.mockResolvedValue({ places: [{ id: 'right-provider-id', photos: [photo] }] });
  const { rerender } = render(<CanvasPlacePhoto place={place} destination="Milan" active={false}/>);
  expect(search).not.toHaveBeenCalled();
  rerender(<CanvasPlacePhoto place={place} destination="Milan" active/>);
  expect(search).not.toHaveBeenCalled();
  act(() => intersect([{ isIntersecting: true }]));
  const image = await screen.findByAltText('Castle');
  expect(screen.getByRole('link', { name: 'Photo Author' }).getAttribute('href')).toBe('https://example.com/author');
  fireEvent.error(image);
  await waitFor(() => expect(screen.queryByAltText('Castle')).toBeNull());
  expect(screen.queryByText('Photo Author')).toBeNull();
});

test('provider failures leave no broken image or attribution placeholder', async () => {
  search.mockRejectedValue(new Error('unavailable'));
  vi.stubGlobal('IntersectionObserver', undefined);
  const { container } = render(<CanvasPlacePhoto place={place} destination="Milan" active/>);
  await waitFor(() => expect(container.querySelector('figure')).toBeNull());
});
