import React from 'react';
import { Card, Icon } from './primitives';
export function TravelEntry({ data, onAction, mode }) {
  const flight = mode === 'flights';
  const title = flight ? 'Flights' : 'Accommodation';
  const booked = data.bookingStatus === 'booked';
  return <Card title={title} icon={flight ? 'plane' : 'bed'} eyebrow={flight ? 'THE WAY THERE' : 'SOMEWHERE TO CALL HOME'} className={`ds-travel ds-${mode} ${booked ? 'is-booked' : ''}`} data={data} onAction={onAction} action={data.status === 'ready' && <span className={`ds-booking-status ${booked ? 'booked' : ''}`}>{booked ? <Icon name="check" size={13}/> : <span className="ds-booking-circle" aria-hidden="true"/>}{booked ? 'Booked' : 'Not booked'}</span>} empty={flight ? 'Your next adventure starts with a way there.' : 'A comfortable base for everything ahead.'}>
    <h3>{data.title || 'Destination not set'}</h3><p>{data.subtitle || 'A few details still to decide'}</p><small>{data.detail}</small>
    {data.need !== 'needed' && <span className="ds-travel-need">{data.need === 'undecided' ? 'Still deciding if needed' : 'Not needed for this trip'}</span>}
    <button className="ds-travel-link" onClick={() => onAction(flight ? 'open_flights' : 'open_accommodation', {})}><span>{booked ? (flight ? 'View flight details' : 'View stay details') : `Explore ${flight ? 'flights' : 'accommodation'}`}</span><Icon name="arrow"/></button><span className="ds-service-note">{booked ? 'Sample booking · preview only' : data.availability === 'unavailable' ? 'Search is not available yet' : 'Preview only · provider not connected'}</span>
  </Card>;
}
export const FlightsEntry = props => <TravelEntry {...props} mode="flights"/>;
export const AccommodationEntry = props => <TravelEntry {...props} mode="accommodation"/>;
