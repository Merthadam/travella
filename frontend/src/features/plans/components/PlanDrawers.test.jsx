import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanDrawer } from './PlanDrawers';

const today = new Date().toISOString();
const sample = (id, title, time = today) => ({ plan_id: id, title, destination_summary: id === 'one' ? 'Lisbon' : null, last_activity_at: time, revision: 3, lifecycle: 'active' });
function setup(overrides = {}) {
  const plans = [sample('one', 'Lisbon weekend'), sample('two', 'Kyoto autumn', '2025-01-01T00:00:00Z')];
  const api = { prepare: vi.fn(async (plan, operation, title) => ({ challenge: 'confirmed', title })), commit: vi.fn(async ({ plan, title, operation }) => ({ ...plan, title: operation === 'rename' ? title : plan.title, lifecycle: operation === 'delete' ? 'deleted' : 'active', revision: plan.revision + 1 })), get: vi.fn(async () => ({ ...plans[0], title: 'Latest name', revision: 4 })) };
  const props = { plans, selected: plans[0], loading: false, api, onExpired: vi.fn(), onDone: vi.fn(), onRetry: vi.fn(), onLoadMore: vi.fn(), onClose: vi.fn(), onOpen: vi.fn(), onNew: vi.fn(), onLockedChange: vi.fn(), closeRef: React.createRef(), drawerRef: React.createRef(), ...overrides };
  const result = render(<PlanDrawer {...props} />);
  return { ...result, props, api, user: userEvent.setup() };
}
afterEach(cleanup);

test('double-click edits before navigation; cancel and keyboard activation preserve explicit intent', async () => {
  const { user, props } = setup();
  await user.dblClick(screen.getByText('Lisbon weekend'));
  expect(screen.getByRole('textbox', { name: 'Plan name' }).value).toBe('Lisbon weekend');
  await new Promise(resolve => setTimeout(resolve, 550));
  expect(props.onOpen).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  expect(props.api.prepare).not.toHaveBeenCalled();
  const link = screen.getByRole('link', { name: /Lisbon weekend/ });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('link', { name: /Lisbon weekend/ })));
  await user.keyboard('{F2}');
  expect(screen.getByRole('textbox', { name: 'Plan name' })).toBeTruthy();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('link', { name: /Lisbon weekend/ })));
  await user.keyboard('{Enter}');
  expect(props.onOpen).toHaveBeenCalledWith(expect.anything(), 'one');
});

test('single mouse click opens a plan after the double-click interval', async () => {
  const { user, props } = setup();
  await user.click(screen.getByRole('link', { name: /Kyoto autumn/ }));
  await waitFor(() => expect(props.onOpen).toHaveBeenCalledWith(expect.anything(), 'two'));
});

test('inline rename validates and commits the normalized exact name only on Enter', async () => {
  const { user, api, props } = setup();
  await user.dblClick(screen.getByText('Lisbon weekend'));
  const input = screen.getByRole('textbox', { name: 'Plan name' });
  await user.clear(input); await user.keyboard('{Enter}');
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Enter a plan name.');
  expect(api.prepare).not.toHaveBeenCalled();
  await user.type(input, '  Cafe\u0301 break  ');
  expect(api.commit).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(props.onDone).toHaveBeenCalled());
  expect(api.prepare).toHaveBeenCalledWith(props.plans[0], 'rename', 'Café break');
  expect(api.commit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Café break', challenge: 'confirmed', operation: 'rename' }));
});

test('trash requires confirmation and preserves the exact request on uncertain retry', async () => {
  const { user, api, props } = setup();
  await user.click(screen.getByRole('button', { name: 'Delete Lisbon weekend' }));
  expect(api.prepare).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Keep plan' }));
  expect(api.commit).not.toHaveBeenCalled();
  api.commit.mockRejectedValueOnce(Object.assign(new Error('Connection lost'), { status: 0 }));
  await user.click(screen.getByRole('button', { name: 'Delete Lisbon weekend' }));
  await user.click(screen.getByRole('button', { name: 'Delete plan' }));
  await screen.findByRole('button', { name: 'Retry' });
  expect(screen.getByRole('button', { name: 'Keep plan' }).disabled).toBe(true);
  expect(screen.getAllByRole('button', { name: 'Close plans navigation' }).every(button => button.disabled)).toBe(true);
  await user.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(props.onDone).toHaveBeenCalled());
  expect(api.prepare).toHaveBeenCalledTimes(1);
  expect(api.commit.mock.calls[1][0]).toEqual(api.commit.mock.calls[0][0]);
});

test('revision conflict shows latest title and requires a new confirmation', async () => {
  const { user, api } = setup();
  api.commit.mockRejectedValueOnce(Object.assign(new Error('Conflict'), { status: 409 }));
  await user.dblClick(screen.getByText('Lisbon weekend'));
  await user.clear(screen.getByRole('textbox', { name: 'Plan name' }));
  await user.type(screen.getByRole('textbox', { name: 'Plan name' }), 'My new title{Enter}');
  await screen.findByText('Latest saved name: Latest name');
  expect(api.commit).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Save name' }));
  expect(api.prepare.mock.calls[1][0].revision).toBe(4);
  expect(api.commit.mock.calls[1][0].id).not.toBe(api.commit.mock.calls[0][0].id);
});

test('search, date groups, pagination and loading errors remain usable', async () => {
  const { user, props, rerender } = setup({ hasMore: true });
  expect(within(screen.getByRole('region', { name: 'Today' })).getByText('Lisbon weekend')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Earlier' })).getByText('Kyoto autumn')).toBeTruthy();
  await user.type(screen.getByRole('searchbox', { name: 'Find a plan' }), 'Lisbon');
  expect(screen.queryByText('Kyoto autumn')).toBeNull();
  await user.clear(screen.getByRole('searchbox')); await user.type(screen.getByRole('searchbox'), 'No match');
  expect(screen.getByText('No matching plans.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Load more plans' }));
  expect(props.onLoadMore).toHaveBeenCalled();
  rerender(<PlanDrawer {...props} error="Plans could not be loaded." />);
  await user.click(screen.getByRole('button', { name: 'Retry loading plans' }));
  expect(props.onRetry).toHaveBeenCalled();
});

test('expired authentication and unavailable plans never appear saved', async () => {
  const { user, api, props } = setup();
  api.prepare.mockRejectedValueOnce(Object.assign(new Error('expired'), { status: 401 }));
  await user.click(screen.getByRole('button', { name: 'Delete Kyoto autumn' }));
  await user.click(screen.getByRole('button', { name: 'Delete plan' }));
  await waitFor(() => expect(props.onExpired).toHaveBeenCalled());
  expect(props.onDone).not.toHaveBeenCalled();
  api.prepare.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }));
  await user.click(screen.getByRole('button', { name: 'Delete plan' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Delete plan' }).disabled).toBe(true);
});
