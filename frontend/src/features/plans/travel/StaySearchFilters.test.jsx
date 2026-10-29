import React, { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { StaySearchFilters, emptyStayFilters } from './StaySearchFilters';
import { travelRequest } from './travelApi';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function Form({ initial = emptyStayFilters() }) {
  const [value, onChange] = useState(initial);
  return <StaySearchFilters planId="filters" active value={value} onChange={onChange}/>;
}
test('chips toggle multiple selections with click and keyboard, without textboxes', async () => {
  travelRequest.mockImplementation(async (_plan, _action, { kind }) => ({ items: kind === 'hotel_types' ? [{ id: 1, name: 'Hotel' }, { id: 2, name: 'Apartment' }] : [{ id: 3, name: 'Pool' }, { id: 4, name: 'Kitchen' }] }));
  render(<Form/>);
  const user = userEvent.setup();
  await user.click(screen.getByText('Property type, amenities & cancellation'));
  await user.click(await screen.findByRole('button', { name: 'Hotel' }));
  await user.click(screen.getByRole('button', { name: 'Apartment' }));
  expect(screen.getByRole('button', { name: 'Hotel', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Apartment', pressed: true })).toBeTruthy();
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Hotel' }));
  expect(screen.getByRole('button', { name: 'Hotel', pressed: false })).toBeTruthy();
  screen.getByRole('button', { name: 'Apartment' }).focus();
  await user.keyboard('[Space]');
  expect(screen.getByRole('button', { name: 'Apartment', pressed: false })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pool', pressed: false })).toBeTruthy();
});
test('expanded catalogs wrap and selected items stay visible after collapsing', async () => {
  travelRequest.mockImplementation(async (_plan, _action, { kind }) => ({ items: kind === 'hotel_types' ? Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Type ${i + 1}` })) : [] }));
  render(<Form/>);
  const user = userEvent.setup();
  await user.click(screen.getByText('Property type, amenities & cancellation'));
  await user.click(await screen.findByRole('button', { name: 'Show all property types (15)' }));
  await user.click(screen.getByRole('button', { name: 'Type 15' }));
  await user.click(screen.getByRole('button', { name: 'Show fewer property types' }));
  expect(screen.getByRole('button', { name: 'Type 15', pressed: true })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Type 14' })).toBeNull();
  screen.getByRole('button', { name: 'Type 15' }).focus();
  await user.keyboard('[Space]');
  expect(screen.queryByRole('button', { name: 'Type 15' })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show all property types (15)' }));
  expect(screen.getByRole('status').textContent).toBe('No options available.');
});
test('selection limit disables only unchecked options and removing one restores capacity', async () => {
  travelRequest.mockResolvedValue({ items: Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `Type ${i + 1}` })) });
  render(<Form initial={{ ...emptyStayFilters(), hotel_type_ids: Array.from({ length: 10 }, (_, i) => i + 1) }}/>);
  const user = userEvent.setup();
  await user.click(screen.getByText(/Property type, amenities & cancellation/));
  const options = await screen.findAllByRole('button', { name: 'Type 11' });
  expect(options[0].disabled).toBe(true);
  await user.click(screen.getAllByRole('button', { name: 'Type 1' })[0]);
  expect(options[0].disabled).toBe(false);
  await user.click(options[0]);
  expect(options[0].getAttribute('aria-pressed')).toBe('true');
});
