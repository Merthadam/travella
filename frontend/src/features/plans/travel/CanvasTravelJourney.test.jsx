import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningCanvas } from '../components/PlanningCanvas';
import { plansApi } from '../../../plansApi';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';
import { canvasTravelResultSchema } from './CanvasTravel';

vi.mock('../components/CanvasDestinationMap', async () => {
  const { createContext } = await import('react');
  return { CanvasMapContext:createContext({}),CanvasDestinationMap:()=> <div>Map boundary</div> };
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

test('legacy activities parse and unknown top-level fields fail closed',()=>{
  expect(canvasTravelResultSchema.parse({suggestions:[],add_ids:[],area:null}).travel).toEqual([]);
  expect(()=>canvasTravelResultSchema.parse({suggestions:[],add_ids:[],area:null,checkout_token:'bad'})).toThrow();
});

test.skipIf(!process.env.TRAVELLA_CANVAS_SSE_FIXTURE)('actual Python SSE crosses real parser, Canvas and A2UI into matching results without refetch',async()=>{
  const fixture=JSON.parse(readFileSync(process.env.TRAVELLA_CANVAS_SSE_FIXTURE,'utf8'));
  history.replaceState({},'',`/plans/${fixture.plan_id}`);
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  HTMLDialogElement.prototype.close=function(){this.open=false;};
  const requests=[];
  vi.stubGlobal('fetch',vi.fn(async(url,options={})=>{
    requests.push(String(url));
    if(String(url).endsWith('/events/stream')) {
      const body=JSON.parse(options.body);expect(body.canvas_edit.draft.components.essentials.dates).toEqual(fixture.components.essentials.dates);
      return new Response(fixture.sse,{status:200,headers:{'Content-Type':'text/event-stream'}});
    }
    if(String(url).endsWith('/travel/capabilities'))return new Response(JSON.stringify({provider:'LiteAPI',sandbox:true,hotels:true,flights:true}),{status:200});
    throw new Error(`Unexpected network boundary: ${url}`);
  }));
  const api={...plansApi,canvas:vi.fn(async()=>({revision:1,context_revision:1,saved_context_revision:1,snapshot:{components:fixture.components}})),researchContext:vi.fn(async()=>({revision:1,context:{}})),conversationMessages:vi.fn(async()=>[]),saveCanvas:vi.fn(),cancelAgentTurn:vi.fn(async()=>{})};
  render(<AppearanceProvider><PlanningCanvas selected={{plan_id:fixture.plan_id,title:'Test stays'}} api={api}/></AppearanceProvider>);
  const user=userEvent.setup();
  await user.click(await screen.findByRole('button',{name:'Edit details',exact:true}));
  await user.type(screen.getByRole('textbox',{name:'Date note'}),'Unfinished editor');
  await user.type(screen.getByRole('textbox',{name:'Message Travella'}),fixture.message);
  await user.click(screen.getByRole('button',{name:'Send message'}));
  const open=await screen.findByRole('button',{name:'View all stays'});
  const previews=screen.getByRole('region',{name:'Stay previews'});
  expect(within(previews).getAllByRole('article')).toHaveLength(3);
  expect(previews.textContent).toContain(fixture.components.essentials.dates.start);
  expect(previews.textContent).toContain('Breakfast included');
  await user.type(screen.getByRole('textbox',{name:'Message Travella'}),'Keep this unsent message');
  const count=requests.length;
  await user.click(open);
  const results=screen.getByRole('region',{name:'Travel results only'});
  expect(within(results).getAllByRole('article')).toHaveLength(4);
  expect(within(results).getByText('Observed stay 3')).toBeTruthy();
  expect(requests).toHaveLength(count);
  expect(results.textContent).toContain('Nothing has been saved or booked');
  expect(results.textContent).not.toContain('PRIVATE_CHECKOUT');
  await user.click(within(results).getByRole('button',{name:'← Back to plan chat'}));
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Message Travella'}).value).toBe('Keep this unsent message'));
  expect(screen.getByRole('textbox',{name:'Date note'}).value).toBe('Unfinished editor');
  expect(api.saveCanvas).not.toHaveBeenCalled();
  expect(requests.filter(x=>x.endsWith('/events/stream'))).toHaveLength(1);
  expect(requests.some(x=>/checkout|prebook|hotels\/search/.test(x))).toBe(false);
});
