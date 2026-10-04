import React, { useEffect, useState } from 'react';
import { saveTravelerProfile, sendOnboardingTurn } from './api';

const emptyProfile = {
  departure_base: '', citizenships: [], food_needs: '',
  accessibility_needs: '', travel_interests: '', onboarding_complete: false,
};

function applyCandidates(profile, candidates) {
  const next = { ...profile };
  for (const item of candidates || []) {
    if (item.topic === 'departure_base') next.departure_base = item.value;
    if (item.topic === 'citizenship') {
      next.citizenships = [...new Set([...next.citizenships, item.value])];
    }
    if (item.topic === 'food_needs') next.food_needs = item.value;
    if (item.topic === 'accessibility') next.accessibility_needs = item.value;
    if (item.topic === 'travel_interests') next.travel_interests = item.value;
  }
  return next;
}

export function FirstLoginOnboarding({ initialProfile, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({ ...emptyProfile, ...initialProfile });
  const [draft, setDraft] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function ask(nextMessages) {
    setBusy(true); setError('');
    try {
      const result = await sendOnboardingTurn(nextMessages);
      setProfile((current) => applyCandidates(current, result.answer_candidates));
      setMessages([...nextMessages, { role: 'assistant', content: result.assistant_text }]);
      if (result.action === 'finish') setReview(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { ask([]); }, []);

  async function submitAnswer(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }].slice(-12);
    setMessages(next); setDraft('');
    await ask(next);
  }

  async function complete(withAnswers) {
    setBusy(true); setError('');
    try {
      const result = await saveTravelerProfile({
        departure_base: withAnswers ? profile.departure_base : '',
        citizenships: withAnswers ? profile.citizenships : [],
        food_needs: withAnswers ? profile.food_needs : '',
        accessibility_needs: withAnswers ? profile.accessibility_needs : '',
        travel_interests: withAnswers ? profile.travel_interests : '',
        onboarding_complete: true,
      });
      onComplete(result);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function update(field, value) { setProfile((current) => ({ ...current, [field]: value })); }

  return <main className="onboarding-shell">
    <p className="eyebrow">YOUR TRAVEL PROFILE</p>
    <h1 tabIndex={-1}>A few details for better trip plans</h1>
    <p className="quiet">I’ll ask a few focused questions. You can skip any of them. These details can help with future plans.</p>
    {!review ? <>
      <section className="onboarding-chat" aria-label="Onboarding conversation" aria-live="polite">
        {messages.map((message, index) => <p className={`onboarding-message ${message.role}`} key={`${index}-${message.role}`}>
          <span className="onboarding-speaker">{message.role === 'assistant' ? 'Travella' : 'You'}</span>
          {message.content}
        </p>)}
        {busy && <p className="quiet" role="status">Thinking…</p>}
      </section>
      <form onSubmit={submitAnswer} className="onboarding-reply">
        <label htmlFor="onboarding-answer">Your answer</label>
        <textarea id="onboarding-answer" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={3} disabled={busy} />
        <div className="actions">
          <button type="submit" className="primary" disabled={busy || !draft.trim()}>Send answer</button>
          <button type="button" disabled={busy} onClick={() => setReview(true)}>Review and continue</button>
        </div>
      </form>
    </> : <section className="onboarding-review" aria-label="Review traveler profile">
      <h2>Review what to remember</h2>
      <p className="quiet">Only save details you want to reuse. Your departure base can be a city or airport; no street address is needed.</p>
      <label>Usual departure city or airport<input value={profile.departure_base} maxLength={120} onChange={(event) => update('departure_base', event.target.value)} /></label>
      <label>Citizenship(s), if relevant<input value={profile.citizenships.join(', ')} maxLength={800} onChange={(event) => update('citizenships', event.target.value.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 10))} /></label>
      <label>Food allergies or dietary needs<textarea value={profile.food_needs} maxLength={1000} rows={2} onChange={(event) => update('food_needs', event.target.value)} /></label>
      <label>Accessibility needs<textarea value={profile.accessibility_needs} maxLength={1000} rows={2} onChange={(event) => update('accessibility_needs', event.target.value)} /></label>
      <label>Travel interests<textarea value={profile.travel_interests} maxLength={1000} rows={2} onChange={(event) => update('travel_interests', event.target.value)} /></label>
      <div className="actions">
        <button disabled={busy} onClick={() => setReview(false)}>Back to questions</button>
        <button className="primary" disabled={busy} onClick={() => complete(true)}>{busy ? 'Saving…' : 'Save profile and continue'}</button>
        <button disabled={busy} onClick={() => complete(false)}>Skip and continue</button>
      </div>
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
  </main>;
}
