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

test('note edits preserve place identity and require explicit confirmation before removal, with undo', async () => {
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
  await user.click(screen.getByRole('button', { name: 'Edit note' }));
  await user.clear(screen.getByRole('textbox', { name: 'Note' }));
  await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Go in the morning');
  await user.click(screen.getByRole('button', { name: 'Update note' }));
  expect(action).toHaveBeenCalledWith('edit_pin', { ...pins[0], description: 'Go in the morning' });
  await user.click(screen.getByRole('button', { name: 'Remove', exact: true }));
  expect(screen.getByRole('dialog').open).toBe(true);
  expect(action.mock.calls.some(([name]) => name === 'remove_pin')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Keep place' }));
  await user.click(screen.getByRole('button', { name: 'Remove', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Remove place', exact: true }));
  expect(screen.queryByRole('button', { name: /Sforzesco Castle/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('button', { name: /Sforzesco Castle/ })).toBeTruthy();
  expect(action).toHaveBeenCalledWith('restore_pin', { pin: { ...pins[0], description: 'Go in the morning' }, index: 0 });
  expect(screen.getAllByRole('button', { name: /Sforzesco Castle|Test cafe/ })[0].textContent).toContain('Sforzesco Castle');
});

test('conversation preview opens the map without adding and waits for an unfinished note', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  const { rerender } = render(<DestinationMap data={data} onAction={action} mapAdapter={Map}/>);
  await user.click(screen.getByRole('button', { name: /Sforzesco Castle/ }));
  await user.click(screen.getByRole('button', { name: 'Edit note' }));
  rerender(<DestinationMap data={data} onAction={action} mapAdapter={Map} placePreview={{ id: 'preview' }}/>);
  expect(screen.getByRole('textbox', { name: 'Note' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.getByRole('region', { name: 'Test map' })).toBeTruthy());
  expect(action.mock.calls.some(([name]) => name === 'add_pin')).toBe(false);
});
