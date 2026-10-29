import React, { useMemo, useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanHeaderContext, PlanHeaderSlot } from './PlanHeaderContext';
afterEach(cleanup);
function Workspace({ owner, active }) {
  const [draft, setDraft] = useState('');
  return <section hidden={!active}><input aria-label={`${owner} draft`} value={draft} onChange={e => setDraft(e.target.value)}/>{active && <PlanHeaderSlot slot="actions"><button>{owner} back</button></PlanHeaderSlot>}</section>;
}
function Shell({ mode }) {
  const [actions, setActions] = useState(null);
  const value = useMemo(() => ({ actions }), [actions]);
  return <PlanHeaderContext.Provider value={value}><header><span>Canvas navigation</span><div ref={setActions}/></header><Workspace owner="Flights" active={mode === 'flights'}/><Workspace owner="Stays" active={mode === 'stays'}/></PlanHeaderContext.Provider>;
}
test('only the active workspace occupies the header; leaving clears it without discarding drafts', async () => {
  const user = userEvent.setup(); const view = render(<Shell mode="flights"/>);
  await user.type(screen.getByRole('textbox', { name: 'Flights draft' }), 'Keep criteria');
  expect(document.querySelector('header button').textContent).toBe('Flights back');
  view.rerender(<Shell mode="stays"/>);
  expect(document.querySelectorAll('header button')).toHaveLength(1);
  expect(document.querySelector('header button').textContent).toBe('Stays back');
  view.rerender(<Shell mode="canvas"/>);
  expect(screen.getByText('Canvas navigation')).toBeTruthy();
  expect(document.querySelector('header button')).toBeNull();
  view.rerender(<Shell mode="flights"/>);
  expect(screen.getByRole('textbox', { name: 'Flights draft' }).value).toBe('Keep criteria');
});
