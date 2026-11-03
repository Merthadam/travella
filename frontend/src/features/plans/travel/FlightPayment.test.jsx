// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { FlightPayment } from './FlightPayment';
import { stripeSandbox } from './stripeSandbox';
import { rememberPaymentReturn, forgetPaymentDraft } from './paymentRecovery';
vi.mock('./paymentRecovery', () => ({ rememberPaymentReturn: vi.fn().mockResolvedValue(), forgetPaymentDraft: vi.fn() }));
vi.mock('./stripeSandbox', () => ({ stripeSandbox: vi.fn() }));
const intent = (status, livemode = false) => ({ paymentIntent: { status, livemode } });
let stripe, elements, payment, events;
beforeEach(() => {
  events = {};
  payment = { on: vi.fn((name, fn) => { events[name] = fn; }), mount: vi.fn(), destroy: vi.fn(), update: vi.fn() };
  elements = { create: vi.fn(() => payment), submit: vi.fn().mockResolvedValue({}) };
  stripe = { elements: vi.fn(() => elements), retrievePaymentIntent: vi.fn().mockResolvedValue(intent('requires_payment_method')), confirmPayment: vi.fn().mockResolvedValue(intent('requires_capture')) };
  stripeSandbox.mockResolvedValue(stripe); sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
async function mount(props = {}) {
  const done = vi.fn(); const view = render(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done} {...props}/>);
  await screen.findByRole('combobox', { name: 'Billing country' });
  act(() => events.ready());
  return { done, view };
}
function choose(name = 'Hungary') {
  fireEvent.change(screen.getByRole('combobox', { name: 'Billing country' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('option', { name }));
}
async function pay() { fireEvent.click(screen.getByRole('button', { name: 'Pay' })); await act(async () => {}); }
it.each([null, { status: 'pending' }])('retains recovery data until the booking is confirmed (%j)', async outcome => {
  const done = vi.fn().mockResolvedValue(outcome);
  await mount({ onAuthorized: done }); choose();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
  await pay();
  expect(done).toHaveBeenCalledOnce();
  expect(forgetPaymentDraft).not.toHaveBeenCalled();
});
it('shows booking progress across the parent consent reset and clears recovery only on confirmation', async () => {
  let resolve;
  const done = vi.fn(() => new Promise(r => { resolve = r; }));
  const { view } = await mount({ onAuthorized: done }); choose();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
  await pay();
  view.rerender(<FlightPayment secret="pi_fixture_secret_test" consent={false} onAuthorized={done}/>);
  expect(screen.getByText('Payment authorized. Confirming your test booking…')).toBeTruthy();
  expect(screen.queryByText(/already authorized/)).toBeNull();
  await act(async () => resolve({ status: 'confirmed' }));
  expect(forgetPaymentDraft).toHaveBeenCalledOnce();
});
it('gates hosted fields on consent and hides only their native country control', async () => {
  const view = render(<FlightPayment secret="pi_fixture_secret_test" consent={false}/>); await act(async () => {});
  expect(stripe.elements).not.toHaveBeenCalled();
  view.rerender(<FlightPayment secret="pi_fixture_secret_test" consent/>);
  await screen.findByRole('combobox', { name: 'Billing country' });
  expect(elements.create).toHaveBeenCalledWith('payment', expect.objectContaining({ fields: { billingDetails: { address: { country: 'never' } } } }));
  expect(stripe.elements).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'pi_fixture_secret_test' }));
  expect(screen.getByRole('button', { name: 'Pay' }).disabled).toBe(true);
  expect(stripe.confirmPayment).not.toHaveBeenCalled();
});
it('requires an actual selection, bounds the list, and sends the chosen country directly to Stripe without remounting', async () => {
  const { done } = await mount(); await pay();
  expect(screen.getByText('Choose your billing country.')).toBeTruthy(); expect(stripe.confirmPayment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('combobox')); expect(screen.getAllByRole('option')).toHaveLength(10);
  choose(); choose('Iceland');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'not-a-country' } });
  expect(screen.getByText('No matches. Try another search.')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
  expect(screen.getByRole('combobox').value).toBe('Iceland');
  expect(payment.update).toHaveBeenLastCalledWith({ defaultValues: { billingDetails: { address: { country: 'IS' } } } });
  expect(payment.mount).toHaveBeenCalledOnce();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
  await pay(); expect(done).toHaveBeenCalledOnce();
  expect(stripe.confirmPayment).toHaveBeenCalledWith({ elements, confirmParams: { return_url: new URL('/liteapi-payment.html', location.origin).href, payment_method_data: { billing_details: { address: { country: 'IS' } } } }, redirect: 'if_required' });
  expect(stripe.retrievePaymentIntent).toHaveBeenLastCalledWith('pi_fixture_secret_test');
  expect(sessionStorage.length).toBe(0);
});
it('keeps the same fields on decline and prevents duplicate submissions while confirming', async () => {
  const { done } = await mount(); choose();
  let resolve; stripe.confirmPayment.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  await pay(); expect(screen.getByRole('button', { name: 'Processing payment…' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Processing payment…' })); expect(stripe.confirmPayment).toHaveBeenCalledOnce();
  await act(async () => resolve({ error: { message: 'Your card was declined.' } }));
  expect(screen.getByRole('alert').textContent).toBe('Your card was declined.');
  expect(payment.destroy).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture')); await pay(); expect(done).toHaveBeenCalledOnce();
});
it('does not confirm invalid hosted fields or finalize an unverified/live payment; recovers the same intent', async () => {
  const { done } = await mount(); choose();
  elements.submit.mockResolvedValueOnce({ error: { message: 'Your card number is incomplete.' } });
  await pay(); expect(stripe.confirmPayment).not.toHaveBeenCalled();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('processing')); await pay();
  expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('not been confirmed');
  stripe.retrievePaymentIntent.mockResolvedValue(intent('succeeded', true)); fireEvent.click(screen.getByText('Check payment again')); await act(async () => {});
  expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('could not be verified');
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture')); fireEvent.click(screen.getByText('Check payment again')); await act(async () => {});
  expect(done).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Finish test booking')); await act(async () => {}); expect(done).toHaveBeenCalledOnce();
});
it('destroys hosted fields and ignores late success after consent is withdrawn', async () => {
  const done = vi.fn(); const { view } = await mount({ onAuthorized: done }); choose();
  let resolve; stripe.confirmPayment.mockImplementationOnce(() => new Promise(r => { resolve = r; })); await pay();
  view.rerender(<FlightPayment secret="pi_fixture_secret_test" consent={false} onAuthorized={done}/>);
  await act(async () => resolve(intent('requires_capture')));
  expect(payment.destroy).toHaveBeenCalledOnce(); expect(done).not.toHaveBeenCalled(); expect(screen.queryByRole('combobox')).toBeNull();
  stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
  view.rerender(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done}/>);
  await screen.findByText('Finish test booking');
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(done).not.toHaveBeenCalled(); expect(stripe.confirmPayment).toHaveBeenCalledOnce();
});
it('fails closed on recovery-storage failure and offers a status check after a network exception', async () => {
  const { done } = await mount(); choose();
  rememberPaymentReturn.mockRejectedValueOnce(new Error('Storage unavailable')); await pay();
  expect(stripe.confirmPayment).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Check payment again')); await screen.findByRole('combobox'); act(() => events.ready()); choose();
  stripe.confirmPayment.mockRejectedValueOnce(new Error('Network')); await pay();
  expect(screen.getByRole('alert').textContent).toContain('Check this same payment'); expect(done).not.toHaveBeenCalled();
});
