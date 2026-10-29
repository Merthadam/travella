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
test('search keeps multiple selections and native keyboard toggling can remove them', async () => {
  travelRequest.mockImplementation(async (_plan, _action, { kind }) => ({ items: kind === 'hotel_types' ? [{ id: 1, name: 'Hotel' }, { id: 2, name: 'Apartment' }] : [{ id: 3, name: 'Pool' }, { id: 4, name: 'Kitchen' }] }));
  render(<Form/>);
  const user = userEvent.setup();
  await user.click(screen.getByText('Property type, amenities & cancellation'));
  await user.click(await screen.findByRole('checkbox', { name: 'Hotel' }));
  await user.click(screen.getByRole('checkbox', { name: 'Apartment' }));
  const search = screen.getByRole('searchbox', { name: 'Search property types' });
  await user.type(search, 'apart');
  expect(screen.getByRole('checkbox', { name: 'Apartment' }).checked).toBe(true);
  expect(screen.queryByRole('checkbox', { name: 'Hotel' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Remove Hotel' }));
  await user.clear(search);
  expect(screen.getByRole('checkbox', { name: 'Hotel' }).checked).toBe(false);
  screen.getByRole('checkbox', { name: 'Apartment' }).focus();
  await user.keyboard('[Space]');
  expect(screen.getByRole('checkbox', { name: 'Apartment' }).checked).toBe(false);
  await user.type(search, 'no match');
  expect(screen.getByRole('status').textContent).toContain('No matching options');
  expect(screen.getByRole('checkbox', { name: 'Pool' })).toBeTruthy();
});
test('selection limit disables only unchecked options and removing one restores capacity', async () => {
  travelRequest.mockResolvedValue({ items: Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `Type ${i + 1}` })) });
  render(<Form initial={{ ...emptyStayFilters(), hotel_type_ids: Array.from({ length: 10 }, (_, i) => i + 1) }}/>);
  const user = userEvent.setup();
  await user.click(screen.getByText(/Property type, amenities & cancellation/));
  const options = await screen.findAllByRole('checkbox', { name: 'Type 11' });
  expect(options[0].disabled).toBe(true);
  await user.click(screen.getAllByRole('checkbox', { name: 'Type 1' })[0]);
  expect(options[0].disabled).toBe(false);
  await user.click(options[0]);
  expect(options[0].checked).toBe(true);
});
