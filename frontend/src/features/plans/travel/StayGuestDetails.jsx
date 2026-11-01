import React from 'react';

const namePattern = '[^<>\\x00-\\x1f]*[^<>\\s\\x00-\\x1f][^<>\\x00-\\x1f]*';
function NameFields({ person, onChange, prefix, autoComplete = 'off' }) {
  return <div className="flight-fields">
    <label htmlFor={`${prefix}-first`}>First name<input id={`${prefix}-first`} name={`${prefix}-first`} autoComplete={autoComplete === 'off' ? 'off' : `${autoComplete} given-name`} required maxLength={50} pattern={namePattern} title="Enter a name, without angle brackets or control characters." value={person.first_name} onChange={e => onChange('first_name', e.target.value)}/></label>
    <label htmlFor={`${prefix}-last`}>Last name<input id={`${prefix}-last`} name={`${prefix}-last`} autoComplete={autoComplete === 'off' ? 'off' : `${autoComplete} family-name`} required maxLength={50} pattern={namePattern} title="Enter a name, without angle brackets or control characters." value={person.last_name} onChange={e => onChange('last_name', e.target.value)}/></label>
  </div>;
}

export function StayGuestDetails({ contact, onContactChange, staying, onStayingChange, guests, onGuestChange, rooms }) {
  return <div className="stay-guest-details">
    <section className="stay-details-section" aria-labelledby="stay-contact-title">
      <div className="stay-section-heading"><span aria-hidden="true">01</span><div><h2 id="stay-contact-title">Your contact details</h2><p>Who should receive the booking updates?</p></div></div>
      <NameFields prefix="stay-contact" person={contact} onChange={onContactChange}/>
      <label className="stay-email" htmlFor="stay-contact-email">Email address<input id="stay-contact-email" type="email" autoComplete="off" required maxLength={254} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" value={contact.email} onChange={e => onContactChange('email', e.target.value)}/></label>
      <p className="stay-field-help">Use fictional details for this sandbox booking. No real reservation or charge.</p>
    </section>
    <section className="stay-details-section" aria-labelledby="stay-guests-title">
      <div className="stay-section-heading"><span aria-hidden="true">02</span><div><h2 id="stay-guests-title">Who’s staying?</h2><p>One main guest for each room, using the name on their check-in identification.</p></div></div>
      <fieldset className="stay-booking-for"><legend>Who are you booking for?</legend>{[[true,'I’m staying'],[false,'Someone else']].map(([value,label]) => <label key={label} className={staying === value ? 'is-selected' : ''}><input type="radio" name="stay-booking-for" checked={staying === value} onChange={() => onStayingChange(value)}/>{label}</label>)}</fieldset>
      {guests.map((guest,index) => { const room = rooms?.find(r => r.room === index + 1); return <fieldset className="stay-guest-room" key={index}><legend>Room {index + 1} · {room?.name || 'Main guest'}</legend><p className="stay-field-help">{room?.occupancy || 'Main guest checking in'}</p>
        {index === 0 && staying ? <div className="stay-contact-reuse"><strong>{contact.first_name} {contact.last_name}</strong><span>Using the booking contact’s name</span></div> : <NameFields prefix={`stay-room-${index + 1}`} person={guest} onChange={(field,value) => onGuestChange(index,field,value)}/>}
        <label className="stay-request-label" htmlFor={`stay-request-${index}`}>Special requests <span>Optional</span></label><textarea id={`stay-request-${index}`} aria-label={`Room ${index + 1} special requests`} aria-describedby={`stay-request-help-${index}`} maxLength={500} rows={3} value={guest.requests || ''} placeholder="For example, a quiet room or late arrival" onChange={e => { e.target.setCustomValidity(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(e.target.value) ? 'Remove control characters from your request.' : ''); onGuestChange(index,'requests',e.target.value); }}/>
        <div className="stay-request-help" id={`stay-request-help-${index}`}><span>Sent with the booking. Subject to availability — not guaranteed.</span><span>{(guest.requests || '').length}/500</span></div>
      </fieldset>; })}
      <p className="stay-field-help">The booking contact’s email is used for each room. Unsubmitted details are cleared when you leave checkout.</p>
    </section>
  </div>;
}
