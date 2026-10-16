import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { plansApi } from '../../../plansApi';
import { PlanConversation } from '../components/PlanConversation';
import { emptyTripContext } from '../components/TripBrief';
import { ResearchFlightPreview } from './ResearchFlightPreview';

const fixture=process.env.TRAVELLA_RESEARCH_SSE_FIXTURE ? JSON.parse(readFileSync(process.env.TRAVELLA_RESEARCH_SSE_FIXTURE,'utf8')) : null;
const api=()=>({...plansApi,conversationMessages:vi.fn(async()=>[]),researchContext:vi.fn(async()=>({revision:1,context:emptyTripContext(),locked:false,a2ui_messages:[]})),cancelAgentTurn:vi.fn(async()=>({cancelled:true}))});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});

test.skipIf(!fixture)('real Research SSE renders three A2UI cards with details and no navigation',async()=>{
  const requests=[]; const fetch=vi.fn(async(url,options)=>{requests.push(String(url));expect(JSON.parse(options.body).canvas_edit).toBeUndefined();return new Response(fixture.sse,{status:200});});
  vi.stubGlobal('fetch',fetch);
  const mounted=render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={api()} onExpired={vi.fn()}/>);
  const user=userEvent.setup();
  await user.type(await screen.findByRole('textbox',{name:'Message Travella'}),fixture.message+'{enter}');
  const previews=await screen.findByRole('region',{name:'Flight previews'});
  expect(within(previews).getAllByRole('article')).toHaveLength(3);
  expect(within(previews).getAllByRole('img',{name:'Flight illustration'})).toHaveLength(3);
  expect(previews.textContent).toContain('3 adults');
  expect(previews.textContent).toContain('Sandbox · test inventory');
  expect(within(previews).queryAllByRole('button')).toHaveLength(0);
  expect(within(previews).queryAllByRole('link')).toHaveLength(0);
  await user.click(within(previews).getAllByText('Flight and fare details')[0]);
  expect(previews.querySelector('details').open).toBe(true);
  expect(requests).toHaveLength(1);
  mounted.unmount();
  render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={api()} onExpired={vi.fn()}/>);
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
});

for(const status of ['stopped','interrupted','error']) test.skipIf(!fixture)(`${status} terminal discards staged flights`,async()=>{
  const a=api();a.agentTurnStream=vi.fn(async(_p,_m,_id,{onEvent})=>{onEvent({type:'STATE_SNAPSHOT',snapshot:{flight_preview:fixture.snapshot}});return {status,generation:fixture.snapshot.generation};});
  render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={a} onExpired={vi.fn()}/>);
  await userEvent.setup().type(await screen.findByRole('textbox',{name:'Message Travella'}),'show flights{enter}');
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Message Travella'}).disabled).toBe(false));
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
});

for(const change of [{plan_id:'another-plan'},{generation:999},{checkout_token:'PRIVATE'}]) test.skipIf(!fixture)('rejects mismatched or forbidden result fields '+Object.keys(change)[0],async()=>{
  const a=api();a.agentTurnStream=vi.fn(async(_p,_m,_id,{onEvent})=>{onEvent({type:'STATE_SNAPSHOT',snapshot:{flight_preview:{...fixture.snapshot,...change}}});return {status:'complete',generation:fixture.snapshot.generation};});
  render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={a} onExpired={vi.fn()}/>);
  await userEvent.setup().type(await screen.findByRole('textbox',{name:'Message Travella'}),'show flights{enter}');
  await screen.findByText('Interrupted');
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
});

test.skipIf(!fixture)('Stop rejects a late successful snapshot even if transport finishes',async()=>{
  const a=api();let emit,finish;
  a.agentTurnStream=vi.fn((_p,_m,_id,{onEvent})=>new Promise(resolve=>{emit=onEvent;finish=resolve;}));
  render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={a} onExpired={vi.fn()}/>);
  const user=userEvent.setup();await user.type(await screen.findByRole('textbox',{name:'Message Travella'}),'show flights{enter}');
  await user.click(screen.getByRole('button',{name:'Stop'}));
  await act(async()=>{emit({type:'STATE_SNAPSHOT',snapshot:{flight_preview:fixture.snapshot}});finish({status:'complete',generation:fixture.snapshot.generation});});
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
  expect(screen.getByText('Stopped')).toBeTruthy();
});

test.skipIf(!fixture)('expired preview hides inventory and has no navigation',()=>{
  const snapshot={...fixture.snapshot,searched_at:new Date(Date.now()-1200000).toISOString(),expires_at:new Date(Date.now()-1).toISOString()};
  render(<ResearchFlightPreview snapshot={snapshot}/>);
  expect(screen.getByRole('status').textContent).toContain('expired');
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
});

test.skipIf(!fixture)('Plan switch cancels the old request and rejects its late preview',async()=>{
  const a=api();let emit,finish;
  a.agentTurnStream=vi.fn((_p,_m,_id,{onEvent})=>new Promise(resolve=>{emit=onEvent;finish=resolve;}));
  const mounted=render(<PlanConversation selected={{plan_id:fixture.plan_id}} api={a} onExpired={vi.fn()}/>);
  await userEvent.setup().type(await screen.findByRole('textbox',{name:'Message Travella'}),'show flights{enter}');
  mounted.rerender(<PlanConversation selected={{plan_id:'new-plan'}} api={a} onExpired={vi.fn()}/>);
  await waitFor(()=>expect(a.cancelAgentTurn).toHaveBeenCalledOnce());
  expect(a.cancelAgentTurn.mock.calls[0][0]).toEqual({plan_id:fixture.plan_id});
  await act(async()=>{emit({type:'STATE_SNAPSHOT',snapshot:{flight_preview:fixture.snapshot}});finish({status:'complete',generation:fixture.snapshot.generation});});
  expect(screen.queryByRole('region',{name:'Flight previews'})).toBeNull();
});

test.skipIf(!fixture)('empty provider result shows an honest empty state without actions',async()=>{
  render(<ResearchFlightPreview snapshot={{...fixture.snapshot,results:[],preview_ids:[],returned_count:0}}/>);
  expect(await screen.findByRole('heading',{name:'No flights found'})).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Research chat');
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryAllByRole('article')).toHaveLength(0);
});
