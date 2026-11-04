import React, { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { StayLocationFilters } from './StayLocationFilters';
import { staySearchDraft } from './staySearchDraft';
import { emptyStayLocation, stayLocationSchema } from './stayLocation';
import { draftFromCriteria, initialWorkspace, travelWorkspaceReducer } from './useTravelWorkspace';

vi.mock('../components/CanvasDestinationMap', async () => {
  const { createContext } = await import('react');
  return { CanvasMapContext: createContext({}), CanvasDestinationMap: ({ places, onSelect }) => <div>{places.map(p => <button key={p.id} onClick={() => onSelect(p.id)}>{p.name}</button>)}</div> };
});
vi.mock('./StayDestination', () => ({ StayDestination: () => null }));
afterEach(cleanup);
const places = [{ id: 'one', name: 'Museum', category: 'activity', position: { lat: 1, lng: 2 } }, { id: 'two', name: 'Gallery', category: 'activity', position: { lat: 2, lng: 3 } }, { id: 'three', name: 'Market', category: 'food', position: { lat: 3, lng: 4 } }];
test('chat mentions follow current saved locations and never plot obsolete coordinates', () => {
  const props = { value: emptyStayLocation(), mentions: [{ id: 'three', name: 'Market', source: 'saved_place', latitude: 3, longitude: 4 }] };
  const { rerender } = render(<StayLocationFilters {...props} places={places}/>);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mentioned in chat (1)' }));
  expect(screen.getByRole('button', { name: 'Mentioned in chat: Market' })).toBeTruthy();
  rerender(<StayLocationFilters {...props} places={[{ ...places[2], position: null }]}/>);
  expect(screen.queryByRole('button', { name: 'Mentioned in chat: Market' })).toBeNull();
  expect(screen.getByText('Market · Mentioned in chat · location unavailable')).toBeTruthy();
  rerender(<StayLocationFilters {...props} places={[]}/>);
  expect(screen.queryByText('Market · Mentioned in chat · location unavailable')).toBeNull();
});
test('category selection is deduplicated and independently editable; pin inspection cannot apply filters', () => {
  const apply = vi.fn(), changed = vi.fn();
  function Harness() { const [value, set] = useState(emptyStayLocation()); return <><StayLocationFilters value={value} onChange={next => { changed(next); set(next); }} places={places} mentions={[{ id: 'three', name: 'Market', source: 'saved_place', latitude: 3, longitude: 4 }]} hotels={[]} onApply={apply}/><output>{JSON.stringify(value.saved_place_ids)}</output></>; }
  render(<Harness/>);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Activities' }));
  expect(screen.getByRole('status').textContent).toBe('["one","two"]');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Museum' }));
  expect(screen.getByRole('status').textContent).toBe('["two"]');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mentioned in chat (1)' }));
  const before = changed.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Mentioned in chat: Market' }));
  expect(changed).toHaveBeenCalledTimes(before); expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Include in search' }));
  expect(screen.getByRole('status').textContent).toBe('["two","three"]');
  fireEvent.click(screen.getByRole('button', { name: 'Apply location & search' }));
  expect(apply).toHaveBeenCalledOnce();
});
test('invalid radii and coordinates fail closed; location edits revoke agent authority', () => {
  expect(stayLocationSchema.safeParse({ ...emptyStayLocation(), radius_m: -1 }).success).toBe(false);
  let state = initialWorkspace({ planId: 'p', topic: 'stays' });
  state = travelWorkspaceReducer(state, { type: 'run-start', authority: { run_id: 'run', brief_digest: 'a'.repeat(64) } });
  const next = travelWorkspaceReducer(state, { type: 'draft', field: 'stayLocation', value: { ...emptyStayLocation(), saved_place_ids: ['one'] } });
  expect(next.authority).toBeNull(); expect(next.draftDirty).toBe(true); expect(next.revision).toBeGreaterThan(state.revision);
});


test('unselected saved places are available directly on the map', () => {
  const changed = vi.fn();
  render(<StayLocationFilters places={places} onChange={changed}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Saved place: Museum' }));
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Include in search' }));
  expect(changed.mock.calls[0][0].saved_place_ids).toEqual(['one']);
});


test('a fresh stay form supplies search context without inventing a place ID or child age', () => {
  const draft = { city: 'Lisbon', country: 'PT', nationality: 'HU', start: '2027-05-12', end: '2027-05-16', currency: 'EUR', rooms: [{ adults: '2', children_ages: [] }], stayLocation: emptyStayLocation() };
  const now = Date.parse('2026-11-04T12:00:00Z');
  expect(staySearchDraft(draft, now)).toMatchObject({ destination: { city: 'Lisbon', country_code: 'PT', place_id: null }, rooms: [{ adults: 2, children_ages: [] }], location: null });
  expect(staySearchDraft({ ...draft, rooms: [{ adults: 2, children_ages: [''] }] }, now)).toBeNull();
  expect(staySearchDraft({ ...draft, nationality: '' }, now)).toBeNull();
  expect(staySearchDraft({ ...draft, end: draft.start }, now)).toBeNull();
});
