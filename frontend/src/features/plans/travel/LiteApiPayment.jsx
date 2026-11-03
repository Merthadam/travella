import React, { useEffect, useRef, useState } from 'react';
import { stripeSandbox } from './stripeSandbox';
import { SearchSelect } from './SearchSelect';
import { countries } from '../../onboarding/catalogs';
import { rememberPaymentReturn, forgetPaymentDraft } from './paymentRecovery';
import './liteapi-payment.css';

const countryOptions = countries.map(({ code, name }) => ({ value: code, label: name }));
const authorized = intent => intent?.livemode === false && ['succeeded', 'requires_capture'].includes(intent.status);
const payable = intent => intent?.livemode === false && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status);
const appearance = {
  theme: 'stripe',
  variables: { colorPrimary: '#366f60', colorText: '#19283b', colorDanger: '#a52a2a', fontFamily: 'system-ui, sans-serif', fontSizeBase: '14px', borderRadius: '8px' },
};

// LiteAPI owns the intent, amount and capture. Stripe hosts the payment fields;
// only billing country is collected by our existing searchable control.
function PaymentForm({ stripe, secret, planId, kind, recoveryData, onAuthorized, onBusyChange, onUncertain, buttonText }) {
  const host = useRef(null), session = useRef(null), callbacks = useRef({});
  callbacks.current = { recoveryData, onAuthorized, onBusyChange, onUncertain };
  const [country, setCountry] = useState(''), [countryError, setCountryError] = useState('');
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const current = { active: true, busy: false };
    session.current = current;
    setReady(false);
    const fail = () => { if (current.active) callbacks.current.onUncertain('The secure payment form could not load. Check your connection and try again.'); };
    const timer = setTimeout(fail, 45000);
    try {
      current.elements = stripe.elements({ clientSecret: secret, appearance });
      current.payment = current.elements.create('payment', {
        layout: { type: 'accordion', defaultCollapsed: false },
        fields: { billingDetails: { address: { country: 'never' } } },
      });
      current.payment.on('ready', () => { clearTimeout(timer); if (current.active) setReady(true); });
      current.payment.on('loaderror', fail);
      current.payment.mount(host.current);
      void rememberPaymentReturn(planId, kind, secret, callbacks.current.recoveryData).catch(fail);
    } catch { fail(); }
    return () => { current.active = false; clearTimeout(timer); current.payment?.destroy(); };
  }, [stripe, secret, planId, kind]);

  function chooseCountry(value) {
    const current = session.current;
    if (!current?.active || current.busy) return;
    setCountry(value); setCountryError('');
    // Keep the same Element/card entry while adapting any remaining address fields.
    current.payment?.update({ defaultValues: { billingDetails: { address: { country: value } } } });
  }
  async function pay() {
    const current = session.current;
    if (!current?.active || current.busy || !ready) return;
    if (!countryOptions.some(option => option.value === country)) { setCountryError('Choose your billing country.'); return; }
    current.busy = true; setBusy(true); setError(''); callbacks.current.onBusyChange?.(true);
    try {
      const validation = await current.elements.submit();
      if (!current.active) return;
      if (validation.error) { setError(validation.error.message || 'Check your payment details.'); return; }
      await rememberPaymentReturn(planId, kind, secret, callbacks.current.recoveryData);
      if (!current.active) return;
      const result = await stripe.confirmPayment({
        elements: current.elements,
        confirmParams: {
          return_url: new URL('/liteapi-payment.html', window.location.origin).href,
          payment_method_data: { billing_details: { address: { country } } },
        },
        redirect: 'if_required',
      });
      if (!current.active) return;
      if (result.error) { setError(result.error.message || 'Payment was declined. Check your details and try again.'); return; }
      // Never finalize from a browser-return status: retrieve the original intent.
      await callbacks.current.onAuthorized();
    } catch {
      if (current.active) callbacks.current.onUncertain('The payment could not be verified. Check this same payment before trying again.');
    } finally {
      current.busy = false;
      if (current.active) { setBusy(false); callbacks.current.onBusyChange?.(false); }
    }
  }
  return <>
    <fieldset className="liteapi-billing-country" disabled={busy}>
      <SearchSelect label="Billing country" name="billing-country" value={country} options={countryOptions} onChange={chooseCountry} error={countryError} required placeholder="Search countries…"/>
    </fieldset>
    {!ready && <p role="status">Loading secure payment…</p>}
    <div ref={host} className="liteapi-payment-element" aria-label="Secure payment form"/>
    {error && <p className="flight-error" role="alert">{error}</p>}
    <button type="button" className="flight-primary" disabled={!ready || busy} onClick={pay}>{busy ? 'Processing payment…' : buttonText}</button>
  </>;
}

export function LiteApiPayment({ secret, consent, onAuthorized, onBusyChange, planId, kind, recoveryData, buttonText = 'Pay' }) {
  const session = useRef(null), callbacks = useRef({});
  callbacks.current = { onAuthorized, onBusyChange, consent };
  const [retry, setRetry] = useState(0), [state, setState] = useState('loading'), [stripe, setStripe] = useState(null);
  const [error, setError] = useState(''), [finishing, setFinishing] = useState(false);
  function fail(message) { setError(message); setState('error'); callbacks.current.onBusyChange?.(false); }
  useEffect(() => {
    const current = { active: true, busy: false, completed: false };
    session.current = current;
    setError(''); setState('loading'); setFinishing(false);
    callbacks.current.onBusyChange?.(false);
    async function load() {
      try {
        const provider = await stripeSandbox();
        if (!current.active) return;
        const result = await provider.retrievePaymentIntent(secret);
        if (!current.active) return;
        if (result.error || result.paymentIntent?.livemode !== false) throw new Error();
        setStripe(provider);
        if (authorized(result.paymentIntent)) setState('authorized');
        else if (payable(result.paymentIntent)) setState('form');
        else fail('Payment has not been confirmed. Check its status before continuing.');
      } catch { if (current.active) fail('The secure payment could not be verified. Check your connection and try again.'); }
    }
    void load();
    return () => { current.active = false; };
  }, [secret, retry, consent, planId, kind]);

  async function finish() {
    const current = session.current;
    if (!current?.active || current.busy || current.completed || !callbacks.current.consent) return;
    current.busy = true; setFinishing(true); callbacks.current.onBusyChange?.(true);
    try {
      const provider = await stripeSandbox();
      if (!current.active) return;
      const result = await provider.retrievePaymentIntent(secret);
      if (!current.active || !callbacks.current.consent) return;
      if (!result.error && authorized(result.paymentIntent)) {
        setState('authorized');
        await callbacks.current.onAuthorized?.();
        current.completed = true;
        forgetPaymentDraft(planId, kind);
      } else fail('Payment has not been confirmed. Check its status before continuing.');
    } catch { if (current.active) fail('The payment could not be verified. Try again to check this same payment.'); }
    finally { current.busy = false; if (current.active) { setFinishing(false); callbacks.current.onBusyChange?.(false); } }
  }
  return <section className="liteapi-payment" aria-label="Secure LiteAPI payment">
    <p className="liteapi-payment-note">Test mode · Use <b>4242 4242 4242 4242</b>, a future expiry and any three-digit CVC.</p>
    {state === 'authorized' ? <><p role="status">Test payment already authorized. Confirm the booking details above to finish without paying again.</p><button className="flight-primary" type="button" disabled={!consent || finishing || session.current?.completed} onClick={finish}>Finish test booking</button></> : !consent ? <p className="liteapi-payment-note">Confirm the booking details above to open secure payment.</p> : <>
      {state === 'loading' && <p role="status">Loading secure payment…</p>}
      {state === 'form' && stripe && <PaymentForm key={`${secret}:${retry}`} stripe={stripe} secret={secret} planId={planId} kind={kind} recoveryData={recoveryData} buttonText={buttonText} onAuthorized={finish} onBusyChange={onBusyChange} onUncertain={fail}/>}
    </>}
    {error && <p className="flight-error" role="alert">{error}</p>}
    {consent && state === 'error' && <button type="button" className="flight-text-button" onClick={() => setRetry(value => value + 1)}>Check payment again</button>}
    <p className="liteapi-payment-note">Payment details are handled securely by LiteAPI’s payment provider.</p>
  </section>;
}
