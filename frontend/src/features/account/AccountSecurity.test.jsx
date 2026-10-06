import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettingsPage } from './AccountSettingsPage';

const account = { identity: { first_name: 'Ada', last_name: 'Traveler', email: 'fixture@example.com' },
  capabilities: { password_change: { available: true }, authenticator: { setup: true, replace: false, disable: false }, recovery_codes: { rotate: false } },
  password_policy: { minimum_length: 12, require_numbers: true }, mfa: { status: 'off' }, recovery_codes: { status: 'empty', remaining: 0 } };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function page(user, setting = 'Password', value = account) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  render(<AccountSettingsPage initialProfile={{ revision: 1 }} onExpired={vi.fn()} />);
  await screen.findByText('Ada Traveler');
  await user.click(screen.getByRole('button', { name: setting, exact: true }));
}
function backend(handler, value = account) { vi.stubGlobal('fetch', vi.fn(async (path, options) => path === '/auth/account' ? response(value) : handler(path, JSON.parse(options.body)))); }
async function passwords(user, confirm = 'new-fixture-password') {
  await user.click(screen.getByText('Change password'));
  await user.type(screen.getByLabelText('Current password'), 'current-fixture');
  await user.type(screen.getByLabelText('New password'), 'new-fixture-password');
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByText('Save password'));
}
test('password verifies current credentials and factor before changing, clears terminal secrets', async () => {
  const user = userEvent.setup();
  backend((path, body) => response(path.endsWith('/verification') ? { state: 'mfa_required', verification_id: 'proof' } : path.endsWith('/complete') ? { state: 'verified', verification_id: 'proof' } : { state: 'complete', account }));
  await page(user); await passwords(user);
  expect(fetch.mock.calls.some(([path]) => path.endsWith('/password'))).toBe(false);
  await user.type(screen.getByLabelText('Authenticator code'), '123456');
  await user.click(screen.getByText('Continue'));
  await screen.findByText('Your password was changed.');
  const call = fetch.mock.calls.find(([path]) => path.endsWith('/password'));
  expect(JSON.parse(call[1].body)).toEqual({ current_password: 'current-fixture', new_password: 'new-fixture-password', verification_id: 'proof', event_id: expect.any(String) });
  expect(screen.queryByLabelText('Current password')).toBeNull();
});
test('password mismatch never submits and unknown outcome checks status without replay', async () => {
  const user = userEvent.setup();
  backend(path => { if (path.endsWith('/password')) throw new TypeError('offline'); return response(path.endsWith('/verification') ? { state: 'verified', verification_id: 'proof' } : { state: 'result_unknown', account }); });
  await page(user); await passwords(user, 'different-fixture');
  await screen.findByText("Your new passwords don't match.");
  expect(fetch.mock.calls).toHaveLength(1);
  await user.clear(screen.getByLabelText('Confirm new password')); await user.type(screen.getByLabelText('Confirm new password'), 'new-fixture-password');
  await user.click(screen.getByText('Save password'));
  await user.click(await screen.findByText('Check account status'));
  expect(fetch.mock.calls.filter(([path]) => path.endsWith('/password'))).toHaveLength(1);
  expect(screen.queryByLabelText('Current password')).toBeNull();
  expect(screen.queryByText('Your password was changed.')).toBeNull();
});

test('authenticator setup discloses a transient manual key and waits for verified canonical On', async () => {
  const user = userEvent.setup();
  backend(path => response(path.endsWith('/verification') ? { state: 'verified', verification_id: 'proof' } : path.endsWith('/start') ? { state: 'enrollment_required', operation_id: 'operation', secret_code: 'FICTIONALSETUPKEY', expires_in: 300 } : { state: 'complete', account: { ...account, mfa: { status: 'on' } } }));
  await page(user, 'Two-factor authentication');
  await user.click(screen.getByText('Set up authenticator'));
  await user.type(screen.getByLabelText('Current password'), 'current-fixture'); await user.click(screen.getByText('Continue'));
  expect(screen.getByLabelText('Setup key').value).toBe('FICTIONALSETUPKEY');
  expect(screen.queryByText('Your authenticator is on.')).toBeNull();
  await user.type(screen.getByLabelText('Authenticator code'), '123456'); await user.click(screen.getByText('Verify authenticator'));
  await screen.findByText('Your authenticator is on.');
  expect(screen.queryByLabelText('Setup key')).toBeNull();
});

test('replacement warns before proof and policy-disallowed disable stays absent', async () => {
  const user = userEvent.setup();
  backend(() => response({}), { ...account, capabilities: { ...account.capabilities, authenticator: { replace: true, disable: false } }, mfa: { status: 'on' } });
  await page(user, 'Two-factor authentication');
  expect(screen.queryByText('Turn off authenticator')).toBeNull();
  await user.click(screen.getByText('Replace authenticator'));
  expect(screen.getByText(/Verifying the new authenticator will invalidate your old authenticator/)).toBeTruthy();
  expect(fetch.mock.calls).toHaveLength(1);
});

test('recovery codes copy follows actual clipboard outcome and navigation requires disclosure confirmation', async () => {
  const user = userEvent.setup();
  const capable = { ...account, mfa: { status: 'on' }, capabilities: { ...account.capabilities, recovery_codes: { rotate: true } } };
  backend(path => response(path.endsWith('/verification') ? { state: 'verified', verification_id: 'proof' } : { state: 'codes_generated', codes: ['FICTIONAL-CODE-ONE', 'FICTIONAL-CODE-TWO'], account: { ...capable, recovery_codes: { status: 'available', remaining: 2 } } }), capable);
  await page(user, 'Recovery codes');
  await user.click(screen.getByText('Generate recovery codes'));
  await user.type(screen.getByLabelText('Current password'), 'current-fixture'); await user.click(screen.getByText('Continue'));
  expect(screen.getByLabelText('Your new recovery codes').value).toContain('FICTIONAL-CODE-ONE');
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce();
  await user.click(screen.getByText('Copy codes'));
  await screen.findByText("Couldn't copy the codes. Select and copy them manually.");
  expect(screen.queryByText('Codes copied.')).toBeNull();
  await user.click(screen.getByText('Copy codes')); await screen.findByText('Codes copied.');
  expect(clipboard).toHaveBeenLastCalledWith('FICTIONAL-CODE-ONE\nFICTIONAL-CODE-TWO');
  await user.click(screen.getByRole('button', { name: 'Password', exact: true }));
  await screen.findByRole('dialog', { name: 'Have you saved your recovery codes?' });
  await user.click(screen.getByText('Go back')); expect(screen.getByLabelText('Your new recovery codes')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Password', exact: true }));
  await user.click(screen.getByText('Close codes')); expect(screen.queryByLabelText('Your new recovery codes')).toBeNull();
});

test('MFA-off recovery link opens actual authenticator setting', async () => {
  const user = userEvent.setup(); backend(() => response({}));
  await page(user, 'Recovery codes');
  await user.click(screen.getByText('Set up authenticator'));
  expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeTruthy();
  expect(fetch.mock.calls).toHaveLength(1);
});
