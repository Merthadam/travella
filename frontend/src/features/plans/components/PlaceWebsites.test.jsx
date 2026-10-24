import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActivitySuggestions, activitySuggestionSchema } from '../../../design-system/a2ui/ActivitySuggestions';
import { DestinationMap } from '../../../design-system/components/DestinationMap';
import { CanvasDestinationMap, CanvasMapContext } from './CanvasDestinationMap';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';
vi.mock('../../../lib/googleMaps', () => ({ loadGoogleMaps: vi.fn(async () => { throw new Error('Unavailable for unit test'); }) }));
afterEach(cleanup);
const place = { id: 'garden', place_id: 'google-test', name: 'Garden', address: 'Milan', position: { lat: 45.4, lng: 9.2 }, rating: null, rating_count: null, types: ['park'], maps_url: 'https://www.google.com/maps/place/test', reason: 'Walk', ticket: 'test', website: 'https://example.org/garden' };

test('chat website is accessible before adding and absent when provider has none', async () => {
  const onAction = vi.fn();
  const { rerender } = render(<ActivitySuggestions surfaceId="test" suggestions={[place]} added={[]} onAction={onAction}/>);
  const link = await screen.findByRole('link', { name: 'Visit Garden website' });
  expect(link.getAttribute('href')).toBe(place.website);
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(onAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '+ Add to plan' }));
  expect(onAction).toHaveBeenCalledWith('add_activity', { id: 'garden' });
  rerender(<ActivitySuggestions surfaceId="test" suggestions={[{ ...place, website: null }]} added={[]} onAction={onAction}/>);
  await screen.findByRole('link', { name: 'Open Garden in Google Maps' });
  expect(screen.queryByRole('link', { name: 'Visit Garden website' })).toBeNull();
  expect(activitySuggestionSchema.safeParse({ ...place, website: 'javascript:alert(1)' }).success).toBe(false);
});

test('saved place website appears when selecting its map pin or list row', () => {
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  const pin = { id: place.id, name: place.name, position: place.position, category: 'activity', description: '', website: place.website };
  const Adapter = ({ onSelect }) => <button onClick={() => onSelect('garden')}>Select map pin</button>;
  render(<DestinationMap data={{ status: 'ready', destination: 'Milan', final: true, pins: [pin] }} combined mapAdapter={Adapter} onAction={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Select map pin' }));
  expect(screen.getByRole('link', { name: 'Visit Garden website' }).getAttribute('href')).toBe(place.website);
});

test('temporary map previews expose the website without adding a pin', async () => {
  const add = vi.fn();
  const preview = { ...place, editorial_summary: 'Original map description.' };
  render(<AppearanceProvider><CanvasMapContext.Provider value={{ preview, onAddPreview: add }}><CanvasDestinationMap destination="" places={[]} onSelect={() => {}}/></CanvasMapContext.Provider></AppearanceProvider>);
  expect(screen.getByRole('link', { name: 'Visit Garden website' }).getAttribute('href')).toBe(place.website);
  expect(add).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add to plan' }));
  expect(add).toHaveBeenCalledWith(preview);
  expect(screen.getByText('Original map description.')).toBeTruthy();
  await screen.findByText('The map is unavailable. Your places are available in List view.');
});

test('suggestions display only the original Google editorial description, never the generated reason', async () => {
  const editorial = 'Original Google description — unchanged.';
  const { rerender } = render(<ActivitySuggestions surfaceId="editorial-test" suggestions={[{ ...place, editorial_summary: editorial, editorial_summary_language: 'en' }]} added={[]} onAction={() => {}}/>);
  expect(await screen.findByText(editorial)).toBeTruthy();
  expect(screen.queryByText(/Why it fits/)).toBeNull();
  expect(screen.queryByText('Walk')).toBeNull();
  rerender(<ActivitySuggestions surfaceId="editorial-test" suggestions={[place]} added={[]} onAction={() => {}}/>);
  await screen.findByRole('link', { name: 'Visit Garden website' });
  expect(screen.queryByText(editorial)).toBeNull();
  expect(screen.queryByText('Walk')).toBeNull();
});
