import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountApp } from '../../AccountApp';

const profile = { exists: true, revision: 3, onboarding_complete: true, onboarding: { completed_version: 2 }, food_needs: 'Vegetarian', accessibility_needs: '' };
const response = (status, body) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => {
  window.history.replaceState(null, '', '/account');
  vi.stubGlobal('fetch', vi.fn(async path => response(200, path === '/v1/traveler-profile' ? profile : { plans: [] })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

test('production account saves exact needs contract and renders only acknowledged values', async () => {
  const user = userEvent.setup();
  render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  const food = screen.getByLabelText('Food preferences & allergies');
  await user.clear(food); await user.type(food, '  Vegan  ');
  let finish;
  fetch.mockImplementation(path => path.endsWith('/sections') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response(200, profile)));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true);
  const [, options] = fetch.mock.calls.find(([path]) => path.endsWith('/sections'));
  expect(options.method).toBe('PATCH');
  expect(JSON.parse(options.body)).toEqual({ section: 'needs', values: { food_needs: '  Vegan  ', accessibility_needs: '' }, expected_revision: 3, event_id: expect.any(String) });
  expect(screen.queryByText('Your food and accessibility preferences were saved.')).toBeNull();
  finish(response(200, { ...profile, food_needs: 'Vegan', revision: 4 }));
  await screen.findByText('Your food and accessibility preferences were saved.');
  expect(screen.getByText('Vegan')).toBeTruthy();
});

test('failed needs save retains the draft', async () => {
  const user = userEvent.setup(); render(<AccountApp />);
  await screen.findByRole('heading', { name: 'Account & preferences' });
  await user.click(screen.getByRole('button', { name: 'Edit food & accessibility' }));
  await user.type(screen.getByLabelText('Accessibility needs'), 'Step-free');
  fetch.mockResolvedValue(response(422, { code: 'invalid_profile', message: 'Check your changes.' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByLabelText('Accessibility needs').value).toBe('Step-free');
});
