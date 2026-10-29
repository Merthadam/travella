import React, { useEffect, useState } from 'react';
import { travelRequest } from './travelApi';

export const emptyStayFilters = () => ({ hotel_type_ids: [], facility_ids: [], strict_facility_filtering: true, refundable_rates_only: false });

export function StaySearchFilters({ planId, active, value, onChange, onExpired, onCatalogs, applied }) {
  const [open, setOpen] = useState(false), [catalogs, setCatalogs] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [queries, setQueries] = useState({ hotel_type_ids: '', facility_ids: '' });
  useEffect(() => {
    if (!active || (!open && !applied?.hotel_type_ids?.length && !applied?.facility_ids?.length)) return;
    if (catalogs) return;
    const controller = new AbortController();
    let live = true;
    setError(''); setCatalogs(null);
    Promise.all(['hotel_types', 'facilities'].map(kind => travelRequest(planId, 'hotels/catalog', { kind }, controller.signal)))
      .then(([types, facilities]) => { if (live) { if (!Array.isArray(types.items) || !Array.isArray(facilities.items)) throw new Error('Invalid catalog'); const next = { hotel_type_ids: types.items, facility_ids: facilities.items }; setCatalogs(next); onCatalogs?.(next); } })
      .catch(err => { if (live && err.name !== 'AbortError') { if (err.status === 401) onExpired?.(); setError('Property types and amenities could not load. Retry to choose filters.'); } });
    return () => { live = false; controller.abort(); };
  }, [open, active, planId, retry, Boolean(applied?.hotel_type_ids?.length || applied?.facility_ids?.length)]);
  const count = value.hotel_type_ids.length + value.facility_ids.length + Number(value.refundable_rates_only);
  function picker(field, label, placeholder) {
    const chosen = value[field];
    const items = catalogs?.[field] || [];
    const query = queries[field].trim().toLocaleLowerCase();
    const matches = items.filter(item => item.name.toLocaleLowerCase().includes(query));
    return <fieldset className="travel-provider-filter">
      <legend>{label}</legend>
      {catalogs && <>
        <input type="search" aria-label={`Search ${label.toLowerCase()}`} value={queries[field]} onChange={event => setQueries({ ...queries, [field]: event.target.value })} placeholder={placeholder}/>
        <p className="travel-filter-count">{chosen.length} selected · Choose up to 10</p>
        <div className="travel-checkbox-options" role="group" aria-label={`${label} options`}>
          {matches.map(item => <label className="travel-check" key={item.id}>
            <input type="checkbox" checked={chosen.includes(item.id)} disabled={chosen.length >= 10 && !chosen.includes(item.id)} onChange={event => onChange({ ...value, [field]: event.target.checked ? [...chosen, item.id] : chosen.filter(id => id !== item.id) })}/>
            <span>{item.name}</span>
          </label>)}
          {!matches.length && <p role="status">{query ? 'No matching options. Try another search.' : 'No options available.'}</p>}
        </div>
      </>}
      <div className="travel-filter-chips">{chosen.map(id => {
        const name = items.find(item => item.id === id)?.name || `Selected ${field === 'hotel_type_ids' ? 'type' : 'amenity'} ${id}`;
        return <button type="button" key={id} aria-label={`Remove ${name}`} onClick={() => onChange({ ...value, [field]: chosen.filter(item => item !== id) })}>{name} <span aria-hidden="true">×</span></button>;
      })}</div>
    </fieldset>;
  }
  return <details className="travel-provider-filters" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Property type, amenities & cancellation{count > 0 ? ` · ${count} selected` : ''}</summary>
    <p>Applied to your next search, using the same filters as the assistant.</p>
    {!catalogs && !error && open && <p role="status">Loading property types and amenities…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Retry filters</button></p>}
    <div className="travel-provider-filter-grid">
      {picker('hotel_type_ids', 'Property types', 'Search apartments, hotels…')}
      {picker('facility_ids', 'Amenities', 'Search kitchen, pool, parking…')}
    </div>
    {value.facility_ids.length > 1 && <label>Amenity matching<select value={value.strict_facility_filtering ? 'all' : 'any'} onChange={event => onChange({ ...value, strict_facility_filtering: event.target.value === 'all' })}><option value="all">All selected amenities</option><option value="any">Any selected amenity</option></select></label>}
    <label className="travel-check"><input type="checkbox" checked={value.refundable_rates_only} onChange={event => onChange({ ...value, refundable_rates_only: event.target.checked })}/> Search refundable rates only</label>
    <p className="travel-note">Amenities describe the property. Check the room details for a private kitchen or other room features.</p>
    {count > 0 && <button type="button" onClick={() => onChange(emptyStayFilters())}>Clear search filters</button>}
  </details>;
}
