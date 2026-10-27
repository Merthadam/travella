import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripBriefing, briefingOverview } from './TripBriefing';

afterEach(cleanup);
const source = { title: 'Local transit guide', url: 'https://transit.example.org/guide' };
const finding = n => ({ id: `f${n}`, title: `Local detail ${n}`, summary: `Useful information ${n}`, certainty: 'supported', sources: [source] });
const data = { map: { final: true, destination: 'Innsbruck', pins: [{ name: 'Nordkette' }] },
  themes: { status: 'ready', items: [{ id: 'ski', kind: 'theme', text: 'Skiing' }, { id: 'avoid', kind: 'avoid', text: 'Nightclubs' }] },
  essentials: { travelers: 2, dates: { flexible: true }, budget: { label: '' } },
  findings: { items: [1, 2, 3, 4].map(finding) }, links: { items: [{ id: 'rental', title: 'Ski rentals', url: 'https://rental.example.org/ski', purpose: 'Equipment near the resort' }] } };

test('compact highlights expand with keyboard and keep every saved source and preference accessible', async () => {
  const user = userEvent.setup(); const onRefresh = vi.fn();
  render(<TripBriefing data={data} onRefresh={onRefresh}/>);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.queryByRole('link', { name: /Ski rentals/ })).toBeNull();
  expect(screen.getByText(/Your interests: Skiing/).textContent).not.toContain('Nightclubs');
  const toggle = screen.getByRole('button', { name: /Read more/ }); toggle.focus();
  await user.keyboard('{Enter}');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText('Local detail 4.')).toBeTruthy();
  expect(screen.getByText(/On your map: Nordkette/)).toBeTruthy();
  expect(screen.getByText('Nightclubs')).toBeTruthy();
  const link = screen.getByRole('link', { name: /Ski rentals/ });
  expect(link.target).toBe('_blank'); expect(link.rel).toContain('noopener');
  await user.click(screen.getByRole('button', { name: 'Refresh briefing' }));
  expect(onRefresh).toHaveBeenCalledWith('research');
  await user.click(screen.getByRole('button', { name: /Show less/ }));
  expect(screen.queryByRole('link', { name: /Ski rentals/ })).toBeNull();
});

test('partial failure preserves details and directs retry to the failed group', async () => {
  const onRefresh = vi.fn(); const user = userEvent.setup();
  const { rerender } = render(<TripBriefing data={data} groups={{ research: 'error' }} onRefresh={onRefresh}/>);
  expect(screen.getByRole('status').textContent).toContain('existing information');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Retry briefing' }));
  expect(onRefresh).toHaveBeenLastCalledWith('research');
  rerender(<TripBriefing data={data} groups={{ themes: 'error' }} onRefresh={onRefresh}/>);
  await user.click(screen.getByRole('button', { name: 'Retry briefing' }));
  expect(onRefresh).toHaveBeenLastCalledWith('all');
});

test('empty/loading states never invent local advice and loading prevents regeneration', () => {
  const empty = { ...data, findings: { items: [] }, links: { items: [] } };
  const { rerender } = render(<TripBriefing data={empty}/>);
  expect(screen.getByText(/Useful local context/)).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
  rerender(<TripBriefing data={empty} groups={{ research: 'loading' }}/>);
  expect(screen.getByRole('status').textContent).toContain('Gathering');
  expect(screen.getByRole('button', { name: 'Generate briefing' }).disabled).toBe(true);
  expect(briefingOverview({})).toBe('Your trip is still taking shape.');
});

test('untrusted URLs are not clickable, uncertain and conflicting evidence stays qualified', () => {
  render(<TripBriefing data={{ ...data, findings: { items: [{ ...finding(1), certainty: 'conflicting', sources: [source, { title: 'Bad', url: 'javascript:alert(1)' }] }, { ...finding(2), certainty: 'uncertain' }] } }}/>);
  expect(screen.queryByRole('link', { name: /Bad/ })).toBeNull();
  expect(screen.getByText('Sources disagree')).toBeTruthy();
  expect(screen.getByText('Worth double-checking')).toBeTruthy();
});

test('preference edits preserve the existing action contract and cannot be collapsed mid-edit', async () => {
  const user = userEvent.setup(); const onAction = vi.fn();
  const { rerender } = render(<TripBriefing data={data} onAction={onAction}/>);
  await user.click(screen.getByRole('button', { name: /Read more/ }));
  await user.click(screen.getByRole('button', { name: 'Add preference' }));
  await user.type(screen.getByRole('textbox', { name: 'Preference' }), 'Easy slopes');
  rerender(<TripBriefing data={data} editing onAction={onAction}/>);
  expect(screen.getByRole('button', { name: /Show less/ }).disabled).toBe(true);
  await user.click(within(screen.getByRole('textbox', { name: 'Preference' }).closest('form')).getByRole('button', { name: /Save|Add|Update/ }));
  expect(onAction.mock.calls.some(([id, action, value]) => id === 'themes' && action === 'add_theme' && value.text === 'Easy slopes')).toBe(true);
});
