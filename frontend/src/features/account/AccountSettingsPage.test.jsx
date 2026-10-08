import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountApp } from '../../AccountApp';
import { AccountSettingsPage as SettingsPage } from './AccountSettingsPage';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
const AccountSettingsPage = props => <AppearanceProvider><SettingsPage {...props} /></AppearanceProvider>;

const profile = { exists: true, revision: 3, onboarding_complete: true, onboarding: { completed_version: 2 }, food_needs: 'Vegetarian', accessibility_needs: '' };
const response = (status, body) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.history.replaceState(null, '', '/account');
  vi.stubGlobal('fetch', vi.fn(async path => response(200, path === '/v1/traveler-profile' ? profile : { plans: [] })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

test('account loading is distinct from failure and local retry preserves selected security setting', async () => {
  const user = userEvent.setup(); let finish;
  fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AccountSettingsPage initialProfile={profile} onExpired={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Your name' }));
  expect(screen.getByText('Loading account details…')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  await act(async () => finish(response(503, {})));
  expect(screen.getByRole('alert').textContent).toContain("We couldn't load this setting.");
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  expect(screen.getByText('Edit food & accessibility')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Two-factor authentication' }));
  await user.click(screen.getByText('Retry'));
  expect(screen.getByText('Loading account details…')).toBeTruthy();
  expect(screen.queryByText('Retry')).toBeNull();
  await act(async () => finish(response(200, { identity: { first_name: 'Ada', last_name: 'Traveler' }, mfa: { status: 'off' }, capabilities: { authenticator: { setup: true } } })));
  expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeTruthy();
  expect(screen.getByText('Set up authenticator')).toBeTruthy();
  expect(fetch.mock.calls).toHaveLength(2);
});

test('production account saves exact needs contract and renders only acknowledged values', async () => {
  const user = userEvent.setup();
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  const food = screen.getByLabelText('Food preferences & allergies');
  await user.clear(food); await user.type(food, '  Vegan  ');
  let finish;
  fetch.mockImplementation(path => path.endsWith('/sections') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response(200, profile)));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true);
  const [, options] = fetch.mock.calls.find(([path]) => path.endsWith('/sections'));
  expect(options.method).toBe('PATCH');
  expect(JSON.parse(options.body)).toEqual({ section: 'needs', values: { food_needs: '  Vegan  ', accessibility_needs: '' }, expected_revision: 3, event_id: expect.any(String) });
  expect(screen.queryByText('Your food and accessibility preferences were saved.')).toBeNull();
  finish(response(200, { ...profile, food_needs: 'Vegan', revision: 4 }));
  await screen.findByText('Your food and accessibility preferences were saved.');
  expect(screen.getByText('Vegan')).toBeTruthy();
});

test('failed needs save retains the draft', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  fetch.mockResolvedValue(response(422, { code: 'invalid_profile', message: 'Check your changes.' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
});

test('dirty cancel and setting navigation keep editing until explicit discard', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
  await user.selectOptions(screen.getByLabelText('Choose a setting'), 'home');
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  expect(screen.getByRole('heading', { name: 'Home base' })).toBeTruthy();
  expect(screen.queryByLabelText('Accessibility needs')).toBeNull();
});

test('appearance persists globally and restores document scheme only when the app unmounts', async () => {
  const user = userEvent.setup(); const old = document.documentElement.style.colorScheme;
  const view = render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(localStorage.getItem('travella.theme')).toBe('dark');
  expect(document.querySelector('.account-page').dataset.theme).toBe('dark');
  expect(fetch.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  view.unmount(); expect(document.documentElement.style.colorScheme).toBe(old);
  render(<AccountApp />); await screen.findByRole('heading', { name: 'Account & preferences' });
  expect(screen.getByRole('button', { name: 'Dark mode' }).getAttribute('aria-pressed')).toBe('true');
});

test('unknown result reconciles the identical request before another write', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  const first = fetch.mock.calls.find(([path]) => path.endsWith('/sections'))[1].body;
  expect(screen.getByRole('button', { name: 'Save changes' }).disabled).toBe(true);
  expect(screen.getByLabelText('Accessibility needs').disabled).toBe(true);
  fetch.mockResolvedValue(response(200, { ...profile, accessibility_needs: 'Step-free', revision: 4 }));
  await user.click(screen.getByRole('button', { name: 'Check saved details' }));
  await screen.findByText('Your food and accessibility preferences were saved.');
  expect(fetch.mock.calls.filter(([path]) => path.endsWith('/sections'))[1][1].body).toBe(first);
});

test('conflict retains draft and requires latest detail review before new revision save', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  fetch.mockImplementation(async path => path.endsWith('/sections') ? response(409, { code: 'revision_conflict' }) : response(200, { ...profile, food_needs: 'Vegan', revision: 6 }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('button', { name: 'Save changes' }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Review latest details' }));
  expect(await screen.findByText('Vegan')).toBeTruthy();
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
  fetch.mockResolvedValue(response(200, { ...profile, accessibility_needs: 'Step-free', revision: 7 }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Your food and accessibility preferences were saved.');
  const writes = fetch.mock.calls.filter(([path]) => path.endsWith('/sections')).map(([, opts]) => JSON.parse(opts.body));
  expect(writes[1].expected_revision).toBe(6); expect(writes[1].event_id).not.toBe(writes[0].event_id);
});

test('direct account entry guards repeated back and forward without losing the draft', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  act(() => history.back());
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await waitFor(() => expect(location.pathname).toBe('/account'));
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  act(() => history.back());
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await waitFor(() => expect(location.pathname).toBe('/account'));
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  act(() => history.forward());
  await screen.findByRole('heading', { name: 'Account & preferences' });
  expect(screen.queryByLabelText('Accessibility needs')).toBeNull();
});

test('transient session failure preserves editor and expiry rejects late save', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Private draft');
  fetch.mockResolvedValueOnce(response(503, {})); act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(fetch.mock.calls.filter(([path]) => path === '/auth/session')).toHaveLength(2));
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Private draft');
  let finish;
  fetch.mockImplementation(path => path.endsWith('/sections') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response(401, {})));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  act(() => window.dispatchEvent(new Event('focus')));
  await screen.findByRole('heading', { name: 'Welcome back' });
  await act(async () => finish(response(200, { ...profile, accessibility_needs: 'Private draft', revision: 4 })));
  expect(screen.queryByText('Private draft')).toBeNull();
  expect(screen.queryByText('Your food and accessibility preferences were saved.')).toBeNull();
});

test('denied appearance storage leaves edits usable and unchanged Cancel leaves immediately', async () => {
  vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Dark mode' }));
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Edit food & accessibility' })).toBeTruthy();
});

test('dirty forward navigation restores position and waits for explicit discard', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'My plans', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  act(() => history.back());
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  act(() => history.forward());
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await waitFor(() => expect(location.pathname).toBe('/account'));
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
  act(() => history.forward());
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await waitFor(() => expect(location.pathname).toBe('/account'));
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
});

test('dirty My plans and desktop setting selection share the confirmation', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  await user.click(screen.getByRole('button', { name: 'My plans', exact: true }));
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  await user.click(screen.getByRole('button', { name: 'Home base' }));
  await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  expect(screen.getByRole('heading', { name: 'Home base' })).toBeTruthy();
});

test('shared brand navigation protects a draft and exits only after explicit discard', async () => {
  const user = userEvent.setup(); const navigate = vi.fn();
  render(<AccountSettingsPage initialProfile={profile} onExpired={vi.fn()} onNavigatePlans={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Food & accessibility' }));
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  await user.click(screen.getByRole('link', { name: 'Travella' }));
  expect(navigate).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
  await user.click(screen.getByRole('link', { name: 'Travella' }));
  await user.click(screen.getByRole('button', { name: 'Discard changes', exact: true }));
  expect(navigate).toHaveBeenCalledTimes(1);
});

test('future suggestions guidance belongs only to travel preferences', async () => {
  const user = userEvent.setup();
  render(<AccountSettingsPage initialProfile={profile} onExpired={vi.fn()} />);
  expect(screen.getByText(/These preferences help shape future suggestions/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Your name' }));
  expect(screen.queryByText(/These preferences help shape future suggestions/)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Password', exact: true }));
  expect(screen.queryByText(/These preferences help shape future suggestions/)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Your interests' }));
  expect(screen.getByText(/These preferences help shape future suggestions/)).toBeTruthy();
});

test('Account appearance applies to Plans and stays selected when returning', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Dark mode' }));
  await user.click(screen.getByRole('button', { name: 'My plans', exact: true }));
  await screen.findByRole('heading', { name: 'My plans', exact: true });
  expect(document.querySelector('.account-page')).toBeNull();
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  await user.click(screen.getByRole('button', { name: 'Account', exact: true }));
  await screen.findByRole('heading', { name: 'Account & preferences' });
  expect(screen.getByRole('button', { name: 'Dark mode' }).getAttribute('aria-pressed')).toBe('true');
  await user.click(screen.getByRole('button', { name: 'Light mode' }));
  expect(document.documentElement.dataset.theme).toBe('light');
});
