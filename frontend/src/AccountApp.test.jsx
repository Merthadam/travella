import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountApp } from './AccountApp';

const response = (status, body) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  history.replaceState(null, '', '/');
  vi.stubGlobal('fetch', vi.fn(async () => response(401, { message: 'Sign-in required.' })));
  vi.stubGlobal('localStorage', { length: 0 });
  vi.stubGlobal('sessionStorage', { length: 0 });
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
  fetch.mockImplementation(async (path) => {
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding_complete: true });
    return response(200, { state: path === '/auth/sign-in' ? 'mfa_challenge' : 'signed_in' });
  });
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

test('Account opens preferences without enrollment and returns to the mounted Plans view', async () => {
  const user = userEvent.setup();
  history.replaceState(null, '', '/plans');
  fetch.mockImplementation(async path => response(200, path === '/v1/traveler-profile'
    ? { exists: true, revision: 1, onboarding: { completed_version: 2 }, food_needs: '', accessibility_needs: '' }
    : { plans: [] }));
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'My plans' });
  const originalPlans = document.querySelector('.plans-app');
  await user.click(screen.getByRole('button', { name: 'Account', exact: true }));
  await screen.findByRole('heading', { name: 'Account & preferences' });
  expect(location.pathname).toBe('/account');
  expect(originalPlans.parentElement.hidden).toBe(true);
  expect(originalPlans.parentElement.hasAttribute('inert')).toBe(true);
  expect(fetch.mock.calls.some(([path]) => path.includes('/mfa/enrollment'))).toBe(false);
  await user.click(screen.getByRole('button', { name: 'My plans', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(document.querySelector('.plans-app')).toBe(originalPlans);
  expect(location.pathname).toBe('/plans');
});

test('direct account entry waits for session and profile bootstrap', async () => {
  history.replaceState(null, '', '/account');
  let sessionReady;
  fetch.mockImplementation(path => path === '/auth/session' ? new Promise(resolve => { sessionReady = resolve; })
    : Promise.resolve(response(200, { exists: true, revision: 1, onboarding: { completed_version: 2 } })));
  render(<AccountApp />);
  expect(screen.queryByRole('heading', { name: 'Account & preferences' })).toBeNull();
  sessionReady(response(200, { state: 'signed_in' }));
  await screen.findByRole('heading', { name: 'Account & preferences' });
  expect(fetch.mock.calls.filter(([path]) => path === '/v1/traveler-profile')).toHaveLength(1);
});

test('recovery code requires authenticator replacement before sign-in', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => {
    if (String(path).startsWith('/v1/plans')) return response(200, { plans: [] });
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding_complete: true, departure_base: '', citizenships: [], food_needs: '', accessibility_needs: '', travel_interests: '' });
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
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding_complete: true, departure_base: '', citizenships: [], food_needs: '', accessibility_needs: '', travel_interests: '' });
    return refreshed ? response(200, { state: 'signed_in' }) : response(401, { state: 'refresh_required' });
  });
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'My plans' });
  expect(fetch.mock.calls.filter(([path]) => path === '/auth/refresh')).toHaveLength(1);
});

test('first login collects, reviews, and explicitly saves reusable travel details before Plans', async () => {
  let intakeCalls = 0;
  let savedProfile;
  fetch.mockImplementation(async (path, args = {}) => {
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    if (path === '/v1/traveler-profile' && args.method === 'GET') return response(200, { exists: false, onboarding_complete: false });
    if (path === '/v1/agent/onboarding/events') {
      intakeCalls++;
      return response(200, intakeCalls === 1
        ? { action: 'ask', assistant_text: 'Where do you usually set off from?', answer_candidates: [] }
        : { action: 'candidate', assistant_text: 'Any food allergies I should know about?', answer_candidates: [{ topic: 'departure_base', value: 'Budapest', source_quote: 'Budapest' }] });
    }
    if (path === '/v1/traveler-profile' && args.method === 'PUT') {
      savedProfile = JSON.parse(args.body);
      return response(200, { exists: true, ...savedProfile });
    }
    if (String(path).startsWith('/v1/plans')) return response(200, { plans: [] });
    return response(401, { message: 'Sign-in required.' });
  });
  const user = userEvent.setup();
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'A few details for better trip plans' });
  await screen.findByText('Where do you usually set off from?');
  await user.type(screen.getByLabelText('Your answer'), 'Budapest');
  await user.click(screen.getByRole('button', { name: 'Send answer' }));
  await screen.findByText('Any food allergies I should know about?');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Review and continue' }));
  expect(screen.getByLabelText('Usual departure city or airport').value).toBe('Budapest');
  await user.click(screen.getByRole('button', { name: 'Save profile and continue' }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(savedProfile).toMatchObject({ departure_base: 'Budapest', onboarding_complete: true });
  expect(savedProfile).not.toHaveProperty('home_address');
});

test('first login skip persists completion with an empty profile', async () => {
  let savedProfile;
  fetch.mockImplementation(async (path, args = {}) => {
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    if (path === '/v1/traveler-profile' && args.method === 'GET') return response(200, { exists: false, onboarding_complete: false });
    if (path === '/v1/agent/onboarding/events') return response(200, { action: 'ask', assistant_text: 'Where do you usually set off from?', answer_candidates: [] });
    if (path === '/v1/traveler-profile' && args.method === 'PUT') {
      savedProfile = JSON.parse(args.body);
      return response(200, { exists: true, ...savedProfile });
    }
    if (String(path).startsWith('/v1/plans')) return response(200, { plans: [] });
    return response(401, { message: 'Sign-in required.' });
  });
  const user = userEvent.setup();
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'A few details for better trip plans' });
  await user.click(await screen.findByRole('button', { name: 'Review and continue' }));
  await user.click(screen.getByRole('button', { name: 'Skip and continue' }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(savedProfile).toMatchObject({ departure_base: '', citizenships: [], food_needs: '', onboarding_complete: true });
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
