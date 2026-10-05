import React, { useEffect, useRef, useState } from 'react';
import { countries, loadAirports } from '../catalogs';
import { searchAddresses, resolveAddress, restoreHomeLocation, createPlacesSession, findGoogleAirports, searchGoogleAirports, findNearbyAirports, searchAirports } from '../places';
import { countryName } from '../components/ProfilePreview';
import { HomeLocationMap } from '../components/HomeLocationMap';

export function HomeStep({ data, update }) {
  const [query, setQuery] = useState(data.home_city?.address || '');
  const [manual, setManual] = useState(data.home_city?.source === 'manual');
  const [editing, setEditing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [location, setLocation] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [airports, setAirports] = useState([]);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [airportQuery, setAirportQuery] = useState('');
  const [airportSearch, setAirportSearch] = useState('');
  const [airportResults, setAirportResults] = useState([]);
  const [useAirportCatalog, setUseAirportCatalog] = useState(false);
  const [airportLoading, setAirportLoading] = useState(false);
  const [airportError, setAirportError] = useState(false);
  const [airportAttempt, setAirportAttempt] = useState(0);
  const [airportNotice, setAirportNotice] = useState('');
  const alive = useRef(true);
  const lookupVersion = useRef(0);
  const airportVersion = useRef(0);
  const restoreVersion = useRef(0);
  const session = useRef(null);
  const restoredPlace = useRef(null);
  const manualAddress = useRef(null);
  const selectedHome = Boolean(data.home_city?.address && !editing);

  useEffect(() => { alive.current = true; return () => { alive.current = false; lookupVersion.current += 1; airportVersion.current += 1; restoreVersion.current += 1; }; }, []);
  useEffect(() => {
    let current = true;
    loadAirports().then(items => { if (current) { setAirports(items); setCatalogError(false); } }).catch(() => { if (current) setCatalogError(true); });
    return () => { current = false; };
  }, [catalogAttempt]);
  useEffect(() => {
    const version = ++lookupVersion.current;
    setSuggestions([]); setActive(-1); setLookupError('');
    if (manual || !editing || query.trim().length < 3) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        session.current ||= await createPlacesSession();
        const results = await searchAddresses(query.trim(), session.current);
        if (!alive.current || version !== lookupVersion.current) return;
        setSuggestions(results); setLoading(false);
      } catch {
        if (alive.current && version === lookupVersion.current) { setLookupError('Address search is unavailable. Try again, or enter your address manually.'); setLoading(false); }
      }
    }, 300);
    return () => { clearTimeout(timer); };
  }, [query, manual, editing, attempt]);

  const placeId = data.home_city?.address ? data.home_city.place_id : null;
  useEffect(() => {
    if (!placeId || manual || restoredPlace.current === placeId) return;
    let current = true;
    const version = ++restoreVersion.current;
    setRestoring(true); setRestoreError(false);
    restoreHomeLocation({ place_id: placeId }).then(point => {
      if (!current || version !== restoreVersion.current) return;
      restoredPlace.current = placeId;
      setLocation(point); setRestoring(false);
    }).catch(() => { if (current && version === restoreVersion.current) { setRestoring(false); setRestoreError(true); } });
    return () => { current = false; };
  }, [placeId, manual, restoreAttempt]);

  useEffect(() => {
    const version = ++airportVersion.current;
    setAirportResults([]); setAirportError(false);
    if (!airports.length || (!location && !airportSearch.trim())) { setAirportLoading(false); return; }
    if (manual || !location || useAirportCatalog) {
      setAirportResults((airportSearch.trim() ? searchAirports(airportSearch, airports) : findNearbyAirports(location, airports)).slice(0, 5)); setAirportLoading(false); return;
    }
    setAirportLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = airportSearch.trim() ? await searchGoogleAirports(airportSearch.trim(), location, airports) : await findGoogleAirports(location, airports);
        if (!alive.current || version !== airportVersion.current) return;
        setAirportResults(results.slice(0, 5)); setAirportLoading(false);
      } catch {
        if (!alive.current || version !== airportVersion.current) return;
        setAirportError(true); setAirportLoading(false);
        setAirportResults((airportSearch.trim() ? searchAirports(airportSearch, airports) : findNearbyAirports(location, airports)).slice(0, 5));
      }
    }, 0);
    return () => { clearTimeout(timer); };
  }, [location, airports, airportSearch, airportAttempt, manual, useAirportCatalog]);

  function invalidateHome() {
    lookupVersion.current += 1; airportVersion.current += 1; restoreVersion.current += 1;
    if (data.default_airport) setAirportNotice('Your previous airport was cleared. Choose an airport for this address, or choose later.');
    restoredPlace.current = null;
    setLocation(null); setUseAirportCatalog(false); setAirportQuery(''); setAirportSearch(''); setAirportResults([]); setRestoreError(false); setRestoring(false);
  }
  async function choose(suggestion) {
    const version = ++lookupVersion.current;
    setLoading(true); setSuggestions([]); setLookupError('');
    try {
      const resolved = await resolveAddress(suggestion);
      if (!alive.current || version !== lookupVersion.current) return;
      invalidateHome();
      restoredPlace.current = resolved.home_city.place_id;
      setLocation(resolved.location); setQuery(resolved.home_city.address); setEditing(false);
      update({ home_city: resolved.home_city, default_airport: null });
      session.current = null; setLoading(false);
    } catch {
      if (alive.current && version === lookupVersion.current) { setLookupError('We couldn’t confirm a full address and city here. Try a street address, or enter the details manually.'); setLoading(false); }
    }
  }
  function useManual() {
    invalidateHome(); setManual(true); setEditing(false); setSuggestions([]); setLoading(false);
    update({ home_city: { address: data.home_city?.address || query.trim(), name: data.home_city?.name || '', country_code: data.home_city?.country_code || '', source: 'manual' }, default_airport: null });
    requestAnimationFrame(() => manualAddress.current?.focus());
  }
  function editManual(field, value) {
    invalidateHome();
    update({ home_city: { ...data.home_city, [field]: value, source: 'manual', place_id: null }, default_airport: null });
  }
  function chooseAirport(code) {
    if (!airports.some(airport => airport.code === code)) return;
    update({ default_airport: code }); setAirportNotice('');
  }
  function submitAirportSearch() {
    airportVersion.current += 1; setAirportSearch(airportQuery.trim()); setAirportAttempt(value => value + 1);
  }
  const selectedAirport = airports.find(airport => airport.code === data.default_airport);
  const catalogFallback = manual || !location || airportError || useAirportCatalog;
  return <div className="ts-fields ts-home-fields">
    {!data.home_city && data.departure_base && !editing && <div className="ts-legacy"><strong>Your previously saved departure base</strong><p>{data.departure_base}</p><p>Select your full home address below to complete your home base.</p></div>}
    {data.home_city && !data.home_city.address && !manual && <p className="ts-help">Your saved home is {data.home_city.name}, {countryName(data.home_city.country_code)}. Add your full address to place it on the map.</p>}
    {!manual && <>
      <label htmlFor="ts-address">Your home address <span>Required</span></label>
      <input id="ts-address" role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="ts-address-results" aria-activedescendant={active >= 0 ? `ts-address-option-${active}` : undefined} aria-describedby="ts-address-help" value={query} autoComplete="off" placeholder="Start typing your street address" onChange={event => {
        invalidateHome(); setQuery(event.target.value); setEditing(true); update({ home_city: null, default_airport: null });
      }} onKeyDown={event => {
        if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setActive(index => (index + 1) % suggestions.length); }
        if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setActive(index => index < 0 ? suggestions.length - 1 : (index - 1 + suggestions.length) % suggestions.length); }
        if (event.key === 'Enter' && suggestions.length) { event.preventDefault(); choose(suggestions[Math.max(active, 0)]); }
        if (event.key === 'Escape') { setSuggestions([]); setActive(-1); }
      }} />
      <p id="ts-address-help" className="ts-help">Select an address, then we’ll automatically find airports nearby.</p>
      {loading && <p className="ts-help" role="status">Finding your address…</p>}
      {suggestions.length > 0 && <><ul className="ts-city-results" id="ts-address-results" role="listbox">{suggestions.map((suggestion, index) => <li id={`ts-address-option-${index}`} key={suggestion.id} role="option" aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => choose(suggestion)}><span aria-hidden="true">⌖</span><span><strong>{suggestion.mainText}</strong><small>{suggestion.secondaryText}</small></span><span aria-hidden="true">↗</span></li>)}</ul><div className="ts-google-attribution" translate="no">Google Maps</div></>}
      {!loading && !suggestions.length && editing && query.trim().length >= 3 && !lookupError && <p className="ts-help" role="status">No address found. Try adding the city or postal code.</p>}
      {lookupError && <div className="ts-lookup-error" role="status"><p>{lookupError}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry address search</button></div>}
      <button type="button" className="ts-text-button" onClick={useManual}>Enter address manually</button>
    </>}
    {manual && <>
      <p className="ts-help">Manual entry · this address has not been verified on the map.</p>
      <label htmlFor="ts-manual-address">Full home address <span>Required</span></label>
      <input ref={manualAddress} id="ts-manual-address" required maxLength={500} autoComplete="street-address" value={data.home_city?.address || ''} onChange={event => editManual('address', event.target.value)} placeholder="Street address, city and postal code" />
      <div className="ts-manual-location">
        <div><label htmlFor="ts-city-name">City <span>Required</span></label><input id="ts-city-name" required minLength={2} maxLength={110} autoComplete="address-level2" value={data.home_city?.name || ''} onChange={event => editManual('name', event.target.value)} /></div>
        <div><label htmlFor="ts-home-country">Country or territory <span>Required</span></label><select id="ts-home-country" required value={data.home_city?.country_code || ''} onChange={event => editManual('country_code', event.target.value)}><option value="">Choose country</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div>
      </div>
      <button type="button" className="ts-text-button" onClick={() => { invalidateHome(); setManual(false); setQuery(''); setEditing(false); update({ home_city: null, default_airport: null }); }}>Search for an address instead</button>
    </>}
    {selectedHome && !manual && <div className="ts-confirmed-address" role="status"><span aria-hidden="true">⌂</span><div><strong>{data.home_city.address}</strong><small>{data.home_city.name} · {countryName(data.home_city.country_code)}</small></div><span aria-label="Address selected">✓</span></div>}
    <HomeLocationMap location={location} airports={airportResults} selectedAirport={selectedAirport} onSelectAirport={chooseAirport} restoring={restoring} restoreError={restoreError} onRetryRestore={() => { restoredPlace.current = null; setRestoreAttempt(value => value + 1); }} />
    <div className="ts-field-heading"><div><h3>Your departure airport</h3><p>{location ? 'Nearby airports appear automatically. You choose your departure.' : 'Choose your usual airport, or decide later.'}</p></div><span>Optional</span></div>
    {airportNotice && <p className="ts-help" role="status">{airportNotice}</p>}
    {selectedAirport && <div className="ts-selected-airport"><span aria-hidden="true">✈</span><div><strong>{selectedAirport.code} · {selectedAirport.name}</strong><small>Your preferred departure airport</small></div><button type="button" aria-label="Clear selected airport" onClick={() => update({ default_airport: null })}>×</button></div>}
    <label className="ts-airport-search-label" htmlFor="ts-airport-search">Find another airport</label>
    <div className="ts-airport-search-row"><input id="ts-airport-search" type="search" autoComplete="off" placeholder="Airport name, city or IATA code" value={airportQuery} onChange={event => setAirportQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitAirportSearch(); } }} /><button type="button" onClick={submitAirportSearch}>Search</button></div>
    {airportSearch && location && <button type="button" className="ts-text-button" onClick={() => { setAirportQuery(''); setAirportSearch(''); }}>Show nearby airports</button>}
    {airportLoading && <p className="ts-help" role="status">{airportSearch ? 'Finding matching airports…' : 'Finding airports near your home…'}</p>}
    {airportError && <div className="ts-lookup-error" role="status"><p>Google airport search is unavailable. Showing airport catalog suggestions instead.</p><button type="button" onClick={() => setAirportAttempt(value => value + 1)}>Retry nearby airport search</button></div>}
    {airportResults.length > 0 && <>
      <p className="ts-airport-source">{catalogFallback ? 'AIRPORT CATALOG' : airportSearch ? 'GOOGLE MAPS AIRPORT RESULTS' : 'AIRPORTS NEAR YOUR HOME'}</p>
      <div className="ts-airports" role="group" aria-label={airportSearch ? 'Matching airports' : 'Nearby airports'}>{airportResults.map(airport => <button type="button" className={`ts-airport ${data.default_airport === airport.code ? 'selected' : ''}`} key={airport.code} aria-pressed={data.default_airport === airport.code} onClick={() => chooseAirport(airport.code)}><span className="ts-airport-code">{airport.code}</span><span><strong>{airport.name}</strong>{Number.isFinite(airport.distanceKm) && <small>Approx. {Math.round(airport.distanceKm)} km in a straight line</small>}</span><span className="ts-radio" aria-hidden="true">{data.default_airport === airport.code ? '✓' : ''}</span></button>)}</div>
      {!catalogFallback && <div className="ts-google-attribution" translate="no">Google Maps</div>}
    </>}
    {!airportLoading && !airportResults.length && !catalogError && (location || airportSearch) && <p className="ts-help" role="status">{airportSearch ? 'No matching airports. Try an airport name or IATA code.' : 'No matching airports found nearby. Search by airport name or IATA code, or choose later.'}</p>}
    {location && !airportLoading && !airportResults.length && !catalogFallback && <button type="button" className="ts-text-button" onClick={() => setUseAirportCatalog(true)}>Search the airport catalog instead</button>}
    {useAirportCatalog && <p className="ts-help">Showing the airport reference catalog. <button type="button" className="ts-text-button" onClick={() => setUseAirportCatalog(false)}>Retry Google airport search</button></p>}
    {catalogError && <div className="ts-lookup-error" role="status"><p>Airport choices couldn’t load. You can continue without one.</p><button type="button" onClick={() => setCatalogAttempt(value => value + 1)}>Retry airport choices</button></div>}
    <button type="button" className="ts-text-button" aria-pressed={!data.default_airport} onClick={() => { update({ default_airport: null }); setAirportNotice('You can choose an airport when you plan a trip.'); }}>I’ll choose an airport later</button>
  </div>;
}
