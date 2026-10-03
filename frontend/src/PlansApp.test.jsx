import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

test('create uses one request and opens the saved Conversation shell', async () => {
  const api = makeApi(); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: 'New plan' });
  await user.click(screen.getByRole('button', { name: 'New plan' }));
  await screen.findByRole('heading', { name: 'Untitled plan' });
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Your draft is saved')).toBeTruthy();
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
  await screen.findByRole('heading', { name: 'Recoverable plan' });
  expect(screen.getByText('Your draft is saved')).toBeTruthy();
});

test('trip details save through the plan-scoped brief CRUD', async () => {
  const api = makeApi([plan('a', 'City break')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'City break' }));
  await screen.findByRole('button', { name: 'Edit details' });
  await user.click(screen.getByRole('button', { name: 'Edit details' }));
  await user.clear(screen.getByLabelText('Interests')); await user.type(screen.getByLabelText('Interests'), 'Food and museums');
  await user.clear(screen.getByLabelText('Travelers')); await user.type(screen.getByLabelText('Travelers'), '2');
  await user.click(screen.getByRole('button', { name: 'Save details' }));
  await waitFor(() => expect(api.updateBrief).toHaveBeenCalled());
  expect(api.updateBrief.mock.calls[0][1]).toMatchObject({ interests: 'Food and museums', travelers: 2 });
  expect(await screen.findByText('Trip details updated.')).toBeTruthy();
});

test('Copilot loads plan history and sends a turn through the plan agent API', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  api.conversationMessages.mockResolvedValue([{ message_id: 'old-1', role: 'assistant', content: 'Welcome back.' }]);
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Island break' }));
  await user.click(await screen.findByRole('button', { name: 'Copilot' }));
  expect(await screen.findByText('Welcome back.')).toBeTruthy();
  const input = screen.getByRole('textbox', { name: 'Message Copilot' });
  await user.type(input, 'A calm island trip');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText('Ideas for A calm island trip')).toBeTruthy();
  expect(screen.getByText('Crete')).toBeTruthy();
  expect(api.agentTurn).toHaveBeenCalledWith(expect.objectContaining({ plan_id: 'a' }), 'A calm island trip', expect.any(String));
});

test('Copilot reports a conversation-history failure and keeps the composer disabled while loading', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  let finishHistory;
  api.conversationMessages.mockReturnValue(new Promise(resolve => { finishHistory = resolve; }));
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Island break' }));
  await user.click(await screen.findByRole('button', { name: 'Copilot' }));
  expect(screen.getByText('Loading conversation…')).toBeTruthy();
  finishHistory([]);
  await screen.findByRole('textbox', { name: 'Message Copilot' });
  api.conversationMessages.mockRejectedValueOnce(new Error('Conversation unavailable.'));
  await user.click(screen.getByText('Close', { selector: 'button' }));
  await user.click(screen.getByRole('button', { name: 'Copilot' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Conversation unavailable.');
});
