import React, { useEffect, useRef, useState } from 'react';
import { readTravelerProfile, saveOnboardingStep } from '../../api';
import { ProfilePreview, Globe } from './components/ProfilePreview';
import { StepActions } from './components/StepActions';
import { HomeStep } from './steps/HomeStep';
import { CitizenshipStep } from './steps/CitizenshipStep';
import { NeedsStep } from './steps/NeedsStep';
import { InterestsStep, interestCount } from './steps/InterestsStep';
import './onboarding.css';

const steps = ['home', 'citizenship', 'needs', 'interests'];
const labels = ['Home base', 'Citizenship', 'Your needs', 'Your interests'];
const headlines = ['Good journeys start at home.', 'A little more of your world.', 'Travel should fit you.', 'What makes you feel alive?'];
const descriptions = ['Tell us where you usually start. We’ll help you find a convenient departure airport.', 'Which citizenships do you hold? Build your travel wallet, one country at a time.', 'Share anything that helps us make your travels more comfortable. Only what you want to.', 'Pick at least five things you love. The obvious favorites. The unexpected ones. All of it.'];
const fields = { home: ['home_city', 'default_airport'], citizenship: ['citizenships'], needs: ['accessibility_needs', 'food_needs'], interests: ['interest_ids', 'custom_interests'] };
const toDraft = profile => ({ home_city: null, default_airport: null, citizenships: [], accessibility_needs: '', food_needs: '', interest_ids: [], custom_interests: [], departure_base: '', travel_interests: '', ...profile, _legacy_interests: profile.interest_ids?.length || profile.custom_interests?.length ? '' : profile.travel_interests || '' });
const resumeStep = profile => Math.max(0, steps.findIndex(step => !['completed', 'skipped'].includes(profile.onboarding?.steps?.[step])));

export function OnboardingFlow({ initialProfile, onComplete, onExpired }) {
  const [saved, setSaved] = useState(initialProfile || {});
  const [data, setData] = useState(() => toDraft(initialProfile || {}));
  const [step, setStep] = useState(() => resumeStep(initialProfile || {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const alive = useRef(true);
  const lock = useRef(false);
  const pending = useRef(null);
  const heading = useRef(null);
  const form = useRef(null);
  const [returned, setReturned] = useState(Boolean(initialProfile?.departure_base || initialProfile?.home_city || initialProfile?.citizenships?.length || initialProfile?.food_needs || initialProfile?.accessibility_needs || initialProfile?.travel_interests));
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { heading.current?.focus(); }, [step, reloadKey]);

  function update(values) { setData(current => ({ ...current, ...values })); if (!error?.stale) setError(null); setStatus(''); }
  function fail(err) {
    if (err.status === 401) { onExpired?.(); return; }
    setError({ stale: err.status === 409, message: err.status === 409 ? 'Your profile changed in another session. Reload saved preferences to review the latest version. This replaces your unsaved edits.' : err.status === 422 ? 'Some details could not be saved. Review your entries and try again.' : 'Your changes could not be saved. Your entries are still here. Try again when you’re ready.' });
  }
  async function save(action, retry = false) {
    if (lock.current || error?.stale) return;
    if (action === 'continue' && !form.current?.reportValidity()) return;
    const key = steps[step];
    const values = action === 'skip' ? {} : Object.fromEntries(fields[key].map(field => [field, data[field]]));
    const body = { step: key, action, expected_revision: saved.revision || 0, values };
    const fingerprint = JSON.stringify(body);
    const request = retry && pending.current ? pending.current.request : pending.current?.fingerprint === fingerprint ? pending.current.request : { ...body, event_id: crypto.randomUUID() };
    pending.current = { fingerprint, request };
    lock.current = true; setBusy(true); setError(null); setStatus('Saving your preferences…');
    try {
      const result = await saveOnboardingStep(request);
      if (!alive.current) return;
      setSaved(result);
      // The acknowledged step is canonical; Back keeps drafts from other steps.
      setData(current => ({ ...current, ...Object.fromEntries(fields[request.step].map(field => [field, toDraft(result)[field]])), departure_base: result.departure_base || '', travel_interests: result.travel_interests || '', _legacy_interests: toDraft(result)._legacy_interests }));
      pending.current = null; setReturned(false); setStatus(action === 'skip' ? 'Step skipped. Previously saved preferences kept.' : 'Preferences saved.');
      if (result.onboarding?.completed_version >= 2) onComplete(result);
      else setStep(Math.min(step + 1, 3));
    } catch (err) { if (alive.current) { fail(err); setStatus(''); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function reload() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await readTravelerProfile();
      if (!alive.current) return;
      pending.current = null; setSaved(result); setData(toDraft(result)); setStep(resumeStep(result)); setReloadKey(key => key + 1); setError(null); setStatus('Latest saved preferences loaded. Review them before continuing.');
      if (result.onboarding?.completed_version >= 2) onComplete(result);
    } catch (err) { if (alive.current) { if (err.status === 401) onExpired?.(); else setError({ stale: true, message: 'The latest saved preferences could not be loaded. Your entries are still here. Try reloading again.' }); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const resolved = steps.filter(key => ['completed', 'skipped'].includes(saved.onboarding?.steps?.[key])).length;
  const canContinue = !error?.stale && (step === 0 ? Boolean(data.home_city?.name?.trim().length >= 2 && /\p{L}/u.test(data.home_city.name) && data.home_city?.country_code) : step === 3 ? interestCount(data) >= 5 : true);
  const Step = [HomeStep, CitizenshipStep, NeedsStep, InterestsStep][step];
  return <div className="travel-studio">
    <header className="ts-header"><span className="ts-brand"><span aria-hidden="true">✳</span> travella</span><span>Your world, a little closer.</span></header>
    <nav className="ts-progress-wrap" aria-label="Onboarding progress"><div className="ts-progress" role="progressbar" aria-label="Saved onboarding steps" aria-valuemin={0} aria-valuemax={4} aria-valuenow={resolved}><span style={{ width: `${resolved * 25}%` }} /></div><ol className="ts-step-labels">{labels.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={['completed', 'skipped'].includes(saved.onboarding?.steps?.[steps[index]]) ? 'done' : ''}><span aria-hidden="true">{['completed', 'skipped'].includes(saved.onboarding?.steps?.[steps[index]]) ? '✓' : `0${index + 1}`}</span>{label}</li>)}</ol></nav>
    <main className="ts-layout">
      <section className="ts-editorial"><p className="ts-studio-label">A LITTLE ABOUT YOU. A WORLD AHEAD.</p><h1 ref={heading} tabIndex={-1}>{headlines[step]}</h1><p className="ts-description">{descriptions[step]}</p><Globe /><ProfilePreview data={data} /><p className="ts-studio-note">Thoughtful plans begin with you.</p></section>
      <form className="ts-form" ref={form} onSubmit={event => { event.preventDefault(); save('continue'); }}>
        <div className="ts-chapter"><span>CHAPTER 0{step + 1}</span><h2>{labels[step]}</h2><p>{step === 0 ? 'The beginning of every adventure.' : step === 1 ? 'Your story can cross borders.' : step === 2 ? 'More comfortable, more you.' : 'A little collection of what you love.'}</p></div>
        {returned && <p className="ts-returned">We’ve brought your saved preferences with you. Review them as you go.</p>}
        <fieldset disabled={busy}><Step key={`${step}-${reloadKey}`} data={data} update={update} /></fieldset>
        {error && <div className="ts-error" role="alert"><p>{error.message}</p><button type="button" disabled={busy} onClick={error.stale ? reload : () => save(pending.current?.request.action || 'continue', true)}>{error.stale ? 'Reload saved preferences' : 'Retry save'}</button></div>}
        <p className="ts-save-status" role="status" aria-live="polite">{status || 'Each step saves when you continue. Come back anytime.'}</p>
        <StepActions step={step} busy={busy || Boolean(error?.stale)} canContinue={canContinue} onBack={() => { setStep(value => value - 1); setError(null); setStatus(''); pending.current = null; }} onSkip={() => save('skip')} />
      </form>
    </main>
  </div>;
}
