let sdk;
export async function stripeSandbox() {
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

