import { countries } from '../../onboarding/catalogs';
// Suggestions only: these values never write a Plan or traveler profile.
const normalized = value => String(value || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
export const allAirports = airport => /\ball airports\b/i.test(airport?.name || '');
export const airportSelection = airport => ({ iata: airport.iata, label: `${airport.city || airport.name}${allAirports(airport) ? ' · All airports' : ''} (${airport.iata})` });

export function preferredAirport(airports, city, country, preferredCode) {
  const [name, ...qualifiers] = String(city || '').split(',').map(part => part.trim());
  const qualifier = normalized(qualifiers.at(-1));
  country ||= countries.find(item => normalized(item.name) === qualifier || normalized(item.code) === qualifier)?.code;
  const query = normalized(name);
  const matches = airports.filter(a => /^[A-Z]{3}$/.test(a.iata) && (!country || a.country_code === country) && (normalized(a.city) === query || normalized(a.iata) === query));
  // Do not silently pick between identically named cities in different countries.
  if (new Set(matches.map(a => a.country_code)).size > 1) return null;
  const metro = matches.filter(allAirports);
  const preferred = matches.find(a => a.iata === preferredCode);
  const choice = metro.length === 1 ? metro[0] : preferred || (matches.length === 1 ? matches[0] : null);
  return choice ? airportSelection(choice) : null;
}

export function profileTravelDefaults(profile, topic) {
  const country = profile?.home_city?.country_code || '';
  return {
    ...(topic === 'flights' && country ? { country } : {}),
    nationality: profile?.citizenships?.[0] || country,
  };
}
