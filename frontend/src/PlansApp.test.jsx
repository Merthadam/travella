import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
    researchContext: vi.fn(async () => ({})),
    researchOffer: vi.fn(async () => ({ readiness: { eligible: false, reasons: ['destination_required'] }, offer: null, deferred: false })),
    agentTurnStream: vi.fn(async (item, message, eventId, { onEvent }) => {
      onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: `Ideas for ${message}` });
      onEvent({ type: 'TERMINAL', status: 'complete' });
      return { status: 'complete', event_id: eventId };
    }),
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
  expect(screen.getAllByRole('article')[0].textContent).toContain('Later activity');
  expect(screen.queryByText('No plans yet')).toBeNull();
  const emptyApi = makeApi();
  cleanup(); render(<PlansApp api={emptyApi} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  expect(await screen.findByText('No plans yet')).toBeTruthy();
});

test('account suspension preserves the selected Plan and its unsent composer', async () => {
  const id = '9f2d2f35-186c-4d57-a2fa-e5a7820f3783';
  const api = { ...makeApi([plan(id, 'Kyoto trip')]), researchContext: vi.fn(async () => ({})) };
  const props = { api, onExpired: vi.fn(), onSignOut: vi.fn(), onAccount: vi.fn() };
  const user = userEvent.setup(); const view = render(<PlansApp {...props} />);
  await user.click(await screen.findByRole('link', { name: 'Kyoto trip' }));
  const composer = await screen.findByRole('textbox', { name: 'Message Travella' });
  await user.type(composer, 'Unsent question');
  const getCount = api.get.mock.calls.length;
  history.pushState({}, '', '/account');
  view.rerender(<PlansApp {...props} inactive />);
  expect(screen.queryByRole('button', { name: /^Trip brief,/ })).toBeNull();
  window.dispatchEvent(new PopStateEvent('popstate'));
  expect(api.get).toHaveBeenCalledTimes(getCount);
  history.pushState({}, '', `/plans/${id}`);
  view.rerender(<PlansApp {...props} inactive={false} />);
  expect(screen.getByRole('textbox', { name: 'Message Travella' }).value).toBe('Unsent question');
  expect(screen.getByRole('button', { name: /^Trip brief,/ })).toBeTruthy();
  expect(api.get).toHaveBeenCalledTimes(getCount);
});

test('create uses one request and opens the saved Plan chat', async () => {
  const api = makeApi(); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: 'New plan' });
  await user.click(screen.getByRole('button', { name: 'New plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe('/plans/new-0');
  await user.click(screen.getByRole('button', { name: 'Open plans navigation' }));
  const drawer = await screen.findByRole('dialog', { name: 'Your plans' });
  expect(await within(drawer).findByRole('link', { name: /Untitled plan/ })).toBeTruthy();
});

test('rename validates exact title and keeps the normalized value', async () => {
  const api = makeApi([plan('a', 'Untitled plan')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: /Rename Untitled plan/ });
  await user.click(screen.getByRole('button', { name: /Rename Untitled plan/ }));
  const input = screen.getByLabelText('Plan name'); await user.clear(input); await user.type(input, '  Cafe\u0301  ');
  await user.keyboard('{Enter}');
  await waitFor(() => expect(api.commit).toHaveBeenCalled());
  expect(api.commit.mock.calls[0][0].title).toBe('Café');
  expect(await screen.findByText('Plan name updated to Café.')).toBeTruthy();
});

test('delete and restore preserve the authoritative lifecycle', async () => {
  const api = makeApi([plan('a', 'Recoverable plan')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: /Delete Recoverable plan/ });
  await user.click(screen.getByRole('button', { name: /Delete Recoverable plan/ }));
  await screen.findByText('No plans yet');
  await user.click(screen.getByRole('link', { name: /View recently deleted/ }));
  await screen.findByRole('button', { name: /Restore plan Recoverable plan/ });
  await user.click(screen.getByRole('button', { name: /Restore plan Recoverable plan/ }));
  await user.click(screen.getByRole('button', { name: 'Restore plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  expect(window.location.pathname).toBe('/plans/a');
  await user.click(screen.getByRole('button', { name: 'Open plans navigation' }));
  const drawer = await screen.findByRole('dialog', { name: 'Your plans' });
  expect(await within(drawer).findByRole('link', { name: /Recoverable plan/ })).toBeTruthy();
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
  expect(screen.queryByRole('button', { name: 'Plans' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Select plan: Island break' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Open plans navigation' })).toBeTruthy();
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
  await user.click(screen.getByRole('button', { name: 'Open plans navigation' }));
  expect(await screen.findByRole('dialog', { name: 'Your plans' })).toBeTruthy();
  const drawer = screen.getByRole('dialog', { name: 'Your plans' });
  await user.click(await within(drawer).findByRole('link', { name: /Second plan/ }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  await waitFor(() => expect(window.location.pathname).toBe('/plans/b'));
  await user.click(screen.getByRole('button', { name: 'Open plans navigation' }));
  const reopenedDrawer = await screen.findByRole('dialog', { name: 'Your plans' });
  const activePlan = await within(reopenedDrawer).findByRole('link', { name: /Second plan/ });
  expect(activePlan.className).toContain('current');
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


test('renaming and deleting another plan in the drawer keeps the current conversation', async () => {
  const api = makeApi([plan('a', 'Current plan'), plan('b', 'Other plan')]);
  const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Current plan' }));
  await screen.findByRole('textbox', { name: 'Message Travella' });
  await user.click(screen.getByRole('button', { name: 'Open plans navigation' }));
  const drawer = await screen.findByRole('dialog', { name: 'Your plans' });
  await user.dblClick(await within(drawer).findByText('Other plan'));
  await user.clear(within(drawer).getByRole('textbox', { name: 'Plan name' }));
  await user.type(within(drawer).getByRole('textbox', { name: 'Plan name' }), 'Renamed other{Enter}');
  await within(drawer).findByRole('link', { name: /Renamed other/ });
  expect(location.pathname).toBe('/plans/a');
  await user.click(within(drawer).getByRole('button', { name: 'Delete Renamed other' }));
  await user.click(within(drawer).getByRole('button', { name: 'Delete plan' }));
  await waitFor(() => expect(within(drawer).queryByText('Renamed other')).toBeNull());
  expect(location.pathname).toBe('/plans/a');
  expect(within(drawer).getByRole('link', { name: /Current plan/ }).getAttribute('aria-current')).toBe('page');
});


test('inline rename cancels without writing and rejects an empty name', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Rename Island break' }));
  const input = screen.getByLabelText('Plan name');
  await user.clear(input); await user.keyboard('{Enter}');
  expect(api.prepare).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toMatch(/name|title/i);
  await user.type(input, 'Changed'); await user.keyboard('{Escape}');
  expect(screen.queryByLabelText('Plan name')).toBeNull();
  expect(api.commit).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Island break' })).toBe(document.activeElement));
});

test('inline name retries an uncertain commit with the same request and title', async () => {
  const api = makeApi([plan('a', 'Island break')]); const commit = api.commit;
  api.commit = vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockImplementation(commit);
  const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Rename Island break' }));
  await user.clear(screen.getByLabelText('Plan name')); await user.type(screen.getByLabelText('Plan name'), 'Our trip{Enter}');
  await screen.findByRole('button', { name: 'Retry saving' });
  expect(screen.getByLabelText('Plan name').readOnly).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Retry saving' }));
  await screen.findByRole('button', { name: 'Rename Our trip' });
  expect(api.prepare).toHaveBeenCalledTimes(1);
  expect(api.commit.mock.calls[0][0]).toEqual(api.commit.mock.calls[1][0]);
});

test('journal filters authoritative stages and searches loaded titles', async () => {
  const api = makeApi([plan('a', 'Forest idea'), { ...plan('b', 'Lisbon days'), planning_stage: 'canvas', destination_summary: 'Lisbon', saved_places_count: 3 }]);
  const user = userEvent.setup(); render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: 'Rename Forest idea' });
  await user.click(screen.getByRole('button', { name: 'Canvas' }));
  expect(screen.queryByRole('button', { name: 'Rename Forest idea' })).toBeNull();
  expect(screen.getByText('3 places saved')).toBeTruthy();
  await user.type(screen.getByLabelText('Find a trip'), 'missing');
  expect(screen.getByText('No trips here just yet.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Show all plans' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);
});


test('renaming an ordinary card keeps its position and restores focus to its title', async () => {
  const api = makeApi([plan('a', 'Featured trip'), plan('b', 'Second trip')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Rename Second trip' }));
  await user.clear(screen.getByLabelText('Plan name')); await user.type(screen.getByLabelText('Plan name'), 'Renamed trip{Enter}');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Renamed trip' })).toBe(document.activeElement));
  const cards = screen.getAllByRole('article');
  expect(cards[0].textContent).toContain('Featured trip');
  expect(cards[1].textContent).toContain('Renamed trip');
  expect(screen.getByText('Plan name updated to Renamed trip.').className).toContain('sr-only');
});

test('unchanged Enter and clicking away cancel without writes or stealing focus', async () => {
  const api = makeApi([plan('a', 'Island break')]); const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Rename Island break' }));
  await user.keyboard('{Enter}');
  expect(screen.queryByLabelText('Plan name')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Rename Island break' }));
  await user.clear(screen.getByLabelText('Plan name')); await user.type(screen.getByLabelText('Plan name'), 'Unsubmitted');
  const search = screen.getByLabelText('Find a trip'); await user.click(search);
  expect(screen.queryByLabelText('Plan name')).toBeNull(); expect(document.activeElement).toBe(search);
  expect(api.prepare).not.toHaveBeenCalled(); expect(api.commit).not.toHaveBeenCalled();
});

test('saving retains field focus and a filtered renamed card stays visible until search changes', async () => {
  const api = makeApi([plan('a', 'Island break')]); let finish;
  api.prepare.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup(); render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await screen.findByRole('button', { name: 'Rename Island break' });
  await user.type(screen.getByLabelText('Find a trip'), 'Island');
  await user.click(screen.getByRole('button', { name: 'Rename Island break' }));
  const field = screen.getByLabelText('Plan name'); await user.clear(field); await user.type(field, 'Forest holiday{Enter}');
  expect(field.readOnly).toBe(true); expect(document.activeElement).toBe(field); expect(field.disabled).toBe(false);
  finish({ challenge: 'challenge', title: 'Forest holiday' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Forest holiday' })).toBe(document.activeElement));
  await user.type(screen.getByLabelText('Find a trip'), 'x');
  expect(screen.queryByRole('button', { name: 'Rename Forest holiday' })).toBeNull();
});

test('opening a plan shows only its loading state and never fetches retired workspace data', async () => {
  const item = plan('a', 'Current journey');
  const api = makeApi([item]);
  // These legacy endpoints must not be called by the current Conversation route.
  api.brief = vi.fn(); api.destinations = vi.fn();
  let finish;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Current journey' }));
  expect(screen.getByRole('heading', { name: 'Opening plan…' })).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Active plans' })).toBeNull();
  expect(screen.queryByRole('list', { name: 'Deleted plans' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Current journey' })).toBeNull();
  expect(document.querySelector('.app-loading')).toBeTruthy();
  await act(async () => finish(item));
  expect(await screen.findByRole('textbox', { name: 'Message Travella' })).toBeTruthy();
  expect(api.brief).not.toHaveBeenCalled(); expect(api.destinations).not.toHaveBeenCalled();
});

test('failed plan opening exposes a return to the journal instead of the retired grid', async () => {
  const api = makeApi([plan('a', 'Current journey')]);
  api.get.mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }));
  const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('link', { name: 'Current journey' }));
  expect(await screen.findByRole('heading', { name: 'Plan unavailable' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Current journey' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Restore plan/ })).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Return to My plans' }));
  expect(await screen.findByRole('link', { name: 'Current journey' })).toBeTruthy();
});

test('a restored plan that fails to open retries the read without restoring a second time', async () => {
  const item = plan('a', 'Recoverable journey', 1, 'deleted');
  const api = makeApi([item]);
  api.get.mockRejectedValueOnce(Object.assign(new Error('unavailable'), { status: 503 }));
  history.replaceState({}, '', '/plans/deleted');
  const user = userEvent.setup();
  render(<PlansApp api={api} onExpired={vi.fn()} onSignOut={vi.fn()} onAccount={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Restore plan Recoverable journey' }));
  await user.click(screen.getByRole('button', { name: 'Restore plan', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Plan unavailable' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('Your plan was restored');
  expect(screen.queryByRole('list', { name: 'Deleted plans' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Open plan' }));
  expect(await screen.findByRole('textbox', { name: 'Message Travella' })).toBeTruthy();
  expect(api.commit).toHaveBeenCalledTimes(1);
  expect(api.commit.mock.calls[0][0].operation).toBe('restore');
});
