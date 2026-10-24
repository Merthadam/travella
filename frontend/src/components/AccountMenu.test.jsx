import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountMenu } from './AccountMenu';

afterEach(cleanup);

test('keyboard opens, moves between actions and restores focus on Escape', async () => {
  const user = userEvent.setup();
  render(<AccountMenu />);
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  trigger.focus(); await user.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Sign out' }));
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Account settings' }));
  await user.keyboard('{End}');
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Sign out' }));
  await user.keyboard('{Home}{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('real callbacks run once and menu closes before guarded navigation', async () => {
  const user = userEvent.setup(); const onAccount = vi.fn(); const onSignOut = vi.fn();
  render(<AccountMenu onAccount={onAccount} onSignOut={onSignOut} />);
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: 'Account settings' }));
  expect(onAccount).toHaveBeenCalledTimes(1); expect(screen.queryByRole('menu')).toBeNull();
  await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
  expect(onSignOut).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(trigger);
});

test('Tab and outside pointer dismiss without trapping or stealing focus', async () => {
  const user = userEvent.setup(); render(<><AccountMenu /><button>Next control</button></>);
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  await user.click(trigger); await user.tab();
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next control' }));
  await user.click(trigger); await user.click(screen.getByRole('button', { name: 'Next control' }));
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next control' }));
});

test('busy transition closes the menu and prevents duplicate actions', async () => {
  const user = userEvent.setup(); const action = vi.fn();
  const view = render(<AccountMenu onSignOut={action} />);
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  view.rerender(<AccountMenu disabled onSignOut={action} />);
  expect(screen.queryByRole('menu')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  expect(action).not.toHaveBeenCalled(); expect(screen.queryByRole('menu')).toBeNull();
  view.rerender(<AccountMenu onSignOut={action} />);
  expect(screen.queryByRole('menu')).toBeNull();
});

test('current account entry closes without restarting the account editor', async () => {
  const user = userEvent.setup(); const onAccount = vi.fn(); render(<AccountMenu current onAccount={onAccount} />);
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  const account = screen.getByRole('menuitem', { name: 'Account settings' });
  expect(account.getAttribute('aria-current')).toBe('page');
  await user.click(account); expect(onAccount).not.toHaveBeenCalled(); expect(screen.queryByRole('menu')).toBeNull();
});
