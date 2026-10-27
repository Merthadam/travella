import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountApp } from './AccountApp';
import { writeCanvasView, readCanvasView } from './features/plans/canvasViewState';
const realSessionStorage = window.sessionStorage;

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
  await screen.findByRole('heading', { name: 'Welcome back.' });
  return userEvent.setup();
}

test('focus session expiry clears actual recovery before the next account signs in', async () => {
  vi.stubGlobal('sessionStorage', realSessionStorage); realSessionStorage.clear();
  let expired = false;
  fetch.mockImplementation(async path => {
    if (path === '/auth/session') return response(expired ? 401 : 200, expired ? {} : { state: 'signed_in', recovery_scope: 'a'.repeat(32) });
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding: { completed_version: 2 } });
    return response(200, { plans: [] });
  });
  render(<AccountApp/>); await screen.findByRole('heading', { name: 'My plans' });
  writeCanvasView('private-plan', { filter: 'previous owner' });
  expect(readCanvasView('private-plan').filter).toBe('previous owner');
  expired = true; window.dispatchEvent(new Event('focus'));
  await screen.findByRole('heading', { name: 'Welcome back.' });
  expect(readCanvasView('private-plan')).toEqual({});
  expect(Object.values(realSessionStorage).join('')).not.toContain('previous owner');
});

test('rejected sign-in stays private and clears the submitted password', async () => {
  const user = await open();
  fetch.mockImplementation(async () => response(401, { message: 'Check your details or reset your password.' }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  expect(screen.getByLabelText('Password').value).toBe('');
  expect(screen.getByLabelText('Email address').value).toBe('ada@example.com');
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

test('registration submits all fields and waits for real verification', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => path === '/auth/register'
    ? response(200, { state: 'verify_email' })
    : response(400, { message: 'This code could not be used.' }));
  await user.click(screen.getByRole('button', { name: 'Create an account' }));
  await user.type(screen.getByLabelText('First name'), 'Ada');
  await user.type(screen.getByLabelText('Last name'), 'Traveler');
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await screen.findByRole('heading', { name: 'Check your inbox.' });
  const [, args] = fetch.mock.calls.find(([path]) => path === '/auth/register');
  expect(JSON.parse(args.body)).toEqual({ first_name: 'Ada', last_name: 'Traveler', email: 'ada@example.com', password: 'secret-password' });
  await user.type(screen.getByLabelText('Email verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify & continue', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  expect(screen.getByLabelText('Email verification code').value).toBe('');
});

test('MFA challenge must succeed before the server session opens My plans', async () => {
  const user = await open();
  fetch.mockImplementation(async (path) => {
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding: { completed_version: 2 } });
    return response(200, { state: path === '/auth/sign-in' ? 'mfa_challenge' : 'signed_in' });
  });
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('heading', { name: 'One more step.' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  await user.type(screen.getByLabelText('Authenticator code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify & continue', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Welcome back.' });
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
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  await user.click(screen.getByRole('menuitem', { name: 'Account settings' }));
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
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding: { completed_version: 2 }, departure_base: '', citizenships: [], food_needs: '', accessibility_needs: '', travel_interests: '' });
    if (path === '/auth/sign-in') return response(200, { state: 'mfa_challenge' });
    if (path === '/auth/mfa/recovery') return response(200, { state: 'mfa_recovery_enrollment', secret_code: 'REPLACESECRET' });
    if (path === '/auth/mfa/recovery/verify') return response(200, { state: 'signed_in' });
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    return response(401, { message: 'Sign-in required.' });
  });
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('heading', { name: 'One more step.' });
  await user.click(screen.getByRole('button', { name: 'Use a recovery code' }));
  await user.type(screen.getByLabelText('Recovery code'), 'ABCD1234');
  await user.click(screen.getByRole('button', { name: 'Verify & continue', exact: true }));
  await screen.findByRole('heading', { name: 'Replace your authenticator.' });
  expect(screen.getByText('REPLACESECRET')).toBeTruthy();
  await user.type(screen.getByLabelText('Authenticator code'), '654321');
  await user.click(screen.getByRole('button', { name: 'Verify & continue', exact: true }));
  await screen.findByRole('heading', { name: 'My plans' });
});

test('expired access session silently refreshes before rendering private content', async () => {
  let refreshed = false;
  fetch.mockImplementation(async (path) => {
    if (path === '/auth/refresh') { refreshed = true; return response(200, { state: 'signed_in' }); }
    if (path === '/v1/traveler-profile') return response(200, { exists: true, onboarding: { completed_version: 2 }, departure_base: '', citizenships: [], food_needs: '', accessibility_needs: '', travel_interests: '' });
    return refreshed ? response(200, { state: 'signed_in' }) : response(401, { state: 'refresh_required' });
  });
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'My plans' });
  expect(fetch.mock.calls.filter(([path]) => path === '/auth/refresh')).toHaveLength(1);
});

test('first login resumes onboarding and saves preferences before opening Plans', async () => {
  const savedSteps = [];
  const profile = { exists: true, revision: 2, onboarding: { completed_version: 0, steps: { home: 'completed', citizenship: 'completed' } } };
  fetch.mockImplementation(async (path, args = {}) => {
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    if (path === '/v1/traveler-profile') return response(200, profile);
    if (path === '/v1/traveler-profile/onboarding') {
      const body = JSON.parse(args.body); savedSteps.push(body);
      return response(200, { ...profile, revision: 2 + savedSteps.length, food_needs: 'Vegetarian', onboarding: {
        completed_version: body.step === 'interests' ? 2 : 0,
        steps: { home: 'completed', citizenship: 'completed', needs: 'completed', ...(body.step === 'interests' ? { interests: 'skipped' } : {}) },
      } });
    }
    return response(200, { plans: [] });
  });
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Travel should fit you.' });
  await user.type(screen.getByLabelText('Any food allergies or dietary requirements?'), 'Vegetarian');
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'What makes you feel alive?' });
  await user.click(screen.getByRole('button', { name: 'Skip for now' }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(savedSteps[0]).toMatchObject({ step: 'needs', action: 'continue', expected_revision: 2, values: { food_needs: 'Vegetarian' } });
  expect(savedSteps[1]).toMatchObject({ step: 'interests', action: 'skip', expected_revision: 3, values: {} });
});

test('first login skip persists the remaining step before opening Plans', async () => {
  let savedStep;
  fetch.mockImplementation(async (path, args = {}) => {
    if (path === '/auth/session') return response(200, { state: 'signed_in' });
    if (path === '/v1/traveler-profile') return response(200, { exists: true, revision: 3,
      onboarding: { completed_version: 0, steps: { home: 'completed', citizenship: 'skipped', needs: 'skipped' } } });
    if (path === '/v1/traveler-profile/onboarding') {
      savedStep = JSON.parse(args.body);
      return response(200, { exists: true, revision: 4, onboarding: { completed_version: 2 } });
    }
    return response(200, { plans: [] });
  });
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'What makes you feel alive?' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Skip for now' }));
  await screen.findByRole('heading', { name: 'My plans' });
  expect(savedStep).toMatchObject({ step: 'interests', action: 'skip', values: {} });
});

test('failed refresh returns to sign-in without private content', async () => {
  fetch.mockImplementation(async (path) => path === '/auth/refresh'
    ? response(401, { message: 'Sign-in required.' })
    : response(401, { state: 'refresh_required' }));
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Welcome back.' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
});

test('provider unavailable is surfaced without a false success', async () => {
  const user = await open();
  fetch.mockImplementation(async () => response(503, { message: 'Account access is not configured yet.' }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
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
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: 'Send reset code' }));
  await screen.findByRole('heading', { name: 'Check your inbox.' });
  await user.click(screen.getByRole('button', { name: 'I have a reset code' }));
  await user.type(screen.getByLabelText('Password reset code'), '123456');
  await user.type(screen.getByLabelText('New password'), 'new-password');
  await user.click(screen.getByRole('button', { name: 'Update password' }));
  await screen.findByRole('heading', { name: 'Welcome back.' });
  expect(screen.queryByRole('heading', { name: 'My plans' })).toBeNull();
  const [, args] = fetch.mock.calls.find(([path]) => path === '/auth/reset-password');
  expect(JSON.parse(args.body)).toEqual({ email: 'ada@example.com', code: '123456', new_password: 'new-password' });
});

test('failed sign-in exposes verification in context, retains email, and supports resend and editing', async () => {
  const user = await open();
  expect(screen.queryByRole('button', { name: 'Verify your email' })).toBeNull();
  fetch.mockImplementation(async path => path === '/auth/sign-in'
    ? response(401, { message: 'Check your details or reset your password.' })
    : response(200, { message: 'If eligible, a code is on its way.' }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await user.click(await screen.findByRole('button', { name: 'Verify your email' }));
  expect(screen.queryByLabelText('Email address')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Resend code' }));
  await screen.findByRole('status');
  expect(JSON.parse(fetch.mock.calls.find(([path]) => path === '/auth/resend-verification')[1].body)).toEqual({ email: 'ada@example.com' });
  await user.click(screen.getByRole('button', { name: 'Use a different email' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Email address'));
  await user.type(screen.getByLabelText('Email address'), 'other@example.com');
  await user.type(screen.getByLabelText('Email verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify & continue' }));
  await screen.findByRole('heading', { name: 'Your email is verified.' });
  expect(JSON.parse(fetch.mock.calls.find(([path]) => path === '/auth/verify-email')[1].body)).toEqual({ email: 'other@example.com', code: '123456' });
  await user.click(screen.getByRole('button', { name: 'Continue to sign in' }));
  expect(screen.getByLabelText('Email address').value).toBe('other@example.com');
  expect(screen.getByLabelText('Password').value).toBe('');
});

test('pending sign-in prevents duplicate submission and navigation while retaining theme controls', async () => {
  const user = await open();
  let finish;
  fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  expect(screen.getByRole('button', { name: 'Please wait…' }).matches(':disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Forgot password?' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Create an account' }).disabled).toBe(true);
  expect(screen.getByLabelText('Password').value).toBe('');
  await user.click(screen.getByRole('button', { name: 'Switch to night mode' }));
  expect(document.querySelector('.auth-access').dataset.authTheme).toBe('dark');
  finish(response(503, { message: 'Try again later.' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Sign in', exact: true }).disabled).toBe(false);
  expect(fetch.mock.calls.filter(([path]) => path === '/auth/sign-in')).toHaveLength(1);
});

test('server field errors stay associated with the field and clear on correction', async () => {
  const user = await open();
  fetch.mockImplementation(async () => response(422, { message: 'Check your email address.', fields: ['email'] }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Email address').getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByLabelText('Email address').getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  await user.type(screen.getByLabelText('Email address'), 'x');
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
  await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(screen.getByLabelText('Password').value).toBe('');
});

test('a rejected retained email becomes editable throughout correction', async () => {
  const user = await open();
  fetch.mockImplementation(async path => path === '/auth/sign-in'
    ? response(401, { message: 'Check your details.' })
    : response(422, { message: 'Check your email.', fields: ['email'] }));
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await user.click(await screen.findByRole('button', { name: 'Verify your email' }));
  expect(screen.queryByLabelText('Email address')).toBeNull();
  await user.type(screen.getByLabelText('Email verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify & continue' }));
  const email = await screen.findByLabelText('Email address');
  await user.clear(email);
  await user.type(email, 'updated@example.com');
  expect(screen.getByLabelText('Email address').value).toBe('updated@example.com');
});
