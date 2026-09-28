import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountApp } from './AccountApp';

const response = (status, body) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => response(401, { message: 'Sign-in required.' })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function open() {
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Welcome back' });
  return userEvent.setup();
}

test('rejected sign-in stays private and clears the submitted password', async () => {
  const user = await open();
  fetch.mockImplementation(async () => response(401, { message: 'Check your details or reset your password.' }));
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  expect(screen.getByLabelText('Password').value).toBe('');
  expect(screen.getByLabelText('Email').value).toBe('ada@example.com');
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

test('registration submits all fields and waits for real verification', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => path === '/auth/register'
    ? response(200, { state: 'verify_email' })
    : response(400, { message: 'This code could not be used.' }));
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await user.type(screen.getByLabelText('First name'), 'Ada');
  await user.type(screen.getByLabelText('Last name'), 'Traveler');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await screen.findByRole('heading', { name: 'Verify your email' });
  const [, args] = fetch.mock.calls.find(([path]) => path === '/auth/register');
  expect(JSON.parse(args.body)).toEqual({ first_name: 'Ada', last_name: 'Traveler', email: 'ada@example.com', password: 'secret-password' });
  await user.type(screen.getByLabelText('Email verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  expect(screen.getByLabelText('Email verification code').value).toBe('');
});

test('MFA challenge must succeed before the server session opens My plans', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => response(200, {
    state: path === '/auth/sign-in' ? 'mfa_challenge' : 'signed_in',
  }));
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('heading', { name: 'Two-step verification' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  await user.type(screen.getByLabelText('Authenticator code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Welcome back' });
});

test('authenticated enrollment shows recovery codes once', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => {
    if (String(path).startsWith('/v1/plans')) return response(200, { plans: [] });
    if (path === '/auth/sign-in' || path === '/auth/session') return response(200, { state: 'signed_in' });
    if (path === '/auth/mfa/enrollment/start') return response(200, { state: 'mfa_enrollment', secret_code: 'JBSWY3DPEHPK3PXP' });
    if (path === '/auth/mfa/enrollment/verify') return response(200, { state: 'recovery_codes', codes: ['ABCD1234', 'EFGH5678'] });
    return response(401, { message: 'Sign-in required.' });
  });
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  await user.click(screen.getByRole('button', { name: 'Set up authenticator' }));
  await screen.findByRole('heading', { name: 'Set up an authenticator' });
  expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
  await user.type(screen.getByLabelText('Authenticator code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await screen.findByRole('heading', { name: 'Save your recovery codes' });
  expect(document.querySelector('.recovery-codes').textContent).toContain('ABCD1234');
  await user.click(screen.getByRole('button', { name: 'I saved my codes' }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(screen.queryByText('ABCD1234')).toBeNull();
});

test('recovery code requires authenticator replacement before sign-in', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => {
    if (String(path).startsWith('/v1/plans')) return response(200, { plans: [] });
    if (path === '/auth/sign-in') return response(200, { state: 'mfa_challenge' });
    if (path === '/auth/mfa/recovery') return response(200, { state: 'mfa_recovery_enrollment', secret_code: 'REPLACESECRET' });
    if (path === '/auth/mfa/recovery/verify') return response(200, { state: 'signed_in' });
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    return response(401, { message: 'Sign-in required.' });
  });
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('heading', { name: 'Two-step verification' });
  await user.click(screen.getByRole('button', { name: 'Use a recovery code' }));
  await user.type(screen.getByLabelText('Recovery code'), 'ABCD1234');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await screen.findByRole('heading', { name: 'Replace your authenticator' });
  expect(screen.getByText('REPLACESECRET')).toBeTruthy();
  await user.type(screen.getByLabelText('Authenticator code'), '654321');
  await user.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
});

test('expired access session silently refreshes before rendering private content', async () => {
  let refreshed = false;
  fetch.mockImplementation(async (path) => {
    if (path === '/auth/refresh') { refreshed = true; return response(200, { state: 'signed_in' }); }
    return refreshed ? response(200, { state: 'signed_in' }) : response(401, { state: 'refresh_required' });
  });
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'My plans' });
  expect(fetch.mock.calls.filter(([path]) => path === '/auth/refresh')).toHaveLength(1);
});

test('failed refresh returns to sign-in without private content', async () => {
  fetch.mockImplementation(async (path) => path === '/auth/refresh'
    ? response(401, { message: 'Sign-in required.' })
    : response(401, { state: 'refresh_required' }));
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
});

test('provider unavailable is surfaced without a false success', async () => {
  const user = await open();
  fetch.mockImplementation(async () => response(503, { message: 'Account access is not configured yet.' }));
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('not configured'));
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
});

test('password reset completes without opening a session', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => path === '/auth/forgot-password'
    ? response(200, { state: 'neutral_confirmation', message: 'Check your inbox.' })
    : path === '/auth/reset-password'
      ? response(200, { state: 'sign_in', message: 'Password updated.' })
      : response(401, { message: 'Sign-in required.' }));
  await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: 'Send instructions' }));
  await screen.findByRole('heading', { name: 'Check your inbox' });
  await user.click(screen.getByRole('button', { name: 'I have a reset code' }));
  await user.type(screen.getByLabelText('Password reset code'), '123456');
  await user.type(screen.getByLabelText('New password'), 'new-password');
  await user.click(screen.getByRole('button', { name: 'Update password' }));
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  const [, args] = fetch.mock.calls.find(([path]) => path === '/auth/reset-password');
  expect(JSON.parse(args.body)).toEqual({ email: 'ada@example.com', code: '123456', new_password: 'new-password' });
});
