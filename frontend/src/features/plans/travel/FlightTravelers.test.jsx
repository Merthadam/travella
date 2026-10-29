import React, { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { FlightTravelers } from './FlightTravelers';

afterEach(cleanup);

function Form({ initial = {}, onSearch = () => {} }) {
  const [adults, onAdultsChange] = useState(initial.adults ?? 1);
  const [children, onChildrenChange] = useState(initial.children ?? []);
  const [infants, onInfantsChange] = useState(initial.infants ?? []);
  return <form onSubmit={event => { event.preventDefault(); onSearch({ adults, children, infants }); }}>
    <FlightTravelers {...{ adults, children, infants, onAdultsChange, onChildrenChange, onInfantsChange }}/>
    <button type="submit">Search</button>
    <button type="button">Outside</button>
  </form>;
}
const button = name => screen.getByRole('button', { name });
const open = async user => user.click(button(/Travelers.*traveler/));

test('counts enforce one adult, nine travelers, and one adult per infant', async () => {
  render(<Form/>);
  const user = userEvent.setup();
  await open(user);
  expect(button('Remove adult').disabled).toBe(true);
  expect(button('Remove child').disabled).toBe(true);
  await user.click(button('Add infant'));
  expect(button('Add infant').disabled).toBe(true);
  await user.click(button('Add adult'));
  await user.click(button('Add infant'));
  expect(button('Remove adult').disabled).toBe(true);
  for (let i = 0; i < 5; i++) await user.click(button('Add child'));
  expect(button(/Travelers.*9 travelers/)).toBeTruthy();
  for (const name of ['Add adult', 'Add child', 'Add infant']) expect(button(name).disabled).toBe(true);
  await user.click(button('Remove infant'));
  expect(button('Remove adult').disabled).toBe(false);
  expect(button('Add infant').disabled).toBe(false);
  expect(button('Add child').disabled).toBe(false);
});

test('removing the last child preserves earlier ages and new passengers need an exact age', async () => {
  render(<Form initial={{ children: ['4', '8'] }}/>);
  const user = userEvent.setup();
  await open(user);
  await user.click(button('Remove child'));
  expect(screen.getByLabelText('Child 1 age').value).toBe('4');
  expect(screen.queryByLabelText('Child 2 age')).toBeNull();
  await user.click(button('Add child'));
  expect(screen.getByLabelText('Child 2 age').value).toBe('');
  expect(Array.from(screen.getByLabelText('Child 2 age').options).map(option => option.value)).toEqual(['', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  await user.click(button('Add infant'));
  expect(Array.from(screen.getByLabelText('Infant 1 age').options).map(option => option.value)).toEqual(['', '0', '1']);
});

test('Done reveals missing ages, then closes and restores trigger focus after valid selection', async () => {
  render(<Form initial={{ children: [''], infants: [''] }}/>);
  const user = userEvent.setup();
  await open(user);
  await user.click(button('Done'));
  expect(screen.getByRole('alert').textContent).toMatch(/Choose an age/);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Child 1 age')));
  await user.selectOptions(screen.getByLabelText('Child 1 age'), '6');
  await user.selectOptions(screen.getByLabelText('Infant 1 age'), '0');
  await user.click(button('Done'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button(/Travelers.*3 travelers/));
});

test('native form validation reopens a closed picker and focuses the first missing age', async () => {
  const onSearch = vi.fn();
  render(<Form initial={{ children: [''], infants: [''] }} onSearch={onSearch}/>);
  const user = userEvent.setup();
  await user.click(button('Search'));
  expect(onSearch).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Travelers' })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Child 1 age')));
  await user.selectOptions(screen.getByLabelText('Child 1 age'), '11');
  await user.selectOptions(screen.getByLabelText('Infant 1 age'), '1');
  await user.click(button('Done'));
  await user.click(button('Search'));
  expect(onSearch).toHaveBeenCalledWith({ adults: 1, children: ['11'], infants: ['1'] });
});

test('Escape and outside click preserve edits; Escape returns focus to the trigger', async () => {
  render(<Form/>);
  const user = userEvent.setup();
  await open(user);
  await user.click(button('Add adult'));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button(/Travelers.*2 travelers/));
  await open(user);
  await user.click(button('Outside'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button('Outside'));
  expect(button(/Travelers.*2 travelers/)).toBeTruthy();
});

test('Tab can leave the nonmodal picker and closes it without trapping focus', async () => {
  render(<Form/>);
  const user = userEvent.setup();
  await open(user);
  button('Done').focus();
  await user.tab();
  expect(document.activeElement).toBe(button('Search'));
  expect(screen.queryByRole('dialog')).toBeNull();
});
