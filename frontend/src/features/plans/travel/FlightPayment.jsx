import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

let sdk;
async function stripeSandbox() {
  if (!sdk) sdk = (async () => {
    if (!window.Stripe) await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://js.stripe.com/v3/'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });
    const response = await fetch('https://payment-wrapper.liteapi.travel/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: 'sandbox' }) });
    if (!response.ok) throw new Error('Payment unavailable');
    const config = await response.json();
    if (!config.publicKey?.startsWith('pk_test_')) throw new Error('Sandbox payment unavailable');
    return window.Stripe(config.publicKey);
  })().catch(error => { sdk = null; throw error; });
  return sdk;
}

// Card data stays inside Stripe's hosted field. Only its sandbox client secret
// enters this component; neither is saved in browser storage or sent to our API.
export const FlightPayment = forwardRef(function FlightPayment({ secret, onReady }, ref) {
  const host = useRef(null), payment = useRef(null), readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const [message, setMessage] = useState('Loading secure test-card fields…'), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true, card;
    payment.current = null; readyCallback.current(false); setError(''); setMessage('Loading secure test-card fields…');
    stripeSandbox().then(async stripe => {
      const check = await stripe.retrievePaymentIntent(secret);
      if (!live) return;
      if (check.error || !check.paymentIntent || check.paymentIntent.livemode) throw new Error('Payment unavailable');
      if (['succeeded', 'requires_capture'].includes(check.paymentIntent.status)) {
        payment.current = { stripe, authorized: true }; readyCallback.current(true); setMessage('Test payment authorized. Confirm to finish your booking.'); return;
      }
      const elements = stripe.elements();
      card = elements.create('card', { hidePostalCode: false, style: { base: { color: '#18333a', fontFamily: 'system-ui, sans-serif', fontSize: '16px', '::placeholder': { color: '#637779' } } } });
      card.on('ready', () => { if (live) setMessage(''); });
      card.on('change', event => { if (live) { readyCallback.current(event.complete); setError(event.error?.message || ''); } });
      card.on('loaderror', () => { if (live) setError('The secure card field could not load. Retry below.'); });
      card.mount(host.current); payment.current = { stripe, card };
    }).catch(() => { if (live) { setMessage(''); setError('The secure test-card form could not load. Retry or check your connection.'); } });
    return () => { live = false; payment.current = null; card?.destroy(); };
  }, [secret, retry]);
  useImperativeHandle(ref, () => ({ async authorize() {
    if (!payment.current) return false;
    setError('');
    if (payment.current.authorized) return true;
    try {
      const value = await payment.current.stripe.confirmCardPayment(secret, { payment_method: { card: payment.current.card } });
      if (value.error) { setError(value.error.message || 'Test payment was declined. Try another test card.'); return false; }
      if (value.paymentIntent?.livemode || !['succeeded', 'requires_capture'].includes(value.paymentIntent?.status)) { setError('Payment is not authorized yet. Check the card details and try again.'); return false; }
      payment.current.authorized = true; setMessage('Test payment authorized. Finalizing your reservation…'); return true;
    } catch { setError('Could not verify test payment. Try again to check this same payment.'); return false; }
  } }), [secret]);
  return <section className="my-5 space-y-3 rounded-xl border border-current/20 p-5" aria-label="Sandbox card payment"><span className="flight-badge">SANDBOX · NO REAL CHARGE</span><h3>Pay with a test card</h3><p className="text-sm">Use <b>4242 4242 4242 4242</b>, a future expiry, any three-digit CVC and a test postal code.</p><div className="rounded-lg border border-slate-200 bg-white p-4" ref={host} aria-label="Secure card details"/>{message && <p role="status" className="text-sm">{message}</p>}{error && <><p role="alert" className="text-sm">{error}</p><button type="button" className="flight-text-button" onClick={() => setRetry(n => n + 1)}>Reload card form</button></>}<p className="text-xs opacity-70">Card details go directly to Stripe’s test environment. Travella does not store them.</p></section>;
});
