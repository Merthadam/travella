import React, { useState } from 'react';
import { formatFlightPrice } from './flightItinerary';
import './flight-seats.css';

const sameSeat = (a, b) => a.id === b.id || (a.segment_index === b.segment_index && a.seat_row && a.seat_column && a.seat_row === b.seat_row && a.seat_column === b.seat_column);
const seatLabel = seat => seat.seat_row && seat.seat_column ? `${seat.seat_row}${seat.seat_column}` : seat.label;

export function FlightSeats({ result, choices, onChange, passengers = [] }) {
  const services = result.services || [];
  const catalog = new Map(services.map(s => [s.id, s]));
  const segments = [...result.flight.outbound.segments, ...result.flight.inbound.segments];
  const travelers = Array.from({ length: result.passenger_count }, (_, index) => ({
    index,
    name: [passengers[index]?.first_name, passengers[index]?.last_name].filter(Boolean).join(' ') || `Passenger ${index + 1}`,
    infant: (result.passenger_ages?.[index] ?? 30) < 2,
  }));
  const [segment, setSegment] = useState(0);
  const [airline, setAirline] = useState(new Set());
  const selection = (values, flight, person) => values.find(c => c.passenger_index === person && catalog.get(c.id)?.kind === 'seat' && catalog.get(c.id)?.segment_index === flight);
  const nextTraveler = (values, flight, skipped, after = -1) => {
    const available = travelers.filter(t => !t.infant && !selection(values, flight, t.index) && !skipped.has(`${flight}:${t.index}`) && services.some(s => s.kind === 'seat' && s.segment_index === flight && s.passenger_indexes.includes(t.index)));
    return (available.find(t => t.index > after) || available[0])?.index ?? null;
  };
  const [passenger, setPassenger] = useState(() => nextTraveler(choices, 0, new Set()));
  const [announcement, setAnnouncement] = useState('');
  const active = travelers.find(t => t.index === passenger);
  const inventory = services.filter(s => s.kind === 'seat' && s.segment_index === segment);
  const selectedSeats = choices.filter(c => catalog.get(c.id)?.kind === 'seat');
  const owner = seat => selectedSeats.find(c => sameSeat(catalog.get(c.id), seat));
  const totals = selectedSeats.reduce((sum, choice) => {
    const { price } = catalog.get(choice.id);
    sum[price.currency] = (sum[price.currency] || 0) + Number(price.amount) * choice.quantity;
    return sum;
  }, {});

  function choose(seat) {
    if (!active || active.infant || !seat.passenger_indexes.includes(passenger) || owner(seat)) return;
    const next = choices.filter(c => c !== selection(choices, segment, passenger));
    next.push({ id: seat.id, passenger_index: passenger, quantity: 1 });
    const skipped = new Set(airline);
    skipped.delete(`${segment}:${passenger}`);
    const nextIndex = nextTraveler(next, segment, skipped, passenger);
    onChange(next);
    setAirline(skipped);
    setPassenger(nextIndex);
    setAnnouncement(`${seatLabel(seat)} selected for ${active.name}.${nextIndex === null ? ' Choose a traveler to change a seat, or continue.' : ` Next: ${travelers[nextIndex].name}.`}`);
  }

  function assignAirline(all = false) {
    const next = choices.filter(c => {
      const service = catalog.get(c.id);
      return service?.kind !== 'seat' || (!all && (service.segment_index !== segment || c.passenger_index !== passenger));
    });
    const skipped = new Set(airline);
    if (all) segments.forEach((_, flight) => travelers.forEach(t => skipped.add(`${flight}:${t.index}`)));
    else skipped.add(`${segment}:${passenger}`);
    onChange(next);
    setAirline(skipped);
    setPassenger(all ? null : nextTraveler(next, segment, skipped, passenger));
    setAnnouncement(all ? 'Airline assignment for everyone on all flights. No paid seats selected.' : `Airline assignment for ${active.name} on this flight.`);
  }

  // One physical position can have separate provider offers for different passenger types.
  const positions = inventory.reduce((list, seat) => {
    const index = list.findIndex(s => sameSeat(s, seat));
    if (index < 0) list.push(seat);
    else if (seat.passenger_indexes.includes(passenger)) list[index] = seat;
    return list;
  }, []);
  const mapped = positions.filter(s => s.seat_row && s.seat_column);
  const rows = [...new Set(mapped.map(s => s.seat_row))].sort((a, b) => a - b);
  const columns = [...new Set(mapped.map(s => s.seat_column))].sort();
  const aisle = columns.length === 6;
  const airlineFlight = !active && !selectedSeats.some(c => catalog.get(c.id).segment_index === segment) && travelers.filter(t => !t.infant).every(t => airline.has(`${segment}:${t.index}`));
  function seatButton(seat) {
    const assigned = owner(seat);
    const eligible = active && !active.infant && seat.passenger_indexes.includes(passenger);
    return <button key={seat.id} type="button" className={`flight-seat${assigned ? ' is-assigned' : ''}`} aria-pressed={Boolean(assigned)}
      disabled={Boolean(assigned) || !eligible} onClick={() => choose(seat)}
      aria-label={`${seat.label} · ${formatFlightPrice(seat.price)}${assigned ? ` · Selected for ${travelers[assigned.passenger_index].name}` : !eligible && active ? ' · Not available for this traveler' : ''}`}>
      <b>{seatLabel(seat)}</b>{assigned ? <small>P{assigned.passenger_index + 1}</small> : <span>{formatFlightPrice(seat.price)}</span>}
    </button>;
  }

  return <section className="flight-seats" aria-label="Choose seats">
    <div className="flight-seat-flights" role="group" aria-label="Choose flight">
      {segments.map((flight, index) => {
        const count = selectedSeats.filter(c => catalog.get(c.id).segment_index === index).length;
        return <button type="button" key={index} aria-pressed={segment === index} onClick={() => { setSegment(index); setPassenger(nextTraveler(choices, index, airline)); setAnnouncement(''); }}>
          <b>{index < result.flight.outbound.segments.length ? 'Outbound' : 'Return'} · {flight.origin} → {flight.destination}</b>
          <span>{count ? `${count} of ${travelers.filter(t => !t.infant).length} seats chosen` : 'No seats chosen'}</span>
        </button>;
      })}
    </div>
    <div className="flight-seat-workspace"><aside className="flight-seat-sidebar"><h3>Travelers on this flight</h3>
    <div className="flight-seat-travelers" role="group" aria-label="Choose traveler">
      {travelers.map(t => {
        const choice = selection(choices, segment, t.index), seat = choice && catalog.get(choice.id);
        return <button type="button" key={t.index} aria-pressed={passenger === t.index} disabled={t.infant} onClick={() => { setPassenger(t.index); setAnnouncement(''); }}>
          <b><span className="flight-seat-person">P{t.index + 1}</span> {t.name}</b>
          <span>{t.infant ? 'Infant · no separate seat' : seat ? `${seatLabel(seat)} · ${formatFlightPrice(seat.price)}` : 'Airline assignment'}</span>
          {!t.infant && <small>{passenger === t.index ? 'Choosing now' : 'Select to change'}</small>}
        </button>;
      })}
    </div>
    <div className="flight-seat-airline">
      <h3>Prefer not to choose?</h3>
      <p>Airline assignment for everyone, on all flights. Seats together are not guaranteed.</p>
      <button type="button" className="flight-secondary" aria-label="Use airline assignment for all flights" onClick={() => assignAirline(true)}>Skip seat selection · no charge</button>
    </div>
    <div className="flight-seat-total"><b>Seat selections · all flights</b><strong>{selectedSeats.length ? Object.entries(totals).map(([currency, amount]) => formatFlightPrice({ currency, amount })).join(' + ') : 'No charge'}</strong></div>
    <p className="flight-seat-note">Selections are confirmed when you continue. Travelers without a chosen seat use airline assignment.</p>
    </aside><div className="flight-seat-canvas">
    <div className="flight-seat-instructions">
      <h3>{active ? `Choose a seat for ${active.name}` : 'Your seat choices are ready'}</h3>
      <p>{active ? 'Each selection moves to the next traveler.' : 'Continue with these choices, or select a traveler to make a change.'}</p>
      <button type="button" className="flight-text-button" disabled={!active} style={{ visibility: active ? undefined : 'hidden' }} aria-label={`Use airline assignment for ${active?.name || 'this traveler'} on this flight`} onClick={() => assignAirline()}>Let the airline choose for this traveler</button>
      <p role="status" className="flight-seat-announcement">{announcement}</p>
    </div>
    <div className="flight-seat-viewport" tabIndex={0} role="region" aria-label="Seat map">
    {!inventory.length || (active && !inventory.some(s => s.passenger_indexes.includes(passenger))) ? <p className="flight-seat-empty">No selectable seats returned for this passenger and flight. You can continue without paid seat selection; sitting together is not guaranteed.</p> : airlineFlight ? <p className="flight-seat-empty">Airline assignment for this flight. No paid seats selected. Select a traveler if you want to choose a seat.</p> : <div className="flight-seat-map">
      <p className="flight-seat-front">FRONT OF CABIN ↑</p>
      <div className="flight-seat-unmapped">{positions.filter(s => !s.seat_row || !s.seat_column).map(seatButton)}</div>
      <div className="flight-seat-map-scroll"><div className="flight-seat-rows" style={{ minWidth: `${Math.max(260, columns.length * 44 + 36)}px` }}>
        {rows.map(row => <div key={row} className="flight-seat-row" style={{ gridTemplateColumns: aisle ? '14px repeat(3,minmax(0,1fr)) 8px repeat(3,minmax(0,1fr))' : `14px repeat(${columns.length},minmax(0,1fr))` }}>
          <span className="flight-seat-row-label">{row}</span>{columns.map((column, index) => {
            const seat = mapped.find(s => s.seat_row === row && s.seat_column === column);
            return <React.Fragment key={column}>{aisle && index === 3 && <span aria-hidden="true"/>}{seat ? seatButton(seat) : <span className="flight-seat-missing" aria-hidden="true"/>}</React.Fragment>;
          })}
        </div>)}
      </div></div>
      <p className="flight-seat-legend">P1, P2… show your travelers’ seats. Select a traveler to change their seat.</p>
    </div>}
    </div></div></div>
  </section>;
}
