import React from 'react';
import { countries, interests } from '../catalogs';

export const countryName = (code) => countries.find(country => country.code === code)?.name || code;
export const countryFlag = (code) => /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0))) : '◎';

export function ProfilePreview({ data }) {
  const selected = [...data.interest_ids.map(id => interests.find(interest => interest.id === id)?.label || id), ...data.custom_interests];
  return <section className="ts-profile" aria-label="Live travel profile preview">
    <div className="ts-profile-heading"><span>YOUR TRAVEL DNA</span><span aria-hidden="true">↗</span></div>
    <div className="ts-profile-home"><strong>{data.home_city?.name || 'Your next chapter'}</strong><span>{data.default_airport || 'Starts right here'}</span></div>
    <div className="ts-profile-row"><span>Citizenship</span><strong>{data.citizenships.length ? data.citizenships.map(countryName).join(' · ') : 'A world of possibilities'}</strong></div>
    <div className="ts-profile-row"><span>Travel needs</span><strong>{data.accessibility_needs || data.food_needs ? 'In your own words' : 'Your comfort comes first'}</strong></div>
    <div className="ts-profile-interests">{selected.length ? selected.map(label => <span key={label}>{label}</span>) : <p>Your favorite things will find a home here.</p>}</div>
    <div className="ts-profile-footer"><span>LIVE PREVIEW</span><span>Save with Continue</span></div>
  </section>;
}

export function Globe() {
  return <div className="ts-globe" aria-hidden="true"><svg viewBox="0 0 360 280" fill="none"><ellipse cx="180" cy="140" rx="110" ry="110"/><ellipse cx="180" cy="140" rx="58" ry="110"/><ellipse cx="180" cy="140" rx="110" ry="38"/><path d="M70 140h220M180 30v220M87 84h186M87 196h186"/><path className="ts-route" d="M66 202C86 130 211 218 268 67"/><circle className="ts-pin" cx="66" cy="202" r="6"/><circle className="ts-pin" cx="268" cy="67" r="6"/></svg><span className="ts-globe-tag ts-tag-one">A world of possibilities</span><span className="ts-globe-tag ts-tag-two">Made for you ↗</span></div>;
}
