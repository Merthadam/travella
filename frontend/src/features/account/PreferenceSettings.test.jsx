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
  vi.stubGlobal('fetch', vi.fn(async (_path, options) => ({ ok: true, status: 200, json: async () => options.method === 'GET' ? {} : ({ ...profile, ...JSON.parse(options.body).values, revision: 4 }) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const page = (data = profile) => render(<AccountSettingsPage initialProfile={data} onExpired={vi.fn()} onNavigatePlans={vi.fn()} />);
const writes = () => fetch.mock.calls.filter(([, options]) => options.method === 'PATCH');

test('home is default and clearing airport only persists on Save', async () => {
  const user = userEvent.setup(); page();
  expect(screen.getByRole('heading', { name: 'Home base' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Edit home base' }));
  await user.click(await screen.findByRole('button', { name: 'Clear selected airport' }));
  expect(writes()).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your home base was saved.');
  expect(JSON.parse(writes()[0][1].body)).toMatchObject({ section: 'home', values: { home_city: profile.home_city, default_airport: null } });
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
  expect(writes()).toHaveLength(0);
});

test('home validation failure retains the draft and focuses the error', async () => {
  const user = userEvent.setup(); page();
  await user.click(screen.getByRole('button', { name: 'Edit home base' }));
  await user.clear(screen.getByLabelText(/City/)); await user.type(screen.getByLabelText(/City/), 'Changed city');
  fetch.mockResolvedValue({ ok: false, status: 422, json: async () => ({ code: 'invalid_profile' }) });
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));
  expect(screen.getByLabelText(/City/).value).toBe('Changed city');
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
  expect(JSON.parse(writes()[0][1].body)).toMatchObject({ section: 'citizenship', values: { citizenships: [] } });
  expect(screen.getByText('No citizenships added')).toBeTruthy();
});

test('interests allow keyboard add, duplicate feedback, individual removal and zero save', async () => {
  const user = userEvent.setup(); page();
  await user.click(screen.getByRole('button', { name: 'Your interests' }));
  await user.click(screen.getByRole('button', { name: 'Edit your interests' }));
  expect(screen.getByText('No interests selected')).toBeTruthy();
  await user.type(screen.getByLabelText('Something else you love?'), '  Quiet   walks{Enter}');
  expect(screen.getByText('1 interest selected')).toBeTruthy();
  await user.type(screen.getByLabelText('Something else you love?'), 'quiet walks{Enter}');
  expect(screen.getByText('That interest is already selected.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Hiking', exact: true }));
  expect(screen.getByText('2 interests selected')).toBeTruthy();
  screen.getByRole('button', { name: 'Remove Quiet walks interest' }).focus();
  await user.keyboard('{Enter}');
  expect(screen.getByText('1 interest selected')).toBeTruthy();
  expect(writes()).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your interests were saved.');
  expect(JSON.parse(writes()[0][1].body).values).toEqual({ interest_ids: ['hiking'], custom_interests: [] });
  await user.click(screen.getByRole('button', { name: 'Edit your interests' }));
  await user.click(screen.getByRole('button', { name: 'Clear all interests' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your interests were saved.');
  expect(JSON.parse(writes()[1][1].body).values).toEqual({ interest_ids: [], custom_interests: [] });
});

test('twenty custom interests remain removable and cannot exceed the maximum', async () => {
  const user = userEvent.setup(); page({ ...profile, interest_ids: [], custom_interests: Array.from({ length: 20 }, (_, i) => `Interest ${i}`) });
  await user.click(screen.getByRole('button', { name: 'Your interests' }));
  await user.click(screen.getByRole('button', { name: 'Edit your interests' }));
  expect(screen.getByText('20 interests selected')).toBeTruthy();
  expect(screen.getByLabelText('Something else you love?').maxLength).toBe(60);
  await user.type(screen.getByLabelText('Something else you love?'), 'One more{Enter}');
  expect(screen.getByText(/up to 40 curated and 20 custom interests/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Remove One more interest' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Remove Interest 0 interest' }));
  await user.click(screen.getByRole('button', { name: 'Add interest' }));
  expect(screen.getByRole('button', { name: 'Remove One more interest' })).toBeTruthy();
});
