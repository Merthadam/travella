import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceProvider, APPEARANCE_KEY } from '../../appearance/AppearanceProvider';
import { CanvasAppearance } from './CanvasAppearance';

beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', () => ({ matches: false })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('canvas controls update the shared appearance preference and retain it after returning', async () => {
  const user = userEvent.setup();
  const view = render(<AppearanceProvider><CanvasAppearance /></AppearanceProvider>);
  await user.click(screen.getByRole('button', { name: 'Use dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(screen.getByRole('button', { name: 'Use dark mode' }).getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem(APPEARANCE_KEY)).toBe('dark');
  view.unmount();
  render(<AppearanceProvider><CanvasAppearance /></AppearanceProvider>);
  expect(screen.getByRole('button', { name: 'Use dark mode' }).getAttribute('aria-pressed')).toBe('true');
  await user.click(screen.getByRole('button', { name: 'Use light mode' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem(APPEARANCE_KEY)).toBe('light');
});
