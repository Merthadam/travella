import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, createBinderlessComponentImplementation } from '@a2ui/react/v0_9';
import { canvasEditResultSchema as activities } from '../../../design-system/a2ui/ActivitySuggestions';
import './travel-results.css';

const text = z.string().max(240), id = z.string().min(1).max(100);
const money = z.object({ amount: z.string().max(40).regex(/^\d+(?:\.\d+)?$/).nullable(), currency: z.string().regex(/^[A-Z]{3}$/).nullable() }).strict();
const tax = money.extend({ name: text });
const price = money.extend({ basis: z.literal('stay'), estimated: z.boolean(), excluded_taxes: z.array(tax).max(50) });
const room = z.object({ id, name: text, board_name: text.nullable(), refundable: z.boolean().nullable(), cancellation_summary: text.nullable(), cancellation_deadline: text.nullable(), total: money, excluded_taxes: z.array(tax).max(50), occupancy_summary: text.nullable() }).strict();
const option = z.object({ id, name: text, address: text.nullable(), price, rooms: z.array(room).max(30) }).strict();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const criteria = z.object({ destination: z.object({ city: z.string().min(2).max(120), country_code: z.string().regex(/^[A-Z]{2}$/), place_id: z.string().max(255).nullable() }).strict(), check_in: date, check_out: date, rooms: z.array(z.object({ adults: z.number().int().min(1).max(6), children_ages: z.array(z.number().int().min(0).max(17)).max(4) }).strict()).min(1).max(4), guest_nationality: z.string().regex(/^[A-Z]{2}$/), currency: z.enum(['EUR','USD','GBP','HUF','CAD','AUD','JPY','CHF']), hotel_id: z.string().max(100).nullable() }).strict();
export const travelSnapshotSchema = z.object({
  search_id: id, plan_id: id, generation: z.number().int().nonnegative(), mode: z.literal('stays'), criteria,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/), draft_facts: z.object({ start: z.string(), end: z.string(), flexible: z.boolean(), travelers: z.number().int().nullable(), destination: z.string() }).strict(),
  searched_at: z.string().datetime({ offset: true }), expires_at: z.string().datetime({ offset: true }), provider: z.literal('LiteAPI'), sandbox: z.boolean(),
  returned_count: z.number().int().min(0).max(100), truncated: z.boolean(), notices: z.array(text).max(10), results: z.array(option).max(100), preview_ids: z.array(id).max(3), search_only_dates: z.boolean(),
}).strict().superRefine((s, ctx) => {
  const ids = new Set(s.results.map(x => x.id));
  if (ids.size !== s.results.length || new Set(s.preview_ids).size !== s.preview_ids.length || s.preview_ids.some(x => !ids.has(x)) || s.preview_ids.length !== Math.min(3, s.results.length) || s.returned_count !== s.results.length || Date.parse(s.expires_at) <= Date.parse(s.searched_at) || new TextEncoder().encode(JSON.stringify(s)).length > 131072)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid travel collection' });
});
// Compose with the existing activity parser, preserving its cross-field checks and strictness.
export const canvasTravelResultSchema = z.object({ suggestions: z.unknown(), add_ids: z.unknown(), area: z.unknown(), travel: z.array(travelSnapshotSchema).max(2).default([]) }).strict().transform(({ travel, ...base }) => ({ ...activities.parse(base), travel }));
export function draftTravelFacts(data) {
  return { start: data?.essentials?.dates?.start || '', end: data?.essentials?.dates?.end || '', flexible: Boolean(data?.essentials?.dates?.flexible), travelers: data?.essentials?.travelers ?? null, destination: data?.map?.destination || '' };
}
export function travelState(snapshot, data, now = Date.now()) {
  if (!snapshot) return 'These results are no longer available. Return to Plan chat to search again.';
  if (now >= Date.parse(snapshot.expires_at)) return 'These results have expired. Return to Plan chat to search again. Prices and availability may have changed.';
  if (data && JSON.stringify(draftTravelFacts(data)) !== JSON.stringify(snapshot.draft_facts)) return 'Your search details have changed. Search again for your current dates and travelers.';
  return '';
}
const amount = p => p?.amount !== null && p?.currency ? `${p.estimated ? 'Estimated ' : ''}${p.currency} ${p.amount}` : 'Price unavailable';
function Taxes({ items }) { return items.length > 0 && <p>Additional taxes excluded: {items.map(x => `${x.name}: ${amount(x)}`).join('; ')}</p>; }
function StayCard({ item, snapshot, full = false }) {
  const rooms = snapshot.criteria.rooms, adults = rooms.reduce((n,x) => n+x.adults,0), children = rooms.reduce((n,x) => n+x.children_ages.length,0);
  const nights = Math.round((Date.parse(snapshot.criteria.check_out)-Date.parse(snapshot.criteria.check_in))/86400000);
  return <article className="canvas-travel-option" data-option-id={item.id}>
    <h3>{item.name}</h3>{item.address && <p>{item.address}</p>}
    <p>{snapshot.criteria.check_in} → {snapshot.criteria.check_out}</p>
    <strong className="canvas-travel-price">{item.price.amount !== null ? 'From ' : ''}{amount(item.price)}</strong>
    <p>Stay total · {nights} nights · {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · {adults} adults{children ? ` · ${children} children` : ''}</p>
    <Taxes items={item.price.excluded_taxes}/>
    {item.rooms.length ? <details open={full}><summary>Room and cancellation details</summary>{item.rooms.map(r => <div key={r.id} className="canvas-travel-room"><strong>{r.name}</strong><p>{amount(r.total)} · {r.occupancy_summary || 'Room occupancy details unavailable'}</p><p>{r.board_name || 'Meal information unavailable'}</p><p>{r.cancellation_summary || (r.refundable === false ? 'Non-refundable' : r.refundable === true ? 'Refundable; detailed cancellation terms unavailable' : 'Cancellation terms unavailable')}</p>{r.cancellation_deadline && <p>Cancellation deadline: {r.cancellation_deadline}</p>}<Taxes items={r.excluded_taxes}/></div>)}</details> : <p>Room and cancellation terms unavailable</p>}
  </article>;
}
function SearchContext({ snapshot }) {
  const c = snapshot.criteria;
  return <div className="canvas-travel-context"><p><strong>{c.destination.city}, {c.destination.country_code}</strong><br/>Check-in {c.check_in} · Check-out {c.check_out}</p>
    <p>Provider: {snapshot.provider} · Checked {new Date(snapshot.searched_at).toISOString().replace('T',' ').slice(0,19)} UTC</p>
    {snapshot.sandbox && <p className="canvas-travel-notice">Sandbox · test inventory</p>}<p>Prices and availability may change.</p>
    {snapshot.search_only_dates && <p>These dates are for this search. Your plan dates are unchanged.</p>}
    {snapshot.truncated && <p>Showing available results; more may exist.</p>}{snapshot.notices.map((n,i) => <p key={i}>{n}</p>)}</div>;
}
const Options = createContext({});
const catalogId = 'urn:travella:catalog:travel-previews:v1';
const Preview = createBinderlessComponentImplementation({ name: 'TravelPreviews', schema: z.object({ value: z.object({ path: z.literal('/travel') }).strict() }).strict() }, function Bound({ context }) {
  const [data, setData] = useState(null); const options = useContext(Options);
  useEffect(() => { const subscription = context.dataContext.subscribeDynamicValue(context.componentModel.properties.value, setData); setData(subscription.value); return () => subscription.unsubscribe(); }, [context]);
  const parsed = travelSnapshotSchema.safeParse(data);
  if (!parsed.success) return <p role="status">Waiting for valid travel results…</p>;
  const snapshot = parsed.data;
  if (options.reason) return <p role="status" className="canvas-travel-notice">{options.reason}</p>;
  if (!snapshot.results.length) return <div role="status"><h3>No stays found</h3><p>Try different dates or a different destination in Plan chat.</p></div>;
  return <section className="canvas-travel" aria-label="Stay previews"><SearchContext snapshot={snapshot}/><p>Showing {snapshot.preview_ids.length} of {snapshot.returned_count} {snapshot.returned_count === 1 ? 'result' : 'results'}</p>
    {snapshot.results.filter(x => snapshot.preview_ids.includes(x.id)).map(item => <StayCard key={item.id} item={item} snapshot={snapshot}/>)}
    <button type="button" className="ds-button primary canvas-travel-all" data-travel-search={snapshot.search_id} onClick={() => context.dispatchAction({ event: { name: 'view_all_travel', context: { search_id: snapshot.search_id } } })}>View all stays</button><p>Nothing has been saved or booked.</p></section>;
});
const catalog = new Catalog(catalogId, 'v0.9', [Preview], []);
export function TravelPreviews({ snapshot, onOpen, reason }) {
  const processor = useRef(null), callback = useRef(onOpen); callback.current = onOpen;
  const [surface, setSurface] = useState(null), [error, setError] = useState(false);
  const surfaceId = `travel-${snapshot.search_id}`;
  useEffect(() => {
    try {
      const data = travelSnapshotSchema.parse(snapshot);
      processor.current = new MessageProcessor([catalog], action => {
        if (action.surfaceId === surfaceId && action.sourceComponentId === 'root' && action.name === 'view_all_travel' && Object.keys(action.context || {}).length === 1 && action.context?.search_id === data.search_id) callback.current(data.search_id);
      });
      processor.current.processMessages([{ version:'v0.9',createSurface:{surfaceId,catalogId} }, {version:'v0.9',updateComponents:{surfaceId,components:[{id:'root',component:'TravelPreviews',value:{path:'/travel'}}]}}, {version:'v0.9',updateDataModel:{surfaceId,path:'/travel',value:data}}]);
      setSurface(processor.current.model.surfacesMap.get(surfaceId)); setError(false);
    } catch { setError(true); }
    return () => { processor.current?.dispose(); processor.current=null; };
  }, [snapshot, surfaceId]);
  return <Options.Provider value={{ reason }}>{error ? <p role="alert">These travel results couldn’t be displayed. Try again from Plan chat. Your draft is unchanged.</p> : surface && <A2uiSurface surface={surface}/>}</Options.Provider>;
}
export function TravelResults({ snapshot, reason, onBack }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [snapshot?.search_id]);
  return <section className="canvas-travel canvas-travel-results" aria-label="Travel results only"><button type="button" className="ds-text-button" onClick={onBack}>← Back to plan chat</button><h2 ref={heading} tabIndex={-1}>Stays for your trip</h2>
    {reason || !snapshot ? <p role="status">{reason || 'These results are no longer available. Return to Plan chat to search again.'}</p> : <><SearchContext snapshot={snapshot}/><p>{snapshot.returned_count} {snapshot.returned_count === 1 ? 'stay option' : 'stay options'} from this search</p><div className="canvas-travel-grid">{snapshot.results.map(item => <StayCard full key={item.id} item={item} snapshot={snapshot}/>)}</div><p>Nothing has been saved or booked.</p></>}</section>;
}
