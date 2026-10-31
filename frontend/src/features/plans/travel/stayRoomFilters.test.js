import { expect, test } from 'vitest';
import { filterStayRooms } from './stayRoomFilters';
const offer = (id, amount, extra = {}) => ({ id, total: { amount, currency: 'EUR' }, ...extra });
const ids = (rooms, filters = {}) => filterStayRooms(rooms, { currency: 'EUR', ...filters }).map(room => room.id);

test('sorts comparable totals including supplied taxes, keeping unknown and foreign prices last', () => {
  const rooms = [offer('taxed', '100', { excluded_taxes: [{ amount: '40', currency: 'EUR' }] }), offer('unknown', null), offer('lower-total', '120'), offer('foreign', 1, { total: { amount: '1', currency: 'USD' } }), offer('unknown-tax', 10, { excluded_taxes: [{ amount: null, currency: 'EUR' }] }), offer('zero', '0')];
  expect(ids(rooms)).toEqual(['zero', 'lower-total', 'taxed', 'unknown', 'foreign', 'unknown-tax']);
  expect(rooms.map(room => room.id)).toEqual(['taxed', 'unknown', 'lower-total', 'foreign', 'unknown-tax', 'zero']);
  expect(ids(rooms, { sort: 'provider' })).toEqual(rooms.map(room => room.id));
});

test.each([null, undefined, '', ' ', 'no price', '-1', Infinity])('does not sort an invalid amount %s as a cheap offer', invalid => {
  expect(ids([offer('invalid', invalid), offer('known', '100')])).toEqual(['known', 'invalid']);
});

test('meal matching is conservative, handles provider variants and requires every bundled room to match', () => {
  const rooms = ['Room Only', ' room   only ', 'Breakfast Included', 'Bed & Breakfast', 'Breakfast Included / Breakfast Included', 'Breakfast Included / Room Only', 'No breakfast included', null, 'Half Board'].map((board_name, index) => offer(String(index), '100', { board_name }));
  expect(ids(rooms, { meal: 'room' })).toEqual(['0', '1']);
  expect(ids(rooms, { meal: 'breakfast' })).toEqual(['2', '3', '4']);
  expect(ids(rooms)).toHaveLength(9);
});

test('refundable filter requires confirmed terms and combines with meal choice', () => {
  const rooms = [offer('yes', 1, { refundable: true, board_name: 'Room Only' }), offer('no', 1, { refundable: false }), offer('unknown', 1), offer('breakfast', 1, { refundable: true, board_name: 'Breakfast Included' })];
  expect(ids(rooms, { cancellation: 'refundable' })).toEqual(['yes', 'breakfast']);
  expect(ids(rooms, { cancellation: 'refundable', meal: 'breakfast' })).toEqual(['breakfast']);
});
