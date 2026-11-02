// Redirect recovery only: never store plaintext guest/contact details or the
// provider secret. The key is derived from the server-recovered payment intent.
const prefix = 'travella:payment-draft:';
const ttl = 15 * 60 * 1000;
const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
async function key(secret) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function rememberPaymentReturn(planId, kind, secret, draft) {
  const route = `/plans/${encodeURIComponent(planId)}?checkout=${kind}`;
  if (!/^\/plans\/[0-9a-f-]{36}\?checkout=(flights|stays)$/.test(route)) throw new Error('Invalid payment return');
  if (draft) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(draft));
    const aad = new TextEncoder().encode(`${planId}:${kind}`);
    const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await key(secret),data);
    sessionStorage.setItem(`${prefix}${kind}:${planId}`,JSON.stringify({expires:Date.now()+ttl,iv:encode(iv),data:encode(new Uint8Array(ciphertext))}));
  }
  sessionStorage.setItem('travella:payment-return',JSON.stringify({route,expires:Date.now()+ttl}));
}
export async function recoverPaymentDraft(planId, kind, secret) {
  const storageKey = `${prefix}${kind}:${planId}`;
  try {
    const record = JSON.parse(sessionStorage.getItem(storageKey));
    if (!record || record.expires <= Date.now()) { sessionStorage.removeItem(storageKey); return null; }
    const data = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv),additionalData:new TextEncoder().encode(`${planId}:${kind}`)},await key(secret),decode(record.data));
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    return null;
  }
}
export function forgetPaymentDraft(planId, kind) {
  try {sessionStorage.removeItem(`${prefix}${kind}:${planId}`);sessionStorage.removeItem('travella:payment-return');} catch { /* Optional cleanup. */ }
}
