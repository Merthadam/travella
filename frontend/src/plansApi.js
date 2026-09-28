import { request } from './api';

export const requestId = () => `${Date.now()}.${crypto.randomUUID()}`;
export function normalizeTitle(value) {
  const title = value.normalize('NFC').trim();
  const count = [...title].length;
  const error = !count ? 'Enter a plan name.' : count > 120 ? 'Use 120 characters or fewer.' : /\p{Cc}/u.test(title) ? 'Remove unsupported control characters.' : '';
  return { title, count, error };
}
const path = id => `/v1/plans/${encodeURIComponent(id)}`;
export const plansApi = {
  list: (view = 'active', cursor) => request(`/v1/plans?${new URLSearchParams({ view, ...(cursor ? { cursor } : {}) })}`),
  get: (id, view = 'active') => request(`${path(id)}?view=${view}`),
  create: id => request('/v1/plans', {}, { headers: { 'Idempotency-Key': id } }),
  activity: (plan, id) => request(`${path(plan.plan_id)}/activity`, {}, { headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision) } }),
  destinations: plan => request(`${path(plan.plan_id)}/destinations`),
  brief: plan => request(`${path(plan.plan_id)}/brief`),
  updateBrief: (plan, brief, id) => request(`${path(plan.plan_id)}/brief`, brief, { method: 'PATCH', headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision) } }),
  addDestination: (plan, destination, id) => request(`${path(plan.plan_id)}/destinations`, destination, { headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision) } }),
  removeDestination: (plan, destinationId, id) => request(`${path(plan.plan_id)}/destinations/${encodeURIComponent(destinationId)}`, {}, { method: 'DELETE', headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision) } }),
  prepare: (plan, operation, title) => request(`${path(plan.plan_id)}/challenges`, { operation, ...(operation === 'rename' ? { title } : {}) }, { headers: { 'Idempotency-Key': requestId(), 'If-Match': String(plan.revision) } }),
  commit: ({ plan, operation, title, challenge, id }) => request(`${path(plan.plan_id)}${operation === 'rename' ? '/title' : operation === 'restore' ? '/restore' : ''}`, operation === 'rename' ? { title } : {}, { method: operation === 'rename' ? 'PATCH' : operation === 'delete' ? 'DELETE' : 'POST', headers: { 'Idempotency-Key': id, 'If-Match': String(plan.revision), 'X-Plan-Challenge': challenge } }),
};
