import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyTripContext, TripBrief, tripBriefProgress } from './TripBrief';

afterEach(() => cleanup());

test('starts empty and derives zero progress without invented trip details', () => {
  const empty = emptyTripContext();
  expect(tripBriefProgress(empty)).toMatchObject({ count: 0, total: 6, percentage: 0 });
  const onChange = vi.fn();
  render(<TripBrief value={empty} onChange={onChange} />);
  expect(screen.getByRole('heading', { name: 'Trip Brief' })).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('6 details left to shape')).toBeTruthy();
  expect(screen.getByText('Choose a final place when you’re ready.')).toBeTruthy();
  expect(screen.getByText('0 candidates · not settled')).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Flights status' })).getByRole('button', { name: 'Undecided' }).getAttribute('aria-pressed')).toBe('true');
  expect(onChange).not.toHaveBeenCalled();
});

test('only a settled destination completes destination; flexible dates and no-fixed-budget resolve their fields', () => {
  const context = emptyTripContext();
  context.candidates = ['Kyoto', 'Osaka'];
  expect(tripBriefProgress(context).count).toBe(0);
  context.finalDestination = 'Kyoto';
  expect(tripBriefProgress(context).count).toBe(1);
  context.flexibleDates = true;
  context.travelers = '2';
  context.noFixedBudget = true;
  context.flights = 'needed';
  context.accommodation = 'not-needed';
  expect(tripBriefProgress(context)).toMatchObject({ count: 6, percentage: 100 });
});

test('dates, traveler count, budget and both non-undecided need values count as provided', () => {
  const context = emptyTripContext();
  context.dateStart = '2027-04-01';
  context.dateEnd = '2027-04-05';
  context.travelers = '1';
  context.budget = '1200 EUR';
  context.flights = 'not-needed';
  expect(tripBriefProgress(context).count).toBe(4);
  context.accommodation = 'needed';
  expect(tripBriefProgress(context).count).toBe(5);
});

test('candidate is separate until the traveler explicitly settles it', async () => {
  const user = userEvent.setup();
  let context = emptyTripContext();
  const onChange = next => { context = next; rerender(<TripBrief value={context} onChange={onChange} />); };
  const { rerender } = render(<TripBrief value={context} onChange={onChange} />);
  await user.type(screen.getByRole('textbox', { name: 'Add a place' }), 'Kyoto');
  await user.click(screen.getByRole('button', { name: 'Add', exact: true }));
  expect(context.candidates).toEqual(['Kyoto']);
  expect(context.finalDestination).toBe('');
  expect(screen.getByText('6 details left to shape')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Set Kyoto as final destination' }));
  expect(context.finalDestination).toBe('Kyoto');
  expect(screen.getByText('5 details left to shape')).toBeTruthy();
});

test('need status remains unchanged until inline confirmation and Cancel discards the staged choice', async () => {
  const user = userEvent.setup();
  let context = emptyTripContext();
  const onChange = next => { context = next; rerender(<TripBrief value={context} onChange={onChange} />); };
  const { rerender } = render(<TripBrief value={context} onChange={onChange} />);
  await user.click(screen.getByText('What we need'));
  const flights = within(screen.getByRole('group', { name: 'Flights status' }));
  await user.click(flights.getByRole('button', { name: 'Needed' }));
  expect(context.flights).toBe('undecided');
  expect(screen.getByRole('group', { name: 'Confirm Flights status change' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(context.flights).toBe('undecided');
  await user.click(flights.getByRole('button', { name: 'Not needed' }));
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(context.flights).toBe('not-needed');
});

test('date flexibility and no-fixed-budget toggles are traveler-editable and clear conflicting values', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TripBrief value={{ ...emptyTripContext(), dateStart: '2027-04-01', budget: '1500 EUR' }} onChange={onChange} />);
  await user.click(screen.getByText('When & who?'));
  fireEvent.click(screen.getByRole('checkbox', { name: 'My dates are flexible' }));
  expect(onChange.mock.lastCall[0]).toMatchObject({ flexibleDates: true, dateStart: '', dateEnd: '' });
  await user.click(screen.getByText('Budget'));
  fireEvent.click(screen.getByRole('checkbox', { name: 'I don’t have a fixed budget' }));
  expect(onChange.mock.lastCall[0]).toMatchObject({ noFixedBudget: true, budget: '' });
});

test('active reply locks every Trip Brief edit control', () => {
  const context = emptyTripContext();
  render(<TripBrief value={context} onChange={vi.fn()} locked />);
  expect(screen.getByRole('status').textContent).toContain('paused while Travella replies');
  expect(screen.getByRole('textbox', { name: 'Add a place' }).disabled).toBe(true);
  expect(screen.getByRole('checkbox', { name: 'My dates are flexible' }).disabled).toBe(true);
  expect(within(screen.getByRole('group', { name: 'Flights status' })).getByRole('button', { name: 'Needed' }).disabled).toBe(true);
});
