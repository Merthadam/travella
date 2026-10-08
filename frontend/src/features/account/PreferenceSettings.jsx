import React, { useEffect, useState } from 'react';
import { HomeStep } from '../onboarding/steps/HomeStep';
import { CitizenshipStep } from '../onboarding/steps/CitizenshipStep';
import { countryName } from '../onboarding/components/ProfilePreview';
import { interests, loadAirports } from '../onboarding/catalogs';
import { restoreHomeLocation } from '../onboarding/places';
import { HomeLocationMap } from '../onboarding/components/HomeLocationMap';

function SavedHomeMap({ city }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLocation(null); setError(false);
    if (city?.source !== 'google' || !city?.place_id) { setLoading(false); return; }
    setLoading(true);
    restoreHomeLocation({ place_id: city.place_id }).then(point => { if (active) { setLocation(point); setLoading(false); } }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [city?.source, city?.place_id, attempt]);
  if (city?.source !== 'google' || !city?.place_id) return <p>Map unavailable for this saved home. Manual addresses are not verified on the map.</p>;
  return <HomeLocationMap location={location} airports={[]} onSelectAirport={() => {}} restoring={loading} restoreError={error} onRetryRestore={() => setAttempt(value => value + 1)} caption="Your saved home. Edit home base to change your departure airport." />;
}

export const preferenceLabels = { home: 'home base', citizenship: 'citizenships', needs: 'food & accessibility', interests: 'your interests' };
export const preferenceSaved = { home: 'Your home base was saved.', citizenship: 'Your citizenships were saved.', needs: 'Your food and accessibility preferences were saved.', interests: 'Your interests were saved.' };
export function preferenceDraft(setting, profile) {
  if (setting === 'home') return { home_city: profile.home_city ? { ...profile.home_city } : null, default_airport: profile.default_airport ?? null };
  if (setting === 'citizenship') return { citizenships: [...(profile.citizenships || [])] };
  if (setting === 'interests') return { interest_ids: [...(profile.interest_ids || [])], custom_interests: [...(profile.custom_interests || [])] };
  return { food_needs: profile.food_needs || '', accessibility_needs: profile.accessibility_needs || '' };
}

const interestLabel = id => interests.find(item => item.id === id)?.label || id;
const normalize = text => text.trim().replace(/\s+/g, ' ');
function InterestEditor({ draft, update, profile }) {
  const [custom, setCustom] = useState('');
  const [notice, setNotice] = useState('');
  const labels = [...draft.interest_ids.map(interestLabel), ...draft.custom_interests];
  const count = labels.length;
  function fits(next) {
    if (next.interest_ids.length > 40 || next.custom_interests.length > 20) { setNotice('You can save up to 40 curated and 20 custom interests. Remove one before adding another.'); return false; }
    if ([...next.interest_ids.map(interestLabel), ...next.custom_interests].join(', ').length > 1000) { setNotice('Please shorten or remove a custom interest before adding more.'); return false; }
    return true;
  }
  function toggle(id) {
    const selected = draft.interest_ids.includes(id);
    const next = { ...draft, interest_ids: selected ? draft.interest_ids.filter(value => value !== id) : [...draft.interest_ids, id] };
    if (!selected && draft.custom_interests.some(value => value.toLowerCase() === interestLabel(id).toLowerCase())) { setNotice('That interest is already selected.'); return; }
    if (fits(next)) { update(next); setNotice(''); }
  }
  function add() {
    const label = normalize(custom);
    if (!label) return;
    if (labels.some(value => value.toLowerCase() === label.toLowerCase())) { setNotice('That interest is already selected.'); return; }
    const known = interests.find(item => item.label.toLowerCase() === label.toLowerCase());
    const next = known ? { ...draft, interest_ids: [...draft.interest_ids, known.id] } : { ...draft, custom_interests: [...draft.custom_interests, label] };
    if (fits(next)) { update(next); setCustom(''); setNotice(`${label} added.`); }
  }
  return <div className="account-interest-editor">
    <p>Choose any that feel like you. There's no minimum.</p>
    {!profile.interest_ids?.length && !profile.custom_interests?.length && profile.travel_interests && <div className="account-values"><strong>Previously saved interests</strong><p>{profile.travel_interests}</p><p>Save changes to replace this text with your selections, including an empty selection.</p></div>}
    <p aria-live="polite">{count === 0 ? 'No interests selected' : `${count} interest${count === 1 ? '' : 's'} selected`}</p>
    <div className="account-chips" role="group" aria-label="Selected interests">{draft.interest_ids.map(id => <button type="button" key={id} aria-label={`Remove ${interestLabel(id)} interest`} onClick={() => toggle(id)}>{interestLabel(id)} ×</button>)}{draft.custom_interests.map(label => <button type="button" key={label} aria-label={`Remove ${label} interest`} onClick={() => { update({ custom_interests: draft.custom_interests.filter(value => value !== label) }); setNotice(''); }}>{label} ×</button>)}</div>
    <div className="account-chips" role="group" aria-label="Travel interests">{interests.map(item => <button type="button" key={item.id} aria-pressed={draft.interest_ids.includes(item.id)} onClick={() => toggle(item.id)}>{item.label}</button>)}</div>
    <label htmlFor="account-custom-interest">Something else you love?</label><div className="account-interest-add"><input id="account-custom-interest" maxLength={60} value={custom} onChange={event => { setCustom(event.target.value); setNotice(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} /><button type="button" disabled={!custom.trim()} onClick={add}>Add interest</button></div>
    <p role="status">{notice}</p><button type="button" onClick={() => { update({ interest_ids: [], custom_interests: [] }); setNotice(''); }}>Clear all interests</button>
  </div>;
}

export function PreferenceSettings({ setting, profile, draft, onDraftChange, editing, disabled, invalid }) {
  const [airports, setAirports] = useState([]);
  useEffect(() => {
    let active = true;
    if (setting === 'home') loadAirports().then(items => { if (active) setAirports(items); }).catch(() => {});
    return () => { active = false; };
  }, [setting]);
  const update = values => onDraftChange({ ...draft, ...values });
  if (editing) {
    if (setting === 'interests') return <InterestEditor draft={draft} update={update} profile={profile} />;
    if (setting === 'home') return <><p>Your usual starting point. You can choose another for any trip.</p><p>Changing your home clears the airport in this draft. Save changes to apply both.</p><HomeStep data={{ ...draft, departure_base: profile.departure_base }} update={update} disabled={disabled} account /></>;
    if (setting === 'citizenship') return <><p>Add the countries you hold citizenship in. This is optional.</p><CitizenshipStep data={draft} update={update} /><button type="button" disabled={disabled || !draft.citizenships.length} onClick={() => update({ citizenships: [] })}>Clear citizenships</button></>;
    return <>{[['food_needs', 'Food preferences & allergies'], ['accessibility_needs', 'Accessibility needs']].map(([key, label]) => <label key={key}>{label}<textarea id={`account-${key.replaceAll('_', '-')}`} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'account-save-error' : undefined} disabled={disabled} maxLength={1000} value={draft[key]} onChange={event => update({ [key]: event.target.value })} /></label>)}</>;
  }
  if (setting === 'home') {
    const airport = airports.find(item => item.code === profile.default_airport);
    return <><dl className="account-values"><dt>Home base</dt><dd>{profile.home_city?.address || profile.home_city?.name || profile.departure_base || 'No home base saved'}{profile.home_city && <small>{profile.home_city.name} · {countryName(profile.home_city.country_code)}</small>}</dd><dt>Preferred airport</dt><dd>{airport ? `${airport.code} · ${airport.name}` : profile.default_airport || 'No preference'}</dd></dl><SavedHomeMap city={profile.home_city} /></>;
  }
  if (setting === 'citizenship') return <div className="account-values account-chips">{profile.citizenships?.length ? profile.citizenships.map(code => <span key={code}>{countryName(code)}</span>) : 'No citizenships added'}</div>;
  if (setting === 'interests') {
    const labels = [...(profile.interest_ids || []).map(interestLabel), ...(profile.custom_interests || [])];
    return <div className="account-values account-chips">{labels.length ? labels.map(label => <span key={label}>{label}</span>) : profile.travel_interests || 'No interests selected'}</div>;
  }
  return <dl className="account-values"><dt>Food preferences &amp; allergies</dt><dd>{profile.food_needs || 'Not provided'}</dd><dt>Accessibility needs</dt><dd>{profile.accessibility_needs || 'Not provided'}</dd></dl>;
}
