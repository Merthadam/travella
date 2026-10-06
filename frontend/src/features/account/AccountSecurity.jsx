import React, { useEffect, useRef, useState } from 'react';
import { request } from '../../api';

const unknownCopy = "We couldn't confirm the result. Check account status before starting another change.";

export function AccountSecurity({ setting, account, onAccountSaved, onExpired, onProtected, onBusy, onDisclosure, onAuthenticator, cancel }) {
  const [stage, setStage] = useState('summary');
  const [password, setPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState(null);
  const [setupKey, setSetupKey] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [codes, setCodes] = useState([]);
  const operation = useRef(null);
  const proof = useRef(null);
  const eventId = useRef(null);
  const alive = useRef(true);
  const lock = useRef(false);
  const form = useRef(null);
  const alert = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; proof.current = null; eventId.current = null; operation.current = null; }; }, []);
  useEffect(() => { onProtected?.(stage !== 'summary'); return () => onProtected?.(false); }, [stage, onProtected]);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { onDisclosure?.(stage === 'codes'); return () => onDisclosure?.(false); }, [stage, onDisclosure]);
  useEffect(() => { form.current?.querySelector('input')?.focus(); }, [stage]);
  useEffect(() => { if (error === "Your new passwords don't match.") form.current?.querySelector('[name="confirmation"]')?.focus(); else if (error) alert.current?.focus(); }, [error]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { clearSecrets(); operation.current = null; setStage('summary'); setError('Verification expired. Confirm it is you again to continue.'); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  function clearSecrets() { setPassword(''); setNextPassword(''); setConfirmation(''); setCode(''); setSetupKey(''); setCodes([]); setExpiresAt(null); proof.current = null; }
  function leave() { clearSecrets(); eventId.current = null; setStage('summary'); setError(''); }
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (err) {
      if (!alive.current) return;
      if (err.code === 'invalid_code' && stage === 'enrollment') { setCode(''); setError(err.message); return; }
      clearSecrets();
      if (err.status === 401) { leave(); onExpired(); }
      else if (eventId.current && (!err.status || err.status >= 500 || err.code === 'result_unknown')) { setStage('unknown'); setError(unknownCopy); }
      else { setStage('summary'); setError(err.message || 'This change could not be completed.'); }
    } finally { lock.current = false; if (alive.current) { setBusy(false); setCode(''); } }
  }
  async function mutate() {
    eventId.current = crypto.randomUUID();
    const authorization = { verification_id: proof.current, event_id: eventId.current };
    const result = await request(setting === 'password' ? '/auth/account/password' : setting === 'recovery' ? '/auth/account/recovery-codes/rotate' : `/auth/account/authenticator/${mode === 'disable' ? 'disable' : 'start'}`,
      setting === 'password' ? { ...authorization, current_password: password, new_password: nextPassword } : setting === 'recovery' || mode === 'disable' ? authorization : { ...authorization, mode });
    if (!alive.current) return;
    clearSecrets();
    if (setting === 'recovery' && result.state === 'codes_generated' && Array.isArray(result.codes) && result.codes.length && result.account) {
      onAccountSaved(result.account); setCodes(result.codes); setStage('codes'); setNotice("New recovery codes were generated. Save them now; you won't be able to view them again."); return;
    }
    if (result.state === 'enrollment_required' && result.operation_id && result.secret_code) {
      operation.current = result.operation_id; setSetupKey(result.secret_code); setExpiresAt(Date.now() + result.expires_in * 1000); setStage('enrollment'); return;
    }
    if (result.state !== 'complete' || !result.account) { setStage('unknown'); setError(unknownCopy); return; }
    onAccountSaved(result.account); leave(); setNotice(successCopy());
  }
  function successCopy() { return setting === 'password' ? 'Your password was changed.' : mode === 'disable' ? 'Your authenticator is off.' : 'Your authenticator is on.'; }
  async function submit(event) {
    event.preventDefault();
    if (stage === 'password' && nextPassword !== confirmation) { setError("Your new passwords don't match."); return; }
    await run(async () => {
      if (stage === 'enrollment') {
        const result = await request('/auth/account/authenticator/verify', { operation_id: operation.current, code });
        if (!alive.current) return;
        if (result.state !== 'complete' || result.account?.mfa?.status !== 'on') { clearSecrets(); setStage('unknown'); setError(unknownCopy); return; }
        onAccountSaved(result.account); leave(); setNotice(successCopy()); return;
      }
      const result = await request(stage === 'factor' ? '/auth/account/verification/complete' : '/auth/account/verification',
        stage === 'factor' ? { verification_id: proof.current, code } : { purpose: setting === 'password' ? 'password_change' : setting === 'recovery' ? 'recovery_rotate' : `mfa_${mode}`, password });
      if (!alive.current) return;
      if (!result.verification_id || !['verified', 'mfa_required'].includes(result.state)) throw new Error('Verification result unavailable.');
      proof.current = result.verification_id;
      if (result.state === 'mfa_required') { if (setting !== 'password') setPassword(''); setExpiresAt(Date.now() + (result.expires_in || 300) * 1000); setStage('factor'); return; }
      await mutate();
    });
  }
  async function check() {
    const result = await request('/auth/account/operation-status', { event_id: eventId.current });
    if (!alive.current) return;
    onAccountSaved(result.account);
    if (result.state === 'complete') { leave(); setNotice(setting === 'recovery' ? 'Recovery codes were generated, but their one-time display is no longer available. Replace recovery codes explicitly if you did not save them.' : successCopy()); }
    else { setStage('unknown'); setError(setting === 'password' ? "The result is still unconfirmed. Check access with your new password before explicitly starting a new change." : 'The result is still unconfirmed. Review your authenticator access before starting another change.'); }
  }
  const policy = account?.password_policy;
  const count = account?.recovery_codes?.remaining;
  const recoveryLabel = account?.recovery_codes?.status === 'unavailable' || !Number.isInteger(count) ? 'Status unavailable' : count === 0 ? 'No recovery codes available' : count === 1 ? '1 code remaining' : `${count} codes remaining`;
  async function copyCodes() {
    setError(''); setNotice('');
    try { await navigator.clipboard.writeText(codes.join('\n')); if (alive.current) setNotice('Codes copied.'); }
    catch { if (alive.current) setError("Couldn't copy the codes. Select and copy them manually."); }
  }
  return <div aria-busy={busy}>
    {error && <p id="account-security-error" ref={alert} tabIndex={-1} role="alert">{error}</p>}<p role="status">{notice}</p>
    {!account ? <p>Status unavailable</p> : stage === 'summary' ? <>
      {setting === 'password' && (account.capabilities?.password_change?.available ? <button className="account-primary" onClick={() => { leave(); setNotice(''); setStage('password'); }}>Change password</button> : <p>Password changes are unavailable right now.</p>)}
      {setting === 'authenticator' && <>
        <p>{account.mfa?.status === 'on' ? 'On · Authenticator app' : account.mfa?.status === 'off' ? 'Off' : 'Status unavailable'}</p>
        {account.mfa?.status === 'unavailable' && <p>A previous change may be unconfirmed. Check your current authenticator access before explicitly starting a new change; fresh verification is required.</p>}
        {['setup', 'replace', 'disable'].filter(action => account.capabilities?.authenticator?.[action]).map(action => <button key={action} onClick={() => { leave(); setMode(action); setStage('verify-password'); }}>{action === 'setup' ? 'Set up authenticator' : action === 'replace' ? 'Replace authenticator' : 'Turn off authenticator'}</button>)}
        {!['setup', 'replace', 'disable'].some(action => account.capabilities?.authenticator?.[action]) && <p>Authenticator changes are unavailable right now.</p>}
      </>}
      {setting === 'recovery' && <><p>{recoveryLabel}</p><p>Manage your backup sign-in codes.</p>
        {account.capabilities?.recovery_codes?.rotate ? <button className="account-primary" onClick={() => { leave(); setNotice(''); setStage('verify-password'); }}>{count > 0 ? 'Replace recovery codes' : 'Generate recovery codes'}</button> : account.mfa?.status === 'off' ? <><p>Set up an authenticator before generating recovery codes.</p><button onClick={onAuthenticator}>Set up authenticator</button></> : <p>Recovery code changes are unavailable right now.</p>}
      </>}
    </> : stage === 'codes' ? <><label>Your new recovery codes<textarea readOnly autoComplete="off" rows={10} value={codes.join('\n')} /></label><div className="account-actions"><button onClick={copyCodes}>Copy codes</button><button onClick={() => { leave(); setNotice('Keep your recovery codes somewhere safe.'); }}>I've saved my codes</button></div></> : stage === 'unknown' ? <><p>No change will be submitted again automatically.</p><button disabled={busy} onClick={() => run(check)}>Check account status</button><button disabled={busy} onClick={() => cancel(leave)}>Close</button></> : <form ref={form} onSubmit={submit}>
      <fieldset disabled={busy}>
        {stage === 'verify-password' && <>
          <h3>Confirm it's you</h3>
          {setting === 'recovery' && <p>{count > 0 ? 'Generating new recovery codes immediately invalidates your old codes. Save the new codes before leaving.' : 'Your recovery codes will be shown once. Save them before leaving.'}</p>}
          {mode === 'replace' && <p>Verifying the new authenticator will invalidate your old authenticator. Keep your backup sign-in codes available.</p>}
          {mode === 'disable' && <p>Turning off your authenticator removes this extra sign-in protection. It does not delete the registered setup key.</p>}
          <label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} /></label>
        </>}
        {stage === 'password' && <>
          <p>{policy ? `Use at least ${policy.minimum_length || 1} characters${policy.require_uppercase ? ', an uppercase letter' : ''}${policy.require_lowercase ? ', a lowercase letter' : ''}${policy.require_numbers ? ', a number' : ''}${policy.require_symbols ? ', a symbol' : ''}.` : 'Your new password must meet your account password policy.'}</p>
          <label>Current password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label>New password<input type="password" autoComplete="new-password" required maxLength={256} minLength={policy?.minimum_length || 1} value={nextPassword} onChange={event => setNextPassword(event.target.value)} /></label>
          <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required maxLength={256} aria-invalid={error === "Your new passwords don't match." || undefined} aria-describedby={error === "Your new passwords don't match." ? 'account-security-error' : undefined} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        </>}
        {stage === 'enrollment' && <><p>Enter this setup key in your authenticator app, then enter its six-digit code. The key is shown only during this setup.</p><label>Setup key<input readOnly value={setupKey} autoComplete="off" /></label></>}
        {['factor', 'enrollment'].includes(stage) && <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /></label>}
      </fieldset>
      <div className="account-actions"><button type="button" disabled={busy} onClick={() => cancel(leave)}>Cancel</button><button className="account-primary" disabled={busy}>{busy ? 'Checking…' : stage === 'password' ? 'Save password' : stage === 'enrollment' ? 'Verify authenticator' : 'Continue'}</button></div>
    </form>}
  </div>;
}
