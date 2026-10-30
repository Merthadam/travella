import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AccountApp } from './AccountApp';
import { PlansApp } from './PlansApp';

vi.mock('./features/plans/components/PlanningCanvas', () => ({ PlanningCanvas: ({ selected }) => <h1>{selected.title}</h1> }));
vi.mock('./features/plans/components/PlanConversation', () => ({ PlanConversation: ({ selected }) => <h1>{selected.title}</h1> }));
const id = '9f2d2f35-186c-4d57-a2fa-e5a7820f3783';
const planPath = `/plans/${id}`;
const plan = { plan_id: id, title: 'My saved journey', lifecycle: 'active', revision: 1, resume_target: 'workspace' };
const session = { state: 'signed_in', recovery_scope: 'a'.repeat(32) };
const profile = { exists: true, onboarding: { completed_version: 2 } };
const response = (status, body) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => { history.replaceState({}, '', planPath); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function expectPlanLoading() {
  expect(screen.getByRole('status').textContent).toBe('Opening plan…');
  expect(document.querySelector('.auth-access')).toBeNull();
  expect(document.querySelector('.plans-journal')).toBeNull();
  expect(screen.queryByText(plan.title)).toBeNull();
  expect(location.pathname).toBe(planPath);
}

test.each([planPath, `${planPath}/conversation`, '/plans/deleted'])('first render respects %s before effects run', path => {
  history.replaceState({}, '', path);
  const html = renderToString(<PlansApp api={{}} />);
  expect(html).not.toContain('YOUR NEXT CHAPTER');
  expect(html).not.toContain('>My plans<');
  if (path.endsWith('deleted')) expect(html).toContain('Recently deleted');
  else { expect(html).toContain('Opening plan…'); expect(html).not.toContain('plans-journal'); }
});

test('refresh keeps one public loading shell through session, profile and Plan reads', async () => {
  const pending = {};
  fetch.mockImplementation(path => new Promise(resolve => { pending[path] = resolve; }));
  render(<AccountApp />);
  expectPlanLoading();
  expect(fetch.mock.calls.map(([path]) => path)).toEqual(['/auth/session']);
  await act(async () => pending['/auth/session'](response(200, session)));
  expectPlanLoading();
  await act(async () => pending['/v1/traveler-profile'](response(200, profile)));
  expectPlanLoading();
  expect(fetch.mock.calls.some(([path]) => path === '/v1/plans?view=active')).toBe(false);
  await act(async () => pending[`/v1${planPath}?view=active`](response(200, plan)));
  expect(await screen.findByRole('heading', { name: plan.title })).toBeTruthy();
  expect(location.pathname).toBe(planPath);
});

test('silent refresh keeps the public shell until refreshed authentication succeeds', async () => {
  let finishRefresh, sessions = 0;
  fetch.mockImplementation(async path => {
    if (path === '/auth/session') return ++sessions === 1 ? response(401, { state: 'refresh_required' }) : response(200, session);
    if (path === '/auth/refresh') return new Promise(resolve => { finishRefresh = resolve; });
    if (path === '/v1/traveler-profile') return response(200, profile);
    return response(200, plan);
  });
  render(<AccountApp />);
  await waitFor(() => expect(finishRefresh).toBeTruthy());
  expectPlanLoading();
  await act(async () => finishRefresh(response(200, {})));
  expect(await screen.findByRole('heading', { name: plan.title })).toBeTruthy();
  expect(sessions).toBe(2);
});

test.each(['/auth/session', '/v1/traveler-profile'])('temporary failure at %s retries without showing login or changing the route', async failurePath => {
  let failed = true;
  fetch.mockImplementation(async path => {
    if (path === failurePath && failed) return response(503, {});
    if (path === '/auth/session') return response(200, session);
    if (path === '/v1/traveler-profile') return response(200, profile);
    return response(200, plan);
  });
  render(<AccountApp />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(document.querySelector('.auth-access')).toBeNull();
  expect(screen.queryByText(plan.title)).toBeNull();
  expect(location.pathname).toBe(planPath);
  failed = false;
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('heading', { name: plan.title })).toBeTruthy();
});

test('a confirmed signed-out session shows sign-in and preserves the requested Plan URL', async () => {
  let finish;
  fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AccountApp />);
  expectPlanLoading();
  await act(async () => finish(response(401, { message: 'Sign in required.' })));
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
  expect(screen.queryByText(plan.title)).toBeNull();
  expect(location.pathname).toBe(planPath);
  expect(fetch).toHaveBeenCalledTimes(1);
});
