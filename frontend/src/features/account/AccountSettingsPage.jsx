import React, { useEffect, useRef, useState } from 'react';
import { readTravelerProfile, request } from '../../api';
import './account.css';

const needs = profile => ({ food_needs: profile.food_needs || '', accessibility_needs: profile.accessibility_needs || '' });
export const ACCOUNT_SETTINGS = [
  { id: 'name', label: 'Your name', group: 'Personal details' },
  { id: 'email', label: 'Email address', group: 'Personal details' },
  { id: 'home', label: 'Home base', group: 'Travel preferences' },
  { id: 'citizenship', label: 'Citizenships', group: 'Travel preferences' },
  { id: 'needs', label: 'Food & accessibility', group: 'Travel preferences' },
  { id: 'interests', label: 'Your interests', group: 'Travel preferences' },
  { id: 'password', label: 'Password', group: 'Security' },
  { id: 'authenticator', label: 'Two-factor authentication', group: 'Security' },
  { id: 'recovery', label: 'Recovery codes', group: 'Security' },
];
const groups = [...new Set(ACCOUNT_SETTINGS.map(item => item.group))];
function initialTheme() {
  try { const stored = localStorage.getItem('travella.account.theme'); if (['light', 'dark'].includes(stored)) return stored; } catch { /* Storage is optional. */ }
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}

export function AccountSettingsPage({ initialProfile, onExpired, onNavigatePlans, navigationGuard, onProfileSaved }) {
  const [profile, setProfile] = useState(initialProfile);
  const [selected, setSelected] = useState('needs');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(initialTheme);
  const [pendingExit, setPendingExit] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState(null);
  const alive = useRef(true);
  const lock = useRef(false);
  const attempt = useRef(null);
  const detailHeading = useRef(null);
  const dialog = useRef(null);
  const keepButton = useRef(null);
  const errorBox = useRef(null);
  const setting = ACCOUNT_SETTINGS.find(item => item.id === selected);
  const invalid = error === 'Check the highlighted fields and try again.';
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(needs(profile));

  useEffect(() => { alive.current = true; return () => { alive.current = false; attempt.current = null; }; }, []);
  useEffect(() => {
    const previous = document.documentElement.style.colorScheme;
    return () => { document.documentElement.style.colorScheme = previous; };
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('travella.account.theme', theme); } catch { /* Keep in memory if denied. */ }
  }, [theme]);
  useEffect(() => { detailHeading.current?.focus(); }, [selected, Boolean(draft)]);
  useEffect(() => {
    if (invalid) document.getElementById('account-food-needs')?.focus();
    else if (error) errorBox.current?.focus();
  }, [error, invalid]);
  useEffect(() => {
    if (!dirty && !busy && !uncertain) return;
    const protect = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, busy, uncertain]);

  function resetEditor() {
    setDraft(null); setError(''); setNotice(''); setConflict(false); setLatest(null);
    setUncertain(false); attempt.current = null;
  }
  function guard(action) {
    if (lock.current) return false;
    if (dirty || uncertain) { setPendingExit(() => action); return false; }
    resetEditor(); action(); return true;
  }
  useEffect(() => {
    if (navigationGuard) navigationGuard.current = guard;
    return () => { if (navigationGuard) navigationGuard.current = null; };
  });
  useEffect(() => {
    if (!pendingExit) return;
    const opener = document.activeElement;
    dialog.current?.showModal();
    keepButton.current?.focus();
    return () => { dialog.current?.close(); if (opener?.isConnected) opener.focus(); };
  }, [pendingExit]);

  function expired() {
    alive.current = false; attempt.current = null; setDraft(null); setProfile(null);
    setLatest(null); setPendingExit(null); onExpired();
  }
  async function save(event, reconcile = false) {
    event?.preventDefault();
    if (lock.current || (uncertain && !reconcile) || conflict) return;
    lock.current = true; setBusy(true); setError('');
    if (!reconcile && (!attempt.current || JSON.stringify(attempt.current.values) !== JSON.stringify(draft))) {
      attempt.current = { section: 'needs', values: { ...draft }, expected_revision: profile.revision, event_id: crypto.randomUUID() };
    }
    try {
      const saved = await request('/v1/traveler-profile/sections', attempt.current, { method: 'PATCH' });
      if (!alive.current) return;
      // A receipt can predate later writes. On reconciliation show today's saved snapshot.
      const canonical = reconcile ? await readTravelerProfile() : saved;
      if (!alive.current) return;
      setProfile(canonical); onProfileSaved?.(canonical); setDraft(null); attempt.current = null;
      setUncertain(false); setLatest(null);
      setNotice('Your food and accessibility preferences were saved.');
    } catch (err) {
      if (!alive.current) return;
      if (err.status === 401) { expired(); return; }
      if (err.code === 'revision_conflict' || err.code === 'request_reused') {
        setUncertain(false); setConflict(true);
        setError('These preferences changed in another session. Review the latest saved details before saving again.');
      } else if (!err.status || err.status >= 500) {
        setUncertain(true);
        setError("We couldn't confirm whether your changes were saved. Check the saved details before trying again.");
      } else {
        setError(err.status === 422 ? 'Check the highlighted fields and try again.' : "We couldn't save your changes. Your edits are still here. Try again.");
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function reviewLatest() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const saved = await readTravelerProfile();
      if (!alive.current) return;
      setLatest(saved); setProfile(saved); onProfileSaved?.(saved);
      setConflict(false); attempt.current = null; setError('');
      setNotice('Review the latest saved details and your unsaved changes before saving again.');
    } catch (err) {
      if (!alive.current) return;
      if (err.status === 401) expired();
      else setError("We couldn't load this setting. Try again.");
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function values(saved) {
    return <dl className="account-values"><dt>Food preferences &amp; allergies</dt><dd>{saved.food_needs || 'Not provided'}</dd><dt>Accessibility needs</dt><dd>{saved.accessibility_needs || 'Not provided'}</dd></dl>;
  }
  function summary() {
    if (selected === 'needs') return <>{values(profile)}<button className="account-primary" onClick={() => { setDraft(needs(profile)); setNotice(''); }}>Edit food &amp; accessibility</button></>;
    if (selected === 'home') return <dl className="account-values"><dt>Home base</dt><dd>{profile.home_city?.address || profile.home_city?.name || profile.departure_base || 'No home base saved'}</dd><dt>Preferred airport</dt><dd>{profile.default_airport || 'No preference'}</dd></dl>;
    if (selected === 'citizenship') return <p className="account-values">{profile.citizenships?.join(', ') || 'No citizenships added'}</p>;
    if (selected === 'interests') return <p className="account-values">{profile.travel_interests || 'No interests selected'}</p>;
    return <p className="account-values">We couldn't load this setting. Try again.</p>;
  }
  if (!profile) return null;

  return <div className="account-page" data-theme={theme}>
    <header className="account-header"><span className="account-brand">✳ travella</span><button disabled={busy} onClick={() => guard(onNavigatePlans)}>My plans</button><span aria-current="page">Account</span>
      <div className="account-theme" aria-label="Appearance">{['light', 'dark'].map(value => <button key={value} aria-label={value === 'light' ? 'Light mode' : 'Dark mode'} aria-pressed={theme === value} onClick={() => setTheme(value)}>{value === 'light' ? '☀ Light' : '☾ Dark'}</button>)}</div>
    </header>
    <main className="account-layout">
      <div className="account-heading"><div><p className="account-kicker">YOUR TRAVEL COMPANION</p><h1>Account &amp; preferences</h1></div><p>Small details. Better journeys.</p></div>
      <div className="account-workspace">
        <aside className="account-master"><p><span aria-hidden="true">◯</span> Your traveler profile</p>{groups.map(group => <nav key={group} aria-label={group}><h2>{group}</h2>{ACCOUNT_SETTINGS.filter(item => item.group === group).map(item => <button key={item.id} disabled={busy} aria-current={selected === item.id ? 'page' : undefined} onClick={() => { if (item.id !== selected) guard(() => setSelected(item.id)); }}>{item.label}<span aria-hidden="true">›</span></button>)}</nav>)}</aside>
        <label className="account-mobile-setting">Choose a setting<select value={selected} disabled={busy} onChange={event => { const next = event.target.value; guard(() => setSelected(next)); }}>{groups.map(group => <optgroup key={group} label={group}>{ACCOUNT_SETTINGS.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}</select></label>
        <section className="account-detail" aria-labelledby="account-setting-heading">
          <p className="account-kicker">{setting.group}</p><h2 ref={detailHeading} tabIndex={-1} id="account-setting-heading">{setting.label}</h2>
          {selected === 'needs' && <p>Share as much or as little as you like. Clear a field to remove it.</p>}
          {error && <p ref={errorBox} id="account-save-error" tabIndex={-1} role="alert">{error}</p>}
          <p role="status" aria-live="polite">{notice}</p>
          {uncertain && <button disabled={busy} onClick={() => save(null, true)}>Check saved details</button>}
          {conflict && <button disabled={busy} onClick={reviewLatest}>Review latest details</button>}
          {latest && <div><h3>Latest saved details</h3>{values(latest)}<h3>Your unsaved changes</h3></div>}
          {draft ? <form onSubmit={save} aria-busy={busy}><fieldset disabled={busy || uncertain}>
            <label>Food preferences &amp; allergies<textarea id="account-food-needs" aria-invalid={invalid || undefined} aria-describedby={invalid ? 'account-save-error' : undefined} disabled={busy || uncertain} maxLength={1000} value={draft.food_needs} onChange={e => setDraft({ ...draft, food_needs: e.target.value })} /></label>
            <label>Accessibility needs<textarea aria-invalid={invalid || undefined} aria-describedby={invalid ? 'account-save-error' : undefined} disabled={busy || uncertain} maxLength={1000} value={draft.accessibility_needs} onChange={e => setDraft({ ...draft, accessibility_needs: e.target.value })} /></label>
          </fieldset><div className="account-actions"><button disabled={busy} type="button" onClick={() => guard(() => {})}>Cancel</button><button disabled={busy || uncertain || conflict} className="account-primary" type="submit">{busy ? 'Saving…' : 'Save changes'}</button></div></form> : summary()}
          <p className="account-note">These preferences help shape future suggestions. Your confirmed Plan details will not change.</p>
        </section>
      </div>
    </main>
    {pendingExit && <dialog ref={dialog} className="account-discard" aria-labelledby="account-discard-heading" aria-describedby="account-discard-description" onCancel={event => { event.preventDefault(); setPendingExit(null); }}>
      <h2 id="account-discard-heading">Discard unsaved changes?</h2><p id="account-discard-description">Your changes to this setting haven't been saved.</p>
      <div className="account-actions"><button ref={keepButton} onClick={() => setPendingExit(null)}>Keep editing</button><button onClick={() => { const action = pendingExit; setPendingExit(null); resetEditor(); action(); }}>Discard changes</button></div>
    </dialog>}
  </div>;
}
