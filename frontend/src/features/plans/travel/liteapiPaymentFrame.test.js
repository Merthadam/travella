// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { it, expect, vi } from 'vitest';
const html=readFileSync(new URL('../../../../public/liteapi-payment.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../../../../public/liteapi-payment.js',import.meta.url),'utf8');
function setup(search='') {
 const dom=new JSDOM(html,{url:`https://travella.test/liteapi-payment.html${search}`,runScripts:'outside-only'});
 const w=dom.window, parent={postMessage:vi.fn()};Object.defineProperty(w,'parent',{value:parent});
 w.ResizeObserver=class{observe(){}};w.MutationObserver=class{observe(){}};
 w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);w.eval(script);
 return {dom,w,parent};
}
it('scrubs all provider return parameters before assets and reports only a return signal',()=>{
 const {dom,w,parent}=setup('?payment_intent_client_secret=pi_private_secret_test&redirect_status=succeeded');
 expect(w.location.href).toBe('https://travella.test/liteapi-payment.html');
 expect(parent.postMessage).toHaveBeenCalledExactlyOnceWith({source:'travella-liteapi',type:'returned'},'https://travella.test');
 expect(w.document.querySelector('script[src*="payment-wrapper"]')).toBeNull();dom.window.close();
});
it('starts the real sandbox SDK once, only on a same-origin parent handshake',()=>{
 const {dom,w,parent}=setup();const constructor=vi.fn(),handle=vi.fn().mockResolvedValue();
 w.LiteAPIPayment=class{constructor(config){constructor(config);}handlePayment(){return handle();}};
 const data={type:'start-liteapi',secret:'pi_private_secret_test',buttonText:'Pay €100'};
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://other.test',source:parent,data}));
 expect(w.document.querySelector('script[src*="payment-wrapper"]')).toBeNull();
 w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:parent,data}));
 const sdk=w.document.querySelector('script[src*="payment-wrapper"]');expect(sdk.src).toBe('https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1');sdk.onload();
 expect(constructor).toHaveBeenCalledExactlyOnceWith({publicKey:'sandbox',secretKey:data.secret,targetElement:'#payment-element',returnUrl:'https://travella.test/liteapi-payment.html',submitButton:{text:'Pay €100'}});
 expect(handle).toHaveBeenCalledOnce();
 w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:parent,data}));
 expect(w.document.querySelectorAll('script[src*="payment-wrapper"]')).toHaveLength(1);
 expect(JSON.stringify(parent.postMessage.mock.calls)).not.toContain(data.secret);dom.window.close();
});

it('returns the top-level SDK redirect only to a recorded checkout route',async()=>{
 const {runInNewContext}=await import('node:vm');
 for(const route of ['https://evil.test','/plans/11111111-1111-1111-1111-111111111111?checkout=stays']) {
  const window={},location={origin:'https://travella.test',replace:vi.fn()},sessionStorage={getItem:()=>JSON.stringify({route,expires:Date.now()+1000}),removeItem:vi.fn()};
  runInNewContext(script,{window,parent:window,location,sessionStorage});
  expect(location.replace).toHaveBeenCalledWith(route.startsWith('/plans/')?route:'/plans');expect(sessionStorage.removeItem).toHaveBeenCalledWith('travella:payment-return');
 }
});
