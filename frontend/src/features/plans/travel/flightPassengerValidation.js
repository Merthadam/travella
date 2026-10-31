import { countries } from '../../onboarding/catalogs';

const countryCodes = new Set(countries.map(country => country.code));
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function passportMinimum(result) {
  const date = new Date(result.flight.inbound.segments[0].departure_at.slice(0, 10));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function passengerErrors(passengers, contact, result, today = new Date().toISOString().slice(0, 10)) {
  const errors = {};
  const name = (key, value) => {
    if (!value?.trim()) errors[key] = 'Enter a name.';
    else if (value.length > 50 || /[<>\x00-\x1f]/.test(value)) errors[key] = 'Use up to 50 characters without angle brackets or control characters.';
  };
  const departure = result.flight.outbound.segments[0].departure_at.slice(0, 10);
  passengers.forEach((passenger, index) => {
    const prefix = `passenger-${index}-`;
    name(prefix + 'first_name', passenger.first_name);
    name(prefix + 'last_name', passenger.last_name);
    const birth = passenger.date_of_birth;
    const expected = result.passenger_ages?.[index] ?? 30;
    const age = Number(departure.slice(0, 4)) - Number(birth.slice(0, 4)) - (departure.slice(5) < birth.slice(5) ? 1 : 0);
    if (!validDate(birth) || birth > today || age < 0 || age > 120) errors[prefix + 'date_of_birth'] = 'Enter a valid date of birth in the past (age up to 120).';
    else if (expected >= 12 ? age < 12 : age !== expected) errors[prefix + 'date_of_birth'] = expected >= 12
      ? 'This adult fare requires age 12 or older on departure.'
      : `This fare is for age ${expected} on departure. Check the birth date or search again with the correct age.`;
    for (const key of ['nationality', 'document_issue_country']) {
      if (!countryCodes.has(passenger[key])) errors[prefix + key] = 'Choose a country from the list.';
    }
    if (!/^TEST[A-Z0-9]{4,16}$/.test(passenger.document_number)) errors[prefix + 'document_number'] = 'Use TEST followed by 4–16 uppercase letters or digits.';
    if (!validDate(passenger.document_expiry) || passenger.document_expiry < passportMinimum(result)) errors[prefix + 'document_expiry'] = `Passport expiry must be after ${result.flight.inbound.segments[0].departure_at.slice(0, 10)} (the return date).`;
  });
  name('contact-first_name', contact.first_name);
  name('contact-last_name', contact.last_name);
  if (contact.email.length > 120 || !/^[A-Za-z0-9._%+\-]+@example\.(com|test)$/.test(contact.email)) errors['contact-email'] = 'Use an @example.com or @example.test email address.';
  if (!/^[1-9][0-9]{0,2}$/.test(contact.phone_country_code)) errors['contact-phone_country_code'] = 'Enter a country calling code of 1–3 digits, without +.';
  if (!/^[0-9]{6,14}$/.test(contact.phone_number)) errors['contact-phone_number'] = 'Enter 6–14 digits.';
  return errors;
}
