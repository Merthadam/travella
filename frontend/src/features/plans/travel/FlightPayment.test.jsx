// @vitest-environment jsdom
import React, { createRef } from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { FlightPayment } from './FlightPayment';
import { stripeSandbox } from './stripeSandbox';
vi.mock('./stripeSandbox', () => ({ stripeSandbox: vi.fn() }));
let stripe, fields;
const intent = status => ({ paymentIntent: { status, livemode: false } });
beforeEach(() => {
 fields = {};
 stripe = { retrievePaymentIntent: vi.fn().mockResolvedValue(intent('requires_payment_method')), confirmCardPayment: vi.fn(), elements: () => ({ create: type => {
  const events = {}; const field = { events, on: (name,fn) => { events[name] = fn; }, mount: vi.fn(() => events.ready()), destroy: vi.fn() }; fields[type] = field; return field;
 } }) };
 stripeSandbox.mockResolvedValue(stripe); sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
async function setup() { const ref=createRef(), ready=vi.fn(); render(<FlightPayment ref={ref} secret="pi_fixture_secret_test" onReady={ready}/>); await act(async () => {}); return {ref,ready}; }
it('requires all three hosted fields and sends billing directly to Stripe, never storage', async () => {
 const {ref,ready}=await setup();
 expect(Object.keys(fields)).toEqual(['cardNumber','cardExpiry','cardCvc']);
 act(() => fields.cardNumber.events.change({complete:true})); expect(ready).toHaveBeenLastCalledWith(false);
 act(() => { fields.cardExpiry.events.change({complete:true}); fields.cardCvc.events.change({complete:true}); }); expect(ready).toHaveBeenLastCalledWith(true);
 fireEvent.change(screen.getByLabelText('Name on card'),{target:{value:'Alex Tester'}});
 fireEvent.change(screen.getByLabelText('Postal code'),{target:{value:'1000'}});
 const country=screen.getByRole('combobox',{name:'Billing country'});
 fireEvent.click(country);
 expect(screen.getAllByRole('option')).toHaveLength(10);
 fireEvent.click(screen.getByRole('button',{name:'Next Billing country choices'}));
 expect(screen.getByText('Page 2 of 25')).toBeTruthy();
 fireEvent.change(country,{target:{value:'Hungary'}});
 fireEvent.click(screen.getByRole('option',{name:'Hungary'}));
 fireEvent.click(country); fireEvent.change(country,{target:{value:'Not a country'}});
 expect(screen.getByText('No matches. Try another search.')).toBeTruthy();
 fireEvent.keyDown(country,{key:'Escape'});
 expect(country.value).toBe('Hungary');
 stripe.confirmCardPayment.mockResolvedValueOnce({error:{message:'Your card was declined.'}});
 let result; await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(false); expect(screen.getByRole('alert').textContent).toContain('declined');
 stripe.confirmCardPayment.mockResolvedValueOnce(intent('requires_capture'));
 await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(true);
 expect(stripe.confirmCardPayment).toHaveBeenLastCalledWith('pi_fixture_secret_test',{payment_method:{card:fields.cardNumber,billing_details:{name:'Alex Tester',address:{country:'HU',postal_code:'1000'}}}});
 expect(sessionStorage.length).toBe(0);
});
it('recovers a lost authorization response without confirming the same payment again', async () => {
 const {ref}=await setup(); stripe.confirmCardPayment.mockRejectedValueOnce(new Error('network'));
 let result; await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(false);
 stripe.retrievePaymentIntent.mockResolvedValue(intent('succeeded'));
 await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(true);
 expect(stripe.confirmCardPayment).toHaveBeenCalledOnce();
});
it('reopens an authorized test intent without requiring new card or billing input', async () => {
 stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
 const {ref,ready}=await setup(); expect(Object.keys(fields)).toHaveLength(0); expect(ready).toHaveBeenLastCalledWith(true);
 expect(screen.getByText(/already authorized/)).toBeTruthy();
 let result; await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(true); expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
});
it('fails closed for live intents and permits retry after a loader failure', async () => {
 stripeSandbox.mockRejectedValueOnce(new Error('offline'));
 await setup(); expect(screen.getByRole('alert').textContent).toContain('could not load');
 stripe.retrievePaymentIntent.mockResolvedValue({paymentIntent:{livemode:true,status:'succeeded'}});
 fireEvent.click(screen.getByRole('button',{name:'Reload card form'})); await act(async () => {});
 expect(screen.getByRole('alert').textContent).toContain('could not load'); expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
});
it('does not confirm a processing payment again', async () => {
 const {ref}=await setup(); stripe.retrievePaymentIntent.mockResolvedValue(intent('processing'));
 let result; await act(async () => { result=await ref.current.authorize(); }); expect(result).toBe(false); expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
 expect(screen.getByRole('alert').textContent).toContain('still processing');
});
