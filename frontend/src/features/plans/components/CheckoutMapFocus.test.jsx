import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DestinationMap } from '../../../design-system/components/DestinationMap';
HTMLDialogElement.prototype.close = vi.fn();
HTMLDialogElement.prototype.showModal = vi.fn();
afterEach(() => { cleanup(); sessionStorage.clear(); });
const data = { status: 'ready', destination: 'Milan', final: true, pins: [
  { id: 'hotel', name: 'Central Hotel', category: 'stay', position: { lat: 45, lng: 9 }, description: '' },
  { id: 'airport', name: 'Malpensa', category: 'airport', position: { lat: 45.63, lng: 8.72 }, description: '' },
] };
function Map({ selectedId }) { return <div data-testid="selected-map-pin">{selectedId}</div>; }
test('confirmation focus clears category filter and selects the existing pin in map and accessible list', async () => {
  const props = { data, combined: true, viewStateKey: 'map-focus-test', mapAdapter: Map, onAction: vi.fn() };
  const { rerender } = render(<DestinationMap {...props}/>);
  fireEvent.click(screen.getByRole('button', { name: /Airports 1/ }));
  expect(screen.queryByRole('button', { name: /Central Hotel Stays/ })).toBeNull();
  rerender(<DestinationMap {...props} placeFocus={{ id: 'hotel', request: 1 }}/>);
  const row = await screen.findByRole('button', { name: /Central Hotel Stays/ });
  await waitFor(() => expect(row.getAttribute('aria-expanded')).toBe('true'));
  expect(screen.getByTestId('selected-map-pin').textContent).toBe('hotel');
  await waitFor(() => expect(document.activeElement).toBe(row));
});
