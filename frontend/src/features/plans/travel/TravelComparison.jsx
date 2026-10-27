import React from 'react';
import { CarrierMarks } from './CarrierMark';

export const referenceKey = ref => JSON.stringify([ref.search_id, ref.option_id, ref.room_id || null]);
export function comparisonEntry(snapshot, reference) {
  if (!snapshot || snapshot.search_id !== reference.search_id) return null;
  const item = snapshot.results.find(value => value.id === reference.option_id);
  if (!item || reference.room_id && (snapshot.mode !== 'stays' || !item.rooms.some(room => room.id === reference.room_id))) return null;
  return { snapshot, item, reference: { ...reference } };
}
const money = price => price?.amount != null && price?.currency ? `${price.estimated ? 'Estimated ' : ''}${price.currency} ${price.amount}` : 'Price unavailable';
const refund = value => value === true ? 'Refundable; check exact terms' : value === false ? 'Non-refundable' : 'Cancellation terms unavailable';
const party = c => c.rooms ? `${c.rooms.length} rooms · ${c.rooms.reduce((n, r) => n + r.adults + r.children_ages.length, 0)} travelers` : `${c.adults} adults · ${c.children_ages.length} children · ${c.infant_ages.length} infants`;
const scope = ({ snapshot: { criteria: c, mode }, item, reference }) => JSON.stringify([mode, (reference.room_id ? item.rooms.find(room => room.id === reference.room_id)?.total : item.price)?.currency, c.currency, c.check_in || c.departure_date, c.check_out || c.return_date, c.rooms || [c.adults, c.children_ages, c.infant_ages], c.origin, c.destination, c.cabin_class]);
function Journey({ leg, label }) {
  return <div><strong>{label}</strong>{leg.segments.map((s, index) => <p key={index}>{s.origin} {s.departure_at.replace('T', ' ')} → {s.destination} {s.arrival_at.replace('T', ' ')}{(s.operating_airline || s.operating_code) && ` · Operated by ${s.operating_airline || s.operating_code}`}</p>)}<p>{leg.duration_minutes == null ? 'Duration unavailable' : `${leg.duration_minutes} min`} · {leg.stops == null ? 'Stops unavailable' : `${leg.stops} stops`} · Local airport times</p></div>;
}
export function TravelComparison({ entries, currentSearchId, onDetails, onChoose, onShortlist, onClose, onDiscuss, discussionError, discussing, choiceDisabled }) {
  if (!entries.length) return null;
  const unlike = new Set(entries.map(scope)).size > 1;
  return <section className="travel-main-comparison" aria-label="Option comparison">
    <header><h3>Compare your options</h3><button type="button" onClick={onClose}>Close comparison</button></header>
    {entries.some(entry => entry.snapshot.search_id !== currentSearchId) && <p role="status">Earlier search · historical comparison</p>}
    {unlike && <p role="status">Different dates, traveler groups, destinations or currencies. These totals are not directly comparable.</p>}
    <div className="travel-comparison-columns">{entries.map(({ item, snapshot, reference }) => {
      const stay = snapshot.mode === 'stays', room = stay && reference.room_id ? item.rooms.find(value => value.id === reference.room_id) : null;
      const c = snapshot.criteria, stale = Date.now() >= Date.parse(snapshot.expires_at);
      const exact = !stay || Boolean(room), entry = { item, snapshot, reference };
      const price = room ? room.total : item.price;
      return <article key={referenceKey(reference)} data-comparison-option={reference.option_id}>
        <h4>{stay ? item.name : item.airlines.join(' · ') || 'Return flight'}</h4>
        {!stay && <CarrierMarks item={item} showName={false}/>}
        <p>{stay ? room ? `Exact room: ${room.name}` : 'Property comparison · no room selected' : 'Exact return fare'}</p>
        <strong>{money(price)}</strong><p>{stay ? room ? 'Observed room offer · total stay' : 'Property starting total · total stay' : 'Return total for all travelers'}</p>
        {room && <p>{room.occupancy_summary || 'Room offer occupancy not supplied; verify before continuing'}</p>}
        <p>{c.check_in || c.departure_date} – {c.check_out || c.return_date} · {party(c)}</p>
        {(room ? room.excluded_taxes || [] : item.price.excluded_taxes || []).map((tax, i) => <p key={i}>Excluded {tax.name}: {money(tax)}</p>)}
        {stay ? <><p>{item.address || 'Address unavailable'} · Distance unavailable</p><p>{item.review_score == null ? 'Guest rating unavailable' : `Guest rating ${item.review_score}${item.review_count == null ? '' : ` · ${item.review_count} reviews`}`}</p><p>Property amenities: {item.facilities.length ? item.facilities.join(', ') : 'Not supplied'}</p><p>Room amenities not supplied</p><p>{room?.board_name || 'Meal plan unavailable'}</p><p>{room?.cancellation_summary || (room ? refund(room.refundable) : 'Select an exact room to compare cancellation terms')}</p></> : <><Journey label="Outbound" leg={item.outbound}/><Journey label="Return" leg={item.inbound}/><p>{item.baggage_summary || 'Baggage allowance unavailable'}</p><p>{item.cancellation_summary || refund(item.refundable)}</p></>}
        <p>Source: {snapshot.provider}{snapshot.sandbox && ' · Sandbox test inventory'}<br/>Observed {new Date(snapshot.searched_at).toLocaleString()}<br/>Expires {new Date(snapshot.expires_at).toLocaleString()}</p>
        {stale && <p role="status">Expired observation. Search again before choosing.</p>}
        <div className="travel-option-actions"><button type="button" onClick={() => onDetails(entry)}>{stay && !room ? 'Select room in details' : 'Details'}</button>{exact && onChoose && <button type="button" disabled={stale || choiceDisabled} onClick={() => onChoose({ title: room?.name || item.name || item.airlines.join(' / '), reference })}>Choose for trip</button>}{exact && onShortlist && <button type="button" disabled={stale || choiceDisabled} onClick={() => onShortlist({ reference })}>Save to shortlist</button>}</div>
      </article>;
    })}</div>
    {onDiscuss && <button type="button" disabled={discussing || entries.length < 2} onClick={onDiscuss}>{discussionError ? 'Retry comparison discussion' : discussing ? 'Discussing comparison…' : 'Discuss this comparison'}</button>}
    {discussionError && <p role="status">Discussion unavailable. You can still compare the observed facts above.</p>}
  </section>;
}
