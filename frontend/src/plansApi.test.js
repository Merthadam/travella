import { afterEach, expect, test, vi } from 'vitest';
import { plansApi } from './plansApi';

afterEach(() => vi.unstubAllGlobals());

test('agent turn uses the same-origin session and never sends a browser bearer token', async () => {
  const plan = { plan_id: '00000000-0000-0000-0000-000000000123' };
  const event = { status: 'needs your input', plan_id: plan.plan_id, event_id: 'event-1' };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(event), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);

  const result = await plansApi.agentTurn(plan, 'A calm coastal trip', 'event-1');

  expect(result).toEqual(event);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(`/v1/agent/plans/${plan.plan_id}/events`);
  expect(options).toMatchObject({ method: 'POST', credentials: 'same-origin', cache: 'no-store' });
  expect(options.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-Travella-Request': '1' });
  expect(options.headers.Authorization).toBeUndefined();
  expect(JSON.parse(options.body)).toEqual({ plan_id: plan.plan_id, event_id: 'event-1', message: 'A calm coastal trip' });
});
