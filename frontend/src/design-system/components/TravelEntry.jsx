import React from 'react';
import { Card, Icon } from './primitives';
export function TravelEntry({ data, onAction, mode, preview = true, disabled, travelCapabilities }) {
  const flight = mode === 'flights';
  const available = travelCapabilities?.[flight ? 'flights' : 'hotels'];
  const title = flight ? 'Flights' : 'Accommodation';
  const mock = data.bookingStatus === 'mock-booked';
  const booked = mock || data.bookingStatus === 'booked';
  const booking = mock ? data.mockBooking : null;
  return <Card title={title} icon={flight ? 'plane' : 'bed'} eyebrow={flight ? 'THE WAY THERE' : 'SOMEWHERE TO CALL HOME'} className={`ds-travel ds-${mode} ${booked ? 'is-booked' : ''}`} data={data} onAction={onAction} action={data.status === 'ready' && <span className={`ds-booking-status ${booked ? 'booked' : ''}`}>{booked ? <Icon name="check" size={13}/> : <span className="ds-booking-circle" aria-hidden="true"/>}{mock ? 'Mock booked' : booked ? 'Booked' : 'Not booked'}</span>} empty={flight ? 'Your next adventure starts with a way there.' : 'A comfortable base for everything ahead.'}>
    <h3>{(booking && flight ? `${booking.origin} ↔ ${booking.destination}` : booking?.hotelName) || data.title || 'Destination not set'}</h3><p>{booking ? (flight ? `${booking.departureDate} → ${booking.returnDate}` : `${booking.checkIn} → ${booking.checkOut}`) : data.subtitle || 'A few details still to decide'}</p><small>{booking ? `Test reference: ${booking.reference}` : data.detail}</small>
    {!booked && data.need !== 'needed' && <span className="ds-travel-need">{data.need === 'undecided' ? 'Still deciding if needed' : 'Not needed for this trip'}</span>}
    {(preview || available || mock) && <button className="ds-travel-link" disabled={disabled} onClick={() => onAction(flight ? 'open_flights' : 'open_accommodation', {})}><span>{mock ? (flight ? 'View mock flight' : 'View mock stay') : booked ? (flight ? 'View flight details' : 'View stay details') : `Explore ${flight ? 'flights' : 'accommodation'}`}</span><Icon name="arrow"/></button>}<span className="ds-service-note">{mock ? 'Sandbox only · no real reservation or charge' : booked ? (preview ? 'Sample booking · preview only' : 'Saved booking details') : available ? (travelCapabilities.sandbox ? 'LiteAPI sandbox · test inventory' : 'Search with LiteAPI') : !preview ? (travelCapabilities ? 'Search unavailable' : 'Connecting travel search…') : 'Preview only · provider not connected'}</span>
  </Card>;
}
export const FlightsEntry = props => <TravelEntry {...props} mode="flights"/>;
export const AccommodationEntry = props => <TravelEntry {...props} mode="accommodation"/>;
