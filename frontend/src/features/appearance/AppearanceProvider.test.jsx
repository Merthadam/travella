import React, { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceProvider, useAppearance, APPEARANCE_KEY } from './AppearanceProvider';

function Controls() {
  const { theme, setTheme } = useAppearance();
  return <><output aria-label="Theme">{theme}</output><button onClick={() => setTheme('dark')}>Dark</button><button onClick={() => setTheme('light')}>Light</button></>;
}
function Routes() {
  const [account, showAccount] = useState(true);
  return <AppearanceProvider><button onClick={() => showAccount(value => !value)}>Navigate</button>{account ? <Controls /> : <p>Plans</p>}</AppearanceProvider>;
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', () => ({ matches: false })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('migrates the existing Account choice and retains it across route unmount and reload', async () => {
  localStorage.setItem('travella.account.theme', 'dark');
  const user = userEvent.setup(); const view = render(<Routes />);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(localStorage.getItem(APPEARANCE_KEY)).toBe('dark');
  expect(localStorage.getItem('travella.account.theme')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(screen.getByText('Plans')).toBeTruthy();
  expect(document.documentElement.dataset.theme).toBe('dark');
  await user.click(screen.getByRole('button', { name: 'Navigate' }));
  await user.click(screen.getByRole('button', { name: 'Light', exact: true }));
  view.unmount(); render(<Routes />);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(screen.getByLabelText('Theme').textContent).toBe('light');
});

test('global preference takes priority and valid changes from another tab are applied', () => {
  localStorage.setItem(APPEARANCE_KEY, 'light'); localStorage.setItem('travella.account.theme', 'dark');
  render(<AppearanceProvider><Controls /></AppearanceProvider>);
  expect(document.documentElement.dataset.theme).toBe('light');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: APPEARANCE_KEY, newValue: 'dark' })));
  expect(document.documentElement.dataset.theme).toBe('dark');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: 'light' })));
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('storage denial uses system preference and still permits in-memory switching', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  const user = userEvent.setup(); render(<AppearanceProvider><Controls /></AppearanceProvider>);
  expect(document.documentElement.dataset.theme).toBe('dark');
  await user.click(screen.getByRole('button', { name: 'Light', exact: true }));
  expect(document.documentElement.dataset.theme).toBe('light');
});
