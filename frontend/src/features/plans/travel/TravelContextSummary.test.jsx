import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelContextSummary } from './TravelContextSummary';

afterEach(cleanup);
test('saved trip context shows themes, selected activities, omission count and unbooked choices', async () => {
  const user = userEvent.setup();
  render(<TravelContextSummary brief={{ destination: 'Rome', dates: { start: '2027-02-03', end: '2027-02-07' }, travelers: 2, themes: [{ text: 'Art and food', source: 'Conversation' }], selected_places: [{ id: 'museum', name: 'City museum' }], omitted_places: 4, accepted_choices: [{ topic: 'flights', title: 'Morning flight', needs_review: true }] }}/>);
  await user.click(screen.getByText('Using your trip'));
  expect(screen.getByText(/Rome.*2027.*2 travelers/)).toBeTruthy();
  expect(screen.queryByText(/start:|end:/)).toBeNull();
  expect(screen.getByText('City museum')).toBeTruthy();
  expect(screen.getByText(/4 other selected places/)).toBeTruthy();
  expect(screen.getByText(/Morning flight.*needs review.*not booked/)).toBeTruthy();
  expect(screen.getByText(/Art and food/)).toBeTruthy();
});
