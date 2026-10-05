import React, { useState } from 'react';
import { countries } from '../catalogs';
import { countryFlag, countryName } from '../components/ProfilePreview';

export function CitizenshipStep({ data, update }) {
  const [query, setQuery] = useState('');
  const available = countries.filter(country => !data.citizenships.includes(country.code) && `${country.name} ${country.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="ts-fields">
    <div className={`ts-wallet ${data.citizenships.length ? 'has-cards' : ''}`}>
      {data.citizenships.length ? data.citizenships.map(code => <div className="ts-passport" key={code}>
        <div className="ts-passport-top"><span>TRAVEL IDENTITY</span><button type="button" aria-label={`Remove ${countryName(code)} citizenship`} onClick={() => update({ citizenships: data.citizenships.filter(value => value !== code) })}>×</button></div>
        <span className="ts-passport-flag" aria-hidden="true">{countryFlag(code)}</span><strong>{countryName(code)}</strong><span>{countries.some(country => country.code === code) ? 'Citizenship' : 'Previously saved · review or remove'}</span><div className="ts-passport-foot"><span>TRAVELLA</span><span aria-hidden="true">◉</span></div>
      </div>) : <div className="ts-wallet-empty"><span aria-hidden="true">◉</span><strong>Your world belongs here.</strong><p>Add a citizenship to start your travel wallet.</p></div>}
    </div>
    <label htmlFor="ts-country">{data.citizenships.length ? 'Add another citizenship' : 'Find your country'} <span>Optional</span></label>
    <input id="ts-country" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search countries" autoComplete="off" aria-controls="ts-country-results" />
    <div id="ts-country-results" className="ts-country-grid" aria-label="Countries">{available.slice(0, query ? 30 : 8).map(country => <button type="button" key={country.code} disabled={data.citizenships.length >= 10} onClick={() => { update({ citizenships: [...data.citizenships, country.code] }); setQuery(''); }}><span aria-hidden="true">{countryFlag(country.code)}</span><span>{country.name}</span><span aria-hidden="true">+</span></button>)}</div>
    {!available.length && <p className="ts-help" role="status">No matching countries. Try another name or country code.</p>}
    {data.citizenships.length >= 10 && <p className="ts-help">You can save up to 10 citizenships.</p>}
    <p className="ts-help">Helps us consider relevant entry requirements when you plan. No passport documents needed.</p>
  </div>;
}
