import { requestId } from '../../plansApi';

export function flightNeedConfirmed(context) {
  return ['needed', 'not-needed'].includes(context?.flights)
    && ['user_explicit', 'user_edit'].includes(context?.provenance?.flights?.source);
}

export async function confirmFlightNeed(api, plan, reviewed, flights) {
  if (!['needed', 'not-needed'].includes(flights)) throw new Error('Choose whether you need flights.');
  if (flightNeedConfirmed(reviewed.context) && reviewed.context.flights === flights) return reviewed;
  const confirmed = await api.updateResearchContext(plan, [
    { operation: 'set', field: 'flights', value: flights, source: 'user_edit', source_quote: '' },
  ], reviewed.revision, requestId());
  if (!Number.isInteger(confirmed?.revision) || confirmed.locked || !flightNeedConfirmed(confirmed.context) || confirmed.context.flights !== flights) {
    throw new Error('Your flight choice could not be confirmed. Review your trip details and try again.');
  }
  return confirmed;
}
