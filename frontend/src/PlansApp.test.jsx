import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlansApp } from './PlansApp';

const plan = (id, title, revision = 1, lifecycle = 'active') => ({
  plan_id: id, title, revision, lifecycle, title_source: 'automatic',
  destination_summary: null, last_activity_at: '2026-09-28T10:00:00Z',
  recovery_deadline: lifecycle === 'deleted' ? '2026-10-05T10:00:00Z' : null,
  conversation: { conversation_id: `conversation-${id}`, plan_id: id }, resume_target: 'conversation',
});

function makeApi(initial = []) {
  let plans = [...initial];
  return {
    list: vi.fn(async view => ({ plans: plans.filter(item => item.lifecycle === (view === 'deleted' ? 'deleted' : 'active')), next_cursor: null })),
    get: vi.fn(async id => plans.find(item => item.plan_id === id) || Promise.reject(Object.assign(new Error('missing'), { status: 404 }))),
    create: vi.fn(async () => { const created = plan(`new-${plans.length}`, 'Untitled plan'); plans = [...plans, created]; return created; }),
    activity: vi.fn(async item => ({ ...item, revision: item.revision + 1 })),
    conversationMessages: vi.fn(async () => []),
    agentTurn: vi.fn(async (item, message, eventId) => ({ status: 'shortlist_ready', plan_id: item.plan_id, event_id: eventId, assistant_text: `Ideas for ${message}`, candidates: [{ candidate_id: 'crete', name: 'Crete', summary: 'A relaxed island stay' }] })),
    agentTurnStream: vi.fn(async (item, message, eventId, { onEvent }) => {
      onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: `Ideas for ${message}` });
      onEvent({ type: 'TERMINAL', status: 'complete' });
      return { status: 'complete', event_id: eventId };
    }),
    brief: vi.fn(async item => ({ plan_id: item.plan_id, revision: item.revision, interests: '', start_date: '', end_date: '', travelers: 1, budget: '', transport_tolerance: '', accessibility_needs: '' })),
    updateBrief: vi.fn(async (item, data) => ({ plan_id: item.plan_id, revision: item.revision + 1, ...data })),
    prepare: vi.fn(async (item, operation, title) => ({ challenge: 'challenge', operation, revision: item.revision, title })),
    commit: vi.fn(async ({ plan: item, operation, title }) => {
      const updated = { ...item, revision: item.revision + 1, ...(operation === 'rename' ? { title, title_source: 'manual' } : {}), ...(operation === 'delete' ? { lifecycle: 'deleted', recovery_deadline: '2026-10-05T10:00:00Z' } : {}), ...(operation === 'restore' ? { lifecycle: 'active', recovery_deadline: null } : {}) };
      plans = plans.map(current => current.plan_id === item.plan_id ? updated : current);
      return updated;
    }),
  };
}

beforeEach(() => { window.history.pushState({}, '', '/plans'); HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; }; });
afterEach(() => cleanup());

test('renders backend order and the empty active state', async () => {
  const api = makeApi([plan('a', 'Later activity'), plan('b', 'Earlier activity')]);
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('link', { name: 'Later activity' });
  expect(screen.getAllByRole('link').map(link => link.textContent)).toContain('Later activity');
  expect(screen.queryByText('No plans yet')).toBeNull();
  const emptyApi = makeApi();
  cleanup(); render(<PlansApp api={emptyApi} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  expect(await screen.findByText('No plans yet')).toBeTruthy();
});

test('create uses one request and opens the saved Plan chat', async () => {
  const api = makeApi(); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: 'New plan' });
  await user.click(screen.getByRole('button', { name: 'New plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Untitled plan')).toBeTruthy();
});

test('rename validates exact title and keeps the normalized value', async () => {
  const api = makeApi([plan('a', 'Untitled plan')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: /Rename Untitled plan/ });
  await user.click(screen.getByRole('button', { name: /Rename Untitled plan/ }));
  const input = screen.getByLabelText('Plan name'); await user.clear(input); await user.type(input, '  Cafe\u0301  ');
  await user.click(screen.getByRole('button', { name: 'Apply name' }));
  await waitFor(() => expect(api.commit).toHaveBeenCalled());
  expect(api.commit.mock.calls[0][0].title).toBe('Café');
  expect(await screen.findByText('Plan name updated.')).toBeTruthy();
});

test('delete and restore preserve the authoritative lifecycle', async () => {
  const api = makeApi([plan('a', 'Recoverable plan')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: /Delete Recoverable plan/ });
  await user.click(screen.getByRole('button', { name: /Delete Recoverable plan/ }));
  await user.click(screen.getByRole('button', { name: 'Delete plan' }));
  await screen.findByText('No plans yet');
  await user.click(screen.getByRole('link', { name: /View recently deleted/ }));
  await screen.findByRole('button', { name: /Restore plan Recoverable plan/ });
  await user.click(screen.getByRole('button', { name: /Restore plan Recoverable plan/ }));
  await user.click(screen.getByRole('button', { name: 'Restore plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  expect(screen.getByText('Recoverable plan')).toBeTruthy();
});

test('opening a Plan goes straight to full-page chat and streams a reply', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  api.conversationMessages.mockResolvedValue([{ message_id: 'old-1', role: 'assistant', content: 'Welcome back.', status: 'complete' }]);
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Island break' }));
  expect(await screen.findByText('Welcome back.')).toBeTruthy();
  expect(window.location.pathname).toBe('/plans/a');
  expect(screen.queryByRole('button', { name: 'Conversation' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Travella' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Application navigation' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Plans' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Select plan: Island break' })).toBeTruthy();
  const input = screen.getByRole('textbox', { name: 'Message Travella' });
  await user.type(input, 'A calm island trip');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText('Ideas for A calm island trip')).toBeTruthy();
  expect(screen.queryByText('Crete')).toBeNull();
  expect(api.agentTurnStream).toHaveBeenCalledWith(expect.objectContaining({ plan_id: 'a' }), 'A calm island trip', expect.any(String), expect.objectContaining({ signal: expect.any(AbortSignal), onEvent: expect.any(Function) }));
});

test('Plans drawer switches directly to another Plan chat', async () => {
  const api = makeApi([plan('a', 'First plan'), plan('b', 'Second plan')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'First plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  await user.click(screen.getByRole('button', { name: 'Select plan: First plan' }));
  expect(await screen.findByRole('complementary', { name: 'Your plans' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Plans', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Plans', exact: true }));
  const drawer = screen.getByRole('complementary', { name: 'Your plans' });
  await user.click(await within(drawer).findByRole('link', { name: /Second plan/ }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  expect(window.location.pathname).toBe('/plans/b');
  expect(screen.getByText('Second plan')).toBeTruthy();
});

test('Copilot reports a conversation-history failure and keeps the composer disabled while loading', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  let finishHistory;
  api.conversationMessages.mockReturnValue(new Promise((resolve, reject) => { finishHistory = { resolve, reject }; }));
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Island break' }));
  expect(screen.getByText('Loading conversation…')).toBeTruthy();
  finishHistory.reject(new Error('Conversation unavailable.'));
  expect((await screen.findByRole('alert')).textContent).toBe('Conversation unavailable.');
});

test('legacy conversation URL continues to load the Plan chat', async () => {
  const id = '00000000-0000-0000-0000-000000000124';
  const api = makeApi([plan(id, 'Legacy chat')]);
  api.conversationMessages.mockResolvedValue([{ message_id: 'saved-2', role: 'user', content: 'Italy', status: 'complete' }]);
  window.history.pushState({}, '', `/plans/${id}/conversation`);
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  expect(await screen.findByText('Italy')).toBeTruthy();
  expect(window.location.pathname).toBe(`/plans/${id}`);
});

test('direct Plan conversation URL loads the same Plan transcript', async () => {
  const id = '00000000-0000-0000-0000-000000000123';
  const api = makeApi([plan(id, 'Direct chat')]);
  api.conversationMessages.mockResolvedValue([{ message_id: 'saved-1', role: 'user', content: 'Japan', status: 'complete' }]);
  window.history.pushState({}, '', `/plans/${id}`);
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  expect(await screen.findByText('Japan')).toBeTruthy();
  expect(api.conversationMessages).toHaveBeenCalledWith({ plan_id: id });
});
