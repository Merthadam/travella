import React, { useEffect, useRef, useState } from 'react';
import { request } from '../../api';

export function AccountIdentity({ setting, account, onSaved, onExpired, onProtected, onBusy, cancel }) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const attempt = useRef(null);
  const alive = useRef(true);
  const lock = useRef(false);
  const identity = account?.identity;
  const names = identity && { first_name: identity.first_name, last_name: identity.last_name };
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(names);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onProtected?.(Boolean(dirty || uncertain)); return () => onProtected?.(false); }, [dirty, uncertain, onProtected]);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (err) {
      if (!alive.current) return;
      if (err.status === 401) onExpired();
      else {
        setError(err.message || "We couldn't load this setting. Try again.");
        if (err.code === 'account_conflict' || err.code === 'request_reused') setConflict(true);
        else if (!err.status || err.status >= 500) setUncertain(Boolean(attempt.current));
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function refresh() {
    const saved = await request('/auth/account');
    if (!alive.current) return;
    onSaved(saved); setConflict(false); setUncertain(false); attempt.current = null;
  }
  async function save(event) {
    event?.preventDefault();
    await run(async () => {
      attempt.current ||= { ...draft, expected_names: names, event_id: crypto.randomUUID() };
      const saved = await request('/auth/account/name', attempt.current, { method: 'PATCH' });
      if (!alive.current) return;
      onSaved(saved); setDraft(null); setUncertain(false); attempt.current = null; setNotice('Your name was saved.');
    });
  }
  if (!identity) return <><p role="alert">We couldn't load this setting. Try again.</p><button onClick={() => run(refresh)} disabled={busy}>Try again</button></>;
  return <div aria-busy={busy}>
    {error && <p role="alert">{error}</p>}<p role="status">{notice}</p>
    {setting === 'name' ? <>{draft ? <form onSubmit={save}>
      <fieldset disabled={busy || uncertain || conflict}>{['first_name', 'last_name'].map((field, index) => <label key={field}>{index ? 'Last name' : 'First name'}<input required maxLength={128} autoComplete={index ? 'family-name' : 'given-name'} value={draft[field]} onChange={event => { attempt.current = null; setDraft({ ...draft, [field]: event.target.value }); }} /></label>)}</fieldset>
      {uncertain && <button type="button" disabled={busy} onClick={() => save()}>Check saved details</button>}
      {conflict && <button type="button" disabled={busy} onClick={() => run(refresh)}>Review latest details</button>}
      <div className="account-actions"><button type="button" disabled={busy} onClick={() => cancel(() => { setDraft(null); setUncertain(false); })}>Cancel</button><button className="account-primary" disabled={busy || uncertain || conflict}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form> : <><p className="account-values">{[identity.first_name, identity.last_name].filter(Boolean).join(' ') || 'Your name has not been added.'}</p><button className="account-primary" onClick={() => { setDraft(names); setNotice(''); }}>Edit your name</button></>}</> : <>
      <p className="account-values">{identity.email}</p>
      <p>Email changes are currently unavailable.</p><button disabled={busy} onClick={() => run(refresh)}>Check availability</button>
    </>}
  </div>;
}
