import React, { useState } from 'react';
import { formatFlightPrice } from './flightItinerary';

export const serviceChoices = (values = []) => values.map(({ id, passenger_index, quantity }) => ({ id, passenger_index, quantity }));
export const sameChoices = (a, b) => JSON.stringify([...a].sort((x, y) => `${x.id}:${x.passenger_index}`.localeCompare(`${y.id}:${y.passenger_index}`))) === JSON.stringify([...b].sort((x, y) => `${x.id}:${x.passenger_index}`.localeCompare(`${y.id}:${y.passenger_index}`)));

export function ExtrasSummary({ values = [], kind }) {
  const selected = values.filter(s => !kind || s.kind === kind);
  return selected.length ? <ul className="m-0 list-none space-y-2 p-0">{selected.map(s => <li key={`${s.id || s.label}:${s.segment_index}:${s.passenger_index}`}><b>Passenger {s.passenger_index + 1}</b> · {s.quantity > 1 ? `${s.quantity} × ` : ''}{s.label} <span className="whitespace-nowrap">({formatFlightPrice({ ...s.price, amount: Number(s.price.amount) * s.quantity })})</span></li>)}</ul> : <span className="block">{kind === 'seat' ? 'No seats selected · airline assignment' : 'No extra baggage selected'}</span>;
}

export function FlightExtras({ result, choices, onChange }) {
  const [segment, setSegment] = useState(0), [passenger, setPassenger] = useState(0);
  const segments = [...result.flight.outbound.segments, ...result.flight.inbound.segments];
  const inventory = (result.services || []).filter(s => s.kind === 'baggage' && s.segment_index === segment && s.passenger_indexes.includes(passenger));
  const quantity = id => choices.find(s => s.id === id && s.passenger_index === passenger)?.quantity || 0;
  function choose(service, amount) {
    const next = choices.filter(s => !(s.id === service.id && s.passenger_index === passenger));
    if (amount) next.push({ id: service.id, passenger_index: passenger, quantity: amount });
    onChange(next);
  }
  return <section className="space-y-5" aria-label="Choose extra baggage">
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Flight<select className="min-w-0 rounded-lg border border-current/20 bg-transparent p-3" value={segment} onChange={e => setSegment(Number(e.target.value))}>{segments.map((s, i) => <option key={i} value={i}>{i < result.flight.outbound.segments.length ? 'Outbound' : 'Return'} · {s.origin} → {s.destination}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Passenger<select className="rounded-lg border border-current/20 bg-transparent p-3" value={passenger} onChange={e => setPassenger(Number(e.target.value))}>{Array.from({ length: result.passenger_count }, (_, i) => <option value={i} key={i}>Passenger {i + 1}</option>)}</select></label></div>
    <p className="text-sm opacity-75">Choose additional bags for each passenger and flight. These are added to the allowance included in your fare.</p>
    {!inventory.length ? <div className="rounded-xl border border-current/15 p-5">No additional baggage is available for this passenger and flight.</div> : <div className="space-y-3">{inventory.map(s => <label key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-current/20 p-4"><span className="min-w-0 flex-1"><b className="block">{s.label}</b><span className="text-sm opacity-75">{formatFlightPrice(s.price)} per bag</span></span><select className="rounded-lg border border-current/20 bg-transparent p-3" aria-label={s.label} value={quantity(s.id)} onChange={e => choose(s, Number(e.target.value))}>{Array.from({ length: (s.max_quantity || 1) + 1 }, (_, n) => <option value={n} key={n}>{n === 0 ? 'No extra bag' : `${n} ${n === 1 ? 'bag' : 'bags'}`}</option>)}</select></label>)}</div>}
    <p className="text-sm opacity-75">Selections and the updated total are checked with the provider when you continue.</p>
  </section>;
}
