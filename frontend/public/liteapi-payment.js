/* A dedicated document keeps the SDK's form and redirect outside React's forms.
 * No card/billing fields, provider internals or confirmation logic are replaced. */
(() => {
  const send = (type, extra = {}) => parent.postMessage({ source: 'travella-liteapi', type, ...extra }, location.origin);
  if (parent === window) {
    // Stripe can return at the top level. The HTML has already scrubbed its
    // query. Recover only an allow-listed Plan route, never a URL from Stripe.
    let route = '/plans';
    try {
      const saved = JSON.parse(sessionStorage.getItem('travella:payment-return'));
      if (saved?.expires > Date.now() && /^\/plans\/[0-9a-f-]{36}\?checkout=(flights|stays)$/.test(saved.route)) route = saved.route;
      sessionStorage.removeItem('travella:payment-return');
    } catch { /* Fall back to the Plans list. */ }
    location.replace(route);
    return;
  }
  if (window.paymentReturned) { send('returned'); return; }
  let started = false, ready = false;
  const report = () => {
    send('height', { height: Math.ceil(document.body.getBoundingClientRect().height) });
    if (!ready && document.querySelector('#payment-element iframe')) { ready = true; send('mounted'); }
    if (document.getElementById('st-error-message')?.textContent.trim()) send('declined');
  };
  new ResizeObserver(report).observe(document.body);
  new MutationObserver(report).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('submit', () => send('submitting'), true);
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'start-liteapi' || started) return;
    if (typeof event.data.secret !== 'string' || !/^pi_.+_secret_.+$/.test(event.data.secret)) { send('error'); return; }
    started = true;
    const script = document.createElement('script');
    script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
    script.onerror = () => send('error');
    script.onload = () => {
      try {
        const sdk = new window.LiteAPIPayment({
          publicKey: 'sandbox', secretKey: event.data.secret,
          targetElement: '#payment-element', returnUrl: new URL('/liteapi-payment.html', location.origin).href,
          submitButton: { text: event.data.buttonText || 'Pay' },
        });
        Promise.resolve(sdk.handlePayment()).catch(() => send('error'));
      } catch { send('error'); }
    };
    document.head.appendChild(script);
  });
  send('ready');
})();
