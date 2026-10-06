import React, { useEffect, useRef, useState } from 'react';
import { request } from '../../api';
import './account.css';

const needs = profile => ({ food_needs: profile.food_needs || '', accessibility_needs: profile.accessibility_needs || '' });

export function AccountSettingsPage({ initialProfile, onExpired, onNavigatePlans }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const alive = useRef(true);
  const lock = useRef(false);
  const attempt = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    if (!attempt.current || JSON.stringify(attempt.current.values) !== JSON.stringify(draft)) {
      attempt.current = { section: 'needs', values: { ...draft }, expected_revision: profile.revision, event_id: crypto.randomUUID() };
    }
    try {
      const saved = await request('/v1/traveler-profile/sections', attempt.current, { method: 'PATCH' });
      if (!alive.current) return;
      setProfile(saved); setDraft(null); attempt.current = null;
      setNotice('Your food and accessibility preferences were saved.');
    } catch (err) {
      if (!alive.current) return;
      if (err.status === 401) { onExpired(); return; }
      setError("We couldn't save your changes. Your edits are still here. Try again.");
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  return <div className="account-page">
    <header className="account-header"><span className="account-brand">Travella</span><button onClick={onNavigatePlans}>My plans</button><span aria-current="page">Account</span></header>
    <main className="account-layout">
      <div className="account-heading"><div><p className="account-kicker">YOUR TRAVEL COMPANION</p><h1>Account &amp; preferences</h1></div><p>Small details. Better journeys.</p></div>
      <div className="account-workspace">
        <aside className="account-master"><p>Your traveler profile</p><nav aria-label="Travel preferences"><h2>Travel preferences</h2><button aria-current="page">Food &amp; accessibility</button></nav></aside>
        <section className="account-detail" aria-labelledby="account-setting-heading">
          <p className="account-kicker">Travel preferences</p><h2 id="account-setting-heading">Food &amp; accessibility</h2>
          <p>Share as much or as little as you like. Clear a field to remove it.</p>
          {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
          {draft ? <form onSubmit={save} aria-busy={busy}><fieldset disabled={busy}>
            <label>Food preferences &amp; allergies<textarea maxLength={1000} value={draft.food_needs} onChange={e => setDraft({ ...draft, food_needs: e.target.value })} /></label>
            <label>Accessibility needs<textarea maxLength={1000} value={draft.accessibility_needs} onChange={e => setDraft({ ...draft, accessibility_needs: e.target.value })} /></label>
            <div className="account-actions"><button disabled={busy} type="button" onClick={() => { setDraft(null); setError(''); }}>Cancel</button><button disabled={busy} className="account-primary" type="submit">{busy ? 'Saving…' : 'Save changes'}</button></div>
          </fieldset></form> : <><dl className="account-values"><dt>Food preferences &amp; allergies</dt><dd>{profile.food_needs || 'Not provided'}</dd><dt>Accessibility needs</dt><dd>{profile.accessibility_needs || 'Not provided'}</dd></dl><button className="account-primary" onClick={() => { setDraft(needs(profile)); setNotice(''); }}>Edit food &amp; accessibility</button></>}
          <p className="account-note">These preferences help shape future suggestions. Your confirmed Plan details will not change.</p>
        </section>
      </div>
    </main>
  </div>;
}
