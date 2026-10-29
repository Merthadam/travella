import React, { useMemo, useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanHeaderContext, PlanHeaderSlot, useFocusedPlanHeader } from './PlanHeaderContext';
afterEach(cleanup);
function Workspace({ owner, active }) {
  useFocusedPlanHeader(owner, active);
  const [draft, setDraft] = useState('');
  return <section hidden={!active}><input aria-label={`${owner} draft`} value={draft} onChange={e => setDraft(e.target.value)}/>{active && <PlanHeaderSlot slot="leading"><button>{owner} back</button></PlanHeaderSlot>}</section>;
}
function Shell({ mode }) {
  const [leading, setLeading] = useState(null), [owner, setOwner] = useState(null);
  const value = useMemo(() => ({ leading, setOwner }), [leading]);
  return <PlanHeaderContext.Provider value={value}><header><span>{owner || 'Canvas navigation'}</span><div ref={setLeading}/></header><Workspace owner="Flights" active={mode === 'flights'}/><Workspace owner="Stays" active={mode === 'stays'}/></PlanHeaderContext.Provider>;
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
