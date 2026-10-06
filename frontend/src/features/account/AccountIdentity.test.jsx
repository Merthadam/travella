import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountIdentity } from './AccountIdentity';

const account = { identity: { first_name: 'Ada', last_name: 'Traveler', email: 'old@example.com', email_verified: true }, capabilities: { email_change: { available: false } } };
const response = body => ({ ok: true, status: 200, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('name keeps draft until canonical acknowledgement and submits exact expected names', async () => {
  const user = userEvent.setup(); const onSaved = vi.fn(); let finish;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  render(<AccountIdentity setting="name" account={account} onSaved={onSaved} cancel={action => action()} />);
  await user.click(screen.getByText('Edit your name'));
  await user.clear(screen.getByLabelText('First name')); await user.type(screen.getByLabelText('First name'), 'Grace');
  await user.click(screen.getByText('Save changes'));
  expect(onSaved).not.toHaveBeenCalled();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ first_name: 'Grace', last_name: 'Traveler', expected_names: { first_name: 'Ada', last_name: 'Traveler' }, event_id: expect.any(String) });
  finish(response({ ...account, identity: { ...account.identity, first_name: 'Grace' } }));
  await screen.findByText('Your name was saved.'); expect(onSaved.mock.calls[0][0].identity.first_name).toBe('Grace');
});

test('unsafe email only permits checking capability', () => {
  render(<AccountIdentity setting="email" account={account} />);
  expect(screen.getByText('old@example.com')).toBeTruthy(); expect(screen.getByText('Check availability')).toBeTruthy();
  expect(screen.queryByLabelText('New email address')).toBeNull();
});
