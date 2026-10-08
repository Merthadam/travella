import React, { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountIdentity } from './AccountIdentity';

const account = { identity: { first_name: 'Ada', last_name: 'Traveler', email: 'old@example.com', email_verified: true }, capabilities: { email_change: { available: false } } };
const response = body => ({ ok: true, status: 200, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('name keeps draft until canonical acknowledgement and submits exact expected names', async () => {
  const user = userEvent.setup(); const onSaved = vi.fn(); let finish;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  render(<AccountIdentity setting="name" account={account} onSaved={onSaved} cancel={action => action()} />);
  await user.click(screen.getByText('Edit your name'));
  expect(document.activeElement).toBe(screen.getByLabelText('First name'));
  await user.clear(screen.getByLabelText('First name')); await user.type(screen.getByLabelText('First name'), 'Grace');
  await user.click(screen.getByText('Save changes'));
  expect(onSaved).not.toHaveBeenCalled();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ first_name: 'Grace', last_name: 'Traveler', expected_names: { first_name: 'Ada', last_name: 'Traveler' }, event_id: expect.any(String) });
  finish(response({ ...account, identity: { ...account.identity, first_name: 'Grace' } }));
  await screen.findByText('Your name was saved.'); expect(onSaved.mock.calls[0][0].identity.first_name).toBe('Grace');
});

test('unsafe email only permits checking capability', () => {
  render(<AccountIdentity setting="email" account={account} />);
  expect(screen.getByText('old@example.com')).toBeTruthy(); expect(screen.getByText('Check availability')).toBeTruthy();
  expect(screen.queryByLabelText('New email address')).toBeNull();
});

test('capable email flow follows explicit verification and factor states through exact completion', async () => {
  const user = userEvent.setup(); const onSaved = vi.fn();
  const capable = { ...account, capabilities: { email_change: { available: true } } };
  vi.stubGlobal('fetch', vi.fn(async path => response(path.endsWith('/verification') ? { state: 'mfa_required', verification_id: 'proof' } : path.endsWith('/complete') ? { state: 'verified', verification_id: 'proof' } : path.endsWith('/start') ? { state: 'awaiting_verification', operation_id: 'operation', account: capable } : path.endsWith('/resend') ? { state: 'awaiting_verification' } : { state: 'complete', account: { ...capable, identity: { ...account.identity, email: 'new@example.com' } } })));
  render(<AccountIdentity setting="email" account={capable} onSaved={onSaved} />);
  await user.click(screen.getByText('Change email address'));
  expect(document.activeElement).toBe(screen.getByLabelText('Current password'));
  await user.type(screen.getByLabelText('Current password'), 'secret'); await user.click(screen.getByText('Continue'));
  expect(screen.queryByLabelText('New email address')).toBeNull();
  await user.type(screen.getByLabelText('Authenticator code'), '123456'); await user.click(screen.getByText('Continue'));
  await user.type(screen.getByLabelText('New email address'), 'new@example.com'); await user.click(screen.getByText('Send verification code'));
  expect(screen.getByText('old@example.com')).toBeTruthy();
  await user.click(screen.getByText('Resend code')); await screen.findByText('A new verification code was requested.');
  await user.type(screen.getByLabelText('Email verification code'), '123456'); await user.click(screen.getByText('Verify email address'));
  await screen.findByText('Your email address was updated.');
  expect(onSaved.mock.calls.at(-1)[0].identity.email).toBe('new@example.com');
  expect(localStorage.getItem('verification_id')).toBeNull();
});

test('pending resume is exact and failed code remains in editor without success', async () => {
  const user = userEvent.setup(); const onSaved = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ code: 'invalid_code', message: 'This code could not be verified.' }) })));
  render(<AccountIdentity setting="email" account={{ ...account, pending_email: { resumable: true, operation_id: 'pending', new_email: 'new@example.com', state: 'awaiting_verification' } }} onSaved={onSaved} />);
  await user.click(screen.getByText('Resume email change'));
  await user.type(screen.getByLabelText('Email verification code'), 'wrong-code'); await user.click(screen.getByText('Verify email address'));
  expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.getByLabelText('Email verification code').value).toBe('');
  expect(document.activeElement).toBe(screen.getByRole('alert'));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ operation_id: 'pending', code: 'wrong-code' });
  expect(onSaved).not.toHaveBeenCalled();
});

test('name conflict compares latest saved names with retained draft before a fresh explicit save', async () => {
  const user = userEvent.setup();
  const latest = { ...account, identity: { ...account.identity, first_name: 'Latest', last_name: 'Saved' } };
  let writes = 0;
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    if (path === '/auth/account') return response(latest);
    writes += 1;
    if (writes === 1) return { ok: false, status: 409, json: async () => ({ code: 'account_conflict', message: 'Review the latest details.' }) };
    return response({ ...latest, identity: { ...latest.identity, first_name: 'Draft', last_name: 'Traveler' } });
  }));
  function Page() { const [saved, setSaved] = useState(account); return <AccountIdentity setting="name" account={saved} onSaved={setSaved} />; }
  render(<Page />);
  await user.click(screen.getByText('Edit your name'));
  await user.clear(screen.getByLabelText('First name')); await user.type(screen.getByLabelText('First name'), 'Draft');
  await user.click(screen.getByText('Save changes'));
  expect(document.activeElement).toBe(screen.getByRole('alert'));
  expect(screen.getByText('Save changes').disabled).toBe(true);
  await user.click(screen.getByText('Review latest details'));
  expect(screen.getByText('Latest saved details')).toBeTruthy();
  expect(screen.getByText('Latest')).toBeTruthy(); expect(screen.getByText('Saved')).toBeTruthy();
  expect(screen.getByText('Your unsaved changes')).toBeTruthy();
  expect(screen.getByLabelText('First name').value).toBe('Draft');
  expect(writes).toBe(1);
  await user.click(screen.getByText('Save changes'));
  const bodies = fetch.mock.calls.filter(([path]) => path.endsWith('/name')).map(([, options]) => JSON.parse(options.body));
  expect(bodies[1].expected_names).toEqual({ first_name: 'Latest', last_name: 'Saved' });
  expect(bodies[1].event_id).not.toBe(bodies[0].event_id);
});

test('blank name validation focuses and associates the missing field without a write', async () => {
  const user = userEvent.setup(); vi.stubGlobal('fetch', vi.fn());
  render(<AccountIdentity setting="name" account={account} />);
  await user.click(screen.getByText('Edit your name'));
  await user.clear(screen.getByLabelText('First name'));
  await user.click(screen.getByText('Save changes'));
  expect(screen.getByRole('alert').textContent).toBe('Enter your first name.');
  expect(document.activeElement).toBe(screen.getByLabelText('First name'));
  expect(screen.getByLabelText('First name').getAttribute('aria-describedby')).toBe('account-name-error');
  expect(fetch).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('First name'), 'Grace');
  expect(screen.getByLabelText('First name').value).toBe('Grace');
  expect(document.activeElement).toBe(screen.getByLabelText('First name'));
  expect(screen.queryByRole('alert')).toBeNull();
});

test('unknown start result clears secrets and requires readback before another mutation', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async path => { if (path.endsWith('/start')) throw new TypeError('offline'); return response({ state: 'verified', verification_id: 'proof' }); }));
  render(<AccountIdentity setting="email" account={{ ...account, capabilities: { email_change: { available: true } } }} />);
  await user.click(screen.getByText('Change email address'));
  await user.type(screen.getByLabelText('Current password'), 'secret'); await user.click(screen.getByText('Continue'));
  await user.type(screen.getByLabelText('New email address'), 'new@example.com'); await user.click(screen.getByText('Send verification code'));
  expect(await screen.findByText('Check saved details')).toBeTruthy(); expect(screen.getByText('Send verification code').disabled).toBe(true);
});
