import React, { useEffect, useRef, useState } from 'react';
import { stripeSandbox } from './stripeSandbox';
import './liteapi-payment.css';
import { rememberPaymentReturn, forgetPaymentDraft } from './paymentRecovery';

const authorized = intent => intent?.livemode === false && ['succeeded', 'requires_capture'].includes(intent.status);
const payable = intent => intent?.livemode === false && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status);

export function LiteApiPayment({ secret, consent, onAuthorized, onBusyChange, planId, kind, recoveryData, buttonText = 'Pay' }) {
  const frame = useRef(null), callbacks = useRef({}), checking = useRef(false);
  callbacks.current = { onAuthorized, onBusyChange, recoveryData };
  const [retry, setRetry] = useState(0), [state, setState] = useState('loading'), [height, setHeight] = useState(440);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true, timer, completed = false;
    checking.current = false; setError(''); setState('loading');
    callbacks.current.onBusyChange?.(false);
    const fail = message => { clearTimeout(timer); if (live) { setError(message); setState('error'); callbacks.current.onBusyChange?.(false); } };
    async function check(finish) {
      if (checking.current) return;
      checking.current = true;
      try {
        const stripe = await stripeSandbox();
        if (!live) return;
        const result = await stripe.retrievePaymentIntent(secret);
        if (!live) return;
        if (result.error || !result.paymentIntent || result.paymentIntent.livemode !== false) throw new Error();
        if (authorized(result.paymentIntent)) {
          clearTimeout(timer); setState('authorized');
          if (finish && consent && !completed) {
            completed = true; callbacks.current.onBusyChange?.(true);
            await callbacks.current.onAuthorized?.();
            forgetPaymentDraft(planId, kind);
          }
        } else if (!finish && payable(result.paymentIntent)) {
          if (consent) await rememberPaymentReturn(planId, kind, secret, callbacks.current.recoveryData);
          if (live) setState('form');
        }
        else fail('Payment has not been confirmed. Check its status before continuing.');
      } catch { fail('The secure payment could not be verified. Check your connection and try again.'); }
      finally { checking.current = false; if (live) callbacks.current.onBusyChange?.(false); }
    }
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.source !== 'travella-liteapi') return;
      const { type } = event.data;
      if (type === 'ready' && consent) frame.current.contentWindow.postMessage({ type: 'start-liteapi', secret, buttonText }, window.location.origin);
      if (type === 'mounted') clearTimeout(timer);
      if (type === 'height' && Number.isFinite(event.data.height)) setHeight(Math.max(200, Math.min(2400, event.data.height + 12)));
      if (type === 'submitting') callbacks.current.onBusyChange?.(true);
      if (type === 'declined') callbacks.current.onBusyChange?.(false);
      if (type === 'error') fail('The secure payment form could not load. Check your connection and try again.');
      if (type === 'returned') { clearTimeout(timer); void check(true); }
    }
    window.addEventListener('message', receive);
    void check(false);
    if (consent) timer = setTimeout(() => fail('The secure payment form could not load. Check your connection and try again.'), 45000);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('message', receive); };
  }, [secret, retry, consent, buttonText, planId, kind]);

  async function finish() {
    if (!consent || checking.current) return;
    checking.current = true; callbacks.current.onBusyChange?.(true);
    try {
      const stripe = await stripeSandbox();
      const result = await stripe.retrievePaymentIntent(secret);
      if (!result.error && authorized(result.paymentIntent)) { await callbacks.current.onAuthorized?.(); forgetPaymentDraft(planId, kind); }
      else { setState('error'); setError('Payment has not been confirmed. Check its status before continuing.'); }
    } catch { setError('The payment could not be verified. Try again to check this same payment.'); }
    finally { checking.current = false; callbacks.current.onBusyChange?.(false); }
  }
  return <section className="liteapi-payment" aria-label="Secure LiteAPI payment">
    <p className="liteapi-payment-note">Test mode · Use <b>4242 4242 4242 4242</b>, a future expiry and any three-digit CVC.</p>
    {state === 'authorized' ? <><p role="status">Test payment already authorized. Confirm the booking details above to finish without paying again.</p><button className="flight-primary" type="button" disabled={!consent} onClick={finish}>Finish test booking</button></> : !consent ? <p className="liteapi-payment-note">Confirm the booking details above to open secure payment.</p> : <>
      {state === 'loading' && <p role="status">Loading secure payment…</p>}
      {state === 'form' && <iframe key={`${secret}:${retry}`} ref={frame} src="/liteapi-payment.html" title="Secure payment form" className="liteapi-payment-frame" style={{ height }} allow="payment" referrerPolicy="no-referrer"/>}
    </>}
    {error && <p className="flight-error" role="alert">{error}</p>}
    {consent && (state === 'error' || state === 'authorized') && <button type="button" className="flight-text-button" onClick={() => setRetry(value => value + 1)}>Check payment again</button>}
    <p className="liteapi-payment-note">Payment details are handled securely by LiteAPI’s payment provider.</p>
  </section>;
}
