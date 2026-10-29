import React, { useEffect, useState } from 'react';
import { travelRequest } from './travelApi';

export const emptyStayFilters = () => ({ hotel_type_ids: [], facility_ids: [], strict_facility_filtering: true, refundable_rates_only: false });

export function StaySearchFilters({ planId, active, value, onChange, onExpired, onCatalogs, applied }) {
  const [open, setOpen] = useState(false), [catalogs, setCatalogs] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState({ hotel_type_ids: false, facility_ids: false });
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
  function picker(field, label) {
    const chosen = value[field];
    const catalog = catalogs?.[field] || [];
    const items = [...catalog, ...chosen.filter(id => !catalog.some(item => item.id === id)).map(id => ({ id, name: `Selected ${field === 'hotel_type_ids' ? 'type' : 'amenity'} ${id}` }))];
    const visible = items.filter((item, index) => expanded[field] || index < 12 || chosen.includes(item.id));
    function toggle(item, event) {
      const selected = chosen.includes(item.id);
      const restoredOnly = !catalog.some(option => option.id === item.id);
      if (selected && (restoredOnly || (!expanded[field] && items.indexOf(item) >= 12))) {
        const focusTarget = items.length - Number(restoredOnly) > 12
          ? event.currentTarget.closest('fieldset').querySelector('.travel-filter-expand')
          : event.currentTarget.closest('details').querySelector('summary');
        focusTarget?.focus();
      }
      onChange({ ...value, [field]: selected ? chosen.filter(id => id !== item.id) : [...chosen, item.id] });
    }
    return <fieldset className="travel-provider-filter">
      <legend>{label}</legend>
      {(catalogs || chosen.length > 0) && <>
        <p className="travel-filter-count">{chosen.length} selected · Choose up to 10</p>
        <div className="travel-toggle-options" role="group" aria-label={`${label} options`}>
          {visible.map(item => <button type="button" className="travel-filter-option" key={item.id} aria-pressed={chosen.includes(item.id)} disabled={chosen.length >= 10 && !chosen.includes(item.id)} onClick={event => toggle(item, event)}>
            {chosen.includes(item.id) && <span aria-hidden="true">✓ </span>}{item.name}
          </button>)}
          {!items.length && <p role="status">No options available.</p>}
        </div>
        {items.length > 12 && <button type="button" className="travel-filter-expand" aria-expanded={expanded[field]} onClick={() => setExpanded({ ...expanded, [field]: !expanded[field] })}>{expanded[field] ? `Show fewer ${label.toLowerCase()}` : `Show all ${label.toLowerCase()} (${items.length})`}</button>}
      </>}
    </fieldset>;
  }
  return <details className="travel-provider-filters" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Property type, amenities & cancellation{count > 0 ? ` · ${count} selected` : ''}</summary>
    <p>Select any that fit. Tap again to remove. Applied to your next search.</p>
    {!catalogs && !error && open && <p role="status">Loading property types and amenities…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Retry filters</button></p>}
    <div className="travel-provider-filter-grid">
      {picker('hotel_type_ids', 'Property types')}
      {picker('facility_ids', 'Amenities')}
    </div>
    {value.facility_ids.length > 1 && <label>Amenity matching<select value={value.strict_facility_filtering ? 'all' : 'any'} onChange={event => onChange({ ...value, strict_facility_filtering: event.target.value === 'all' })}><option value="all">All selected amenities</option><option value="any">Any selected amenity</option></select></label>}
    <label className="travel-check"><input type="checkbox" checked={value.refundable_rates_only} onChange={event => onChange({ ...value, refundable_rates_only: event.target.checked })}/> Search refundable rates only</label>
    <p className="travel-note">Amenities describe the property. Check the room details for a private kitchen or other room features.</p>
    {count > 0 && <button type="button" onClick={() => onChange(emptyStayFilters())}>Clear search filters</button>}
  </details>;
}
