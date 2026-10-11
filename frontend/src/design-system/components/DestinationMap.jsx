import React, { useEffect, useId, useRef, useState } from 'react';
import { categories, pinSchema } from '../schemas';
import { Icon, useDraftEditor } from './primitives';
import './places.css';

// View state stays local; durable edits still pass through the canvas action boundary.
export function DestinationMap({ data, onAction, disabled, mapAdapter: MapAdapter, placePreview, placePhoto: PlacePhoto }) {
  const [view, setView] = useState('list');
  const [mapVisited, setMapVisited] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);
  const [removed, setRemoved] = useState(null);
  const [fitRequest, setFitRequest] = useState(0);
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  const listButton = useRef(null);
  const heading = useId();
  useDraftEditor(draft, onAction);

  function dismissPreview() { if (placePreview) onAction('clear_place_preview', {}); }
  function openMap(id = selected) { if (id) dismissPreview(); setSelected(id); setMapVisited(true); setView('map'); }
  useEffect(() => {
    if (!placePreview || draft) return;
    setFilter('all'); setSelected(null); setMapVisited(true); setView('map');
  }, [placePreview, draft]);
  useEffect(() => {
    if (removing) { returnFocus.current = document.activeElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); if (returnFocus.current) { (returnFocus.current.isConnected ? returnFocus.current : listButton.current)?.focus(); returnFocus.current = null; } }
  }, [removing]);
  useEffect(() => { if (filter !== 'all' && !data.pins.some(p => p.category === filter)) setFilter('all'); }, [data.pins, filter]);

  const visible = data.pins.filter(p => (filter === 'all' || p.category === filter));
  const pin = visible.find(p => p.id === selected);
  function clearFilters() { dismissPreview(); setFilter('all'); }
  function showAll() { if (draft) return; clearFilters(); setSelected(null); setFitRequest(value => value + 1); }
  function edit(pin) { setDraft({ ...pin }); setError(''); }
  function save(event) {
    event.preventDefault();
    if (disabled) return;
    const result = pinSchema.safeParse(draft);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    onAction('edit_pin', result.data); setDraft(null);
  }
  function details(place) {
    return <div className="places-detail">
      {view === 'map' && <div className="places-detail-heading"><h3>{place.name}</h3><button className="ds-icon-button" aria-label="Close place details" disabled={Boolean(draft)} onClick={() => setSelected(null)}><Icon name="close" size={16}/></button></div>}
      {draft?.id === place.id ? <form onSubmit={save}><label>Note<textarea autoFocus maxLength={240} rows={3} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>{error && <p role="alert">{error}</p>}<div className="places-actions"><button type="button" className="ds-button small" onClick={() => setDraft(null)}>Cancel</button><button className="ds-button small primary" disabled={disabled}>Update note</button></div></form> : <><span className="places-note-label">Note</span><p>{place.description || 'No note yet.'}</p><div className="places-actions"><button className="ds-button small" disabled={disabled || Boolean(draft)} onClick={() => edit(place)}>{place.description ? 'Edit note' : 'Add note'}</button>{view === 'list' && <button className="ds-button small" onClick={() => openMap(place.id)}>Show on map</button>}<button className="ds-text-button places-remove" disabled={disabled || Boolean(draft)} onClick={() => setRemoving(place)}>Remove</button></div></>}
    </div>;
  }
  return <section className="ds-card ds-map-card ds-places" aria-labelledby={heading}>
    <header className="places-heading"><div><h2 id={heading}>Your places</h2><p>{data.destination ? `${data.destination} · ` : ''}{data.pins.length} {data.pins.length === 1 ? 'place' : 'places'}</p></div></header>
    <div className="places-toolbar"><div className="places-views" aria-label="View places"><button ref={listButton} aria-pressed={view === 'list'} disabled={Boolean(draft)} onClick={() => { dismissPreview(); setView('list'); }}>List</button><button aria-pressed={view === 'map'} disabled={Boolean(draft)} onClick={() => openMap()}>Map</button></div></div>
    {data.pins.length > 0 && <div className="places-filters" aria-label="Filter places"><button aria-pressed={filter === 'all'} disabled={Boolean(draft)} onClick={() => { clearFilters(); setSelected(null); }}>All places <span>{data.pins.length}</span></button>{Object.entries(categories).filter(([key]) => data.pins.some(p => p.category === key)).map(([key, category]) => <button key={key} aria-pressed={filter === key} disabled={Boolean(draft)} onClick={() => { dismissPreview(); setFilter(key); setSelected(null); }}>{category.label} <span>{data.pins.filter(p => p.category === key).length}</span></button>)}</div>}
    {data.status === 'loading' && <p className="places-empty" role="status">Loading places…</p>}
    {data.status === 'error' && <p role="alert">Places couldn’t update. Your existing places are still available. <button className="ds-text-button" disabled={disabled} onClick={() => onAction('retry', {})}>Retry</button></p>}
    <div hidden={view !== 'list'}>
      {visible.length ? <ul className="places-list">{visible.map(place => <li key={place.id}><div className="places-list-row">{PlacePhoto && <PlacePhoto place={place} destination={data.destination} active={view === 'list'}/>}<button className="places-row" aria-expanded={selected === place.id} disabled={Boolean(draft) && draft.id !== place.id} onClick={() => { if (!draft) setSelected(selected === place.id ? null : place.id); }}><span className="places-dot" style={{ background: categories[place.category].color }}/><span><strong>{place.name}</strong><small>{categories[place.category].label}</small></span><span aria-hidden="true" className="places-chevron">{selected === place.id ? '−' : '+'}</span></button></div>{view === 'list' && selected === place.id && details(place)}</li>)}</ul> : data.status !== 'loading' && <div className="places-empty"><h3>{data.pins.length ? 'No matching places' : 'No places added yet'}</h3><p>{data.pins.length ? 'Try another category.' : 'Find places in the conversation, then add the ones you want.'}</p>{data.pins.length > 0 && <button className="ds-button small" onClick={clearFilters}>Clear filters</button>}</div>}
    </div>
    <div hidden={view !== 'map'}>{mapVisited && (MapAdapter ? <MapAdapter destination={data.destination} final={data.final} places={visible} selectedId={selected} onSelect={id => { if (!draft) { dismissPreview(); setSelected(id); } }} editing={Boolean(draft)} fitRequest={fitRequest} onShowAll={showAll} active={view === 'map'}/> : <p className="places-empty">Map unavailable. Your places are available in List view.</p>)}{view === 'map' && pin && details(pin)}</div>
    {removed && !data.pins.some(p => p.id === removed.pin.id) && <div className="places-undo" role="status"><span>{removed.pin.name} removed from draft.</span><button className="ds-text-button" disabled={disabled || data.pins.length >= 50} onClick={() => { onAction('restore_pin', removed); setRemoved(null); clearFilters(); }}>Undo</button></div>}
    <footer className="places-footer">{visible.length} {visible.length === 1 ? 'place' : 'places'}{view === 'map' ? ' · Select a pin for details' : ''}</footer>
    <dialog className="canvas-confirm places-confirm" ref={dialog} aria-labelledby={`${heading}-remove`} onCancel={event => { event.preventDefault(); setRemoving(null); }}><h2 id={`${heading}-remove`}>Remove {removing?.name}?</h2><p>This removes the place from your draft. You can undo this before leaving the canvas.</p><div className="places-actions"><button className="ds-button" autoFocus onClick={() => setRemoving(null)}>Keep place</button><button className="ds-button primary" disabled={disabled} onClick={() => { onAction('remove_pin', { id: removing.id }); setRemoved({ pin: removing, index: data.pins.findIndex(p => p.id === removing.id) }); setRemoving(null); setSelected(null); }}>Remove place</button></div></dialog>
  </section>;
}
