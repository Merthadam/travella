import React, { useEffect, useRef, useState } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider';
import './account-access.css';

const titles = {
  sign_in: 'Welcome back.', register: 'Make room for your next trip.', verify_email: 'Check your inbox.',
  verified: 'Your email is verified.', forgot_password_email: 'Forgot your password?',
  neutral_confirmation: 'Check your inbox.', reset_password: 'Choose a new password.',
  mfa_challenge: 'One more step.', mfa_recovery: 'Use a recovery code.',
  mfa_enrollment: 'Set up your authenticator.', mfa_recovery_enrollment: 'Replace your authenticator.',
  recovery_codes: 'Keep these somewhere safe.',
};
const descriptions = {
  sign_in: 'Sign in to pick up where your plans left off.',
  register: 'Create your account to start shaping a trip that feels like you.',
  verify_email: 'Enter the verification code from your email to continue.',
  verified: 'You can now sign in and start planning.',
  forgot_password_email: 'We’ll email you a code to reset your password.',
  neutral_confirmation: 'If this address is eligible, we’ll send instructions. Check your spam folder, or try again in a few minutes if nothing arrives.',
  reset_password: 'Enter the code from your email and your new password.',
  mfa_challenge: 'Enter the six-digit code from your authenticator app.',
  mfa_recovery: 'Enter one of your saved recovery codes.',
  mfa_enrollment: 'Add the setup key to your authenticator app, then enter its six-digit code.',
  mfa_recovery_enrollment: 'Add the replacement key to your new authenticator app, then enter its six-digit code.',
  recovery_codes: 'Save these codes somewhere safe. Each can be used once, and they will not be shown again.',
};

function JourneyArt() {
  return <svg className="auth-journey-art" viewBox="0 0 500 310" fill="none" aria-hidden="true">
    <g className="auth-globe-grid">
      <circle cx="250" cy="155" r="112" />
      <ellipse cx="250" cy="155" rx="48" ry="112" />
      <path d="M138 155h224M153 99h194M153 211h194" />
    </g>
    <path className="auth-route" d="M174 213Q202 88 329 111" />
    <circle className="auth-stop" cx="174" cy="213" r="4" />
    <circle className="auth-destination-ring" cx="329" cy="111" r="10" />
    <circle className="auth-stop" cx="329" cy="111" r="4" />
  </svg>;
}

// Presentation only: AccountContent retains the server state machine and secret lifecycle.
export function AccountAccess({ step, heading, email, firstName, lastName, busy, error, notice,
  secretCode, recoveryCodes, onEmailChange, onFirstNameChange, onLastNameChange, onClearError,
  onNavigate, onSubmit, onResend }) {
  const { theme, setTheme } = useAppearance();
  const [editingEmail, setEditingEmail] = useState(!email);
  const emailInput = useRef(null);
  const focusEmail = useRef(false);
  useEffect(() => {
    if (focusEmail.current && emailInput.current) {
      emailInput.current.focus(); focusEmail.current = false;
    }
  }, [editingEmail]);
  useEffect(() => {
    if (error?.fields?.includes('email')) setEditingEmail(true);
  }, [error]);
  const emailStep = ['verify_email', 'reset_password'].includes(step);
  const hasEmail = ['sign_in', 'register', 'forgot_password_email'].includes(step)
    || (emailStep && (editingEmail || error?.fields?.includes('email')));
  const hasPassword = ['sign_in', 'register', 'reset_password'].includes(step);
  const hasCode = ['verify_email', 'reset_password', 'mfa_challenge', 'mfa_recovery', 'mfa_enrollment', 'mfa_recovery_enrollment'].includes(step);
  const isForm = hasEmail || hasPassword || hasCode;
  const fields = [...(step === 'register' ? ['first_name', 'last_name'] : []), ...(hasEmail ? ['email'] : []), ...(hasCode ? ['code'] : []), ...(hasPassword ? ['password'] : [])];
  const primaryErrorField = error?.fields?.find(name => fields.includes(name))
    || (error?.status === 401 && step === 'sign_in' ? 'password'
      : error?.status === 400 && hasCode ? 'code'
        : error?.status === 400 && step === 'forgot_password_email' ? 'email' : null);
  const feedback = error && <div id="auth-error" role="alert" className="auth-error">
    {error.message}
    {step === 'sign_in' && error.status === 401 && <span className="auth-error-help">Just signed up?{' '}
      <button type="button" disabled={busy} onClick={() => onNavigate('verify_email')}>Verify your email</button>
    </span>}
  </div>;

  function field(name, label, props = {}) {
    const invalid = Boolean(error && (error.fields?.includes(name) || name === primaryErrorField));
    return <div className="auth-field">
      <div className="auth-label-row"><label htmlFor={`auth-${name}`}>{label}</label>
        {name === 'password' && step === 'sign_in' && <button type="button" disabled={busy} onClick={() => onNavigate('forgot_password_email')}>Forgot password?</button>}
      </div>
      <input id={`auth-${name}`} name={name} ref={name === 'email' ? emailInput : undefined} required
        aria-invalid={invalid || undefined} aria-describedby={invalid ? 'auth-error' : undefined} {...props}
        onChange={event => { props.onChange?.(event); onClearError(); }} />
      {name === primaryErrorField && feedback}
    </div>;
  }
  function editEmail() {
    focusEmail.current = true; setEditingEmail(true); onEmailChange(''); onClearError();
    emailInput.current?.focus();
  }
  function resend() {
    if (emailInput.current && !emailInput.current.reportValidity()) return;
    if (email) onResend();
  }
  const submitLabel = step === 'sign_in' ? 'Sign in' : step === 'register' ? 'Create account'
    : step === 'forgot_password_email' ? 'Send reset code' : step === 'reset_password' ? 'Update password' : 'Verify & continue';

  return <div className="auth-access" data-auth-theme={theme}>
    <aside className="auth-story">
      <span className="auth-brand"><span className="auth-mark" aria-hidden="true">✳</span> Travella<span className="auth-brand-dot">.</span></span>
      <div className="auth-story-copy">
        <span className="auth-kicker">LESS SEARCHING. MORE POSSIBILITY.</span>
        <h2>Somewhere<br />{' '}starts here.</h2>
        <p>A spark of an idea. A place you’ve been thinking about.<br />Let’s turn it into your kind of trip.</p>
        <JourneyArt />
      </div>
      <span className="auth-story-footer">A little curiosity goes a long way.</span>
    </aside>
    <main className="auth-main">
      <button className="auth-theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'} title={theme === 'dark' ? 'Light mode' : 'Night mode'}>
        {theme === 'dark' ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>}
      </button>
      <section className="auth-form-section" aria-labelledby="auth-heading">
        {step !== 'sign_in' && <button className="auth-back" disabled={busy} onClick={() => onNavigate('sign_in')}><span aria-hidden="true">← </span>Back to sign in</button>}
        <h1 id="auth-heading" ref={heading} tabIndex={-1}>{titles[step] || 'Account access'}</h1>
        {descriptions[step] && <p className="auth-description" role={step === 'neutral_confirmation' ? 'status' : undefined}>{step === 'neutral_confirmation' ? notice || descriptions[step] : descriptions[step]}</p>}
        {notice && step !== 'neutral_confirmation' && <p role="status" className="auth-notice">{notice}</p>}
        {isForm && <form onSubmit={onSubmit} aria-busy={busy}>
          <fieldset disabled={busy}>
            {step === 'register' && <div className="auth-name-row">
              {field('first_name', 'First name', { value: firstName, onChange: e => onFirstNameChange(e.target.value), autoComplete: 'given-name', maxLength: 128 })}
              {field('last_name', 'Last name', { value: lastName, onChange: e => onLastNameChange(e.target.value), autoComplete: 'family-name', maxLength: 128 })}
            </div>}
            {hasEmail && field('email', 'Email address', { type: 'email', value: email, onChange: e => onEmailChange(e.target.value), autoComplete: 'email', placeholder: 'you@example.com' })}
            {['mfa_enrollment', 'mfa_recovery_enrollment'].includes(step) && <p className="auth-setup-key"><span>Setup key</span><code>{secretCode}</code></p>}
            {hasCode && field('code', step === 'verify_email' ? 'Email verification code' : step === 'reset_password' ? 'Password reset code' : step === 'mfa_recovery' ? 'Recovery code' : 'Authenticator code', { inputMode: step === 'mfa_recovery' ? 'text' : 'numeric', autoComplete: 'one-time-code', maxLength: step === 'mfa_recovery' ? 64 : 6, placeholder: 'Enter your code' })}
            {hasPassword && field('password', step === 'reset_password' ? 'New password' : 'Password', { type: 'password', autoComplete: step === 'register' || step === 'reset_password' ? 'new-password' : 'current-password', maxLength: 256 })}
            {!primaryErrorField && feedback}
            <button className="auth-primary" type="submit">{busy ? 'Please wait…' : submitLabel}</button>
          </fieldset>
        </form>}
        {!isForm && feedback}
        {step === 'sign_in' && <p className="auth-secondary">New to Travella? <button disabled={busy} onClick={() => onNavigate('register')}>Create an account</button></p>}
        {step === 'forgot_password_email' && <p className="auth-secondary"><button disabled={busy} onClick={() => onNavigate('reset_password')}>I already have a reset code</button></p>}
        {step === 'verify_email' && <p className="auth-secondary">No email yet? <button disabled={busy} onClick={resend}>Resend code</button><span className="auth-secondary-line"><button disabled={busy} onClick={editEmail}>Use a different email</button></span></p>}
        {step === 'reset_password' && <p className="auth-secondary"><button disabled={busy} onClick={() => onNavigate('forgot_password_email')}>Request a new code</button></p>}
        {step === 'mfa_challenge' && <p className="auth-secondary"><button disabled={busy} onClick={() => onNavigate('mfa_recovery')}>Use a recovery code</button></p>}
        {step === 'verified' && <button className="auth-primary" onClick={() => onNavigate('sign_in')}>Continue to sign in</button>}
        {step === 'neutral_confirmation' && <>
          <button className="auth-primary" onClick={() => onNavigate('reset_password')}>I have a reset code</button>
          <p className="auth-secondary">No email? <button onClick={() => onNavigate('forgot_password_email')}>Try again</button><span className="auth-secondary-line">Received a sign-up code? <button onClick={() => onNavigate('verify_email')}>Verify your email</button></span></p>
        </>}
        {step === 'recovery_codes' && <><pre className="auth-recovery-codes">{recoveryCodes.join('\n')}</pre><button className="auth-primary" onClick={() => onNavigate('signed_in')}>I saved my codes</button></>}
      </section>
    </main>
  </div>;
}
