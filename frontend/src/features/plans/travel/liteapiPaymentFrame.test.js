// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { it, expect, vi } from 'vitest';
const html = readFileSync(new URL('../../../../public/liteapi-payment.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../../../public/liteapi-payment.js', import.meta.url), 'utf8');
it('scrubs provider return parameters before loading any callback assets', () => {
  const dom = new JSDOM(html, { url: 'https://travella.test/liteapi-payment.html?payment_intent_client_secret=pi_private_secret_test&redirect_status=succeeded#private', runScripts: 'outside-only' });
  dom.window.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  expect(dom.window.location.href).toBe('https://travella.test/liteapi-payment.html');
  expect(html.indexOf('history.replaceState')).toBeLessThan(html.indexOf('<script src='));
  expect(dom.window.document.querySelector('script[src*="payment-wrapper"]')).toBeNull(); dom.window.close();
});
it('resumes only a valid unexpired local checkout, ignoring provider return data', () => {
  const valid = '/plans/11111111-1111-1111-1111-111111111111?checkout=stays';
  for (const [route, expires, expected] of [[valid, Date.now()+1000, valid], ['https://evil.test', Date.now()+1000, '/plans'], [valid, 0, '/plans']]) {
    const location = { replace: vi.fn() }, sessionStorage = { getItem: () => JSON.stringify({ route, expires }), removeItem: vi.fn() };
    runInNewContext(script, { location, sessionStorage });
    expect(location.replace).toHaveBeenCalledWith(expected); expect(sessionStorage.removeItem).toHaveBeenCalledWith('travella:payment-return');
  }
});
