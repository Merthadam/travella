import React, { useEffect, useRef, useState } from 'react';
import { readSession, readTravelerProfile, request } from './api';
import { PlansApp } from './PlansApp';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { AccountSettingsPage } from './features/account/AccountSettingsPage';

const titles = {
  sign_in: 'Welcome back', register: 'Create your account', verify_email: 'Verify your email',
  verified: 'Your email is verified', mfa_challenge: 'Two-step verification',
  forgot_password_email: 'Recover your account', neutral_confirmation: 'Check your inbox',
  reset_password: 'Set a new password',
  mfa_enrollment: 'Set up an authenticator', recovery_codes: 'Save your recovery codes',
  mfa_recovery: 'Use a recovery code', mfa_recovery_enrollment: 'Replace your authenticator',
  signed_in: 'My plans', loading: 'Opening your account…',
};

export function AccountApp() {
  const [step, setStep] = useState('loading');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [travelerProfile, setTravelerProfile] = useState(null);
  const heading = useRef(null);
  const generation = useRef(0);

  async function routeAfterSignIn() {
    const profile = await readTravelerProfile();
    setTravelerProfile(profile);
    setStep(profile.onboarding?.completed_version >= 2 ? (window.location.pathname === '/account' ? 'account' : 'signed_in') : 'onboarding');
  }

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    let cancelled = false;
    readSession().then(() => { if (!cancelled) return routeAfterSignIn(); }).catch((err) => {
      if (!cancelled) {
        setStep('sign_in');
        if (err.status !== 401) setError(err);
      }
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!['signed_in', 'account', 'onboarding'].includes(step)) return;
    let cancelled = false;
    const check = () => readSession().catch((err) => {
      // A temporary network/server failure must not discard an in-progress form.
      if (!cancelled && err.status === 401) {
        generation.current++;
        setStep('sign_in'); setNotice(''); setError(null);
      }
    });
    const timer = setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', check); };
  }, [step]);

  function go(next) {
    generation.current++;
    setStep(next); setError(null); setNotice('');
    if (next !== 'mfa_enrollment') setSecretCode('');
    if (next !== 'recovery_codes') setRecoveryCodes([]);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const secret = fields.get('password');
    const code = fields.get('code');
    // Secrets live only in this submission; no storage or retained React state.
    for (const name of ['password', 'code']) if (form.elements[name]) form.elements[name].value = '';
    setBusy(true); setError(null);
    const attempt = ++generation.current;
    try {
      let result;
      if (step === 'register') result = await request('/auth/register', { first_name: firstName, last_name: lastName, email, password: secret });
      else if (step === 'verify_email') {
        await request('/auth/verify-email', { email, code }); result = { state: 'verified' };
      } else if (step === 'mfa_challenge') result = await request('/auth/mfa/challenge', { code });
      else if (step === 'mfa_enrollment') result = await request('/auth/mfa/enrollment/verify', { code });
      else if (step === 'mfa_recovery') result = await request('/auth/mfa/recovery', { code });
      else if (step === 'mfa_recovery_enrollment') result = await request('/auth/mfa/recovery/verify', { code });
      else if (step === 'forgot_password_email') result = await request('/auth/forgot-password', { email });
      else if (step === 'reset_password') result = await request('/auth/reset-password', { email, code, new_password: secret });
      else result = await request('/auth/sign-in', { email, password: secret });
      if (generation.current !== attempt) return;
      if (result.state === 'signed_in') {
        await readSession();
        await routeAfterSignIn();
        if (generation.current === attempt) setNotice(result.message || '');
        return;
      }
      if (generation.current !== attempt) return;
      if (result.state === 'mfa_enrollment' || result.state === 'mfa_recovery_enrollment') setSecretCode(result.secret_code);
      if (result.state === 'recovery_codes') setRecoveryCodes(result.codes);
      setStep(result.state); setNotice(result.message || '');
    } catch (err) {
      if (generation.current === attempt) {
        setError(err);
        if (step === 'mfa_challenge' && err.status === 401) setStep('sign_in');
      }
    } finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError(null);
    try { setNotice((await request('/auth/resend-verification', { email })).message); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError(null);
    try { await request('/auth/sign-out', {}); go('sign_in'); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  async function beginEnrollment() {
    setBusy(true); setError(null);
    try {
      const result = await request('/auth/mfa/enrollment/start', {});
      setSecretCode(result.secret_code); setStep('mfa_enrollment');
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  if (step === 'onboarding') {
    return <OnboardingFlow initialProfile={travelerProfile || undefined} onExpired={() => go('sign_in')} onComplete={(profile) => {
      setTravelerProfile(profile); setStep('signed_in');
    }} />;
  }

  if (step === 'signed_in') {
    return <PlansApp onExpired={() => go('sign_in')} onSignOut={signOut} onAccount={() => { history.pushState(null, '', '/account'); go('account'); }}
      accountBusy={busy} accountError={error} />;
  }

  if (step === 'account') return <AccountSettingsPage initialProfile={travelerProfile} onExpired={() => go('sign_in')}
    onNavigatePlans={() => { history.pushState(null, '', '/plans'); go('signed_in'); }} />;

  const hasEmail = ['sign_in', 'register', 'verify_email', 'forgot_password_email', 'reset_password'].includes(step);
  const hasPassword = ['sign_in', 'register', 'reset_password'].includes(step);
  const isForm = hasEmail || ['mfa_challenge', 'mfa_enrollment', 'mfa_recovery', 'mfa_recovery_enrollment'].includes(step);
  const fieldError = (name) => error?.fields?.includes(name);
  function field(name, label, props) {
    return <label>{label}<input name={name} required aria-invalid={fieldError(name) || undefined}
      aria-describedby={fieldError(name) ? `${name}-error` : undefined} {...props} />
      {fieldError(name) && <span id={`${name}-error`} className="field-error">Check {label.toLowerCase()}.</span>}</label>;
  }
  return <main className="shell">
    <p className="eyebrow">TRAVELLA ACCOUNT</p>
    <h1 ref={heading} tabIndex={-1}>{titles[step] || 'Account access'}</h1>
    {['register', 'verify_email', 'verified'].includes(step) && <ol className="checklist" aria-label="Account steps">
      {['Account details', 'Verify email', 'Sign in'].map((label, i) => <li key={label}
        aria-current={i === ['register', 'verify_email', 'verified'].indexOf(step) ? 'step' : undefined}>{label}</li>)}
    </ol>}
    {error && <div role="alert" className="error">{error.message}</div>}
    {notice && <p role="status" className="quiet">{notice}</p>}
    {isForm && <form key={step} onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        {step === 'register' && <>
          {field('first_name', 'First name', { value: firstName, onChange: e => setFirstName(e.target.value), autoComplete: 'given-name', maxLength: 128 })}
          {field('last_name', 'Last name', { value: lastName, onChange: e => setLastName(e.target.value), autoComplete: 'family-name', maxLength: 128 })}
        </>}
        {hasEmail && field('email', 'Email', { type: 'email', value: email, onChange: e => setEmail(e.target.value), autoComplete: 'email' })}
        {hasPassword && field('password', step === 'reset_password' ? 'New password' : 'Password', { type: 'password', autoComplete: step === 'register' || step === 'reset_password' ? 'new-password' : 'current-password', maxLength: 256 })}
        {['verify_email', 'mfa_challenge', 'mfa_enrollment', 'mfa_recovery', 'mfa_recovery_enrollment', 'reset_password'].includes(step) && field('code', step === 'verify_email' ? 'Email verification code' : step === 'reset_password' ? 'Password reset code' : step === 'mfa_recovery' ? 'Recovery code' : 'Authenticator code', { inputMode: 'text', autoComplete: 'one-time-code', maxLength: step === 'mfa_recovery' ? 64 : 6 })}
        <div className="actions">
          {step !== 'sign_in' && <button type="button" onClick={() => go(step === 'verify_email' ? 'register' : 'sign_in')}>Back</button>}
          <button className="primary" type="submit">{busy ? 'Please wait…' : step === 'register' ? 'Create account' : step === 'sign_in' ? 'Sign in' : step === 'forgot_password_email' ? 'Send instructions' : step === 'reset_password' ? 'Update password' : 'Verify'}</button>
        </div>
      </fieldset>
    </form>}
    {step === 'sign_in' && <nav className="secondary" aria-label="Account help">
      <button disabled={busy} onClick={() => go('register')}>Create account</button>
      <button disabled={busy} onClick={() => go('forgot_password_email')}>Forgot password?</button>
      <button disabled={busy} onClick={() => go('verify_email')}>Verify email</button>
    </nav>}
    {step === 'verify_email' && <button disabled={busy} onClick={resend}>Resend code</button>}
    {step === 'mfa_challenge' && <button disabled={busy} onClick={() => go('mfa_recovery')}>Use a recovery code</button>}
    {step === 'verified' && <><p className="quiet">Your email is verified. Continue to sign in.</p><button className="primary" onClick={() => go('sign_in')}>Continue</button></>}
    {step === 'neutral_confirmation' && <><button className="primary" onClick={() => go('reset_password')}>I have a reset code</button><button onClick={() => go('sign_in')}>Back to sign in</button></>}
    {step === 'mfa_enrollment' && <p className="quiet">Add the secret code <code>{secretCode}</code> to your authenticator app, then enter the six-digit code.</p>}
    {step === 'mfa_recovery_enrollment' && <p className="quiet">Add the replacement secret <code>{secretCode}</code> to your new authenticator app, then enter its six-digit code.</p>}
    {step === 'recovery_codes' && <><p className="quiet">Save these codes somewhere safe. Each can be used once, and they will not be shown again.</p><pre className="recovery-codes">{recoveryCodes.join('\n')}</pre><button className="primary" onClick={() => go('signed_in')}>I saved my codes</button></>}
  </main>;
}
