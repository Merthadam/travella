import React, { useEffect, useRef, useState } from 'react';
import { countries, loadAirports } from '../catalogs';
import { searchCities, resolveCity, createPlacesSession, findNearbyAirports, searchAirports } from '../places';
import { countryName } from '../components/ProfilePreview';

export function HomeStep({ data, update }) {
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState(data.home_city?.source === 'manual');
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [location, setLocation] = useState(null);
  const [airports, setAirports] = useState([]);
  const [airportQuery, setAirportQuery] = useState('');
  const [airportError, setAirportError] = useState(false);
  const [airportAttempt, setAirportAttempt] = useState(0);
  const [airportNotice, setAirportNotice] = useState('');
  const alive = useRef(true);
  const lookupVersion = useRef(0);
  const session = useRef(null);
  const nameInput = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; lookupVersion.current += 1; }; }, []);
  useEffect(() => { let current = true; loadAirports().then(items => { if (current) { setAirports(items); setAirportError(false); } }).catch(() => { if (current) setAirportError(true); }); return () => { current = false; }; }, [airportAttempt]);
  useEffect(() => {
    const version = ++lookupVersion.current;
    setSuggestions([]); setActive(-1); setLookupError('');
    if (manual || query.trim().length < 2 || selectedLabel) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        session.current ||= await createPlacesSession();
        const results = await searchCities(query.trim(), session.current);
        if (!alive.current || version !== lookupVersion.current) return;
        setSuggestions(results); setLoading(false);
      } catch { if (alive.current && version === lookupVersion.current) { setLookupError('City search is unavailable. Try again, or enter your city manually.'); setLoading(false); } }
    }, 300);
    return () => { clearTimeout(timer); };
  }, [query, manual, selectedLabel, attempt]);

  function clearAirport() {
    if (data.default_airport) setAirportNotice('Your departure airport was cleared. Choose an airport for this city, or choose one later.');
    setLocation(null); setAirportQuery('');
  }
  async function choose(suggestion) {
    const version = ++lookupVersion.current;
    setLoading(true); setSuggestions([]); setLookupError('');
    try {
      const city = await resolveCity(suggestion);
      if (!alive.current || version !== lookupVersion.current) return;
      clearAirport(); setLocation(city.location); setSelectedLabel([suggestion.mainText, suggestion.secondaryText].filter(Boolean).join(', '));
      update({ home_city: { name: '', country_code: city.country_code, place_id: city.place_id, source: 'google' }, default_airport: null });
      session.current = null; setLoading(false);
      requestAnimationFrame(() => nameInput.current?.focus());
    } catch { if (alive.current && version === lookupVersion.current) { setLookupError('We couldn’t confirm this city. Try another suggestion, or enter it manually.'); setLoading(false); } }
  }
  function useManual() {
    lookupVersion.current += 1; clearAirport(); setManual(true); setSelectedLabel(''); setSuggestions([]); setLoading(false);
    update({ home_city: { name: query.trim(), country_code: '', source: 'manual' }, default_airport: null });
  }
  const airportResults = airportQuery.trim() ? searchAirports(airportQuery, airports).slice(0, 8) : location ? findNearbyAirports(location, airports).slice(0, 5) : [];
  const selectedAirport = airports.find(airport => airport.code === data.default_airport);
  return <div className="ts-fields">
    {!data.home_city && data.departure_base && <div className="ts-legacy"><strong>Your previously saved departure base</strong><p>{data.departure_base}</p><p>Confirm your home city below. We haven’t guessed a city or airport from this text.</p></div>}
    {!manual && <><label htmlFor="ts-city">Find your home city <span>Required</span></label><input id="ts-city" role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="ts-city-results" aria-activedescendant={active >= 0 ? `ts-city-option-${active}` : undefined} value={query} autoComplete="off" placeholder={data.home_city ? 'Search to change your city' : 'Search for your city'} onChange={event => { setQuery(event.target.value); setSelectedLabel(''); clearAirport(); update({ home_city: null, default_airport: null }); }} onKeyDown={event => {
      if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setActive(index => (index + 1) % suggestions.length); }
      if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setActive(index => index < 0 ? suggestions.length - 1 : (index - 1 + suggestions.length) % suggestions.length); }
      if (event.key === 'Enter' && suggestions.length) { event.preventDefault(); choose(suggestions[Math.max(active, 0)]); }
      if (event.key === 'Escape') { setSuggestions([]); setActive(-1); }
    }} />
      {loading && <p className="ts-help" role="status">Finding your city…</p>}
      {suggestions.length > 0 && <><ul className="ts-city-results" id="ts-city-results" role="listbox">{suggestions.map((suggestion, index) => <li id={`ts-city-option-${index}`} key={suggestion.id} role="option" aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => choose(suggestion)}><span aria-hidden="true">⌖</span><span><strong>{suggestion.mainText}</strong><small>{suggestion.secondaryText}</small></span><span aria-hidden="true">↗</span></li>)}</ul><div className="ts-google-attribution" translate="no">Google Maps</div></>}
      {!loading && !suggestions.length && query.trim().length >= 2 && !selectedLabel && !lookupError && <p className="ts-help" role="status">No city found. Try a more specific name, or enter it manually.</p>}
      {lookupError && <div className="ts-lookup-error" role="status"><p>{lookupError}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry city search</button></div>}
      <button type="button" className="ts-text-button" onClick={useManual}>Enter city manually</button>
    </>}
    {data.home_city && <>
      {selectedLabel && <><p className="ts-chosen-home"><span aria-hidden="true">✓</span> {selectedLabel}</p><div className="ts-google-attribution" translate="no">Google Maps</div></>}
      {manual && <p className="ts-help">Manual entry · city location has not been verified.</p>}
      <label htmlFor="ts-city-name">{manual ? 'Your home city' : 'City name for your profile'} <span>Required</span></label>
      <input ref={nameInput} id="ts-city-name" required minLength={2} maxLength={110} autoComplete="address-level2" value={data.home_city.name} onChange={event => { if (data.default_airport) clearAirport(); update({ home_city: { ...data.home_city, name: event.target.value }, default_airport: null }); }} aria-describedby="ts-city-help" placeholder="Write the full city name" />
      <p id="ts-city-help" className="ts-help">Use the full city name you want to save with your profile.</p>
      {manual ? <><label htmlFor="ts-home-country">Country or territory <span>Required</span></label><select id="ts-home-country" required value={data.home_city.country_code} onChange={event => { clearAirport(); update({ home_city: { ...data.home_city, country_code: event.target.value }, default_airport: null }); }}><option value="">Choose a country or territory</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select><button type="button" className="ts-text-button" onClick={() => { setManual(false); setQuery(''); update({ home_city: null, default_airport: null }); }}>Search for a city instead</button></> : <p className="ts-help">{countryName(data.home_city.country_code)}</p>}
      <div className="ts-field-heading"><div><h3>Your usual departure airport</h3><p>You choose. You can always change it for a trip.</p></div><span>Optional</span></div>
      {airportNotice && <p className="ts-help" role="status">{airportNotice}</p>}
      {data.default_airport && <p className="ts-chosen-home"><span aria-hidden="true">✓</span> {data.default_airport}{selectedAirport ? ` · ${selectedAirport.name}` : ''}</p>}
      <label className="ts-airport-search-label" htmlFor="ts-airport-search">Search airports by name or code</label><input id="ts-airport-search" type="search" autoComplete="off" placeholder="For example, BUD or Budapest" value={airportQuery} onChange={event => setAirportQuery(event.target.value)} />
      <div className="ts-airports" role="group" aria-label={airportQuery ? 'Matching airports' : 'Nearby airports'}>{airportResults.map(airport => <button type="button" className={`ts-airport ${data.default_airport === airport.code ? 'selected' : ''}`} key={airport.code} aria-pressed={data.default_airport === airport.code} onClick={() => { update({ default_airport: data.default_airport === airport.code ? null : airport.code }); setAirportNotice(''); }}><span className="ts-airport-code">{airport.code}</span><span><strong>{airport.name}</strong>{Number.isFinite(airport.distanceKm) && <small>Approx. {Math.round(airport.distanceKm)} km in a straight line</small>}</span><span className="ts-radio" aria-hidden="true">{data.default_airport === airport.code ? '✓' : ''}</span></button>)}</div>
      {airportQuery && !airportResults.length && !airportError && <p className="ts-help">No matching airports. Try another name or IATA code.</p>}
      {airportError && <p className="ts-help">Airport choices couldn’t load. You can continue without one. <button type="button" className="ts-text-button" onClick={() => setAirportAttempt(value => value + 1)}>Retry airports</button></p>}
      <button type="button" className="ts-text-button" aria-pressed={!data.default_airport} onClick={() => { update({ default_airport: null }); setAirportNotice('You can choose an airport when you plan a trip.'); }}>I’ll choose an airport later</button>
    </>}
  </div>;
}
