import countriesData from '../../../../services/shared/travel_reference/countries.json';
import interestsData from '../../../../services/shared/travel_reference/interests.json';

export const countries = countriesData;
export const interests = interestsData;

let airportsPromise;

export async function loadAirports() {
  if (!airportsPromise) {
    airportsPromise = import('../../../../services/shared/travel_reference/airports.json')
      .then(module => module.default)
      .catch(error => {
        airportsPromise = undefined;
        throw error;
      });
  }
  return airportsPromise;
}
