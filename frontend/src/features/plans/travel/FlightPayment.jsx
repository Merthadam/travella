import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { stripeSandbox } from './stripeSandbox';
import './flight-payment.css';

const authorized = intent => intent && intent.livemode === false && ['succeeded', 'requires_capture'].includes(intent.status);
// PAN, expiry and CVC live only in provider-hosted iframes. Billing details are
// sent directly to Stripe and never enter Travella's API or recovery storage.
export const FlightPayment = forwardRef(function FlightPayment({ secret, onReady, country = 'US' }, ref) {
  const hosts = useRef({}), payment = useRef(null), callback = useRef(onReady);
  callback.current = onReady;
  const [billing, setBilling] = useState({ name: '', country, postal: '' });
  const [message, setMessage] = useState('Loading secure card fields…'), [error, setError] = useState(''), [retry, setRetry] = useState(0), [paid, setPaid] = useState(false);
  useEffect(() => {
    let live = true; const fields = [], complete = {};
    payment.current = null; callback.current(false); setPaid(false); setError(''); setMessage('Loading secure card fields…');
    stripeSandbox().then(async stripe => {
      const result = await stripe.retrievePaymentIntent(secret);
      if (!live) return;
      if (result.error || !result.paymentIntent || result.paymentIntent.livemode !== false) throw new Error('Payment unavailable');
      payment.current = { stripe };
      if (authorized(result.paymentIntent)) { setPaid(true); callback.current(true); setMessage('Test payment already authorized. Confirm below to finish this same booking.'); return; }
      if (!['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(result.paymentIntent.status)) throw new Error('Payment unavailable');
      const elements = stripe.elements();
      for (const type of ['cardNumber', 'cardExpiry', 'cardCvc']) {
        const field = elements.create(type, { style: { base: { color: '#24382e', fontFamily: 'system-ui, sans-serif', fontSize: '16px', '::placeholder': { color: '#7a847e' } } } });
        fields.push(field);
        field.on('ready', () => { if (live) setMessage(''); });
        field.on('change', event => { if (live) { complete[type] = event.complete; callback.current(['cardNumber','cardExpiry','cardCvc'].every(key => complete[key])); setError(event.error?.message || ''); } });
        field.on('loaderror', () => { if (live) { callback.current(false); setError('The secure card fields could not load. Reload the form below.'); } });
        field.mount(hosts.current[type]);
        if (type === 'cardNumber') payment.current.card = field;
      }
    }).catch(() => { if (live) { setMessage(''); setError('The secure card form could not load. Check your connection and reload the form.'); } });
    return () => { live = false; payment.current = null; fields.forEach(field => field.destroy()); };
  }, [secret, retry]);
  useImperativeHandle(ref, () => ({ async authorize() {
    const current = payment.current;
    if (!current) return false;
    setError('');
    try {
      // Reconcile the same intent first, including a lost confirmation response.
      const check = await current.stripe.retrievePaymentIntent(secret);
      if (check.error || !check.paymentIntent || check.paymentIntent.livemode !== false) throw new Error('Unknown payment');
      if (authorized(check.paymentIntent)) { setPaid(true); return true; }
      if (!['requires_payment_method','requires_confirmation','requires_action'].includes(check.paymentIntent.status)) {
        setError('This payment is still processing or no longer available. Reload the form to check its status.'); return false;
      }
      const result = await current.stripe.confirmCardPayment(secret, { payment_method: { card: current.card, billing_details: { name: billing.name.trim(), address: { country: billing.country, postal_code: billing.postal.trim() } } } });
      if (result.error) { setError(result.error.message || 'Your test card was declined. Check the details or try another test card.'); return false; }
      if (!authorized(result.paymentIntent)) throw new Error('Unknown payment');
      setPaid(true); setMessage('Test payment authorized. Finalizing your reservation…'); return true;
    } catch { setError('We could not verify the test payment. Try again to check this same payment.'); return false; }
  } }), [secret, billing]);
  return <section className="flight-card-card-payment" aria-label="Card payment">
    <div className="flight-card-payment-method"><span>◉ &nbsp; Credit or debit card</span><span className="flight-card-card-brands" aria-label="Visa, Mastercard and American Express">VISA <b>●●</b> AMEX</span></div>
    <p className="flight-card-test-card">Test mode · Use <b>4242 4242 4242 4242</b>, a future expiry and any three-digit CVC.</p>
    <div hidden={paid} className="flight-card-card-fields">
      <label htmlFor="flight-card-card-name">Name on card<input id="flight-card-card-name" autoComplete="cc-name" required={!paid} maxLength={120} pattern=".*\S.*" value={billing.name} onChange={e => setBilling(old => ({ ...old, name: e.target.value }))} placeholder="Full name as shown on card"/></label>
      <div className="flight-card-hosted-label">Card number<div ref={element => { hosts.current.cardNumber = element; }} className="flight-card-hosted-field" aria-label="Secure card number"/></div>
      <div className="flight-card-card-row"><div className="flight-card-hosted-label">Expiry date<div ref={element => { hosts.current.cardExpiry = element; }} className="flight-card-hosted-field" aria-label="Secure expiry date"/></div><div className="flight-card-hosted-label">Security code<div ref={element => { hosts.current.cardCvc = element; }} className="flight-card-hosted-field" aria-label="Secure security code"/></div></div>
      <div className="flight-card-card-row"><label htmlFor="flight-card-card-country">Billing country<select id="flight-card-card-country" autoComplete="country" value={billing.country} onChange={e => setBilling(old => ({ ...old, country: e.target.value }))}>{countries.map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label><label htmlFor="flight-card-card-postal">Postal code<input id="flight-card-card-postal" autoComplete="postal-code" required={!paid} maxLength={20} pattern=".*\S.*" value={billing.postal} onChange={e => setBilling(old => ({ ...old, postal: e.target.value }))} placeholder="Billing postal code"/></label></div>
    </div>
    {message && <p role="status" className="flight-card-payment-status">{message}</p>}
    {error && <div className="flight-error"><p role="alert">{error}</p><button type="button" className="flight-text-button" onClick={() => setRetry(value => value + 1)}>Reload card form</button></div>}
    <p className="flight-card-payment-security">Encrypted card details go directly to Stripe’s test environment. Travella does not store them.</p>
  </section>;
});
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ').map(code => [code,regionNames.of(code)]).sort((a,b) => a[1].localeCompare(b[1]));
