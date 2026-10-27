import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelWorkspace } from './TravelWorkspace';
import { useTravelConversation } from './useTravelConversation';

vi.mock('./TravelSearch', () => ({ TravelSearch: ({ active }) => <section hidden={!active} aria-label="Manual search">Manual search form</section> }));
const selected = { plan_id: 'plan-1', title: 'A city break', revision: 4 };
const option = { id: 'observed-1', title: 'Courtyard apartment', summary: 'Near the selected museum.', price_label: 'EUR 420 · total stay', facts: ['Kitchen listed for the property'], unknowns: ['Room kitchen not confirmed'], observed_at: new Date().toISOString(), provider: 'LiteAPI sandbox', criteria: {} };
const snapshot = topic => ({ plan_id: selected.plan_id, topic, revision: 4, brief: { destination: 'Rome', dates: { start: '2027-02-03', end: '2027-02-07' }, travelers: 2, themes: [{ text: 'Art and quiet cafés', source: 'Conversation' }], selected_places: [{ id: 'place-1', name: 'City museum' }], accepted_choices: [] }, messages: [], notes: { items: [], incomplete: true }, comparison: null, shortlist: [], preferred: null, readiness: 'researching', locked: false });
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(cleanup);

test('topic discussions restore separately, preserve unsent drafts, and keep manual search available alongside collapsible chat', async () => {
  const user = userEvent.setup();
  const api = { travelTopic: vi.fn(async (_, topic) => ({ ...snapshot(topic), messages: [{ message_id: topic, role: 'assistant', content: topic === 'stays' ? 'A quiet apartment matters.' : 'Prefer a morning flight.' }] })), travelTurn: vi.fn(), cancelAgentTurn: vi.fn() };
  function Workspaces({ mode }) { return <><TravelWorkspace selected={selected} api={api} mode="accommodation" active={mode === 'stays'} pendingEdits/><TravelWorkspace selected={selected} api={api} mode="flights" active={mode === 'flights'}/></>; }
  const view = render(<Workspaces mode="stays"/>);
  await screen.findByText('A quiet apartment matters.');
  expect(screen.queryByText('Prefer a morning flight.')).toBeTruthy(); // retained hidden workspace
  expect(screen.getByRole('region', { name: 'Manual search' })).toBeTruthy();
  const composer = screen.getByRole('textbox', { name: 'Message accommodation assistant' });
  await user.type(composer, 'I would like a balcony');
  expect(screen.getByText(/unfinished canvas edits/)).toBeTruthy();
  view.rerender(<Workspaces mode="flights"/>);
  expect(await screen.findByRole('textbox', { name: 'Message flight assistant' })).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Message accommodation assistant' })).toBeNull();
  view.rerender(<Workspaces mode="stays"/>);
  expect(screen.getByRole('textbox', { name: 'Message accommodation assistant' }).value).toBe('I would like a balcony');
  await user.click(screen.getByRole('button', { name: 'Collapse accommodation chat' }));
  expect(screen.queryByRole('textbox', { name: 'Message accommodation assistant' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Manual search' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Open accommodation chat' }));
  expect(screen.getByRole('textbox', { name: 'Message accommodation assistant' }).value).toBe('I would like a balcony');
  expect(api.travelTurn).not.toHaveBeenCalled();
});

test('a preferred option is saved only after exact review and restores as ready but unbooked', async () => {
  const user = userEvent.setup(); let stored = { ...snapshot('stays'), comparison: { options: [option] } };
  const api = { travelTopic: vi.fn(async () => structuredClone(stored)), prepareTravelChoice: vi.fn(async () => ({ challenge: 'confirmation', revision: 4 })), commitTravelChoice: vi.fn(async () => { stored = { ...stored, revision: 5, preferred: { ...option, evidence_id: option.id }, shortlist: [{ ...option, evidence_id: option.id }], readiness: 'ready' }; return stored; }) };
  const onChoiceSaved = vi.fn();
  const view = render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active onChoiceSaved={onChoiceSaved}/>);
  await user.click(await screen.findByRole('button', { name: 'Choose for trip' }));
  expect(api.prepareTravelChoice).toHaveBeenCalledWith(selected, 'stays', { action: 'prefer', evidence_id: option.id }, 4);
  expect(api.commitTravelChoice).not.toHaveBeenCalled();
  const review = screen.getByRole('dialog');
  expect(within(review).getByText('Courtyard apartment')).toBeTruthy();
  expect(within(review).getByText('Kitchen listed for the property')).toBeTruthy();
  expect(within(review).getByText(/Room kitchen not confirmed/)).toBeTruthy();
  expect(within(review).getByText(/LiteAPI sandbox.*Observed/)).toBeTruthy();
  expect(within(review).getByText(/does not book/)).toBeTruthy();
  await user.click(within(review).getByRole('button', { name: 'Confirm choice · not booked' }));
  await screen.findByText('Ready · selected, not booked');
  expect(onChoiceSaved).toHaveBeenCalledWith(4, 5);
  expect(api.commitTravelChoice.mock.calls[0].slice(0, 5)).toEqual([selected, 'stays', { action: 'prefer', evidence_id: option.id }, 4, 'confirmation']);
  view.unmount();
  render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active/>);
  expect(await screen.findByRole('region', { name: 'Preferred option' })).toBeTruthy();
  expect(screen.getByText('Ready · selected, not booked')).toBeTruthy();
});

test('stale research remains visible but cannot be accepted as a fresh choice', async () => {
  const api = { travelTopic: vi.fn(async () => ({ ...snapshot('stays'), comparison: { options: [option] }, comparison_stale: true })) };
  render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active/>);
  const choose = await screen.findByRole('button', { name: 'Choose for trip' });
  expect(choose.disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Save to shortlist' }).disabled).toBe(true);
  expect(screen.getByText(/observed offer has expired/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Search again' }).disabled).toBe(false);
});

test('cancellation holds the shared lock until acknowledged and rejects late text', async () => {
  let stream, cancel; const busy = vi.fn();
  const api = { travelTopic: vi.fn(async () => snapshot('stays')), travelTurn: vi.fn((_, topic, text, id, options) => { stream = options; return new Promise(() => {}); }), cancelAgentTurn: vi.fn(() => new Promise(resolve => { cancel = resolve; })) };
  const { result } = renderHook(() => useTravelConversation({ api, selected, topic: 'stays', visible: true, onBusyChange: busy }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => { void result.current.send('Find an apartment.'); });
  await waitFor(() => expect(stream).toBeTruthy());
  let stopping; act(() => { stopping = result.current.stop(); });
  act(() => stream.onEvent({ type: 'TEXT_MESSAGE_CONTENT', delta: 'Obsolete result' }));
  expect(result.current.active).toBe(true);
  expect(result.current.messages.some(item => item.content.includes('Obsolete'))).toBe(false);
  await act(async () => { expect(await result.current.send('Another request')).toBe(false); });
  expect(api.travelTurn).toHaveBeenCalledTimes(1);
  await act(async () => { cancel({ status: 'stopped' }); await stopping; });
  expect(result.current.active).toBe(false);
  expect(busy).toHaveBeenLastCalledWith('stays', false);
});

test('failed cancellation keeps further sends blocked until Stop succeeds', async () => {
  const api = { travelTopic: vi.fn(async () => snapshot('flights')), travelTurn: vi.fn(() => new Promise(() => {})), cancelAgentTurn: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 'stopped' }) };
  const { result } = renderHook(() => useTravelConversation({ api, selected, topic: 'flights', visible: true }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => { void result.current.send('Find a flight.'); });
  await act(async () => { expect(await result.current.stop()).toBe(false); });
  expect(result.current.active).toBe(true);
  await act(async () => { expect(await result.current.send('Another flight')).toBe(false); });
  await act(async () => { expect(await result.current.stop()).toBe(true); });
  expect(result.current.active).toBe(false);
});


test('starter prompts prepare editable drafts without starting research, using the Canvas send control', async () => {
  const user = userEvent.setup();
  const api = { travelTopic: vi.fn(async () => snapshot('stays')), travelTurn: vi.fn() };
  render(<TravelWorkspace selected={selected} api={api} mode="accommodation" active/>);
  await user.click(await screen.findByRole('button', { name: 'Help me choose an area' }));
  const composer = screen.getByRole('textbox', { name: 'Message accommodation assistant' });
  expect(composer.value).toBe('Help me choose an area');
  await waitFor(() => expect(document.activeElement).toBe(composer));
  expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(false);
  expect(api.travelTurn).not.toHaveBeenCalled();
  await user.type(composer, '{Shift>}{Enter}{/Shift}Near my activities.');
  expect(composer.value).toContain('\nNear my activities.');
  expect(api.travelTurn).not.toHaveBeenCalled();
});

test('reply references stay compact and attach exact context without replacing a draft', async () => {
  const user = userEvent.setup();
  const first = { ...option, reference: { search_id: 'search-1', option_id: 'hotel-1', room_id: 'apartment-rate' } };
  const other = { ...option, id: 'other', title: 'Station hotel', reference: { search_id: 'search-1', option_id: 'hotel-2', room_id: 'room-2' } };
  const reply = { message_id: 'reply-1', role: 'assistant', content: 'These fit your trip.', comparison: { options: [first, other] } };
  const api = { travelTopic: vi.fn(async () => ({ ...snapshot('stays'), messages: [reply] })), travelTurn: vi.fn(async () => ({ status: 'complete' })) };
  render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active/>);
  const suggestions = await screen.findByRole('region', { name: 'Referenced options' });
  expect(suggestions.closest('.canvas-chat-message').textContent).toContain('These fit your trip.');
  const composer = screen.getByRole('textbox', { name: 'Message accommodation assistant' });
  await user.type(composer, 'Is the kitchen private?');
  expect(within(suggestions).queryByRole('heading')).toBeNull();
  expect(within(suggestions).queryByRole('checkbox')).toBeNull();
  expect(within(suggestions).getByRole('button', { name: 'View Station hotel' })).toBeTruthy();
  expect(within(suggestions).queryByText('Kitchen listed for the property')).toBeNull();
  await user.click(within(suggestions).getByRole('button', { name: 'Discuss Station hotel' }));
  expect(composer.value).toBe('Is the kitchen private?');
  expect(screen.getByText('Discussing Station hotel')).toBeTruthy();
  expect(api.travelTurn).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Remove discussion context' }));
  expect(composer.value).toBe('Is the kitchen private?');
  expect(api.travelTurn).not.toHaveBeenCalled();
  expect(composer.value).toBe('Is the kitchen private?');
  expect(screen.queryByRole('searchbox', { name: 'Filter suggestions' })).toBeNull();
});

test('a message sends exact attached references separately from the typed text', async () => {
  const user = userEvent.setup();
  const first = { ...option, reference: { search_id: 'search-1', option_id: 'hotel-1', room_id: 'room-1' } };
  const api = { travelTopic: vi.fn(async () => ({ ...snapshot('stays'), messages: [{ message_id: 'reply', role: 'assistant', content: 'Here is the room.', comparison: { options: [first] } }] })), travelTurn: vi.fn(async () => ({ status: 'complete' })) };
  render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active/>);
  await user.click(await screen.findByRole('button', { name: 'Discuss Courtyard apartment' }));
  const composer = screen.getByRole('textbox', { name: 'Message accommodation assistant' });
  expect(composer.value).toBe('');
  await user.type(composer, 'What are its cancellation terms?');
  await user.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(api.travelTurn).toHaveBeenCalledTimes(1));
  expect(api.travelTurn.mock.calls[0][2]).toBe('What are its cancellation terms?');
  expect(api.travelTurn.mock.calls[0][4].travelDiscussion).toEqual({ intent:'discuss', options:[first.reference] });
  await waitFor(() => expect(composer.value).toBe(''));
  expect(screen.queryByRole('button', { name:'Remove discussion context' })).toBeNull();
});

test('typing the next draft while a reply runs survives asynchronous completion', async () => {
  const user = userEvent.setup(); let finish;
  const api = { travelTopic: vi.fn(async () => snapshot('stays')), travelTurn: vi.fn(() => new Promise(resolve => { finish = resolve; })), cancelAgentTurn: vi.fn(async () => ({})) };
  render(<TravelWorkspace api={api} selected={selected} mode="accommodation" active/>);
  await screen.findByRole('button', { name: 'Help me choose an area' });
  const composer = screen.getByRole('textbox', { name: 'Message accommodation assistant' });
  await user.type(composer, 'Find a quiet stay'); await user.click(screen.getByRole('button', { name: 'Send message' }));
  await screen.findByRole('button', { name: 'Stop' });
  expect(composer.disabled).toBe(false);
  await user.clear(composer); await user.type(composer, 'My next unsent question');
  await act(async () => finish({ status: 'complete' }));
  await screen.findByRole('button', { name: 'Send message' });
  expect(composer.value).toBe('My next unsent question');
  expect(api.travelTurn).toHaveBeenCalledTimes(1);
});
