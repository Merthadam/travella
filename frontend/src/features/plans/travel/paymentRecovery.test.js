// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { rememberPaymentReturn, recoverPaymentDraft, forgetPaymentDraft } from './paymentRecovery';
const plan='11111111-1111-1111-1111-111111111111';
const draft={guests:[{first_name:'Alex',last_name:'Tester'}],contact:{email:'sandbox@example.com'},staying:true};
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('crypto',webcrypto);});
afterEach(()=>vi.unstubAllGlobals());
it('recovers guest details with the same payment secret without storing plaintext or the key',async()=>{
 await rememberPaymentReturn(plan,'stays','pi_test_secret_private',draft);
 const stored=JSON.stringify(sessionStorage);expect(stored).not.toMatch(/Alex|Tester|sandbox@example|pi_test_secret_private/);
 expect(await recoverPaymentDraft(plan,'stays','pi_test_secret_private')).toEqual(draft);
 forgetPaymentDraft(plan,'stays');expect(sessionStorage.length).toBe(0);
});
it('rejects another payment secret and expired encrypted data',async()=>{
 await rememberPaymentReturn(plan,'stays','pi_test_secret_private',draft);
 expect(await recoverPaymentDraft(plan,'stays','pi_other_secret_private')).toBeNull();
 await rememberPaymentReturn(plan,'stays','pi_test_secret_private',draft);
 const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now()+16*60*1000);
 expect(await recoverPaymentDraft(plan,'stays','pi_test_secret_private')).toBeNull();clock.mockRestore();
});
it('returns no draft when browser storage is disabled',async()=>{
 const get=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
 const remove=vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw new Error('blocked');});
 expect(await recoverPaymentDraft(plan,'stays','pi_test_secret_private')).toBeNull();get.mockRestore();remove.mockRestore();
});
