import React, { useEffect, useRef, useState } from 'react';
import { request } from '../../api';
import { AccountIcon } from './AccountIcon';

export function AccountIdentity({ setting, account, onSaved, onExpired, onProtected, onBusy, cancel }) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState(null);
  const [invalidField, setInvalidField] = useState(null);
  const form = useRef(null);
  const alert = useRef(null);
  const attempt = useRef(null);
  const alive = useRef(true);
  const lock = useRef(false);
  const identity = account?.identity;
  const names = identity && { first_name: identity.first_name, last_name: identity.last_name };
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(names);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onProtected?.(Boolean(dirty || uncertain)); return () => onProtected?.(false); }, [dirty, uncertain, onProtected]);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { if (draft) form.current?.querySelector('input')?.focus(); }, [Boolean(draft)]);
  useEffect(() => {
    if (error) (invalidField ? form.current?.elements.namedItem(invalidField) : alert.current)?.focus();
  }, [error, invalidField]);
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
    onSaved(saved); setLatest(saved.identity); setConflict(false); setUncertain(false); attempt.current = null;
    setNotice('Review the latest saved details and your unsaved changes before saving again.');
  }
  async function save(event) {
    event?.preventDefault();
    const missing = ['first_name', 'last_name'].find(field => !draft[field].trim());
    setInvalidField(missing || null);
    if (missing) { setError(missing === 'first_name' ? 'Enter your first name.' : 'Enter your last name.'); return; }
    await run(async () => {
      attempt.current ||= { ...draft, expected_names: names, event_id: crypto.randomUUID() };
      const saved = await request('/auth/account/name', attempt.current, { method: 'PATCH' });
      if (!alive.current) return;
      onSaved(saved); setDraft(null); setLatest(null); setUncertain(false); attempt.current = null; setNotice('Your name was saved.');
    });
  }
  if (!identity) return <><p role="alert"><AccountIcon name="error" /> We couldn't load this setting. Try again.</p><button onClick={() => run(refresh)} disabled={busy}>Retry</button></>;
  return <div aria-busy={busy}>
    {error && <p id="account-name-error" ref={alert} tabIndex={-1} role="alert"><AccountIcon name="error" />{error}</p>}<p role="status">{notice}</p>
    {setting === 'name' ? <>{draft ? <form ref={form} onSubmit={save} noValidate>
      {latest && <div><h3>Latest saved details</h3><dl className="account-values"><dt>First name</dt><dd>{latest.first_name || 'Not provided'}</dd><dt>Last name</dt><dd>{latest.last_name || 'Not provided'}</dd></dl><h3>Your unsaved changes</h3></div>}
      <fieldset disabled={busy || uncertain || conflict}>{['first_name', 'last_name'].map((field, index) => <label key={field}>{index ? 'Last name' : 'First name'}<input name={field} required maxLength={128} aria-invalid={invalidField === field || undefined} aria-describedby={error ? 'account-name-error' : undefined} autoComplete={index ? 'family-name' : 'given-name'} value={draft[field]} onChange={event => { attempt.current = null; if (invalidField) setError(''); setInvalidField(null); setDraft({ ...draft, [field]: event.target.value }); }} /></label>)}</fieldset>
      {uncertain && <button type="button" disabled={busy} onClick={() => save()}>Check saved details</button>}
      {conflict && <button type="button" disabled={busy} onClick={() => run(refresh)}>Review latest details</button>}
      <div className="account-actions"><button type="button" disabled={busy} onClick={() => cancel(() => { setDraft(null); setLatest(null); setError(''); setUncertain(false); })}>Cancel</button><button className="account-primary" disabled={busy || uncertain || conflict}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form> : <><p>How we address you across Travella.</p><dl className="account-values"><dt>First name</dt><dd>{identity.first_name || 'Not provided'}</dd><dt>Last name</dt><dd>{identity.last_name || 'Not provided'}</dd></dl><button className="account-primary" onClick={() => { setDraft(names); setNotice(''); }}>Edit your name</button></>}</> : <EmailIdentity account={account} onSaved={onSaved} onExpired={onExpired} onProtected={onProtected} onBusy={onBusy} cancel={cancel} />}
  </div>;
}

function EmailIdentity({ account, onSaved, onExpired, onProtected, onBusy, cancel }) {
  const [stage, setStage] = useState('summary');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const verification = useRef(null);
  const operation = useRef(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const form = useRef(null);
  const alert = useRef(null);
  const pending = account.pending_email;
  useEffect(() => { alive.current = true; return () => { alive.current = false; verification.current = null; operation.current = null; }; }, []);
  useEffect(() => { onProtected?.(stage !== 'summary' || uncertain); return () => onProtected?.(false); }, [stage, uncertain, onProtected]);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { form.current?.querySelector('input')?.focus(); }, [stage]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  function leave() {
    verification.current = null; operation.current = null; setPassword(''); setCode(''); setEmail(''); setStage('summary'); setUncertain(false); setError('');
  }
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (err) {
      if (!alive.current) return;
      if (err.status === 401) { leave(); onExpired?.(); }
      else {
        setError(err.message || "We couldn't confirm the result. Check saved details.");
        if (['verification_required', 'verification_failed'].includes(err.code)) { verification.current = null; setStage('password'); }
        if (err.code === 'obsolete_operation') { verification.current = null; operation.current = null; setStage('summary'); }
        if (!err.status || err.status >= 500) setUncertain(true);
      }
    } finally { lock.current = false; if (alive.current) { setBusy(false); setPassword(''); setCode(''); } }
  }
  async function check() {
    const saved = await request('/auth/account');
    if (!alive.current) return;
    onSaved(saved); setUncertain(false); verification.current = null;
    if (saved.pending_email?.resumable) { operation.current = saved.pending_email.operation_id; setEmail(saved.pending_email.new_email); setStage('pending'); }
    else { operation.current = null; setStage('summary'); }
  }
  async function submit(event) {
    event.preventDefault();
    const current = stage;
    await run(async () => {
      let result;
      if (current === 'password' || current === 'factor') {
        result = await request(current === 'password' ? '/auth/account/verification' : '/auth/account/verification/complete', current === 'password' ? { purpose: 'email_change', password } : { verification_id: verification.current, code });
        if (!alive.current) return;
        if (!['verified', 'mfa_required'].includes(result.state) || !result.verification_id) throw new Error('Verification result unavailable.');
        verification.current = result.verification_id; setStage(result.state === 'verified' ? 'email' : 'factor');
      } else if (current === 'email') {
        result = await request('/auth/account/email/start', { new_email: email, verification_id: verification.current, event_id: crypto.randomUUID() });
        if (!alive.current) return;
        verification.current = null;
        if (result.state !== 'awaiting_verification' || !result.operation_id || !result.account) throw new Error('Email result unavailable.');
        operation.current = result.operation_id; onSaved(result.account); setStage('pending');
      } else if (current === 'pending') {
        result = await request('/auth/account/email/verify', { operation_id: operation.current, code });
        if (!alive.current) return;
        if (result.state !== 'complete' || !result.account?.identity?.email_verified || result.account.identity.email !== email) throw new Error('Email result unavailable.');
        onSaved(result.account); leave(); setNotice('Your email address was updated.');
      }
    });
  }
  return <div aria-busy={busy}>
    <div className="account-values"><p>{account.identity.email}</p><p>{account.identity.email_verified ? 'Verified' : 'Verification status unavailable'}</p></div>
    {error && <p id="account-email-error" ref={alert} tabIndex={-1} role="alert"><AccountIcon name="error" />{error}</p>}<p role="status">{notice}</p>
    {uncertain && <button disabled={busy} onClick={() => run(check)}>Check saved details</button>}
    {stage === 'summary' ? <>{pending ? <><p>{pending.resumable ? 'Awaiting verification. Verify your new email address to complete the change.' : 'An email change is pending in another session.'}</p>{pending.resumable && <button onClick={() => { operation.current = pending.operation_id; setEmail(pending.new_email); setStage('pending'); }}>Resume email change</button>}</> : account.capabilities.email_change.available ? <button className="account-primary" onClick={() => setStage('password')}>Change email address</button> : <p>Email changes are unavailable right now. Your current email address is unchanged.</p>}
      <button disabled={busy} onClick={() => run(check)}>Check availability</button></> : <form ref={form} onSubmit={submit}>
      <fieldset disabled={busy || uncertain} aria-describedby={error ? 'account-email-error' : undefined}>
        {stage === 'password' && <><h3>Confirm it's you</h3><label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} /></label></>}
        {stage === 'factor' && <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" value={code} onChange={event => setCode(event.target.value)} /></label>}
        {stage === 'email' && <label>New email address<input type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} /></label>}
        {stage === 'pending' && <><p>A verification code was requested for {email}. Your current email stays unchanged until verification completes.</p><label>Email verification code<input autoComplete="one-time-code" required maxLength={64} value={code} onChange={event => setCode(event.target.value)} /></label><button type="button" onClick={() => run(async () => {
          const result = await request('/auth/account/email/resend', { operation_id: operation.current });
          if (alive.current && result.state === 'awaiting_verification') setNotice('A new verification code was requested.');
        })}>Resend code</button></>}
      </fieldset>
      <p>Leaving this editor does not revoke a code already sent.</p>
      <div className="account-actions"><button type="button" disabled={busy} onClick={() => cancel ? cancel(leave) : leave()}>Cancel</button><button className="account-primary" disabled={busy || uncertain}>{busy ? 'Checking…' : stage === 'email' ? 'Send verification code' : stage === 'pending' ? 'Verify email address' : 'Continue'}</button></div>
    </form>}
  </div>;
}
