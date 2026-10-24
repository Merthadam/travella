import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CanvasPlaceDetails, loadSavedPlaceDetails } from './CanvasPlaceDetails';
import { loadGoogleMaps } from '../../../lib/googleMaps';
vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn() }));
const search = vi.fn();
const place = { id: '', name: 'Garden', position: { lat: 45.47, lng: 9.18 } };
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('right-id'));
  place.id = 'google_' + Buffer.from(digest).toString('hex').slice(0, 32);
  search.mockReset();
  loadGoogleMaps.mockResolvedValue({ libraries: { places: { Place: { searchByText: search } } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const detail = () => ({ id: 'right-id', websiteURI: 'https://example.org/garden', editorialSummary: 'Original description — unchanged.', editorialSummaryLanguageCode: 'en', fetchFields: vi.fn() });

test('fetches only the exact saved identity and rejects unsafe URLs without discarding its description', async () => {
  const wrong = { ...detail(), id: 'wrong-id' }; const right = detail();
  search.mockResolvedValue({ places: [wrong, right] });
  expect(await loadSavedPlaceDetails(place, 'Milan')).toEqual({ website: right.websiteURI, placeId: 'right-id', summary: right.editorialSummary, language: 'en' });
  expect(wrong.fetchFields).not.toHaveBeenCalled();
  right.websiteURI = 'javascript:alert(1)';
  expect((await loadSavedPlaceDetails(place, 'Milan')).website).toBeNull();
  search.mockResolvedValue({ places: [wrong] });
  expect(await loadSavedPlaceDetails(place, 'Milan')).toBeNull();
});

test('shows verbatim provider text and defers website enrichment until the draft is available', async () => {
  search.mockResolvedValue({ places: [detail()] });
  const onAction = vi.fn();
  const { rerender } = render(<CanvasPlaceDetails place={place} destination="Milan" onAction={onAction} disabled/>);
  expect(screen.getByRole('status').textContent).toContain('Loading');
  expect(await screen.findByText('Original description — unchanged.')).toBeTruthy();
  expect(onAction).not.toHaveBeenCalled();
  expect(new URL(screen.getByRole('link', { name: 'Open Garden in Google Maps' }).href).searchParams.get('query_place_id')).toBe('right-id');
  rerender(<CanvasPlaceDetails place={place} destination="Milan" onAction={onAction}/>);
  await waitFor(() => expect(onAction).toHaveBeenCalledWith('set_place_website', { id: place.id, website: 'https://example.org/garden' }));
  onAction.mockClear();
  rerender(<CanvasPlaceDetails place={{ ...place, website: 'https://existing.example.org' }} destination="Milan" onAction={onAction}/>);
  expect(screen.getByRole('link', { name: 'Visit Garden website' }).getAttribute('href')).toBe('https://existing.example.org');
  expect(onAction).not.toHaveBeenCalled();
});

test('failed lookup can retry; missing summary never falls back to generated notes', async () => {
  search.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ places: [{ ...detail(), websiteURI: null, editorialSummary: null }] });
  render(<CanvasPlaceDetails place={{ ...place, description: 'AI filler' }} destination="Milan" onAction={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry details' }));
  expect(await screen.findByText('No website listed on Google Maps.')).toBeTruthy();
  expect(screen.queryByText('AI filler')).toBeNull();
  expect(screen.queryByText('Description from Google Maps')).toBeNull();
});

test('late responses from a previous place cannot enrich the selected place', async () => {
  let resolve;
  search.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue({ places: [] });
  const onAction = vi.fn();
  const { rerender } = render(<CanvasPlaceDetails place={place} destination="Milan" onAction={onAction}/>);
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  rerender(<CanvasPlaceDetails place={{ ...place, id: 'google_' + '0'.repeat(32) }} destination="Milan" onAction={onAction}/>);
  resolve({ places: [detail()] });
  await screen.findByText('Google Maps details unavailable for this place.');
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Visit Garden website' })).toBeNull();
  expect(new URL(screen.getByRole('link', { name: 'Open Garden in Google Maps' }).href).searchParams.has('query_place_id')).toBe(false);
});
