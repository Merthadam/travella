// @vitest-environment jsdom
import React, { createRef } from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { FlightPayment } from './FlightPayment';

let events, stripe, card;
beforeEach(() => {
  events = {};
  card = { on: vi.fn((name, cb) => { events[name] = cb; }), mount: vi.fn(() => events.ready()), destroy: vi.fn() };
  stripe = { retrievePaymentIntent: vi.fn().mockResolvedValue({ paymentIntent: { status: 'requires_payment_method', livemode: false } }), elements: () => ({ create: () => card }), confirmCardPayment: vi.fn() };
  window.Stripe = vi.fn(() => stripe);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ publicKey: 'pk_test_fixture' }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('keeps card data hosted, reports declines and only authorizes a successful test intent', async () => {
  const ref = createRef(), ready = vi.fn();
  render(<FlightPayment ref={ref} secret="pi_fixture_secret_test" onReady={ready}/>);
  await act(async () => {});
  expect(card.mount).toHaveBeenCalledOnce();
  expect(document.querySelector('input')).toBeNull();
  act(() => events.change({ complete: true })); expect(ready).toHaveBeenLastCalledWith(true);
  stripe.confirmCardPayment.mockResolvedValueOnce({ error: { message: 'Your card was declined.' } });
  let accepted;
  await act(async () => { accepted = await ref.current.authorize(); });
  expect(accepted).toBe(false); expect(screen.getByRole('alert').textContent).toContain('declined');
  stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: 'requires_capture', livemode: false } });
  await act(async () => { accepted = await ref.current.authorize(); });
  expect(accepted).toBe(true);
  expect(stripe.confirmCardPayment).toHaveBeenLastCalledWith('pi_fixture_secret_test', { payment_method: { card } });
  await act(async () => { accepted = await ref.current.authorize(); });
  expect(stripe.confirmCardPayment).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(sessionStorage)).not.toContain('secret');
});
