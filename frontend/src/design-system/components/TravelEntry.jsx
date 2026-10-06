import React from 'react';
import { Card, Icon } from './primitives';
export function TravelEntry({ data, onAction, mode }) {
  const flight = mode === 'flights';
  const title = flight ? 'Flights' : 'Accommodation';
  return <Card title={title} icon={flight ? 'plane' : 'bed'} eyebrow={flight ? 'THE WAY THERE' : 'SOMEWHERE TO CALL HOME'} className={`ds-travel ds-${mode}`} data={data} onAction={onAction} action={<span className="ds-tag">{{needed:'Needed',undecided:'Still deciding','not-needed':'Not needed'}[data.need]}</span>} empty={flight ? 'Your next adventure starts with a way there.' : 'A comfortable base for everything ahead.'}>
    <h3>{data.title || 'Destination not set'}</h3><p>{data.subtitle || 'A few details still to decide'}</p><small>{data.detail}</small><button className="ds-travel-link" onClick={() => onAction(flight ? 'open_flights' : 'open_accommodation', {})}><span>Explore {flight ? 'flights' : 'accommodation'}</span><Icon name="arrow"/></button><span className="ds-service-note">{data.availability === 'unavailable' ? 'Search is not available yet' : 'Preview only · provider not connected'}</span>
  </Card>;
}
export const FlightsEntry = props => <TravelEntry {...props} mode="flights"/>;
export const AccommodationEntry = props => <TravelEntry {...props} mode="accommodation"/>;
