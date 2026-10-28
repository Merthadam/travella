import React, { useState } from 'react';
import { formatFlightPrice } from './flightItinerary';

export const serviceChoices = (values = []) => values.map(({ id, passenger_index, quantity }) => ({ id, passenger_index, quantity }));
export const sameChoices = (a, b) => JSON.stringify([...a].sort((x, y) => `${x.id}:${x.passenger_index}`.localeCompare(`${y.id}:${y.passenger_index}`))) === JSON.stringify([...b].sort((x, y) => `${x.id}:${x.passenger_index}`.localeCompare(`${y.id}:${y.passenger_index}`)));

export function ExtrasSummary({ values = [], kind }) {
  const selected = values.filter(s => !kind || s.kind === kind);
  return selected.length ? <ul className="m-0 list-none space-y-2 p-0">{selected.map(s => <li key={`${s.id || s.label}:${s.segment_index}:${s.passenger_index}`}><b>Passenger {s.passenger_index + 1}</b> · {s.quantity > 1 ? `${s.quantity} × ` : ''}{s.label} <span className="whitespace-nowrap">({formatFlightPrice({ ...s.price, amount: Number(s.price.amount) * s.quantity })})</span></li>)}</ul> : <span className="block">{kind === 'seat' ? 'No seats selected · airline assignment' : 'No extra baggage selected'}</span>;
}

export function FlightExtras({ kind, result, choices, onChange }) {
  const [segment, setSegment] = useState(0), [passenger, setPassenger] = useState(0);
  const segments = [...result.flight.outbound.segments, ...result.flight.inbound.segments];
  const inventory = (result.services || []).filter(s => s.kind === kind && s.segment_index === segment && s.passenger_indexes.includes(passenger));
  const quantity = id => choices.find(s => s.id === id && s.passenger_index === passenger)?.quantity || 0;
  function choose(service, amount) {
    const next = choices.filter(s => !(s.id === service.id && s.passenger_index === passenger) && !(kind === 'seat' && s.passenger_index === passenger && (result.services || []).some(candidate => candidate.id === s.id && candidate.kind === 'seat' && candidate.segment_index === segment)));
    if (amount) next.push({ id: service.id, passenger_index: passenger, quantity: amount });
    onChange(next);
  }
  const seats = inventory.filter(s => s.seat_row && s.seat_column).sort((a, b) => (a.seat_row || 0) - (b.seat_row || 0) || (a.seat_column || a.label).localeCompare(b.seat_column || b.label));
  const rows = [...new Set(seats.map(s => s.seat_row || 0))];
  const columns = [...new Set(seats.map(s => s.seat_column || s.id))].sort();
  const aisle = columns.length === 6;
  return <section className="space-y-5" aria-label={kind === 'seat' ? 'Choose seats' : 'Choose extra baggage'}>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Flight<select className="min-w-0 rounded-lg border border-current/20 bg-transparent p-3" value={segment} onChange={e => setSegment(Number(e.target.value))}>{segments.map((s, i) => <option key={i} value={i}>{i < result.flight.outbound.segments.length ? 'Outbound' : 'Return'} · {s.origin} → {s.destination}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Passenger<select className="rounded-lg border border-current/20 bg-transparent p-3" value={passenger} onChange={e => setPassenger(Number(e.target.value))}>{Array.from({ length: result.passenger_count }, (_, i) => <option value={i} key={i}>Passenger {i + 1}</option>)}</select></label></div>
    <p className="text-sm opacity-75">{kind === 'seat' ? 'Choose a seat for each passenger and flight, or continue with airline assignment. Prices are per seat.' : 'Choose additional bags for each passenger and flight. These are added to the allowance included in your fare.'}</p>
    {!inventory.length ? <div className="rounded-xl border border-current/15 p-5">{kind === 'seat' ? 'No selectable seats returned for this passenger and flight. Airline assignment applies; sitting together is not guaranteed.' : 'No additional baggage is available for this passenger and flight.'}</div> : kind === 'seat' ? <div className="rounded-3xl border border-current/15 p-4 sm:p-6">
      {inventory.filter(s => !s.seat_row || !s.seat_column).map(s => <button key={s.id} type="button" aria-pressed={Boolean(quantity(s.id))} disabled={choices.some(c => c.id === s.id && c.passenger_index !== passenger)} onClick={() => choose(s, quantity(s.id) ? 0 : 1)} className="mb-3 block w-full rounded-lg border border-solid! border-current/30 p-3 text-left">{s.label} · {formatFlightPrice(s.price)}{quantity(s.id) ? ' · Selected (tap to remove)' : ''}</button>)}
      <div className="mb-5 text-center text-xs font-semibold tracking-widest opacity-60">FRONT OF CABIN ↑</div>
      <div className="mx-auto max-w-md space-y-2">{rows.map(row => <div key={row} className="grid items-center gap-1 sm:gap-2" style={{ gridTemplateColumns: aisle ? '12px repeat(3,minmax(0,1fr)) 8px repeat(3,minmax(0,1fr))' : `12px repeat(${columns.length},minmax(0,1fr))` }}><span className="text-xs opacity-60">{row || ''}</span>{columns.map((column, index) => {
        const s = seats.find(s => (s.seat_row || 0) === row && (s.seat_column || s.id) === column);
        const selected = s && Boolean(quantity(s.id));
        const taken = s && choices.some(c => c.id === s.id && c.passenger_index !== passenger);
        return <React.Fragment key={column}>{aisle && index === 3 && <span aria-hidden="true"/>}{s ? <button type="button" aria-pressed={selected} disabled={taken} title={`${s.label} · ${formatFlightPrice(s.price)}`} aria-label={`${s.label} · ${formatFlightPrice(s.price)}${taken ? ' · Selected by another passenger' : ''}`} onClick={() => choose(s, selected ? 0 : 1)} className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-t-xl! rounded-b-md! border! border-solid! text-xs! transition disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'border-travella-teal bg-travella-teal text-white' : 'border-current/25 bg-transparent hover:bg-travella-teal/15'}`}><b>{s.seat_row && s.seat_column ? `${s.seat_row}${s.seat_column}` : s.label}</b><span className="mt-1 text-[10px]">{formatFlightPrice(s.price)}</span></button> : <span aria-hidden="true" className="h-12 rounded-lg border border-dashed border-current/10"/>}</React.Fragment>;
      })}</div>)}</div><p className="mb-0 mt-5 text-center text-xs opacity-65">Only seats offered by the provider are shown. Tap a selected seat to remove it.</p>
    </div> : <div className="space-y-3">{inventory.map(s => <label key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-current/20 p-4"><span className="min-w-0 flex-1"><b className="block">{s.label}</b><span className="text-sm opacity-75">{formatFlightPrice(s.price)} per bag</span></span><select className="rounded-lg border border-current/20 bg-transparent p-3" aria-label={s.label} value={quantity(s.id)} onChange={e => choose(s, Number(e.target.value))}>{Array.from({ length: (s.max_quantity || 1) + 1 }, (_, n) => <option value={n} key={n}>{n === 0 ? 'No extra bag' : `${n} ${n === 1 ? 'bag' : 'bags'}`}</option>)}</select></label>)}</div>}
    <p className="text-sm opacity-75">Selections and the updated total are checked with the provider when you continue.</p>
  </section>;
}
