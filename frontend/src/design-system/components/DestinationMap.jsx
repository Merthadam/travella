import React, { useEffect, useId, useRef, useState } from 'react';
import { categories } from '../schemas';
import { Icon } from './primitives';
import './places.css';
import { readCanvasView, writeCanvasView } from '../../features/plans/canvasViewState';

function PlaceOptions({ place, disabled, onRemove }) {
  const [open, setOpen] = useState(false);
  const host = useRef(null);
  const trigger = useRef(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!host.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="places-options" ref={host} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="places-options-trigger" ref={trigger} aria-label={`More options for ${place.name}`} aria-expanded={open} aria-controls={menuId} disabled={disabled} onClick={() => setOpen(value => !value)}>•••</button>
    {open && <div className="places-options-panel" id={menuId}><button type="button" disabled={disabled} onClick={() => { setOpen(false); onRemove(trigger.current); }}>Remove from plan</button></div>}
  </div>;
}

// View state stays local; durable edits still pass through the canvas action boundary.
export function DestinationMap({ data, onAction, disabled, mapAdapter: MapAdapter, placePreview, placePhoto: PlacePhoto, placeDetails: PlaceDetails, combined = false, viewStateKey }) {
  const [initial] = useState(() => readCanvasView(viewStateKey));
  const [view, setView] = useState(initial.view === 'map' ? 'map' : 'list');
  const [mapVisited, setMapVisited] = useState(combined || initial.view === 'map');
  const [selected, setSelected] = useState(() => data.pins.some(p => p.id === initial.selected) ? initial.selected : null);
  const [filter, setFilter] = useState(() => data.pins.some(p => p.category === initial.filter) ? initial.filter : 'all');
  const [removing, setRemoving] = useState(null);
  const [removed, setRemoved] = useState(null);
  const [fitRequest, setFitRequest] = useState(0);
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  const listButton = useRef(null);
  const heading = useId();

  useEffect(() => { writeCanvasView(viewStateKey, { view, selected, filter }); }, [viewStateKey, view, selected, filter]);
  function dismissPreview() { if (placePreview) onAction('clear_place_preview', {}); }
  function openMap(id = selected) { if (id) dismissPreview(); setSelected(id); setMapVisited(true); setView('map'); }
  useEffect(() => {
    if (!placePreview) return;
    setFilter('all'); setSelected(null); setMapVisited(true); setView('map');
  }, [placePreview]);
  useEffect(() => {
    if (removing) { if (!returnFocus.current) returnFocus.current = document.activeElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); if (returnFocus.current) { (returnFocus.current.isConnected ? returnFocus.current : listButton.current)?.focus(); returnFocus.current = null; } }
  }, [removing]);
  useEffect(() => { if (filter !== 'all' && !data.pins.some(p => p.category === filter)) setFilter('all'); }, [data.pins, filter]);

  const visible = data.pins.filter(p => (filter === 'all' || p.category === filter));
  const pin = visible.find(p => p.id === selected);
  function clearFilters() { dismissPreview(); setFilter('all'); }
  function showAll() { clearFilters(); setSelected(null); setFitRequest(value => value + 1); }
  function details(place) {
    const actions = <>{!combined && view === 'list' && <button className="ds-text-button" onClick={() => openMap(place.id)}>Show on map</button>}<PlaceOptions key={place.id} place={place} disabled={disabled} onRemove={trigger => { returnFocus.current = trigger; setRemoving(place); }}/></>;
    return <div className="places-detail" id={`${heading}-${place.id}-details`}>
      {!combined && view === 'map' && <div className="places-detail-heading"><h3>{place.name}</h3><button className="ds-icon-button" aria-label="Close place details" onClick={() => setSelected(null)}><Icon name="close" size={16}/></button></div>}
      {PlaceDetails ? <PlaceDetails place={place} destination={data.destination} disabled={disabled} onAction={onAction} actions={actions}/> : <div className="places-actions places-detail-actions">{place.website && <a href={place.website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${place.name} website`}>Website ↗</a>}<a href={`https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: `${place.position.lat},${place.position.lng}` })}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${place.name} in Google Maps`}>Google Maps ↗</a>{actions}</div>}
    </div>;
  }
  return <section className={`ds-card ds-map-card ds-places ${combined ? 'places-combined' : ''}`} aria-labelledby={heading}>
    <header className="places-heading"><div><h2 id={heading}>Your places</h2><p>{data.destination ? `${data.destination} · ` : ''}{data.pins.length} {data.pins.length === 1 ? 'place' : 'places'}</p></div></header>
    {!combined && <div className="places-toolbar"><div className="places-views" aria-label="View places"><button ref={listButton} aria-pressed={view === 'list'} onClick={() => { dismissPreview(); setView('list'); }}>List</button><button aria-pressed={view === 'map'} onClick={() => openMap()}>Map</button></div></div>}
    {data.pins.length > 0 && <div className="places-filters" aria-label="Filter places"><button ref={combined ? listButton : undefined} aria-pressed={filter === 'all'} onClick={() => { clearFilters(); setSelected(null); }}>All places <span>{data.pins.length}</span></button>{Object.entries(categories).filter(([key]) => data.pins.some(p => p.category === key)).map(([key, category]) => <button key={key} aria-pressed={filter === key} onClick={() => { dismissPreview(); setFilter(key); setSelected(null); }}>{category.label} <span>{data.pins.filter(p => p.category === key).length}</span></button>)}</div>}
    {data.status === 'loading' && <p className="places-empty" role="status">Loading places…</p>}
    {data.status === 'error' && <p role="alert">Places couldn’t update. Your existing places are still available. <button className="ds-text-button" disabled={disabled} onClick={() => onAction('retry', {})}>Retry</button></p>}
    <div className="places-content"><div className="places-list-pane" hidden={!combined && view !== 'list'}>
      {visible.length ? <ul className="places-list">{visible.map(place => <li key={place.id}><div className="places-list-row">{PlacePhoto && <PlacePhoto place={place} destination={data.destination} active={combined || view === 'list'}/>}<button className="places-row" aria-expanded={selected === place.id} aria-controls={`${heading}-${place.id}-details`} onClick={() => { setSelected(selected === place.id ? null : place.id); }}><span className="places-row-title"><strong>{place.name}</strong><small><span className="places-dot" style={{ background: categories[place.category].color }}/>{categories[place.category].label}</small></span><span aria-hidden="true" className="places-chevron"><svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span></button></div>{selected === place.id && (combined || view === 'list') && details(place)}</li>)}</ul> : data.status !== 'loading' && <div className="places-empty"><h3>{data.pins.length ? 'No matching places' : 'No places added yet'}</h3><p>{data.pins.length ? 'Try another category.' : 'Find places in the conversation, then add the ones you want.'}</p>{data.pins.length > 0 && <button className="ds-button small" onClick={clearFilters}>Clear filters</button>}</div>}
    </div>
    <div className="places-map-pane" hidden={!combined && view !== 'map'}>{mapVisited && (MapAdapter ? <MapAdapter destination={data.destination} final={data.final} places={visible} selectedId={selected} onSelect={id => { dismissPreview(); setSelected(id); }} editing={false} fitRequest={fitRequest} onShowAll={showAll} active={combined || view === 'map'}/> : <p className="places-empty">Map unavailable. Your places are available in List view.</p>)}{!combined && view === 'map' && pin && details(pin)}</div></div>
    {removed && !data.pins.some(p => p.id === removed.pin.id) && <div className="places-undo" role="status"><span>{removed.pin.name} removed from draft.</span><button className="ds-text-button" disabled={disabled || data.pins.length >= 50} onClick={() => { onAction('restore_pin', removed); setRemoved(null); clearFilters(); }}>Undo</button></div>}
    <footer className="places-footer">{visible.length} {visible.length === 1 ? 'place' : 'places'}{view === 'map' ? ' · Select a pin for details' : ''}</footer>
    <dialog className="canvas-confirm places-confirm" ref={dialog} aria-labelledby={`${heading}-remove`} onCancel={event => { event.preventDefault(); setRemoving(null); }}><h2 id={`${heading}-remove`}>Remove {removing?.name}?</h2><p>This removes the place from your draft. You can undo this before leaving the canvas.</p><div className="places-actions"><button className="ds-button" autoFocus onClick={() => setRemoving(null)}>Keep place</button><button className="ds-button primary" disabled={disabled} onClick={() => { onAction('remove_pin', { id: removing.id }); setRemoved({ pin: removing, index: data.pins.findIndex(p => p.id === removing.id) }); setRemoving(null); setSelected(null); }}>Remove place</button></div></dialog>
  </section>;
}
