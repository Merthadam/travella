// THROWAWAY: three four-step onboarding designs, on ?preview=onboarding&variant=A|B|C.
// All place lookups and saves are simulated. State is deliberately memory-only.
import React, { useEffect, useState } from 'react';
import './onboarding-prototype.css';

const directions = { A: 'Soft landing', B: 'Travel studio', C: 'Departure board' };
const stages = ['Home base', 'Citizenship', 'Your needs', 'Your interests'];
const titles = ['Good journeys start at home.', 'A little more of your world.', 'Travel should fit you.', 'What makes you feel alive?'];
const descriptions = [
  'Tell us where you usually start. We’ll help you find a convenient departure airport.',
  'Which citizenships do you hold? Build your travel wallet, one country at a time.',
  'Share anything that helps us make your travels more comfortable. Only what you want to.',
  'Pick at least five things you love. The obvious favorites. The unexpected ones. All of it.',
];
const cities = [
  { name: 'Prague', country: 'Czechia', flag: '🇨🇿', airports: [['PRG', 'Václav Havel Airport', '17 km']] },
  { name: 'Budapest', country: 'Hungary', flag: '🇭🇺', airports: [['BUD', 'Ferenc Liszt Airport', '18 km'], ['VIE', 'Vienna International', '215 km']] },
  { name: 'Brno', country: 'Czechia', flag: '🇨🇿', airports: [['BRQ', 'Brno–Tuřany', '8 km'], ['VIE', 'Vienna International', '120 km'], ['PRG', 'Václav Havel Airport', '200 km']] },
  { name: 'Vienna', country: 'Austria', flag: '🇦🇹', airports: [['VIE', 'Vienna International', '18 km'], ['BTS', 'Bratislava Airport', '62 km']] },
  { name: 'London', country: 'United Kingdom', flag: '🇬🇧', airports: [['LHR', 'Heathrow', '23 km'], ['LCY', 'London City', '12 km'], ['LGW', 'Gatwick', '40 km']] },
  { name: 'Berlin', country: 'Germany', flag: '🇩🇪', airports: [['BER', 'Berlin Brandenburg', '19 km']] },
  { name: 'Paris', country: 'France', flag: '🇫🇷', airports: [['CDG', 'Charles de Gaulle', '23 km'], ['ORY', 'Paris Orly', '15 km']] },
  { name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', airports: [['AMS', 'Amsterdam Schiphol', '11 km']] },
];
const countries = [
  ['CZ', 'Czechia', '🇨🇿'], ['SK', 'Slovakia', '🇸🇰'], ['HU', 'Hungary', '🇭🇺'], ['AT', 'Austria', '🇦🇹'],
  ['DE', 'Germany', '🇩🇪'], ['GB', 'United Kingdom', '🇬🇧'], ['FR', 'France', '🇫🇷'], ['IT', 'Italy', '🇮🇹'],
  ['ES', 'Spain', '🇪🇸'], ['PT', 'Portugal', '🇵🇹'], ['NL', 'Netherlands', '🇳🇱'], ['PL', 'Poland', '🇵🇱'],
  ['US', 'United States', '🇺🇸'], ['CA', 'Canada', '🇨🇦'], ['AU', 'Australia', '🇦🇺'], ['NZ', 'New Zealand', '🇳🇿'],
  ['JP', 'Japan', '🇯🇵'], ['IN', 'India', '🇮🇳'], ['BR', 'Brazil', '🇧🇷'], ['ZA', 'South Africa', '🇿🇦'],
  ['IE', 'Ireland', '🇮🇪'], ['CH', 'Switzerland', '🇨🇭'], ['SE', 'Sweden', '🇸🇪'], ['NO', 'Norway', '🇳🇴'],
  ['DK', 'Denmark', '🇩🇰'], ['FI', 'Finland', '🇫🇮'], ['GR', 'Greece', '🇬🇷'], ['HR', 'Croatia', '🇭🇷'],
  ['RO', 'Romania', '🇷🇴'], ['UA', 'Ukraine', '🇺🇦'], ['KR', 'South Korea', '🇰🇷'], ['MX', 'Mexico', '🇲🇽'],
];
const interests = [
  ['⛰', 'Hiking'], ['✳', 'Skiing'], ['☀', 'Beaches'], ['◒', 'Local food'], ['▥', 'Architecture'],
  ['♧', 'Nature'], ['♫', 'Live music'], ['◎', 'Photography'], ['⌁', 'Surfing'], ['✦', 'Art & museums'],
  ['☕', 'Café hopping'], ['☽', 'Stargazing'], ['♨', 'Wellness'], ['↗', 'Road trips'], ['❀', 'Gardens'],
  ['◇', 'Hidden gems'], ['♜', 'History'], ['≋', 'Diving'], ['☷', 'Markets'], ['↟', 'Camping'],
];
const blank = () => ({ home: null, airport: null, citizenships: [], accessibility: '', food: '', interests: [] });
const flagFor = code => countries.find(c => c[0] === code)?.[2] || '◎';

function Globe({ small = false }) {
  return <div className={`op-globe ${small ? 'small' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 360 280" fill="none"><ellipse cx="180" cy="140" rx="110" ry="110"/><ellipse cx="180" cy="140" rx="58" ry="110"/><ellipse cx="180" cy="140" rx="110" ry="38"/><path d="M70 140h220M180 30v220M87 84h186M87 196h186"/><path className="route" d="M66 202C86 130 211 218 268 67"/><circle className="pin" cx="66" cy="202" r="6"/><circle className="pin" cx="268" cy="67" r="6"/></svg>
    <span className="op-globe-tag tag-one">A world of possibilities</span><span className="op-globe-tag tag-two">Made for you ↗</span>
  </div>;
}

function Passport({ code, remove }) {
  const country = countries.find(item => item[0] === code);
  return <div className="op-passport">
    <div className="op-passport-top"><span>TRAVEL IDENTITY</span><button type="button" onClick={remove} aria-label={`Remove ${country[1]} citizenship`}>×</button></div>
    <span className="op-passport-flag" aria-hidden="true">{country[2]}</span>
    <strong>{country[1]}</strong><span className="op-passport-caption">Citizenship</span>
    <div className="op-passport-foot"><span>TRAVELLA</span><span>{code} ◉</span></div>
  </div>;
}

function HomeStep({ data, update }) {
  const [query, setQuery] = useState(data.home?.name || '');
  const matching = cities.filter(c => `${c.name} ${c.country}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="op-fields">
    <label htmlFor="op-city">Your home city <span className="op-required">Required</span></label>
    <div className="op-search"><span aria-hidden="true">⌖</span><input id="op-city" autoComplete="off" placeholder="Search for your city" value={query} onChange={event => { setQuery(event.target.value); update({ home: null, airport: null }); }} /></div>
    {!data.home && <div className="op-city-results" aria-label="City suggestions">
      {(query ? matching : cities.slice(0, 4)).map(city => <button type="button" key={city.name} onClick={() => { setQuery(city.name); update({ home: city, airport: null }); }}><span className="op-result-icon" aria-hidden="true">{city.flag}</span><span><strong>{city.name}</strong><small>{city.country}</small></span><span className="op-arrow">↗</span></button>)}
      {!matching.length && <p className="op-muted">Preview cities: Prague, Brno, Budapest, Vienna, London, Berlin, Paris, Amsterdam.</p>}
    </div>}
    {data.home && <>
      <div className="op-chosen-home"><span aria-hidden="true">✓</span><span><strong>{data.home.name}</strong>, {data.home.country}</span><span className="op-home-label">HOME BASE</span></div>
      <div className="op-field-heading"><div><h3>Your usual departure airport</h3><p>You choose. You can always change it for a trip.</p></div><span className="op-optional">Optional</span></div>
      <div className="op-airports" role="group" aria-label="Default departure airport">
        {data.home.airports.map(([code, name, distance]) => <button className={`op-airport ${data.airport?.code === code ? 'selected' : ''}`} type="button" aria-pressed={data.airport?.code === code} key={code} onClick={() => update({ airport: data.airport?.code === code ? null : { code, name } })}>
          <span className="op-airport-code">{code}</span><span><strong>{name}</strong><small>Approx. {distance} from city center</small></span><span className="op-radio" aria-hidden="true">{data.airport?.code === code ? '✓' : ''}</span>
        </button>)}
      </div><button type="button" className="op-text-button" onClick={() => update({ airport: null })}>I’ll choose an airport later</button>
    </>}
    <p className="op-preview-note">City and airport suggestions are sample data in this preview.</p>
  </div>;
}

function CitizenshipStep({ data, update }) {
  const [query, setQuery] = useState('');
  const available = countries.filter(([code, name]) => !data.citizenships.includes(code) && name.toLowerCase().includes(query.toLowerCase()));
  return <div className="op-fields">
    <div className={`op-wallet ${data.citizenships.length ? 'has-cards' : ''}`}>
      {data.citizenships.length ? data.citizenships.map(code => <Passport key={code} code={code} remove={() => update({ citizenships: data.citizenships.filter(c => c !== code) })} />) : <div className="op-wallet-empty"><span aria-hidden="true">◉</span><strong>Your world belongs here.</strong><p>Add a citizenship to start your travel wallet.</p></div>}
    </div>
    <label htmlFor="op-country">{data.citizenships.length ? 'Add another citizenship' : 'Find your country'}</label>
    <div className="op-search"><span aria-hidden="true">⌕</span><input id="op-country" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search countries" autoComplete="off" /></div>
    <div className="op-country-grid">{available.slice(0, 8).map(([code, name, flag]) => <button type="button" key={code} onClick={() => { update({ citizenships: [...data.citizenships, code] }); setQuery(''); }}><span aria-hidden="true">{flag}</span><span>{name}</span><span className="op-country-plus">+</span></button>)}</div>
    {!available.length && <p className="op-muted">No match in this preview’s sample country list.</p>}
    <p className="op-field-help">Helps us consider relevant entry requirements when you plan. No passport documents needed.</p>
  </div>;
}

function NeedsStep({ data, update }) {
  return <div className="op-fields op-needs">
    <div className="op-note-heading"><span aria-hidden="true">♡</span><span>A little context can make a big difference.<br/><strong>Both fields are completely optional.</strong></span></div>
    <label htmlFor="op-accessibility">What makes travel more accessible for you?</label>
    <textarea id="op-accessibility" maxLength={1000} rows={3} value={data.accessibility} onChange={e => update({ accessibility: e.target.value })} placeholder="For example, wheelchair access or avoiding lots of stairs…" />
    <label htmlFor="op-food">Any food allergies or dietary requirements?</label>
    <textarea id="op-food" maxLength={1000} rows={3} value={data.food} onChange={e => update({ food: e.target.value })} placeholder="For example, a peanut allergy or vegetarian meals…" />
    <p className="op-field-help">Your words, your preferences. You can edit these later.</p>
  </div>;
}

function InterestsStep({ data, update }) {
  const [custom, setCustom] = useState('');
  const all = [...interests, ...data.interests.filter(name => !interests.some(i => i[1] === name)).map(name => ['✧', name])];
  function toggle(name) { update({ interests: data.interests.includes(name) ? data.interests.filter(i => i !== name) : [...data.interests, name] }); }
  function addCustom(event) { event.preventDefault(); const typed = custom.trim(); if (!typed) return; const value = interests.find(i => i[1].toLowerCase() === typed.toLowerCase())?.[1] || typed; if (!data.interests.some(i => i.toLowerCase() === value.toLowerCase())) update({ interests: [...data.interests, value] }); setCustom(''); }
  return <div className="op-fields">
    <div className="op-interest-count" aria-live="polite"><span>{Array.from({ length: 5 }, (_, i) => <i key={i} className={data.interests.length > i ? 'filled' : ''} />)}</span><strong>{data.interests.length >= 5 ? `${data.interests.length} picked. Very you.` : `${data.interests.length} of 5 picked`}</strong><small>Keep going, or skip for now.</small></div>
    <div className="op-bubble-field" aria-label="Travel interests">{all.map(([icon, name], index) => <button key={name} type="button" className={`op-bubble size-${index % 4} ${data.interests.includes(name) ? 'selected' : ''}`} style={{ '--delay': `${index * -.29}s`, '--tilt': `${(index % 5) - 2}deg` }} aria-pressed={data.interests.includes(name)} onClick={() => toggle(name)}><span aria-hidden="true">{data.interests.includes(name) ? '✓' : icon}</span>{name}</button>)}</div>
    <form className="op-custom-interest" onSubmit={addCustom}><label htmlFor="op-custom">Something else you love?</label><div className="op-custom-input"><input id="op-custom" value={custom} onChange={e => setCustom(e.target.value)} maxLength={60} placeholder="Add your own interest" /><button type="submit" disabled={!custom.trim()} aria-label="Add custom interest">+ Add</button></div></form>
  </div>;
}

function ProfilePreview({ data, step, ticket = false }) {
  return <div className={`op-profile ${ticket ? 'ticket' : ''}`}>
    <div className="op-profile-heading"><span>YOUR TRAVEL DNA</span><span aria-hidden="true">↗</span></div>
    <div className="op-profile-home"><span className="op-profile-city">{data.home?.name || 'Your next chapter'}</span><span>{data.airport?.code || (data.home ? 'Airport, your choice' : 'Starts right here')}</span></div>
    <div className="op-profile-row"><span>Citizenship</span><strong>{data.citizenships.length ? data.citizenships.map(c => `${flagFor(c)} ${c}`).join('  ') : 'Your world'}</strong></div>
    <div className="op-profile-row"><span>Travel needs</span><strong>{data.accessibility || data.food ? 'Noted with care' : 'On your terms'}</strong></div>
    <div className="op-profile-interests">{data.interests.length ? data.interests.slice(0, 6).map(name => <span key={name}>{name}</span>) : <span className="empty">A few things that make you, you.</span>}</div>
    <div className="op-profile-footer"><span>PERSONAL BY DESIGN</span><span>{String(Math.min(step + 1, 4)).padStart(2, '0')} / 04</span></div>
  </div>;
}

function Progress({ step, variant }) {
  return <div className="op-progress-wrap"><div className="op-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step}><span style={{ width: `${step / 4 * 100}%` }} /></div><div className="op-step-labels">{stages.map((label, i) => <span key={label} className={step === i ? 'current' : step > i ? 'done' : ''}><i>{step > i ? '✓' : `0${i + 1}`}</i>{label}</span>)}</div></div>;
}

function StepHeading({ step }) {
  return <div className="op-step-heading"><p className="op-kicker">{step === 0 ? 'LET’S GET TO KNOW YOU' : `A LITTLE MORE YOU · ${String(step + 1).padStart(2, '0')}`}</p><h1>{titles[step]}</h1><p>{descriptions[step]}</p></div>;
}

function VariantA({ heading, fields, actions, data, step }) {
  return <main className="op-layout-a"><div className="op-a-intro"><span className="op-step-symbol" aria-hidden="true">{['⌖', '◉', '♡', '✦'][step]}</span>{heading}</div><div className="op-a-form">{fields}{actions}</div><p className="op-bottom-note">A little about you. A world that fits.</p></main>;
}
function VariantB({ heading, fields, actions, data, step }) {
  return <main className="op-layout-b"><aside className="op-studio"><span className="op-studio-label">THE WORLD, THROUGH YOUR EYES</span>{heading}<Globe /><ProfilePreview data={data} step={step} /><p className="op-studio-note">Good recommendations begin with understanding you.</p></aside><section className="op-studio-form"><div className="op-studio-step"><span>CHAPTER {step + 1}</span><strong>{stages[step]}</strong><span>{step === 0 ? 'Make yourself at home' : 'Make it yours'}</span></div>{fields}{actions}</section></main>;
}
function VariantC({ heading, fields, actions, data, step }) {
  return <main className="op-layout-c"><aside className="op-itinerary"><p className="op-kicker">YOUR FIRST ITINERARY</p><h2>Four stops.<br/>More you.</h2><ol>{stages.map((label, i) => <li key={label} className={step === i ? 'current' : step > i ? 'done' : ''}><span>{step > i ? '✓' : String(i + 1).padStart(2, '0')}</span><div><strong>{label}</strong><small>{['Where you set off', 'The places you belong', 'Comfort, considered', 'Follow your curiosity'][i]}</small></div></li>)}</ol><div className="op-itinerary-note">⌁<p>The destination changes.<br/>Your preferences travel with you.</p></div></aside><section className="op-ticket-form"><div className="op-ticket-header"><span>TRAVELLA / PERSONAL PROFILE</span><span>ADMIT ONE EXPLORER ↗</span></div>{heading}{fields}{actions}<div className="op-ticket-stub"><div><span>HOME</span><strong>{data.airport?.code || data.home?.name || 'YOU'}</strong></div><span className="op-stub-route">········ ✈ ········</span><div><span>DESTINATION</span><strong>ANYWHERE</strong></div><div className="op-barcode" aria-hidden="true" /></div></section></main>;
}

export function OnboardingPrototype() {
  const params = new URLSearchParams(location.search);
  const [variant, setVariant] = useState(directions[params.get('variant')] ? params.get('variant') : 'A');
  const [step, setStep] = useState(0);
  const [data, setData] = useState(blank);
  const [inspect, setInspect] = useState(false);
  const [finished, setFinished] = useState(false);
  const update = patch => setData(current => ({ ...current, ...patch }));
  function changeVariant(next) { setVariant(next); const url = new URL(location.href); url.searchParams.set('variant', next); history.replaceState(null, '', url); }
  function cycle(direction) { const keys = Object.keys(directions); changeVariant(keys[(keys.indexOf(variant) + direction + 3) % 3]); }
  useEffect(() => {
    function key(event) { if (event.target.closest('input,textarea,select,[contenteditable]') || event.metaKey || event.ctrlKey || event.altKey) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); cycle(event.key === 'ArrowRight' ? 1 : -1); } }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [variant]);
  useEffect(() => { document.title = `${directions[variant]} · Travella onboarding preview`; }, [variant]);
  function advance() { if (step === 3) setFinished(true); else setStep(step + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function skip() { if (step === 1) update({ citizenships: [] }); if (step === 2) update({ accessibility: '', food: '' }); if (step === 3) update({ interests: [] }); advance(); }
  const canContinue = step === 0 ? Boolean(data.home) : step === 3 ? data.interests.length >= 5 : true;
  const fields = [<HomeStep key="home" data={data} update={update} />, <CitizenshipStep key="citizenship" data={data} update={update} />, <NeedsStep key="needs" data={data} update={update} />, <InterestsStep key="interests" data={data} update={update} />][step];
  const actions = <div className="op-actions"><button className="op-back" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button><div>{step > 0 && <button type="button" className="op-skip" onClick={skip}>Skip for now</button>}<button className="op-continue" type="button" onClick={advance} disabled={!canContinue}>{step === 3 ? 'Make it mine' : 'Continue'} <span aria-hidden="true">↗</span></button></div></div>;
  const Layout = { A: VariantA, B: VariantB, C: VariantC }[variant];
  return <div className={`op-root op-${variant}`}>
    <div className="op-preview-strip"><span>INTERACTIVE DESIGN PREVIEW</span><span>Sample places · nothing saved · no AI calls</span><button onClick={() => setInspect(!inspect)} type="button">{inspect ? 'Close' : 'View'} preview data ↗</button></div>
    <header className="op-header"><a href="?preview=onboarding" className="op-brand" aria-label="Restart Travella preview"><span aria-hidden="true">✳</span> travella</a><div className="op-header-right"><span>Your world, a little closer.</span><button type="button" onClick={() => { setData(blank()); setStep(0); setFinished(false); }}>Start over ↺</button></div></header>
    <Progress step={finished ? 4 : step} variant={variant} />
    {finished ? <main className="op-finish"><span className="op-finish-icon">✓</span><p className="op-kicker">A VERY GOOD BEGINNING</p><h1>Now, where shall we go?</h1><p>Your travel profile is taking shape. The next adventure is yours.</p><ProfilePreview data={data} step={4} /><button type="button" className="op-continue" onClick={() => { setFinished(false); setStep(0); }}>Review my choices ↗</button><p className="op-preview-note">Preview complete. Nothing has been saved to an account.</p></main> : <Layout heading={<StepHeading step={step} />} fields={fields} actions={actions} data={data} step={step} />}
    {inspect && <aside className="op-inspector"><div><strong>Preview state · in memory</strong><button type="button" onClick={() => setInspect(false)} aria-label="Close preview data">×</button></div><pre>{JSON.stringify({ variant, step: finished ? 'complete' : stages[step], ...data }, null, 2)}</pre></aside>}
    <nav className="op-switcher" aria-label="Prototype directions"><button onClick={() => cycle(-1)} aria-label="Previous design">←</button><div><small>DESIGN DIRECTION</small><strong>{variant} · {directions[variant]}</strong></div><span className="op-variant-dots">{Object.keys(directions).map(key => <button key={key} className={key === variant ? 'active' : ''} onClick={() => changeVariant(key)} aria-label={`View ${directions[key]}`} aria-pressed={key === variant}>{key}</button>)}</span><button onClick={() => cycle(1)} aria-label="Next design">→</button></nav>
  </div>;
}
