import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../lib/googleMaps';

const validPosition = point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng);

export function HomeLocationMap({ location, airports, selectedAirport, onSelectAirport, restoring, restoreError, onRetryRestore }) {
  const canvas = useRef(null);
  const selectAirport = useRef(onSelectAirport);
  const [mapState, setMapState] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasLocation = validPosition(location);
  selectAirport.current = onSelectAirport;

  useEffect(() => {
    if (!hasLocation) return;
    let current = true;
    let map;
    setMapError(false);
    loadGoogleMaps({ libraries: ['maps', 'marker'] }).then(({ maps, libraries }) => {
      if (!current || !canvas.current) return;
      map = new libraries.maps.Map(canvas.current, {
        center: { lat: 20, lng: 0 }, zoom: 2, mapId: 'DEMO_MAP_ID',
        fullscreenControl: false, streetViewControl: false, mapTypeControl: false,
        gestureHandling: 'cooperative',
      });
      setMapState({ map, maps, AdvancedMarkerElement: libraries.marker.AdvancedMarkerElement });
    }).catch(() => { if (current) setMapError(true); });
    return () => {
      current = false;
      if (map) window.google?.maps?.event.clearInstanceListeners(map);
      setMapState(null);
    };
  }, [hasLocation, attempt]);

  useEffect(() => {
    if (!mapState || !hasLocation) return;
    const { map, maps, AdvancedMarkerElement } = mapState;
    const markers = [];
    const listeners = [];
    const pin = (label, className) => {
      const element = document.createElement('span');
      element.className = `ts-map-pin ${className}`;
      element.textContent = label;
      return element;
    };
    markers.push(new AdvancedMarkerElement({ map, position: location, title: 'Your home address', content: pin('⌂', 'ts-map-pin-home'), zIndex: 3 }));
    const airportPins = new Map(airports.filter(validPosition).map(airport => [airport.code, airport]));
    if (validPosition(selectedAirport)) airportPins.set(selectedAirport.code, selectedAirport);
    for (const airport of airportPins.values()) {
      const selected = airport.code === selectedAirport?.code;
      const marker = new AdvancedMarkerElement({
        map, position: { lat: airport.lat, lng: airport.lng },
        title: `${selected ? 'Selected airport' : 'Choose airport'}: ${airport.code}, ${airport.name}`,
        content: pin(`✈ ${airport.code}`, selected ? 'ts-map-pin-airport selected' : 'ts-map-pin-airport'), zIndex: selected ? 2 : 1,
      });
      listeners.push(marker.addListener('click', () => { if (!canvas.current?.closest('fieldset')?.disabled) selectAirport.current(airport.code); }));
      markers.push(marker);
    }
    const bounds = new maps.LatLngBounds();
    bounds.extend(location);
    const visibleAirports = validPosition(selectedAirport) ? [selectedAirport] : [...airportPins.values()];
    visibleAirports.forEach(airport => bounds.extend({ lat: airport.lat, lng: airport.lng }));
    if (visibleAirports.length) map.fitBounds(bounds, 55);
    else { map.setCenter(location); map.setZoom(12); }
    return () => { listeners.forEach(listener => listener.remove()); markers.forEach(marker => { marker.map = null; }); };
  }, [mapState, hasLocation, location, airports, selectedAirport]);

  return <div className="ts-home-map-wrap">
    <div className="ts-map-heading"><span>YOUR STARTING POINT</span><span><i className="ts-map-key-home" /> Home <i className="ts-map-key-airport" /> Airport</span></div>
    <div className="ts-home-map" aria-label="Home and departure airports map">
      {hasLocation && <div className="ts-home-map-canvas" ref={canvas} />}
      {(!hasLocation || mapError || !mapState) && <div className="ts-home-map-placeholder" role="status">
        <span aria-hidden="true">⌖</span>
        <strong>{restoring ? 'Locating your saved address…' : mapError || restoreError ? 'Your address is here. The map couldn’t load.' : hasLocation ? 'Loading your map…' : 'Your journey starts here'}</strong>
        <p>{!hasLocation && !restoring && !restoreError ? 'Select your home address to see nearby airports.' : mapError || restoreError ? 'You can still review your address and choose an airport below.' : 'We’ll show your home and nearby departure options.'}</p>
        {(mapError || restoreError) && <button type="button" className="ts-text-button" onClick={() => { setAttempt(value => value + 1); onRetryRestore(); }}>Retry map</button>}
      </div>}
    </div>
    <p className="ts-map-caption">Choose an airport on the map or from the list below. Your selection saves with Continue.</p>
  </div>;
}
