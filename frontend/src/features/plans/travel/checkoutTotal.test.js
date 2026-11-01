import { expect, it } from 'vitest';
import { checkoutTotal } from './FlightExtras';

const seat = { id: 'seat', price: { amount: '12.00', currency: 'EUR' }, passenger_index: 0, quantity: 1 };
const bag = { id: 'bag', price: { amount: '30.00', currency: 'EUR' }, passenger_index: 0, quantity: 2 };
const choice = value => ({ id: value.id, passenger_index: value.passenger_index, quantity: value.quantity });
const result = { flight: { price: { amount: '272.10', currency: 'EUR' } }, selected_services: [seat, bag], services: [seat, bag] };

it('previews removals without dropping already confirmed baggage or changing provider data', () => {
  expect(checkoutTotal(result, [choice(bag)])).toEqual({ amount: '260.10', currency: 'EUR' });
  expect(result.flight.price.amount).toBe('272.10');
});
it('does not preview unchanged choices or invent prices for missing or foreign-currency offers', () => {
  expect(checkoutTotal(result, [choice(bag), choice(seat)])).toBeNull();
  expect(checkoutTotal(result, [{ id: 'missing', passenger_index: 0, quantity: 1 }])).toBeNull();
  expect(checkoutTotal({ ...result, services: [{ ...seat, price: { amount: '15', currency: 'USD' } }] }, [choice(seat)])).toBeNull();
});
it('counts the same offer separately for multiple travelers and quantities', () => {
  const choices = [choice(seat), { ...choice(seat), passenger_index: 1 }, { ...choice(bag), quantity: 3 }];
  expect(checkoutTotal(result, choices)).toEqual({ amount: '314.10', currency: 'EUR' });
});
