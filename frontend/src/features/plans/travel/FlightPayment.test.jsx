// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { FlightPayment } from './FlightPayment';
import { stripeSandbox } from './stripeSandbox';
vi.mock('./paymentRecovery', () => ({ rememberPaymentReturn: vi.fn().mockResolvedValue(), forgetPaymentDraft: vi.fn() }));
vi.mock('./stripeSandbox', () => ({ stripeSandbox: vi.fn() }));
const intent = (status,livemode=false) => ({paymentIntent:{status,livemode}});
let stripe;
beforeEach(() => { stripe={retrievePaymentIntent:vi.fn().mockResolvedValue(intent('requires_payment_method'))};stripeSandbox.mockResolvedValue(stripe);sessionStorage.clear(); });
afterEach(() => {cleanup();vi.clearAllMocks();vi.useRealTimers();});
async function message(frame,type,extra={}) {await act(async () => window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:frame.contentWindow,data:{source:'travella-liteapi',type,...extra}})));}
it('gates SDK mounting on consent and sends its secret only to the frame after a verified handshake',async () => {
 const props={secret:'pi_fixture_secret_test',onAuthorized:vi.fn()};
 const view=render(<FlightPayment {...props} consent={false}/>);await act(async()=>{});
 expect(screen.queryByTitle('Secure payment form')).toBeNull();
 view.rerender(<FlightPayment {...props} consent/>);
 const frame=await screen.findByTitle('Secure payment form');const send=vi.spyOn(frame.contentWindow,'postMessage');
 await message(frame,'ready');expect(send).toHaveBeenCalledWith({type:'start-liteapi',secret:props.secret,buttonText:'Pay'},location.origin);
 expect(frame.src).not.toContain('secret');expect(sessionStorage.length).toBe(0);expect(props.onAuthorized).not.toHaveBeenCalled();
});
it('ignores forged sources and duplicate returns, verifying the original intent before booking',async () => {
 const done=vi.fn();render(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done}/>);
 const frame=await screen.findByTitle('Secure payment form');stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));
 await act(async()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{source:'travella-liteapi',type:'returned'}})));
 expect(done).not.toHaveBeenCalled();
 await message(frame,'returned');expect(done).toHaveBeenCalledOnce();
 expect(stripe.retrievePaymentIntent).toHaveBeenLastCalledWith('pi_fixture_secret_test');
});
it('does not finalize unconfirmed or live payments and can retry the same intent',async () => {
 const done=vi.fn();render(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done}/>);
 const frame=await screen.findByTitle('Secure payment form');stripe.retrievePaymentIntent.mockResolvedValue(intent('processing'));
 await message(frame,'returned');expect(done).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('not been confirmed');
 stripe.retrievePaymentIntent.mockResolvedValue(intent('succeeded',true));fireEvent.click(screen.getByText('Check payment again'));await act(async()=>{});
 expect(done).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('could not be verified');
 stripe.retrievePaymentIntent.mockResolvedValue(intent('requires_capture'));fireEvent.click(screen.getByText('Check payment again'));await act(async()=>{});
 expect(done).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Finish test booking'));await act(async()=>{});expect(done).toHaveBeenCalledOnce();
});
it('preserves the form on decline and bounds resize messages',async()=>{
 const done=vi.fn(),busy=vi.fn();render(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done} onBusyChange={busy}/>);
 const frame=await screen.findByTitle('Secure payment form');await message(frame,'submitting');expect(busy).toHaveBeenLastCalledWith(true);
 await message(frame,'declined');expect(busy).toHaveBeenLastCalledWith(false);expect(done).not.toHaveBeenCalled();expect(screen.getByTitle('Secure payment form')).toBe(frame);
 await message(frame,'height',{height:999999});expect(frame.style.height).toBe('2400px');
});
it('removes the frame and ignores its late return after consent is withdrawn',async()=>{
 const done=vi.fn();const view=render(<FlightPayment secret="pi_fixture_secret_test" consent onAuthorized={done}/>);
 const frame=await screen.findByTitle('Secure payment form');const source=frame.contentWindow;
 view.rerender(<FlightPayment secret="pi_fixture_secret_test" consent={false} onAuthorized={done}/>);
 await act(async()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source,data:{source:'travella-liteapi',type:'returned'}})));
 expect(done).not.toHaveBeenCalled();expect(screen.queryByTitle('Secure payment form')).toBeNull();
});
