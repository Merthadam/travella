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

// Home address details stay in the confirmed profile; geometry is UI-only.
export async function searchAddresses(input, session) {
  const query = String(input || '').trim();
  if (query.length < 3) return [];
  const requestId = ++session.latestRequest;
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  if (requestId !== session.latestRequest) return [];
  const { AutocompleteSessionToken, AutocompleteSuggestion } = libraries.places;
  session.token ||= new AutocompleteSessionToken();
  const { suggestions = [] } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query, sessionToken: session.token,
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
  });
  if (requestId !== session.latestRequest) return [];
  return suggestions.filter(item => item?.placePrediction?.placeId).map(({ placePrediction }) => ({
    id: placePrediction.placeId,
    mainText: textOf(placePrediction.mainText) || textOf(placePrediction.text),
    secondaryText: textOf(placePrediction.secondaryText),
    prediction: placePrediction,
  }));
}

function plainLocation(value) {
  const point = value?.toJSON?.() || value;
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    throw new Error('This place does not include a usable map location.');
  }
  return { lat: point.lat, lng: point.lng };
}

export async function resolveAddress(suggestion) {
  const prediction = suggestion?.prediction || suggestion?.placePrediction || suggestion;
  if (!prediction?.toPlace) throw new Error('Choose an address suggestion.');
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents'] });
  const components = place.addressComponents || [];
  const component = type => components.find(item => item.types?.includes(type));
  const city = ['locality', 'postal_town']
    .map(type => component(type)?.longText).find(Boolean);
  const country = component('country')?.shortText;
  if (!city || !country || !place.formattedAddress) {
    throw new Error('This address needs a city and country. You can enter it manually.');
  }
  return {
    home_city: { name: city, country_code: country.toUpperCase(), place_id: place.id || suggestion.id,
      source: 'google', address: place.formattedAddress },
    location: plainLocation(place.location),
  };
}

export async function restoreHomeLocation(home) {
  if (home?.place_id) {
    const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
    const place = new libraries.places.Place({ id: home.place_id });
    await place.fetchFields({ fields: ['location'] });
    return plainLocation(place.location);
  }
  if (!home?.address) return null;
  const { libraries } = await loadGoogleMaps({ libraries: ['geocoding'] });
  const { results } = await new libraries.geocoding.Geocoder().geocode({
    address: home.address, componentRestrictions: { country: home.country_code },
  });
  if (!results?.length) throw new Error('The saved address could not be placed on the map.');
  return plainLocation(results[0].geometry.location);
}

function matchedAirport(place, catalog) {
  let location;
  try { location = plainLocation(place.location); } catch { return null; }
  const name = textOf(place.displayName);
  const country = place.addressComponents?.find(item => item.types?.includes('country'))?.shortText;
  if (!country) return null;
  const nearby = catalog.map(airport => ({ airport, distance: distanceKm(location, airport) }))
    .filter(item => item.distance <= 5 && item.airport.country === country).sort((a, b) => a.distance - b.distance);
  if (!nearby.length) return null;
  // Never synthesize an IATA code from a provider label. Only accept a known
  // airport when its explicit code or an unambiguous nearby location matches.
  const coded = nearby.filter(({ airport }) => new RegExp(`\\b${airport.code}\\b`, 'i').test(name));
  if (coded.length === 1) return coded[0].airport;
  const tokens = value => new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z]+/).filter(token => token.length > 3 && !['airport', 'international', 'regional', 'municipal'].includes(token)));
  const providerTokens = tokens(name);
  const named = nearby.filter(({ airport }) => [...tokens(airport.name)].some(token => providerTokens.has(token)));
  return named.length === 1 ? named[0].airport : null;
}

function airportResults(places, location, catalog) {
  const matched = new Map();
  for (const place of places || []) {
    const airport = matchedAirport(place, catalog);
    if (airport && !matched.has(airport.code)) matched.set(airport.code, {
      ...airport, distanceKm: location ? distanceKm(location, airport) : undefined, source: 'google',
    });
  }
  return [...matched.values()].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

export async function findGoogleAirports(location, catalog) {
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  const { places = [] } = await libraries.places.Place.searchNearby({
    fields: ['displayName', 'location', 'addressComponents'],
    locationRestriction: { center: location, radius: 50000 },
    includedPrimaryTypes: ['airport', 'international_airport'], maxResultCount: 20,
    rankPreference: libraries.places.SearchNearbyRankPreference.POPULARITY,
  });
  return airportResults(places, location, catalog).slice(0, 5);
}

export async function searchGoogleAirports(query, location, catalog) {
  const text = String(query || '').trim();
  if (text.length < 2) return [];
  // Expand known codes to their actual airport name for more reliable provider search.
  const known = catalog.find(airport => airport.code === text.toUpperCase());
  const { libraries } = await loadGoogleMaps({ libraries: ['places'] });
  const { places = [] } = await libraries.places.Place.searchByText({
    textQuery: known ? known.name : text,
    fields: ['displayName', 'location', 'addressComponents'], includedType: 'airport', useStrictTypeFiltering: true,
    ...(location ? { locationBias: { center: location, radius: 50000 } } : {}),
    maxResultCount: 8,
  });
  return airportResults(places, location, catalog);
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
