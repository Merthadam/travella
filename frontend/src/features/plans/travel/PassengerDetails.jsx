import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { countries } from '../../onboarding/catalogs';
import { SearchSelect } from './SearchSelect';
import { passengerErrors, passportMinimum } from './flightPassengerValidation';
import './passenger-details.css';

const countryOptions = countries.map(({ code, name }) => ({ value: code, label: name }));
const sectionFor = key => key.startsWith('contact-') ? 'contact' : Number(key.split('-')[1]);

export const PassengerDetails = forwardRef(function PassengerDetails({ passengers, setPassengers, contact, setContact, result, locked, onFill }, ref) {
  const id = useId(), root = useRef(null);
  const [open, setOpen] = useState(0), [complete, setComplete] = useState({});
  const [touched, setTouched] = useState({}), [checked, setChecked] = useState({}), [submitted, setSubmitted] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const solo = passengers.length === 1;
  const errors = passengerErrors(passengers, contact, result);
  useEffect(() => {
    if (!focusRequest) return;
    const target = focusRequest.field
      ? [...root.current.querySelectorAll('[name]')].find(el => el.name === focusRequest.field)
      : root.current.querySelector(`[data-section="${focusRequest.section}"]`);
    target?.focus();
  }, [focusRequest]);
  function reveal(key) {
    setOpen(sectionFor(key));
    setFocusRequest({ field: key });
  }
  useImperativeHandle(ref, () => ({ validateAndFocus() {
    setSubmitted(true);
    const first = Object.keys(errors)[0];
    if (first) { reveal(first); return false; }
    return true;
  } }));
  const touch = key => setTouched(old => ({ ...old, [key]: true }));
  const errorFor = key => !locked && (submitted || touched[key] || checked[sectionFor(key)]) ? errors[key] : undefined;
  function change(section, apply) {
    setComplete(old => ({ ...old, [section]: false }));
    apply();
  }
  const update = (index, key, value) => change(index, () => setPassengers(old => old.map((p, i) => i === index ? { ...p, [key]: value } : p)));
  function finish(index) {
    setChecked(old => ({ ...old, [index]: true }));
    const first = Object.keys(errors).find(key => sectionFor(key) === index);
    if (first) { reveal(first); return; }
    setComplete(old => ({ ...old, [index]: true }));
    const next = index + 1 < passengers.length ? index + 1 : 'contact';
    setOpen(next);
    setFocusRequest({ section: next });
  }
  const field = (key, label, value, onChange, props = {}) => {
    const error = errorFor(key), fieldId = `${id}-${key}`;
    return <div className="flight-field"><label htmlFor={fieldId}>{label}</label><input id={fieldId} name={key} required autoComplete="off" {...props} value={value} onChange={e => onChange(e.target.value)} onBlur={() => touch(key)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined}/>{error && <span id={`${fieldId}-error`} className="flight-field-error" aria-live="polite">{error}</span>}</div>;
  };
  const country = (p, index, key, label) => {
    const name = `passenger-${index}-${key}`;
    return <SearchSelect name={name} label={label} value={p[key]} options={countryOptions} onChange={value => update(index, key, value)} onBlur={() => touch(name)} error={errorFor(name)} required placeholder="Search country or code…"/>;
  };
  const contactField = (key, label, props = {}) => field(`contact-${key}`, label, contact[key], value => change('contact', () => setContact(old => ({ ...old, [key]: value }))), props);
  const expanded = section => locked || solo || open === section;
  function sectionHeader(section, title, subtitle, number) {
    const isOpen = expanded(section);
    const hasErrors = Object.keys(errors).some(key => sectionFor(key) === section && errorFor(key));
    const Heading = solo ? 'div' : 'button';
    return <h3><Heading type={solo ? undefined : "button"} className="passenger-section-toggle" id={`${id}-heading-${section}`} data-section={section} aria-expanded={solo ? undefined : isOpen} aria-controls={`${id}-section-${section}`} onClick={() => setOpen(current => current === section ? null : section)} disabled={locked}>
      <span className={`passenger-section-number${complete[section] ? ' is-complete' : ''}`} aria-hidden="true">{complete[section] ? '✓' : number}</span>
      <span className="passenger-section-title"><strong>{title}</strong><span>{subtitle}</span></span>
      <span className={`passenger-section-status${hasErrors ? ' has-errors' : ''}`}>{hasErrors ? 'Check details' : complete[section] ? 'Complete' : isOpen ? 'In progress' : 'To complete'}</span>
      {!solo && !locked && <span className="passenger-section-edit">{isOpen ? '−' : complete[section] ? 'Edit' : '+'}</span>}
    </Heading></h3>;
  }
  if (locked && !passengers.length) return <p>Passenger and contact details were supplied when this test reservation was created. They are not stored in your Plan.</p>;
  return <fieldset ref={root} disabled={locked} className="flight-passengers passenger-details"><legend className="visually-hidden">Test passengers and contact</legend>
    {!locked && <div className="passenger-toolbar"><span>{passengers.length} traveler{solo ? '' : 's'} · one booking contact</span><button type="button" className="flight-text-button" onClick={() => { onFill(); setComplete({}); setChecked({}); setTouched({}); setSubmitted(false); setOpen(0); }}>Fill with test passengers</button></div>}
    {passengers.map((p, index) => {
      const passengerField = (key, label, props) => field(`passenger-${index}-${key}`, label, p[key], value => update(index, key, value), props);
      const age = result.passenger_ages?.[index] ?? 30;
      return <section className={`passenger-section${expanded(index) ? ' is-open' : ''}`} key={index}>
        {sectionHeader(index, complete[index] ? `${p.first_name} ${p.last_name}` : `Passenger ${index + 1}`, `${complete[index] ? `Passenger ${index + 1} · ` : ''}${age >= 12 ? 'Adult' : age < 2 ? 'Infant' : 'Child'}`, index + 1)}
        {expanded(index) && <div className="passenger-section-body" id={`${id}-section-${index}`} role="region" aria-labelledby={`${id}-heading-${index}`}>
          <p className="passenger-section-hint">Enter names exactly as they appear on the travel document.</p>
          <div className="flight-fields">
            {passengerField('first_name', 'Given name', { maxLength: 50 })}{passengerField('last_name', 'Family name', { maxLength: 50 })}
            {passengerField('date_of_birth', 'Date of birth', { type: 'date', max: new Date().toISOString().slice(0, 10) })}
            <label>Gender on document<select value={p.gender} onChange={e => update(index, 'gender', e.target.value)}><option value="M">Male</option><option value="F">Female</option></select></label>
          </div>
          <h4>Travel document</h4><div className="flight-fields">
            {country(p, index, 'nationality', 'Nationality')}{country(p, index, 'document_issue_country', 'Passport issuing country')}
            {passengerField('document_number', 'Test passport number', { pattern: 'TEST[A-Z0-9]{4,16}' })}
            {passengerField('document_expiry', 'Passport valid until', { type: 'date', min: passportMinimum(result) })}
          </div>
          {!locked && !solo && <div className="passenger-section-footer"><span>{index + 1} of {passengers.length} travelers</span><button type="button" className="flight-secondary" onClick={() => finish(index)}>Done · {index + 1 < passengers.length ? 'next traveler' : 'booking contact'} →</button></div>}
        </div>}
      </section>;
    })}
    <section className={`passenger-section passenger-contact${expanded('contact') ? ' is-open' : ''}`}>
      {sectionHeader('contact', 'Booking contact', 'One contact for everyone on this booking', '@')}
      {expanded('contact') && <div className="passenger-section-body" id={`${id}-section-contact`} role="region" aria-labelledby={`${id}-heading-contact`}>
        <div className="flight-fields">{contactField('first_name', 'Contact given name', { maxLength: 50 })}{contactField('last_name', 'Contact family name', { maxLength: 50 })}
          <div className="passenger-contact-email">{contactField('email', 'Test email', { type: 'email', maxLength: 120 })}<p className="passenger-input-hint">Use @example.com or @example.test</p></div>
          <div className="passenger-phone">{contactField('phone_country_code', 'Calling code', { inputMode: 'numeric', maxLength: 3, 'aria-label': 'Phone country code' })}{contactField('phone_number', 'Test phone number', { inputMode: 'numeric', maxLength: 14 })}</div>
        </div><p className="flight-muted">Use fictional details only. They are sent for this sandbox booking and are not saved in your profile or Plan.</p>
      </div>}
    </section>
  </fieldset>;
});
