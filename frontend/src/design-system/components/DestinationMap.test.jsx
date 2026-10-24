import React, { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationMap } from './DestinationMap';

const pins = [
  { id: 'castle', name: 'Sforzesco Castle', category: 'activity', description: 'Visit the courtyard', position: { lat: 45.47, lng: 9.18 } },
  { id: 'cafe', name: 'Test cafe', category: 'food', description: 'Breakfast', position: { lat: 45.46, lng: 9.19 } },
];
const data = { status: 'ready', destination: 'Milan', final: true, pins };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(cleanup);
function Map({ places, onSelect, onShowAll }) { return <div role="region" aria-label="Test map">{places.map(p => <button key={p.id} onClick={() => onSelect(p.id)}>{p.name} pin</button>)}<button onClick={onShowAll}>Show all places</button></div>; }

test('list and map share category filters without changing the plan', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  render(<DestinationMap data={data} onAction={action} mapAdapter={Map}/>);
  expect(screen.queryByRole('region', { name: 'Test map' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Food 1' }));
  expect(screen.queryByRole('button', { name: /Sforzesco Castle/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Map', exact: true }));
  expect(screen.getByRole('button', { name: 'Test cafe pin' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Show all places' }));
  expect(screen.getByRole('button', { name: 'Sforzesco Castle pin' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'List', exact: true }));
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Find places' })).toBeNull();
  expect(action.mock.calls.filter(([name]) => name !== 'editor_state')).toEqual([]);
});

test('generated notes are hidden; removal still requires confirmation and supports undo', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  function Live() {
    const [value, setValue] = useState(data);
    return <DestinationMap data={value} onAction={(name, payload) => {
      action(name, payload);
      if (name === 'edit_pin') setValue(v => ({ ...v, pins: v.pins.map(p => p.id === payload.id ? payload : p) }));
      if (name === 'remove_pin') setValue(v => ({ ...v, pins: v.pins.filter(p => p.id !== payload.id) }));
      if (name === 'restore_pin') setValue(v => { const restored = [...v.pins]; restored.splice(payload.index, 0, payload.pin); return { ...v, pins: restored }; });
    }} mapAdapter={Map}/>;
  }
  render(<Live/>);
  await user.click(screen.getByRole('button', { name: /Sforzesco Castle/ }));
  expect(screen.queryByText('Visit the courtyard')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit note' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'More options for Sforzesco Castle' }));
  await user.click(screen.getByRole('button', { name: 'Remove from plan', exact: true }));
  expect(screen.getByRole('dialog').open).toBe(true);
  expect(action.mock.calls.some(([name]) => name === 'remove_pin')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Keep place' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More options for Sforzesco Castle' }));
  await user.click(screen.getByRole('button', { name: 'More options for Sforzesco Castle' }));
  await user.click(screen.getByRole('button', { name: 'Remove from plan', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Remove place', exact: true }));
  expect(screen.queryByRole('button', { name: /Sforzesco Castle/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('button', { name: /Sforzesco Castle/ })).toBeTruthy();
  expect(action).toHaveBeenCalledWith('restore_pin', { pin: pins[0], index: 0 });
  expect(screen.getAllByRole('button', { name: /Sforzesco Castle|Test cafe/ })[0].textContent).toContain('Sforzesco Castle');
});

test('conversation preview opens the map without adding', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  const { rerender } = render(<DestinationMap data={data} onAction={action} mapAdapter={Map}/>);
  await user.click(screen.getByRole('button', { name: /Sforzesco Castle/ }));
  rerender(<DestinationMap data={data} onAction={action} mapAdapter={Map} placePreview={{ id: 'preview' }}/>);
  await waitFor(() => expect(screen.getByRole('region', { name: 'Test map' })).toBeTruthy());
  expect(action.mock.calls.some(([name]) => name === 'add_pin')).toBe(false);
});

test('reopening a plan restores its filter and selected place without changing saved pins', async () => {
  sessionStorage.clear();const user=userEvent.setup();const action=vi.fn();
  const props={data,onAction:action,mapAdapter:Map,viewStateKey:'reopen-map-test'};
  const first=render(<DestinationMap {...props}/>);
  await user.click(screen.getByRole('button',{name:'Food 1'}));
  await user.click(screen.getByRole('button',{name:/Test cafe Food/}));
  first.unmount();render(<DestinationMap {...props}/>);
  expect(screen.getByRole('button',{name:'Food 1'}).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: /Test cafe Food/ }).getAttribute('aria-expanded')).toBe('true');
  expect(screen.queryByText('Breakfast')).toBeNull();
  expect(action.mock.calls.filter(([name])=>name!=='editor_state')).toEqual([]);
});

test('combined places keeps the list and map visible with shared selection and filters', async () => {
  const user=userEvent.setup(); const action=vi.fn();
  render(<DestinationMap data={data} onAction={action} mapAdapter={Map} combined/>);
  expect(screen.getByRole('region',{name:'Test map'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'List',exact:true})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Sforzesco Castle pin'}));
  expect(screen.getByRole('button',{name:/Sforzesco Castle Activities/}).getAttribute('aria-expanded')).toBe('true');
  expect(screen.queryByRole('heading', { name: 'Sforzesco Castle' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close place details' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Open Sforzesco Castle in Google Maps' }).href).toContain('query=45.47%2C9.18');
  await user.click(screen.getByRole('button',{name:'Food 1'}));
  expect(screen.queryByRole('button',{name:'Sforzesco Castle pin'})).toBeNull();
  expect(screen.getByRole('button',{name:'Test cafe pin'})).toBeTruthy();
  expect(action.mock.calls.filter(([name])=>name!=='editor_state')).toEqual([]);
});

test('place options dismiss on Escape and outside click without removing anything', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  render(<DestinationMap data={data} onAction={action} combined/>);
  await user.click(screen.getByRole('button', { name: /Sforzesco Castle Activities/ }));
  const more = screen.getByRole('button', { name: 'More options for Sforzesco Castle' });
  await user.click(more);
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove from plan' }));
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(more);
  expect(screen.queryByRole('button', { name: 'Remove from plan' })).toBeNull();
  await user.click(more);
  await user.click(screen.getByRole('heading', { name: 'Your places' }));
  expect(screen.queryByRole('button', { name: 'Remove from plan' })).toBeNull();
  expect(action).not.toHaveBeenCalled();
});
