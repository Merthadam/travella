import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAppearance } from '../../appearance/AppearanceProvider';
import { loadGoogleMaps } from '../../../lib/googleMaps';
import { categories } from '../../../design-system/schemas';

export const CanvasMapContext = createContext({});

function pinIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 28 36'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M14 34S2 21 2 14a12 12 0 1 1 24 0c0 7-12 20-12 20Z');
  path.setAttribute('fill', 'var(--category)'); path.setAttribute('stroke', 'white'); path.setAttribute('stroke-width', '2');
  const dot = document.createElementNS(svg.namespaceURI, 'circle');
  dot.setAttribute('cx', '14'); dot.setAttribute('cy', '14'); dot.setAttribute('r', '4'); dot.setAttribute('fill', 'white');
  svg.append(path, dot); return svg;
}

async function geocode(request) {
  const { libraries } = await loadGoogleMaps({ libraries: ['geocoding'] });
  try {
    const { results } = await new libraries.geocoding.Geocoder().geocode(request);
    return (results || []).filter(result => result.geometry?.location).slice(0, 5);
  } catch (error) { if (error.code === 'ZERO_RESULTS') return []; throw error; }
}

export function CanvasDestinationMap({ destination, final, places, selectedId, onSelect, fitRequest = 0, onShowAll, active = true, editing = false }) {
  const { preview, destinationHint, onClearPreview, onSearchArea, onAddPreview, disabled } = useContext(CanvasMapContext);
  const { theme } = useAppearance();
  const canvas = useRef(null);
  const mapView = useRef(null);
  const framedDestination = useRef(null);
  const framedPlaces = useRef(null);
  const selection = useRef(onSelect); selection.current = onSelect;
  const [runtime, setRuntime] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [resolved, setResolved] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [bounds, setBounds] = useState(null);
  // A single stated candidate may frame the map without choosing it for the Plan.
  const usableDestination = destination || destinationHint || '';

  useEffect(() => {
    let alive = true;
    let map;
    setMapError(false);
    loadGoogleMaps({ libraries: ['maps', 'marker'] }).then(({ maps, libraries }) => {
      if (!alive || !canvas.current) return;
      map = new libraries.maps.Map(canvas.current, {
        mapId: 'DEMO_MAP_ID', colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
        center: mapView.current?.center || { lat: 20, lng: 0 }, zoom: mapView.current?.zoom ?? 2,
        fullscreenControl: false, streetViewControl: false, mapTypeControl: false, gestureHandling: 'cooperative',
      });
      setRuntime({ map, maps, Marker: libraries.marker.AdvancedMarkerElement });
    }).catch(() => { if (alive) setMapError(true); });
    return () => {
      alive = false;
      if (map) {
        mapView.current = { center: map.getCenter()?.toJSON(), zoom: map.getZoom() };
        window.google?.maps?.event.clearInstanceListeners(map);
      }
      setRuntime(null);
    };
    // Google Maps only accepts colorScheme at construction. Preserve the view
    // when recreating it so switching appearance never resets the user's map.
  }, [attempt, theme]);

  useEffect(() => {
    let alive = true;
    setCandidates([]); setResolved(null); setError('');
    if (!usableDestination) { setLoading(false); return; }
    setLoading(true);
    geocode({ address: usableDestination }).then(results => {
      if (!alive) return;
      setLoading(false);
      if (!results.length) setError('We couldn’t locate this destination. Check its name in the conversation, or retry.');
      else if (results.length > 1 || results[0].partial_match) setCandidates(results);
      else setResolved(results[0]);
    }).catch(() => { if (alive) { setLoading(false); setError('The destination map couldn’t load. Your Plan details are still here.'); } });
    return () => { alive = false; };
  }, [usableDestination, attempt]);

  useEffect(() => {
    if (!runtime || !resolved || places.length || preview || framedDestination.current === resolved) return;
    const frame = () => {
      if (!canvas.current?.clientWidth || !canvas.current?.clientHeight || framedDestination.current === resolved) return;
      framedDestination.current = resolved;
      // City/region bounds frame the destination itself; suggested viewports can
      // extend far beyond it. Countries retain Google's recommended overview.
      const viewport = resolved.types?.includes('country') ? resolved.geometry.viewport : resolved.geometry.bounds || resolved.geometry.viewport;
      if (viewport) runtime.map.fitBounds(viewport, 24);
      else { runtime.map.setCenter(resolved.geometry.location); runtime.map.setZoom(resolved.types?.includes('country') ? 5 : 12); }
    };
    frame();
    // fitBounds is a no-op while the canvas is hidden (mobile chat / travel search).
    // Apply the pending destination once it is visible, then leave user zoom alone.
    if (framedDestination.current === resolved) return;
    const observer = new ResizeObserver(frame);
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [runtime, resolved, places.length, preview]);

  useEffect(() => {
    if (!runtime) return;
    const listener = runtime.map.addListener('idle', () => setBounds(runtime.map.getBounds()?.toJSON() || null));
    return () => listener.remove();
  }, [runtime]);

  const placePositions = places.map(p => `${p.id}:${p.position.lat}:${p.position.lng}`).join('|');
  const selectedPlace = places.find(p => p.id === selectedId);

  useEffect(() => {
    if (!runtime || !preview || !active) return;
    runtime.map.panTo(preview.position); runtime.map.setZoom(15);
    if (places.some(place => place.id === preview.id || (place.name === preview.name && place.position.lat === preview.position.lat && place.position.lng === preview.position.lng))) return;
    const content = document.createElement('span'); content.className = 'canvas-map-pin is-preview'; content.style.setProperty('--category', categories.activity.color);
    content.append(pinIcon());
    const marker = new runtime.Marker({ map: runtime.map, position: preview.position, title: `Preview only: ${preview.name}`, content });
    return () => { marker.map = null; };
  }, [runtime, preview, placePositions, active]);

  useEffect(() => {
    if (!runtime) return;
    const markers = []; const listeners = [];
    for (const place of places) {
      const category = categories[place.category];
      const content = document.createElement('span');
      content.className = `canvas-map-pin ${place.id === selectedId ? 'selected' : ''}`;
      content.style.setProperty('--category', category.color);
      content.append(pinIcon());
      const marker = new runtime.Marker({ map: runtime.map, position: place.position, title: `Inspect ${place.name}`, content });
      listeners.push(marker.addListener('click', () => selection.current(place.id))); markers.push(marker);
    }
    return () => { listeners.forEach(listener => listener.remove()); markers.forEach(marker => { marker.map = null; }); };
  }, [runtime, places, selectedId]);

  useEffect(() => {
    if (!runtime || !active || preview || !places.length) return;
    const signature = `${fitRequest}:${places.map(p => `${p.id}:${p.position.lat}:${p.position.lng}`).join('|')}`;
    if (framedPlaces.current === signature) return;
    const frame = () => {
      if (!canvas.current?.clientWidth || !canvas.current?.clientHeight || framedPlaces.current === signature) return;
      framedPlaces.current = signature; showAll();
    };
    frame();
    const observer = new ResizeObserver(frame); observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [runtime, active, places, preview, fitRequest]);

  useEffect(() => {
    if (runtime && active && selectedPlace && !preview) runtime.map.panTo(selectedPlace.position);
  }, [runtime, active, selectedId, selectedPlace?.position.lat, selectedPlace?.position.lng, preview]);

  function showAll() {
    if (!runtime || !places.length) return;
    const bounds = new runtime.maps.LatLngBounds(); places.forEach(place => bounds.extend(place.position));
    runtime.map.fitBounds(bounds, 48);
    if (places.length === 1) runtime.map.setZoom(14);
  }
  const message = mapError ? 'The map is unavailable. Your places are available in List view.' : !usableDestination ? 'Choose a destination in the conversation to frame your map.' : loading ? 'Finding your destination…' : error || (!final && resolved ? `Exploring ${usableDestination}. Your final destination is still yours to choose.` : '');
  return <div className="canvas-map-adapter">
    <div className="canvas-google-map" ref={canvas} aria-label={usableDestination ? `Map of ${usableDestination}` : 'Destination map'}/>
    {(message || candidates.length > 0) && <div className="canvas-map-message" role="status">
      {message && <p>{message}</p>}
      {candidates.length > 0 && <><p>Which location should the map show? This only adjusts your map view.</p>{candidates.map(result => <button type="button" className="ds-button small" key={result.place_id} onClick={() => { setResolved(result); setCandidates([]); }}>{result.formatted_address}</button>)}</>}
      {(error || mapError) && <button type="button" className="ds-button small" onClick={() => setAttempt(value => value + 1)}>Retry map</button>}
    </div>}
    {preview && <div className="canvas-map-preview"><div><strong>{preview.name}</strong><small>{places.some(place => place.id === preview.id) ? 'In your draft' : 'Preview only · not added to your draft'}</small></div><div className="places-actions">{onAddPreview && !places.some(place => place.id === preview.id) && <button type="button" className="ds-button small" disabled={disabled} onClick={() => onAddPreview(preview)}>Add to plan</button>}<button type="button" className="ds-text-button" onClick={onClearPreview}>Close preview</button></div></div>}
    <div className="canvas-map-tools"><button type="button" className="ds-text-button" disabled={!runtime || editing} onClick={() => { onClearPreview?.(); if (onShowAll) onShowAll(); else showAll(); }}>Show all places</button>{onSearchArea && <button type="button" className="ds-button small" disabled={!bounds || disabled} onClick={() => onSearchArea(bounds)}>Search this map area</button>}</div>
  </div>;
}
