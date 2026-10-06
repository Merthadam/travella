import React, { useEffect, useState } from 'react';
import { HomeStep } from '../onboarding/steps/HomeStep';
import { CitizenshipStep } from '../onboarding/steps/CitizenshipStep';
import { countryName } from '../onboarding/components/ProfilePreview';
import { loadAirports } from '../onboarding/catalogs';
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

export const preferenceLabels = { home: 'home base', citizenship: 'citizenships', needs: 'food & accessibility' };
export const preferenceSaved = { home: 'Your home base was saved.', citizenship: 'Your citizenships were saved.', needs: 'Your food and accessibility preferences were saved.' };
export function preferenceDraft(setting, profile) {
  if (setting === 'home') return { home_city: profile.home_city ? { ...profile.home_city } : null, default_airport: profile.default_airport ?? null };
  if (setting === 'citizenship') return { citizenships: [...(profile.citizenships || [])] };
  return { food_needs: profile.food_needs || '', accessibility_needs: profile.accessibility_needs || '' };
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
    if (setting === 'home') return <><p>Your usual starting point. You can choose another for any trip.</p><p>Changing your home clears the airport in this draft. Save changes to apply both.</p><HomeStep data={{ ...draft, departure_base: profile.departure_base }} update={update} disabled={disabled} account /></>;
    if (setting === 'citizenship') return <><p>Add the countries you hold citizenship in. This is optional.</p><CitizenshipStep data={draft} update={update} /><button type="button" disabled={disabled || !draft.citizenships.length} onClick={() => update({ citizenships: [] })}>Clear citizenships</button></>;
    return <>{[['food_needs', 'Food preferences & allergies'], ['accessibility_needs', 'Accessibility needs']].map(([key, label]) => <label key={key}>{label}<textarea id={`account-${key.replaceAll('_', '-')}`} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'account-save-error' : undefined} disabled={disabled} maxLength={1000} value={draft[key]} onChange={event => update({ [key]: event.target.value })} /></label>)}</>;
  }
  if (setting === 'home') {
    const airport = airports.find(item => item.code === profile.default_airport);
    return <><dl className="account-values"><dt>Home base</dt><dd>{profile.home_city?.address || profile.home_city?.name || profile.departure_base || 'No home base saved'}{profile.home_city && <small>{profile.home_city.name} · {countryName(profile.home_city.country_code)}</small>}</dd><dt>Preferred airport</dt><dd>{airport ? `${airport.code} · ${airport.name}` : profile.default_airport || 'No preference'}</dd></dl><SavedHomeMap city={profile.home_city} /></>;
  }
  if (setting === 'citizenship') return <div className="account-values account-chips">{profile.citizenships?.length ? profile.citizenships.map(code => <span key={code}>{countryName(code)}</span>) : 'No citizenships added'}</div>;
  return <dl className="account-values"><dt>Food preferences &amp; allergies</dt><dd>{profile.food_needs || 'Not provided'}</dd><dt>Accessibility needs</dt><dd>{profile.accessibility_needs || 'Not provided'}</dd></dl>;
}
