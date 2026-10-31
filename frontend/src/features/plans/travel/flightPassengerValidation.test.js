import { expect, it } from 'vitest';
import { passengerErrors, passportMinimum } from './flightPassengerValidation';
const result = { passenger_ages: [30], flight: { outbound: { segments: [{ departure_at: '2027-03-01T12:00:00' }] }, inbound: { segments: [{ departure_at: '2027-12-31T12:00:00' }] } } };
const passenger = { first_name: 'Alex', last_name: "O’Tester", date_of_birth: '1997-03-01', nationality: 'HU', document_issue_country: 'HU', document_number: 'TEST00001', document_expiry: '2028-01-01' };
const contact = { first_name: 'Alex', last_name: 'Tester', email: 'test@example.com', phone_country_code: '36', phone_number: '2025550123' };
const errors = (changes, expected = 30) => passengerErrors([{ ...passenger, ...changes }], contact, { ...result, passenger_ages: [expected] }, '2026-10-31');
it('accepts valid details and rolls the strict expiry minimum into the next year', () => {
  expect(errors({})).toEqual({}); expect(passportMinimum(result)).toBe('2028-01-01');
  expect(errors({ document_expiry: '2027-12-31' })).toHaveProperty('passenger-0-document_expiry');
});
it.each([
  ['2015-03-01', 30, true], ['2015-03-02', 30, false],
  ['2022-03-01', 5, true], ['2022-03-02', 5, false],
  ['2026-03-01', 1, true], ['2025-03-01', 1, false],
  ['2024-02-29', 3, true], ['2024-02-30', 3, false],
  ['2027-01-01', 0, false], ['1900-01-01', 30, false],
])('checks birth date %s against departure age %s', (date, age, valid) => {
  expect(!errors({ date_of_birth: date }, age)['passenger-0-date_of_birth']).toBe(valid);
});
it('rejects whitespace-only names and missing or malformed fields', () => {
  const invalid = errors({ first_name: '\u00a0 ', last_name: '<name>', date_of_birth: '', document_expiry: '', document_number: 'real', nationality: '', document_issue_country: 'XX' });
  expect(Object.keys(invalid)).toHaveLength(7);
});
