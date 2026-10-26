import React, { useEffect, useState } from 'react';
import { SearchSelect } from './SearchSelect';
import { travelRequest } from './travelApi';

export const emptyStayFilters = () => ({ hotel_type_ids: [], facility_ids: [], strict_facility_filtering: true, refundable_rates_only: false });

export function StaySearchFilters({ planId, active, value, onChange, onExpired }) {
  const [open, setOpen] = useState(false), [catalogs, setCatalogs] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || !active) return;
    const controller = new AbortController();
    let live = true;
    setError(''); setCatalogs(null);
    Promise.all(['hotel_types', 'facilities'].map(kind => travelRequest(planId, 'hotels/catalog', { kind }, controller.signal)))
      .then(([types, facilities]) => { if (live) { if (!Array.isArray(types.items) || !Array.isArray(facilities.items)) throw new Error('Invalid catalog'); setCatalogs({ hotel_type_ids: types.items, facility_ids: facilities.items }); } })
      .catch(err => { if (live && err.name !== 'AbortError') { if (err.status === 401) onExpired?.(); setError('Property types and amenities could not load. Retry to choose filters.'); } });
    return () => { live = false; controller.abort(); };
  }, [open, active, planId, retry]);
  const count = value.hotel_type_ids.length + value.facility_ids.length + Number(value.refundable_rates_only);
  function picker(field, label, placeholder) {
    const chosen = value[field];
    const items = catalogs?.[field] || [];
    return <div className="travel-provider-filter">
      {catalogs && chosen.length < 10 && <SearchSelect label={label} value="" options={items.filter(item => !chosen.includes(item.id)).map(item => ({ value: String(item.id), label: item.name }))} onChange={id => onChange({ ...value, [field]: [...chosen, Number(id)] })} placeholder={placeholder}/>}
      <div className="travel-filter-chips">{chosen.map(id => {
        const name = items.find(item => item.id === id)?.name || `Selected ${field === 'hotel_type_ids' ? 'type' : 'amenity'} ${id}`;
        return <button type="button" key={id} aria-label={`Remove ${name}`} onClick={() => onChange({ ...value, [field]: chosen.filter(item => item !== id) })}>{name} <span aria-hidden="true">×</span></button>;
      })}</div>
    </div>;
  }
  return <details className="travel-provider-filters" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Property type, amenities & cancellation{count > 0 ? ` · ${count} selected` : ''}</summary>
    <p>Applied to your next search, using the same filters as the assistant.</p>
    {!catalogs && !error && open && <p role="status">Loading property types and amenities…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Retry filters</button></p>}
    <div className="travel-provider-filter-grid">
      {picker('hotel_type_ids', 'Property type', 'Search apartments, hotels…')}
      {picker('facility_ids', 'Add an amenity', 'Search kitchen, pool, parking…')}
    </div>
    {value.facility_ids.length > 1 && <label>Amenity matching<select value={value.strict_facility_filtering ? 'all' : 'any'} onChange={event => onChange({ ...value, strict_facility_filtering: event.target.value === 'all' })}><option value="all">All selected amenities</option><option value="any">Any selected amenity</option></select></label>}
    <label className="travel-check"><input type="checkbox" checked={value.refundable_rates_only} onChange={event => onChange({ ...value, refundable_rates_only: event.target.checked })}/> Search refundable rates only</label>
    <p className="travel-note">Amenities describe the property. Check the room details for a private kitchen or other room features.</p>
    {count > 0 && <button type="button" onClick={() => onChange(emptyStayFilters())}>Clear search filters</button>}
  </details>;
}
