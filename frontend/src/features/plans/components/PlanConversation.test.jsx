import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanConversation } from './PlanConversation';

const plan = { plan_id: 'plan-1', title: 'Japan trip' };
const settledApi = () => ({
  conversationMessages: vi.fn(async () => [
    { message_id: 'one', role: 'user', content: 'Japan', status: 'complete' },
    { message_id: 'two', role: 'assistant', content: 'What would you like to know?', status: 'complete' },
  ]),
  agentTurnStream: vi.fn(async (_plan, message, _eventId, { onEvent }) => {
    onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: `Researching ${message}` });
    onEvent({ type: 'TERMINAL', status: 'complete', sources: [{ title: 'Official guide', url: 'https://example.org/guide' }, { title: 'Unsafe', url: 'javascript:alert(1)' }] });
    return { status: 'complete' };
  }),
});

afterEach(() => cleanup());

test('loads history, streams assistant text, and renders only safe inline source links', async () => {
  const api = settledApi(); const user = userEvent.setup();
  render(<PlanConversation selected={plan} api={api} onExpired={vi.fn()} />);
  expect(await screen.findByText('Japan')).toBeTruthy();
  expect(screen.getByText('What would you like to know?')).toBeTruthy();
  const composer = screen.getByRole('textbox', { name: 'Message Travella' });
  await user.type(composer, 'weather in Kyoto{enter}');
  expect(await screen.findByText('Researching weather in Kyoto')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Official guide' }).getAttribute('href')).toBe('https://example.org/guide');
  expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull();
  expect(api.agentTurnStream).toHaveBeenCalledOnce();
});

test('Stop preserves partial text and disables the composer only while active', async () => {
  const api = settledApi(); const user = userEvent.setup();
  let emit;
  api.agentTurnStream.mockImplementation((_plan, _message, _eventId, { signal, onEvent }) => new Promise((_resolve, reject) => {
    emit = onEvent;
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  render(<PlanConversation selected={plan} api={api} onExpired={vi.fn()} />);
  const composer = await screen.findByRole('textbox', { name: 'Message Travella' });
  const addCandidate = screen.getByRole('button', { name: 'Add', exact: true });
  expect(addCandidate.disabled).toBe(true);
  await user.type(screen.getByRole('textbox', { name: 'Add a place' }), 'Sapporo');
  expect(screen.getByRole('button', { name: 'Add', exact: true }).disabled).toBe(false);
  await user.clear(screen.getByRole('textbox', { name: 'Add a place' }));
  await user.type(composer, 'Tell me about Hokkaido');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(emit).toBeTypeOf('function'));
  emit({ type: 'TEXT_MESSAGE_CONTENT', delta: 'Hokkaido has ' });
  expect(await screen.findByText('Hokkaido has')).toBeTruthy();
  expect(composer.disabled).toBe(true);
  expect(screen.getByRole('textbox', { name: 'Add a place' }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Stop' }));
  expect(await screen.findByText('Stopped')).toBeTruthy();
  expect(screen.getByText('Hokkaido has')).toBeTruthy();
  expect(composer.disabled).toBe(false);
  expect(screen.getByRole('textbox', { name: 'Add a place' }).disabled).toBe(false);
});

test('connection failure marks partial output interrupted and offers retry with a fresh event', async () => {
  const api = settledApi(); const user = userEvent.setup();
  let count = 0;
  api.agentTurnStream.mockImplementation(async (_plan, _message, _eventId, { onEvent }) => {
    count += 1;
    onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: count === 1 ? 'It is usually mild' : 'It can be rainy' });
    if (count === 1) throw new Error('Connection lost.');
    onEvent({ type: 'TERMINAL', status: 'complete' });
    return { status: 'complete' };
  });
  render(<PlanConversation selected={plan} api={api} onExpired={vi.fn()} />);
  const composer = await screen.findByRole('textbox', { name: 'Message Travella' });
  await user.type(composer, 'What is spring like?');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText('Interrupted')).toBeTruthy();
  expect(screen.getByText('It is usually mild')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('It can be rainy')).toBeTruthy();
  expect(api.agentTurnStream).toHaveBeenCalledTimes(2);
  expect(api.agentTurnStream.mock.calls[0][2]).not.toBe(api.agentTurnStream.mock.calls[1][2]);
  expect(screen.getAllByText('What is spring like?')).toHaveLength(2);
});

test('Shift+Enter inserts a newline without sending; Enter sends', async () => {
  const api = settledApi(); const user = userEvent.setup();
  render(<PlanConversation selected={plan} api={api} onExpired={vi.fn()} />);
  const composer = await screen.findByRole('textbox', { name: 'Message Travella' });
  await user.type(composer, 'First line');
  await user.keyboard('{Shift>}{Enter}{/Shift}Second line');
  expect(composer.value).toContain('\n');
  expect(api.agentTurnStream).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(api.agentTurnStream).toHaveBeenCalledOnce());
  expect(api.agentTurnStream.mock.calls[0][1]).toBe('First line\nSecond line');
});
