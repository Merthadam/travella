// THROWAWAY: three account-access layouts on /?prototype=account-access&variant=A.
// No authentication requests. Form values stay in the DOM and are cleared on submit/navigation.
import React, { useEffect, useRef, useState } from 'react';
import './account-access-prototype.css';

const variants = { A: 'The journey begins', B: 'Quiet focus', C: 'Your workspace' };
const titles = { sign_in: 'Welcome back.', register: 'Make room for your next trip.', verify_email: 'Check your inbox.', forgot_password_email: 'Let’s get you back in.', reset_password: 'A fresh start.', mfa_challenge: 'One more step.', mfa_recovery: 'Use a recovery code.', mfa_enrollment: 'Set up your authenticator.', mfa_recovery_enrollment: 'Replace your authenticator.', recovery_codes: 'Keep these somewhere safe.', success: 'You’re ready to explore.' };
const descriptions = { sign_in: 'Sign in to pick up where your plans left off.', register: 'Create your account to start shaping a trip that feels like you.', verify_email: 'Enter the verification code from your email to continue.', forgot_password_email: 'Enter your email and we’ll send password reset instructions.', reset_password: 'Enter your email code and choose a new password.', mfa_challenge: 'Enter the six-digit code from your authenticator app.', mfa_recovery: 'Enter one of your saved recovery codes.', mfa_enrollment: 'Add the setup key to your authenticator app, then enter its code.', mfa_recovery_enrollment: 'Add the replacement key to your new authenticator app.', recovery_codes: 'Each recovery code can be used once. Save them before continuing.', success: 'This is a simulated sign-in. Your account has not been changed.' };

function Brand() { return <span className="aap-brand"><span className="aap-mark" aria-hidden="true">✳</span> Travella<span className="aap-brand-dot">.</span></span>; }
function JourneyArt() {
  return <svg className="aap-journey-art" viewBox="0 0 500 310" fill="none" aria-hidden="true"><circle cx="250" cy="155" r="135"/><ellipse cx="250" cy="155" rx="72" ry="135"/><path d="M115 155h270M140 78q110 60 220 0M140 232q110-60 220 0M250 20v270"/><path className="aap-route" d="M146 205C110 100 365 30 343 129S208 261 276 246" strokeDasharray="4 7"/><circle className="aap-stop" cx="146" cy="205" r="7"/><circle className="aap-stop" cx="276" cy="246" r="7"/><path className="aap-plane" d="m340 93 21 13-16 4-6 15-8-28z"/></svg>;
}
export function VariantA({ form }) {
  return <div className="aap-split"><aside className="aap-story"><Brand/><div className="aap-story-copy"><span className="aap-kicker">LESS SEARCHING. MORE POSSIBILITY.</span><h2>Somewhere<br/>{' '}starts here.</h2><p>A spark of an idea. A place you’ve been thinking about.<br/>Let’s turn it into your kind of trip.</p><JourneyArt/></div><span className="aap-story-footer">A little curiosity goes a long way.</span></aside><main className="aap-split-main">{form}</main></div>;
}
export function VariantB({ form }) {
  return <div className="aap-centered"><header><Brand/><span>Your world, a little closer.</span></header><main><div className="aap-centered-form">{form}</div></main><footer>Room for your ideas. A place for your plans.</footer></div>;
}
export function VariantC({ form, step, go }) {
  const links = [['sign_in','Sign in'],['register','Create account'],['forgot_password_email','Recover access'],['verify_email','Verify email']];
  return <div className="aap-workspace"><aside className="aap-workspace-nav"><Brand/><div><span className="aap-kicker">YOUR ACCOUNT</span><nav aria-label="Account access">{links.map(([key,label],i)=><button key={key} aria-current={step===key?'page':undefined} onClick={()=>go(key)}><span>0{i+1}</span>{label}<span aria-hidden="true">↗</span></button>)}</nav></div><p>Good trips start<br/>with a little space<br/>to think.</p></aside><main><header><span>Travella / Account</span><span className="aap-workspace-tag">YOUR NEXT CHAPTER</span></header><div className="aap-workspace-content">{form}<aside><div className="aap-mini-route"><i/><span/><i/><span/><i/></div><h2>From “what if”<br/>to “let’s go”.</h2><p>Research a destination.<br/>Find what matters to you.<br/>Bring your plans together.</p></aside></div></main></div>;
}

export function AccountAccessPrototype() {
  const [variant,setVariant]=useState(()=>variants[new URLSearchParams(location.search).get('variant')]?new URLSearchParams(location.search).get('variant'):'A');
  const [step,setStep]=useState('sign_in');
  const [theme,setTheme]=useState('light');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const heading=useRef(null);
  const pending=useRef(null);
  const formRef=useRef(null);
  const go=next=>{clearTimeout(pending.current);formRef.current?.reset();setStep(next);setBusy(false);setError('');setNotice('');};
  useEffect(()=>()=>clearTimeout(pending.current),[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
  function change(delta){const next=['A','B','C'][(['A','B','C'].indexOf(variant)+delta+3)%3];const url=new URL(location.href);url.searchParams.set('variant',next);history.replaceState(history.state,'',url);setVariant(next);go('sign_in');}
  useEffect(()=>{const key=e=>{if(e.target.closest('input,textarea,select,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(e.key==='ArrowRight'?1:-1);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[variant]);
  const field=(name,label,type='text')=><div className="aap-field"><div className="aap-label-row"><label htmlFor={`aap-${name}`}>{label}</label>{name==='password'&&step==='sign_in'&&<button type="button" onClick={()=>go('forgot_password_email')}>Forgot password?</button>}</div><input id={`aap-${name}`} name={name} type={type} required autoComplete="off" maxLength={name==='code'?64:256} placeholder={name==='email'?'you@example.com':name==='code'?'Enter your code':undefined}/></div>;
  function submit(e){e.preventDefault();e.currentTarget.reset();setBusy(true);setError('');setNotice('');pending.current=setTimeout(()=>{setBusy(false);if(step==='register')go('verify_email');else if(step==='forgot_password_email'){go('reset_password');setNotice('Simulation: password reset instructions sent.');}else if(step==='reset_password'){go('sign_in');setNotice('Simulation: password updated. Sign in to continue.');}else if(step==='verify_email'){go('sign_in');setNotice('Simulation: email verified. You can now sign in.');}else if(step==='mfa_recovery')go('mfa_recovery_enrollment');else if(step.includes('enrollment'))go('recovery_codes');else go('success');},700);}
  const hasEmail=['sign_in','register','verify_email','forgot_password_email','reset_password'].includes(step);
  const hasPassword=['sign_in','register','reset_password'].includes(step);
  const hasCode=['verify_email','reset_password','mfa_challenge','mfa_recovery','mfa_enrollment','mfa_recovery_enrollment'].includes(step);
  const submitLabel=step==='sign_in'?'Sign in':step==='register'?'Create account':step==='forgot_password_email'?'Send reset instructions':step==='reset_password'?'Update password':'Verify & continue';
  const form=<section className="aap-form-section" aria-labelledby="aap-heading"><span className="aap-kicker">{step==='sign_in'?'YOUR NEXT ADVENTURE AWAITS':'A LITTLE CLOSER'}</span><h1 id="aap-heading" ref={heading} tabIndex={-1}>{titles[step]}</h1><p className="aap-description">{descriptions[step]}</p>
    {error&&<p role="alert" className="aap-alert">{error}</p>}{notice&&<p role="status" className="aap-notice">{notice}</p>}
    {step==='success'?<div className="aap-success"><span aria-hidden="true">✓</span><button className="aap-primary" onClick={()=>go('sign_in')}>Back to sign in</button></div>:step==='recovery_codes'?<><pre className="aap-codes">DEMO-CODE-01 · DEMO-CODE-02<br/>Illustration only — not usable codes</pre><button className="aap-primary" onClick={()=>go('success')}>I saved my codes</button></>:<form ref={formRef} key={step} onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>
      {step==='register'&&<div className="aap-name-row">{field('first_name','First name')}{field('last_name','Last name')}</div>}
      {hasEmail&&field('email','Email address','email')}{hasPassword&&field('password',step==='reset_password'?'New password':'Password','password')}
      {step.includes('enrollment')&&<p className="aap-codes">DEMO-SETUP-KEY<br/><small>Illustration only — not a usable key</small></p>}
      {hasCode&&field('code',step==='mfa_recovery'?'Recovery code':step==='verify_email'||step==='reset_password'?'Email verification code':'Authenticator code')}
      <button className="aap-primary" type="submit">{busy?'Please wait…':submitLabel}<span aria-hidden="true">→</span></button>
    </fieldset></form>}
    {step==='sign_in'&&<><p className="aap-create">New to Travella? <button onClick={()=>go('register')} disabled={busy}>Create an account</button></p><div className="aap-verify"><button onClick={()=>go('verify_email')} disabled={busy}>Already registered? Verify your email</button></div></>}
    {step==='verify_email'&&<p className="aap-create">No email yet? <button disabled={busy} onClick={()=>setNotice('Simulation: a new verification code was sent.')}>Resend code</button></p>}
    {step==='mfa_challenge'&&<p className="aap-create"><button disabled={busy} onClick={()=>go('mfa_recovery')}>Use a recovery code</button></p>}
    {!['sign_in','success'].includes(step)&&<button className="aap-back" disabled={busy} onClick={()=>go('sign_in')}>← Back to sign in</button>}
  </section>;
  return <div className={`aap-root aap-variant-${variant}`} data-aap-theme={theme}>{variant==='A'?<VariantA form={form}/>:variant==='B'?<VariantB form={form}/>:<VariantC form={form} step={step} go={go}/>}
    <aside className="aap-controls" aria-label="Prototype controls"><div className="aap-controls-top"><button aria-label="Previous design" onClick={()=>change(-1)}>←</button><div><small>DESIGN PROTOTYPE · SIMULATED ACTIONS</small><strong>{variant} · {variants[variant]}</strong></div><button aria-label="Next design" onClick={()=>change(1)}>→</button></div><div className="aap-controls-bottom"><label>Screen <select aria-label="Preview screen" value={step} onChange={e=>go(e.target.value)}>{Object.entries(titles).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><button onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?'Dark':'Light'} mode</button><button onClick={()=>{setError('Check your details or reset your password.');setNotice('');}}>Show error</button></div><span className="aap-state">{step} · {busy?'loading':error?'error':'ready'} · no account requests</span></aside>
  </div>;
}
