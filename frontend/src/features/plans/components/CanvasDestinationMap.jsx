import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAppearance } from '../../appearance/AppearanceProvider';
import { loadGoogleMaps } from '../../../lib/googleMaps';
import { categories } from '../../../design-system/schemas';

export const CanvasMapContext = createContext({});

function pinIcon(category) {
  const paths = {
    stay: ['M3 18V7m18 11V9M3 15h18M3 9h18v6', 'M6 9V6h5v3m2 0V6h5v3'],
    airport: ['m3 11 7 2 1 7 2-1 1-6 6-8-1-2-8 6-6-1z', 'm14 13 5 4-2 2-4-5'],
    food: ['M5 8h11v6a5 5 0 0 1-10 0V8m11 1h2a3 3 0 0 1 0 6h-2M4 21h15M8 2v3m5-3v3'],
    activity: ['m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z'],
    other: ['M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z'],
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  for (const path of paths[category] || paths.other) { const element = document.createElementNS('http://www.w3.org/2000/svg', 'path'); element.setAttribute('d', path); svg.append(element); }
  return svg;
}

async function geocode(request) {
  const { libraries } = await loadGoogleMaps({ libraries: ['geocoding'] });
  try {
    const { results } = await new libraries.geocoding.Geocoder().geocode(request);
    return (results || []).filter(result => result.geometry?.location).slice(0, 5);
  } catch (error) { if (error.code === 'ZERO_RESULTS') return []; throw error; }
}

// Coordinates and viewports originate only from the provider. Resolving a viewport
// changes the local map view; it does not select or save a Plan destination.
export async function searchCanvasPlaces(query, destination) {
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  const { places = [] } = await libraries.places.Place.searchByText({
    textQuery: `${query}${destination ? ` in ${destination}` : ''}`,
    fields: ['id', 'displayName', 'formattedAddress', 'location'], maxResultCount: 5,
  });
  return places.filter(place => place.location).map(place => ({
    id: place.id, name: place.displayName, address: place.formattedAddress,
    position: place.location.toJSON(),
  }));
}

export function CanvasDestinationMap({ destination, final, places, selectedId, onSelect }) {
  const { preview, destinationHint, onClearPreview, onSearchArea, disabled } = useContext(CanvasMapContext);
  const { theme } = useAppearance();
  const canvas = useRef(null);
  const mapView = useRef(null);
  const framedDestination = useRef(null);
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
    if (!runtime || !resolved || framedDestination.current === resolved) return;
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
  }, [runtime, resolved]);

  useEffect(() => {
    if (!runtime) return;
    const listener = runtime.map.addListener('idle', () => setBounds(runtime.map.getBounds()?.toJSON() || null));
    return () => listener.remove();
  }, [runtime]);

  useEffect(() => {
    if (!runtime || !preview) return;
    runtime.map.panTo(preview.position); runtime.map.setZoom(15);
    if (places.some(place => place.id === preview.id)) return;
    const content = document.createElement('span'); content.className = 'canvas-map-pin is-preview'; content.style.setProperty('--category', categories.activity.color);
    const label = document.createElement('span'); label.textContent = preview.name; content.append(pinIcon('activity'), label);
    const marker = new runtime.Marker({ map: runtime.map, position: preview.position, title: `Preview only: ${preview.name}`, content });
    return () => { marker.map = null; };
  }, [runtime, preview, places]);

  useEffect(() => {
    if (!runtime) return;
    const markers = []; const listeners = [];
    for (const place of places) {
      const category = categories[place.category];
      const content = document.createElement('span');
      content.className = `canvas-map-pin ${place.id === selectedId ? 'selected' : ''}`;
      content.style.setProperty('--category', category.color);
      const icon = pinIcon(place.category);
      const label = document.createElement('span'); label.textContent = place.name;
      content.append(icon, label);
      const marker = new runtime.Marker({ map: runtime.map, position: place.position, title: `Inspect ${place.name}`, content });
      listeners.push(marker.addListener('click', () => selection.current(place.id))); markers.push(marker);
    }
    return () => { listeners.forEach(listener => listener.remove()); markers.forEach(marker => { marker.map = null; }); };
  }, [runtime, places, selectedId]);

  function showAll() {
    if (!runtime || !places.length) return;
    const bounds = new runtime.maps.LatLngBounds(); places.forEach(place => bounds.extend(place.position));
    runtime.map.fitBounds(bounds, 48);
    if (places.length === 1) runtime.map.setZoom(14);
  }
  const message = mapError ? 'The map is unavailable. Your places remain in the list below.' : !usableDestination ? 'Choose a destination in the conversation to frame your map.' : loading ? 'Finding your destination…' : error || (!final && resolved ? `Exploring ${usableDestination}. Your final destination is still yours to choose.` : '');
  return <div className="canvas-map-adapter">
    <div className="canvas-google-map" ref={canvas} aria-label={usableDestination ? `Map of ${usableDestination}` : 'Destination map'}/>
    {(message || candidates.length > 0) && <div className="canvas-map-message" role="status">
      {message && <p>{message}</p>}
      {candidates.length > 0 && <><p>Which location should the map show? This only adjusts your map view.</p>{candidates.map(result => <button type="button" className="ds-button small" key={result.place_id} onClick={() => { setResolved(result); setCandidates([]); }}>{result.formatted_address}</button>)}</>}
      {(error || mapError) && <button type="button" className="ds-button small" onClick={() => setAttempt(value => value + 1)}>Retry map</button>}
    </div>}
    {preview && <div className="canvas-map-preview"><div><strong>{preview.name}</strong><small>{places.some(place => place.id === preview.id) ? 'In your draft' : 'Preview only · not added to your draft'}</small></div><button type="button" className="ds-text-button" onClick={onClearPreview}>Close preview</button></div>}
    <div className="canvas-map-tools"><button type="button" className="ds-text-button" disabled={!runtime || !places.length} onClick={showAll}>Show all places</button>{onSearchArea && <button type="button" className="ds-button small" disabled={!bounds || disabled} onClick={() => onSearchArea(bounds)}>Search this map area</button>}</div>
  </div>;
}
