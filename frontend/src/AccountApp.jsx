import { bindTravelRecoveryScope, clearCanvasViews } from './features/plans/canvasViewState';
import React, { useEffect, useRef, useState } from 'react';
import { readSession, readTravelerProfile, request } from './api';
import { PlansApp } from './PlansApp';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { AccountSettingsPage } from './features/account/AccountSettingsPage';
import { AppearanceProvider } from './features/appearance/AppearanceProvider';
import { AccountAccess } from './features/auth/AccountAccess';

export function AccountApp() {
  return <AppearanceProvider><AccountContent /></AppearanceProvider>;
}

function AccountContent() {
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
  const navigationGuard = useRef(null);
  const accountVisible = useRef(false);
  const returnRoute = useRef('/plans');
  const position = useRef(0);
  const restoring = useRef(false);
  const approvedTraversal = useRef(false);
  const queuedTraversal = useRef(null);
  const plansRoute = path => /^\/plans(?:\/deleted|\/[0-9a-fA-F-]{36}(?:\/conversation)?)?$/.test(path) ? path : '/plans';

  function initializeAccountHistory() {
    if (Number.isInteger(history.state?.accountPosition)) {
      position.current = history.state.accountPosition;
      returnRoute.current = plansRoute(history.state?.accountReturn);
    } else {
      // A direct entry needs an internal Back destination whose history position is known.
      history.replaceState({ accountPosition: 0 }, '', '/plans');
      history.pushState({ accountPosition: 1, accountReturn: '/plans' }, '', '/account');
      position.current = 1;
    }
  }
  function openAccount() {
    returnRoute.current = plansRoute(location.pathname);
    position.current = Number.isInteger(history.state?.accountPosition) ? history.state.accountPosition : 0;
    history.replaceState({ ...history.state, accountPosition: position.current }, '', location.pathname);
    history.pushState({ accountPosition: ++position.current, accountReturn: returnRoute.current }, '', '/account');
    accountVisible.current = true; go('account');
  }
  function openPlans() {
    history.pushState({ accountPosition: ++position.current }, '', returnRoute.current);
    accountVisible.current = false; go('signed_in');
  }

  async function routeAfterSignIn() {
    const ticket = generation.current;
    const profile = await readTravelerProfile();
    if (generation.current !== ticket) return;
    setTravelerProfile(profile);
    const account = window.location.pathname === '/account';
    if (profile.onboarding?.completed_version >= 2 && account) initializeAccountHistory();
    accountVisible.current = account && profile.onboarding?.completed_version >= 2;
    setStep(profile.onboarding?.completed_version >= 2 ? (account ? 'account' : 'signed_in') : 'onboarding');
  }

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    let cancelled = false;
    readSession().then(session => { if (!cancelled) { bindTravelRecoveryScope(session.recovery_scope); return routeAfterSignIn(); } }).catch((err) => {
      if (!cancelled) {
        go('sign_in');
        if (err.status !== 401) setError(err);
      }
    });
    return () => { cancelled = true; generation.current++; };
  }, []);
  useEffect(() => {
    if (!['signed_in', 'account'].includes(step)) return;
    function navigate(event) {
      const target = location.pathname;
      if (restoring.current) {
        event.stopImmediatePropagation(); restoring.current = false;
        const resume = queuedTraversal.current; queuedTraversal.current = null; resume?.(); return;
      }
      const nextPosition = Number.isInteger(event.state?.accountPosition) ? event.state.accountPosition : position.current - 1;
      if (accountVisible.current) {
        event.stopImmediatePropagation();
        const delta = nextPosition - position.current;
        if (!approvedTraversal.current && delta !== 0 && navigationGuard.current) {
          const proceed = () => {
            const traverse = () => { approvedTraversal.current = true; history.go(delta); };
            if (restoring.current) queuedTraversal.current = traverse; else traverse();
          };
          // Query the guard without executing an accepted traversal twice.
          let accepted = false;
          const allowed = navigationGuard.current(() => { accepted = true; });
          if (!allowed) {
            restoring.current = true; history.go(-delta);
            // Replace only the pending action, keeping the single page guard/dialog.
            navigationGuard.current(proceed);
            return;
          }
          if (!accepted) return;
        }
        approvedTraversal.current = false; position.current = nextPosition;
        if (target === '/account') return;
        accountVisible.current = false; setStep('signed_in');
        return;
      }
      position.current = nextPosition;
      if (target === '/account') {
        event.stopImmediatePropagation();
        returnRoute.current = plansRoute(event.state?.accountReturn);
        accountVisible.current = true; setStep('account');
      }
    }
    window.addEventListener('popstate', navigate, true);
    return () => window.removeEventListener('popstate', navigate, true);
  }, [step]);
  useEffect(() => {
    if (!['signed_in', 'account', 'onboarding'].includes(step)) return;
    let cancelled = false;
    const check = async () => {
      const ticket = generation.current;
      let switching = false;
      try {
        const session = await readSession();
        if (cancelled || ticket !== generation.current) return;
        if (bindTravelRecoveryScope(session.recovery_scope)) {
          // Scope revocation synchronously aborts workspace effects before React
          // unmounts the old private tree or requests the new account's profile.
          switching = true; generation.current++; setTravelerProfile(null);
          accountVisible.current = false; setStep('loading');
          await routeAfterSignIn();
        }
      } catch (err) {
      // A temporary network/server failure must not discard an in-progress form.
      if (!cancelled && (ticket === generation.current || switching) && (err.status === 401 || switching)) {
        go('sign_in'); setNotice('Your session has expired. Sign in again to continue.');
      }
      }
    };
    const timer = setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', check); };
  }, [step]);

  function go(next) {
    if (next === 'sign_in') clearCanvasViews();
    generation.current++;
    setStep(next); setError(null); setNotice('');
    if (next !== 'mfa_enrollment') setSecretCode('');
    if (next !== 'recovery_codes') setRecoveryCodes([]);
    if (next === 'sign_in') { setTravelerProfile(null); accountVisible.current = false; }
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
        const session = await readSession();
        if (generation.current !== attempt) return;
        bindTravelRecoveryScope(session.recovery_scope);
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
        if (step === 'mfa_challenge' && err.status === 401) go('sign_in');
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

  if (step === 'onboarding') {
    return <OnboardingFlow initialProfile={travelerProfile || undefined} onExpired={() => go('sign_in')} onComplete={(profile) => {
      setTravelerProfile(profile); setStep('signed_in');
    }} />;
  }

  if (step === 'signed_in' || step === 'account') {
    return <><div hidden={step === 'account'} inert={step === 'account'}><PlansApp inactive={step === 'account'} onExpired={() => go('sign_in')} onSignOut={signOut} onAccount={openAccount}
      accountBusy={busy} accountError={error} travelerProfile={travelerProfile} /></div>
      {step === 'account' && <AccountSettingsPage initialProfile={travelerProfile} onExpired={() => go('sign_in')}
        navigationGuard={navigationGuard} onProfileSaved={setTravelerProfile} onNavigatePlans={openPlans} onSignOut={signOut} sessionBusy={busy} sessionError={error} />}</>;
  }

  return <AccountAccess key={step} step={step} heading={heading} email={email} firstName={firstName} lastName={lastName}
    busy={busy} error={error} notice={notice} secretCode={secretCode} recoveryCodes={recoveryCodes}
    onEmailChange={setEmail} onFirstNameChange={setFirstName} onLastNameChange={setLastName}
    onClearError={() => setError(null)} onNavigate={go} onSubmit={submit} onResend={resend} />;
}
