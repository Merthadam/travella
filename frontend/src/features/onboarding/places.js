import { loadGoogleMaps } from '../../lib/googleMaps';

const EARTH_RADIUS_KM = 6371.0088;
const MAX_NEARBY_DISTANCE_KM = 250;
const NEARBY_LIMIT = 5;
const AIRPORT_SEARCH_LIMIT = 30;
const resolvedCityDetails = new WeakMap();

export function createPlacesSession() {
  return { token: null, latestRequest: 0 };
}

function textOf(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : value.toString();
}

export async function searchCities(input, session) {
  const query = String(input || '').trim();
  if (query.length < 2) return [];
  if (!session || typeof session !== 'object') throw new TypeError('A Places session is required.');

  const requestId = ++session.latestRequest;
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  if (requestId !== session.latestRequest) return [];
  const { AutocompleteSessionToken, AutocompleteSuggestion } = libraries.places;
  session.token ||= new AutocompleteSessionToken();

  const { suggestions = [] } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    sessionToken: session.token,
    includedPrimaryTypes: ['(cities)'],
  });
  if (requestId !== session.latestRequest) return [];

  return suggestions
    .filter(item => item?.placePrediction?.placeId)
    .map(({ placePrediction }) => ({
      id: placePrediction.placeId,
      mainText: textOf(placePrediction.mainText) || textOf(placePrediction.text),
      secondaryText: textOf(placePrediction.secondaryText),
      prediction: placePrediction,
    }));
}

export async function resolveCity(value) {
  const prediction = value?.prediction || value?.placePrediction || value;
  const placeId = value?.id || prediction?.placeId;
  if (!prediction?.toPlace || !placeId) throw new TypeError('Choose a city suggestion before resolving it.');
  if (typeof prediction === 'object' && resolvedCityDetails.has(prediction)) {
    return resolvedCityDetails.get(prediction);
  }

  const result = (async () => {
    await loadGoogleMaps({ libraries: ['places'] });
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['location', 'addressComponents'] });
    const location = place.location?.toJSON?.() || place.location;
    const country = place.addressComponents?.find(component => component.types?.includes('country'));
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      throw new Error('The selected city did not include a location.');
    }
    if (!country?.shortText) throw new Error('The selected city did not include a country code.');
    return {
      place_id: placeId,
      country_code: country.shortText.toUpperCase(),
      location: { lat: location.lat, lng: location.lng },
    };
  })();
  if (typeof prediction === 'object') resolvedCityDetails.set(prediction, result);
  try {
    return await result;
  } catch (error) {
    if (typeof prediction === 'object') resolvedCityDetails.delete(prediction);
    throw error;
  }
}

function radians(value) { return value * Math.PI / 180; }

function distanceKm(a, b) {
  const lat1 = Number(a.lat), lng1 = Number(a.lng);
  const lat2 = Number(b.lat), lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function findNearbyAirports(location, airports) {
  if (!location || !Array.isArray(airports)) return [];
  return airports
    .map(airport => ({ ...airport, distanceKm: distanceKm(location, airport) }))
    .filter(airport => airport.distanceKm <= MAX_NEARBY_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.code.localeCompare(b.code))
    .slice(0, NEARBY_LIMIT);
}

export function searchAirports(query, airports) {
  const normalized = String(query || '').trim().toLocaleLowerCase();
  if (!normalized || !Array.isArray(airports)) return [];
  const matches = airports
    .filter(airport => `${airport.code} ${airport.name} ${airport.country}`.toLocaleLowerCase().includes(normalized))
    .sort((a, b) => {
      const rank = airport => airport.code.toLocaleLowerCase() === normalized ? 0
        : airport.code.toLocaleLowerCase().startsWith(normalized) ? 1
          : airport.name.toLocaleLowerCase().startsWith(normalized) ? 2 : 3;
      return rank(a) - rank(b) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code);
    });
  return matches.slice(0, AIRPORT_SEARCH_LIMIT);
}
