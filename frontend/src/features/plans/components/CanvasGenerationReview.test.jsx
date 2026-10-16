import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasGenerationReview } from './CanvasGenerationReview';
import { confirmFlightNeed } from '../flightNeeds';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(cleanup);

test.each([{}, { flights: 'undecided' }, { flights: 'needed', provenance: { flights: { source: 'agent_inferred' } } }])('requires an explicit flight choice for %j', async context => {
  const user = userEvent.setup(); const confirm = vi.fn(); const cancel = vi.fn();
  render(<CanvasGenerationReview context={context} onConfirm={confirm} onCancel={cancel}/>);
  const submit = screen.getByRole('button', { name: 'Confirm & generate' });
  expect(submit.disabled).toBe(true);
  await user.click(screen.getByRole('radio', { name: 'No, leave flights out' }));
  expect(submit.disabled).toBe(false);
  await user.click(submit);
  expect(confirm).toHaveBeenCalledExactlyOnceWith('not-needed');
});

test('failed confirmation stays open and allows retry without generating', async () => {
  const user = userEvent.setup(); let fail;
  const confirm = vi.fn(() => new Promise((_resolve, reject) => { fail = reject; }));
  render(<CanvasGenerationReview context={{}} onConfirm={confirm} onCancel={vi.fn()}/>);
  await user.click(screen.getByRole('radio', { name: 'Yes, include flights' }));
  await user.click(screen.getByRole('button', { name: 'Confirm & generate' }));
  expect(screen.getByRole('button', { name: 'Confirming flights…' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Edit trip details' }).disabled).toBe(true);
  fail(new Error('Trip details changed.'));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Trip details changed.'));
  expect(screen.getByRole('radio', { name: 'Yes, include flights' }).checked).toBe(true);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm & generate' }).disabled).toBe(false));
});

test('confirmation records a user edit against the reviewed revision and returns the new revision', async () => {
  const snapshot = { revision: 8, context: { flights: 'needed', provenance: { flights: { source: 'user_edit' } } } };
  const api = { updateResearchContext: vi.fn(async () => snapshot) };
  const plan = { plan_id: 'test-plan' };
  expect(await confirmFlightNeed(api, plan, { revision: 7, context: { flights: 'needed' } }, 'needed')).toEqual(snapshot);
  expect(api.updateResearchContext).toHaveBeenCalledWith(plan, [{ operation: 'set', field: 'flights', value: 'needed', source: 'user_edit', source_quote: '' }], 7, expect.any(String));
});
