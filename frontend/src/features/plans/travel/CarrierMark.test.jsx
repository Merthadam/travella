import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

afterEach(cleanup);
// Resolve optionally so the initial RED is a behavior assertion, not a load error.
const modules = import.meta.glob('./CarrierMark.jsx');
const module = modules['./CarrierMark.jsx'] ? await modules['./CarrierMark.jsx']() : {};
test('observed carrier marks preserve accessible names through image failure', () => {
  expect(module.CarrierMark).toBeTypeOf('function');
  const { CarrierMark } = module;
  render(<CarrierMark name="Observed Air" code="OA" logo="https://assets.nuitee.flights/airlines/OA.svg"/>);
  const img = screen.getByRole('img', { name: 'Observed Air logo' });
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(img.getAttribute('width')).toBe('32');
  fireEvent.error(img);
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('Observed Air')).toBeTruthy();
});
test('unsafe missing and relative logos retain neutral carrier identity', () => {
  expect(module.CarrierMark).toBeTypeOf('function');
  for (const logo of [null, '/logo.svg', 'https://unverified.example/logo.svg', 'https://assets.nuitee.flights/logo.svg?token=secret', 'https://assets.nuitee.flights:8443/logo.svg', 'https://user:secret@assets.nuitee.flights/logo.svg']) {
    const view = render(<module.CarrierMark name="Known carrier" logo={logo}/>);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Known carrier')).toBeTruthy();
    view.unmount();
  }
});
test('carrier grouping retains mixed marketing and operating identities without inferred codes', () => {
  expect(module.flightCarriers).toBeTypeOf('function');
  const leg = segments => ({ segments });
  expect(module.flightCarriers({ outbound: leg([{ airline: 'First Air', marketing_code: 'FA', operating_airline: 'Operator', operating_code: 'OP' }]), inbound: leg([{ airline: 'Return Air', flight_number: 'XX 123' }]) })).toEqual([
    { name: 'First Air', code: 'FA', logo: null }, { name: 'Return Air', code: null, logo: null },
  ]);
});
