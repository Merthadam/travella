import React, { useEffect, useRef, useState } from 'react';
import { request } from '../../api';

const unknownCopy = "We couldn't confirm the result. Check account status before starting another change.";

export function AccountSecurity({ setting, account, onAccountSaved, onExpired, onProtected, onBusy, cancel }) {
  const [stage, setStage] = useState('summary');
  const [password, setPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const proof = useRef(null);
  const eventId = useRef(null);
  const alive = useRef(true);
  const lock = useRef(false);
  const form = useRef(null);
  const alert = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; proof.current = null; eventId.current = null; }; }, []);
  useEffect(() => { onProtected?.(stage !== 'summary'); return () => onProtected?.(false); }, [stage, onProtected]);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { form.current?.querySelector('input')?.focus(); }, [stage]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  function clearSecrets() { setPassword(''); setNextPassword(''); setConfirmation(''); setCode(''); proof.current = null; }
  function leave() { clearSecrets(); eventId.current = null; setStage('summary'); setError(''); }
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (err) {
      if (!alive.current) return;
      clearSecrets();
      if (err.status === 401) { leave(); onExpired(); }
      else if (eventId.current && (!err.status || err.status >= 500 || err.code === 'result_unknown')) { setStage('unknown'); setError(unknownCopy); }
      else { setStage('summary'); setError(err.message || 'This change could not be completed.'); }
    } finally { lock.current = false; if (alive.current) { setBusy(false); setCode(''); } }
  }
  async function mutate() {
    eventId.current = crypto.randomUUID();
    const result = await request('/auth/account/password', { current_password: password, new_password: nextPassword, verification_id: proof.current, event_id: eventId.current });
    if (!alive.current) return;
    clearSecrets();
    if (result.state !== 'complete' || !result.account) { setStage('unknown'); setError(unknownCopy); return; }
    onAccountSaved(result.account); leave(); setNotice('Your password was changed.');
  }
  async function submit(event) {
    event.preventDefault();
    if (stage === 'password' && nextPassword !== confirmation) { setError("Your new passwords don't match."); return; }
    await run(async () => {
      const result = await request(stage === 'factor' ? '/auth/account/verification/complete' : '/auth/account/verification',
        stage === 'factor' ? { verification_id: proof.current, code } : { purpose: 'password_change', password });
      if (!alive.current) return;
      if (!result.verification_id || !['verified', 'mfa_required'].includes(result.state)) throw new Error('Verification result unavailable.');
      proof.current = result.verification_id;
      if (result.state === 'mfa_required') { setStage('factor'); return; }
      await mutate();
    });
  }
  async function check() {
    const result = await request('/auth/account/operation-status', { event_id: eventId.current });
    if (!alive.current) return;
    onAccountSaved(result.account);
    if (result.state === 'complete') { leave(); setNotice('Your password was changed.'); }
    else { setStage('unknown'); setError("The result is still unconfirmed. Check access with your new password before explicitly starting a new change."); }
  }
  const policy = account?.password_policy;
  return <div aria-busy={busy}>
    {error && <p ref={alert} tabIndex={-1} role="alert">{error}</p>}<p role="status">{notice}</p>
    {!account ? <p>Status unavailable</p> : stage === 'summary' ? <>
      {setting === 'password' && (account.capabilities?.password_change?.available ? <button className="account-primary" onClick={() => { leave(); setNotice(''); setStage('password'); }}>Change password</button> : <p>Password changes are unavailable right now.</p>)}
    </> : stage === 'unknown' ? <><p>No change will be submitted again automatically.</p><button disabled={busy} onClick={() => run(check)}>Check account status</button><button disabled={busy} onClick={() => cancel(leave)}>Close</button></> : <form ref={form} onSubmit={submit}>
      <fieldset disabled={busy}>
        {stage === 'password' && <>
          <p>{policy ? `Use at least ${policy.minimum_length || 1} characters${policy.require_uppercase ? ', an uppercase letter' : ''}${policy.require_lowercase ? ', a lowercase letter' : ''}${policy.require_numbers ? ', a number' : ''}${policy.require_symbols ? ', a symbol' : ''}.` : 'Your new password must meet your account password policy.'}</p>
          <label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label>New password<input type="password" autoComplete="new-password" required maxLength={256} minLength={policy?.minimum_length || 1} value={nextPassword} onChange={event => setNextPassword(event.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" required maxLength={256} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        </>}
        {stage === 'factor' && <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /></label>}
      </fieldset>
      <div className="account-actions"><button type="button" disabled={busy} onClick={() => cancel(leave)}>Cancel</button><button className="account-primary" disabled={busy}>{busy ? 'Checking…' : stage === 'password' ? 'Save password' : 'Continue'}</button></div>
    </form>}
  </div>;
}
