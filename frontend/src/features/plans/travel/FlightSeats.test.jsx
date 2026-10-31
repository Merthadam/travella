import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FlightSeats } from './FlightSeats';

afterEach(cleanup);
const seat = (id, column, segment = 0, eligible = [0, 1]) => ({ id, kind: 'seat', label: `Seat 12${column}`, seat_row: 12, seat_column: column, segment_index: segment, passenger_indexes: eligible, price: { amount: '12', currency: 'EUR' } });
const services = [seat('a', 'A'), seat('b', 'B'), seat('c', 'C'), seat('return-a', 'A', 1), seat('return-b', 'B', 1), { id: 'bag', kind: 'baggage', segment_index: 0, passenger_indexes: [0], price: { amount: '30', currency: 'EUR' } }];
const result = { passenger_count: 2, services, flight: { outbound: { segments: [{ origin: 'BUD', destination: 'LIS' }] }, inbound: { segments: [{ origin: 'LIS', destination: 'BUD' }] } } };
const passengers = [{ first_name: 'Alex', last_name: 'Tester' }, { first_name: 'Sam', last_name: 'Tester' }];
const choice = (id, passenger_index = 0) => ({ id, passenger_index, quantity: 1 });
function setup(initial = [], value = result) {
  const changed = vi.fn();
  function Harness() {
    const [choices, setChoices] = useState(initial);
    return <FlightSeats result={value} passengers={passengers} choices={choices} onChange={next => { changed(next); setChoices(next); }}/>;
  }
  render(<Harness/>);
  return changed;
}
const clickSeat = label => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Seat ${label} ·`) }));
const traveler = name => within(screen.getByRole('group', { name: 'Choose traveler' })).getByRole('button', { name: new RegExp(name) });

it('assigns successive seats to different travelers and stops before replacing the last seat', () => {
  const changed = setup();
  clickSeat('12A');
  expect(traveler('Sam').getAttribute('aria-pressed')).toBe('true');
  clickSeat('12B');
  expect(changed).toHaveBeenLastCalledWith([choice('a'), choice('b', 1)]);
  expect(screen.getByRole('button', { name: /^Seat 12A/ }).textContent).toContain('P1');
  expect(screen.getByRole('button', { name: /^Seat 12B/ }).textContent).toContain('P2');
  expect(screen.getByRole('button', { name: /^Seat 12C/ }).disabled).toBe(true);
  expect(screen.getByRole('heading', { name: 'Your seat choices are ready' })).toBeTruthy();
  clickSeat('12C');
  expect(changed).toHaveBeenCalledTimes(2);
});

it('changes only an explicitly selected traveler and protects seats occupied by someone else', () => {
  const changed = setup([choice('a'), choice('b', 1), choice('return-a'), choice('bag')]);
  fireEvent.click(traveler('Alex'));
  expect(screen.getByRole('button', { name: /^Seat 12B/ }).disabled).toBe(true);
  clickSeat('12C');
  expect(changed).toHaveBeenLastCalledWith([choice('b', 1), choice('return-a'), choice('bag'), choice('c')]);
  expect(traveler('Alex').textContent).toContain('12C');
});

it('offers airline assignment for one traveler on one flight without dropping other extras', () => {
  const changed = setup([choice('a'), choice('b', 1), choice('return-a'), choice('bag')]);
  fireEvent.click(traveler('Alex'));
  fireEvent.click(screen.getByRole('button', { name: 'Use airline assignment for Alex Tester on this flight' }));
  expect(changed).toHaveBeenLastCalledWith([choice('b', 1), choice('return-a'), choice('bag')]);
  expect(traveler('Alex').textContent).toContain('Airline assignment');
  fireEvent.click(traveler('Sam')); clickSeat('12C');
  expect(traveler('Alex').getAttribute('aria-pressed')).toBe('false');
});

it('clears seats on all flights while retaining bags, and allows choosing seats again', () => {
  const changed = setup([choice('a'), choice('b', 1), choice('return-a'), choice('bag')]);
  fireEvent.click(screen.getByRole('button', { name: 'Use airline assignment for all flights' }));
  expect(changed).toHaveBeenLastCalledWith([choice('bag')]);
  expect(screen.getByText('No charge')).toBeTruthy();
  expect(screen.getByText(/Airline assignment for this flight. No paid seats selected/)).toBeTruthy();
  expect(screen.queryByText('FRONT OF CABIN ↑')).toBeNull();
  fireEvent.click(traveler('Alex')); clickSeat('12C');
  expect(changed).toHaveBeenLastCalledWith([choice('bag'), choice('c')]);
  expect(traveler('Sam').getAttribute('aria-pressed')).toBe('false');
});

it('tracks return-flight seats independently and restores outbound selections', () => {
  const changed = setup();
  clickSeat('12A'); clickSeat('12B');
  fireEvent.click(screen.getByRole('button', { name: /Return · LIS → BUD/ }));
  expect(traveler('Alex').getAttribute('aria-pressed')).toBe('true');
  clickSeat('12B'); clickSeat('12A');
  expect(changed).toHaveBeenLastCalledWith([choice('a'), choice('b', 1), choice('return-b'), choice('return-a', 1)]);
  fireEvent.click(screen.getByRole('button', { name: /Outbound · BUD → LIS/ }));
  expect(traveler('Alex').textContent).toContain('12A');
  expect(traveler('Sam').textContent).toContain('12B');
  expect(screen.getByText('€48.00')).toBeTruthy();
});

it('skips infants and travelers without eligible inventory when advancing', () => {
  setup([], { ...result, passenger_count: 3, passenger_ages: [30, 1, 8], services: [seat('a', 'A', 0, [0]), seat('b', 'B', 0, [2])] });
  expect(traveler('Sam').disabled).toBe(true);
  expect(traveler('Sam').textContent).toContain('Infant · no separate seat');
  expect(screen.getByRole('button', { name: /^Seat 12B/ }).disabled).toBe(true);
  clickSeat('12A');
  expect(traveler('Passenger 3').getAttribute('aria-pressed')).toBe('true');
  clickSeat('12B');
  expect(screen.getByRole('heading', { name: 'Your seat choices are ready' })).toBeTruthy();
});

it('blocks the same physical seat when separate provider IDs target different travelers', () => {
  setup([], { ...result, services: [seat('adult-a', 'A', 0, [0]), seat('child-a', 'A', 0, [1]), seat('b', 'B', 0, [1])] });
  clickSeat('12A');
  expect(screen.getAllByRole('button', { name: /^Seat 12A/ })).toHaveLength(1);
  expect(screen.getByRole('button', { name: /^Seat 12A/ }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: /^Seat 12B/ }).disabled).toBe(false);
});

it('supports missing maps and empty inventories without inventing seats', () => {
  const changed = setup([], { ...result, services: [] });
  expect(screen.getByText(/No selectable seats returned/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Use airline assignment for all flights' }));
  expect(changed).toHaveBeenLastCalledWith([]);
  expect(screen.queryByText('FRONT OF CABIN ↑')).toBeNull();
});
