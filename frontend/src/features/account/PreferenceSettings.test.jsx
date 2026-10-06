import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettingsPage } from './AccountSettingsPage';

vi.mock('../onboarding/components/GoogleAddressSearch', () => ({ GoogleAddressSearch: () => <p>Address lookup unavailable in isolated test</p> }));
vi.mock('../onboarding/components/HomeLocationMap', () => ({ HomeLocationMap: () => <p>Map unavailable</p> }));
const profile = { exists: true, revision: 3, home_city: { name: 'Vienna', country_code: 'AT', source: 'manual', address: 'Private address' }, default_airport: 'VIE', citizenships: ['AT', 'HU'], food_needs: 'Vegetarian' };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.stubGlobal('fetch', vi.fn(async (_path, options) => ({ ok: true, status: 200, json: async () => ({ ...profile, ...JSON.parse(options.body).values, revision: 4 }) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const page = (data = profile) => render(<AccountSettingsPage initialProfile={data} onExpired={vi.fn()} onNavigatePlans={vi.fn()} />);

test('home is default and clearing airport only persists on Save', async () => {
  const user = userEvent.setup(); page();
  expect(screen.getByRole('heading', { name: 'Home base' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Edit home base' }));
  await user.click(await screen.findByRole('button', { name: 'Clear selected airport' }));
  expect(fetch).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your home base was saved.');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ section: 'home', values: { home_city: profile.home_city, default_airport: null } });
  expect(screen.getByText('No preference')).toBeTruthy();
});

test('home changes disclose draft airport clear and cancel preserves saved home', async () => {
  const user = userEvent.setup(); page();
  await user.click(screen.getByRole('button', { name: 'Edit home base' }));
  await user.clear(screen.getByLabelText(/City/)); await user.type(screen.getByLabelText(/City/), 'Budapest');
  expect(screen.getByText(/Changing your home clears the airport in this draft/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  expect(screen.getByText(/Vienna · Austria/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

test('citizenships support accessible removal, catalog add and explicit clear via mobile selector', async () => {
  const user = userEvent.setup(); page();
  await user.selectOptions(screen.getByLabelText('Choose a setting'), 'citizenship');
  await user.click(screen.getByRole('button', { name: 'Edit citizenships' }));
  await user.click(screen.getByRole('button', { name: 'Remove Austria citizenship' }));
  await user.type(screen.getByRole('searchbox'), 'Austria');
  await user.click(screen.getByRole('button', { name: /Austria/ }));
  expect(screen.getByRole('button', { name: 'Remove Austria citizenship' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Clear citizenships' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your citizenships were saved.');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ section: 'citizenship', values: { citizenships: [] } });
  expect(screen.getByText('No citizenships added')).toBeTruthy();
});
