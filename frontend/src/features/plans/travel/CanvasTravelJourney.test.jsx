import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningCanvas } from '../components/PlanningCanvas';
import { plansApi } from '../../../plansApi';
import { AppearanceProvider } from '../../appearance/AppearanceProvider';
import { canvasTravelResultSchema, draftTravelFacts, requestedTravelModes, travelState } from './CanvasTravel';
import { useCanvasConversation } from '../useCanvasConversation';

vi.mock('../components/CanvasDestinationMap', async () => {
  const { createContext } = await import('react');
  return { CanvasMapContext:createContext({}),CanvasDestinationMap:()=> <div>Map boundary</div> };
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});

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
  const turns=fixture.turns || [{message:fixture.message,sse:fixture.sse}]; let turnIndex=0;
  vi.stubGlobal('fetch',vi.fn(async(url,options={})=>{
    requests.push(String(url));
    if(String(url).endsWith('/events/stream')) {
      const body=JSON.parse(options.body);expect(body.canvas_edit.draft.components.essentials.dates).toEqual(fixture.components.essentials.dates);
      return new Response(turns[turnIndex++].sse,{status:200,headers:{'Content-Type':'text/event-stream'}});
    }
    if(String(url).endsWith('/travel/capabilities'))return new Response(JSON.stringify({provider:'LiteAPI',sandbox:true,hotels:true,flights:true}),{status:200});
    throw new Error(`Unexpected network boundary: ${url}`);
  }));
  const api={...plansApi,canvas:vi.fn(async()=>({revision:1,context_revision:1,saved_context_revision:1,snapshot:{components:fixture.components}})),researchContext:vi.fn(async()=>({revision:1,context:{}})),conversationMessages:vi.fn(async()=>[]),saveCanvas:vi.fn(),cancelAgentTurn:vi.fn(async()=>{})};
  const mounted=render(<AppearanceProvider><PlanningCanvas selected={{plan_id:fixture.plan_id,title:'Test stays'}} api={api}/></AppearanceProvider>);
  const user=userEvent.setup();
  await user.click(await screen.findByRole('button',{name:'Edit details',exact:true}));
  await user.type(screen.getByRole('textbox',{name:'Date note'}),'Unfinished editor');
  for (const [index,turn] of turns.entries()) {
    await user.type(screen.getByRole('textbox',{name:'Message Travella'}),turn.message);
    await user.click(screen.getByRole('button',{name:'Send message'}));
    if(index<turns.length-1) {
      await screen.findByText(/What is the guests’ nationality/);
      expect(screen.queryByRole('button',{name:'View all stays'})).toBeNull();
    }
  }
  const resultCount=fixture.count ?? 4, mode=fixture.mode || 'stays';
  if (!resultCount) {
    const empty=await screen.findByRole('heading',{name:'No stays found'});
    expect(screen.queryByRole('button',{name:'View all stays'})).toBeNull();
    expect(within(empty.closest('[role="status"]')).queryAllByRole('article')).toHaveLength(0);
    expect(api.saveCanvas).not.toHaveBeenCalled();
    return;
  }
  const open=await screen.findByRole('button',{name:`View all ${mode}`});
  const previews=screen.getByRole('region',{name:mode==='flights' ? 'Flight previews' : 'Stay previews'});
  expect(within(previews).getAllByRole('article')).toHaveLength(Math.min(3,resultCount));
  expect(previews.textContent).toContain(`Showing ${Math.min(3,resultCount)} of ${resultCount}`);
  expect(previews.textContent).toContain(fixture.search_start || fixture.components.essentials.dates.start);
  if(mode==='stays') {
    expect(previews.textContent).toContain('Breakfast included');
    expect(within(previews).getAllByRole('img')).toHaveLength(Math.min(3,resultCount));
    expect(within(previews).getAllByRole('img')[0].getAttribute('src')).toBe('https://photos.example.com/hotel-0.jpg');
  }
  else {
    expect(within(previews).getAllByRole('img',{name:'Flight illustration'})).toHaveLength(Math.min(3,resultCount));
    expect(previews.textContent).toContain('Return total for the party · 2 adults');
    expect(previews.textContent).toContain(`${fixture.components.essentials.dates.start} 23:30:00+02:00`);
    expect(previews.textContent).toContain('ECONOMY · EUR');
    expect(previews.textContent).toContain(fixture.unknown ? 'Price unavailable' : 'Estimated EUR 824.50');
    expect(previews.textContent).toContain(fixture.unknown ? 'Baggage information unavailable' : '1 checked bag per adult');
    expect(previews.textContent).toContain(fixture.unknown ? 'Cancellation terms unavailable' : 'Non-refundable');
  }
  await user.type(screen.getByRole('textbox',{name:'Message Travella'}),'Keep this unsent message');
  const count=requests.length;
  await user.click(open);
  const results=await screen.findByRole('region',{name:mode==='stays' ? 'Accommodation search' : 'Flight search'});
  await within(results).findByRole('heading',{name:`${mode==='flights' ? 'Observed Air' : 'Observed stay'} ${resultCount-1}`});
  expect(within(results).getAllByRole('article')).toHaveLength(resultCount);
  expect(within(results).getByRole('heading',{name:`${mode==='flights' ? 'Observed Air' : 'Observed stay'} ${resultCount-1}`})).toBeTruthy();
  expect(requests).toHaveLength(count);
  expect(within(results).getByLabelText(mode==='stays' ? 'Check-in' : 'Departure').value).toBe(fixture.search_start || fixture.components.essentials.dates.start);
  expect(within(results).getByLabelText(mode==='stays' ? 'Destination or ski area' : 'From airport').value).toBe(mode==='stays' ? 'Lisbon' : 'BUD');
  expect(results.textContent).not.toContain('PRIVATE_CHECKOUT');
  await user.click(screen.getByRole('button',{name:'← Back to plan chat'}));
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Message Travella'}).value).toBe('Keep this unsent message'));
  expect(screen.getByRole('textbox',{name:'Date note'}).value).toBe('Unfinished editor');
  expect(api.saveCanvas).not.toHaveBeenCalled();
  if(fixture.mixed) {
    const flightOpen=screen.getByRole('button',{name:'View all flights'});
    await user.click(flightOpen);
    const flightsView=await screen.findByRole('region',{name:'Flight search'});
    await within(flightsView).findByRole('heading',{name:'Observed Air 3'});
    expect(within(flightsView).getAllByRole('article')).toHaveLength(4);
    expect(within(flightsView).getByRole('heading',{name:'Observed Air 3'})).toBeTruthy();
    expect(flightsView.textContent).not.toContain('Observed stay');
    expect(flightsView.textContent).toContain('Return total · all travelers');
    expect(requests).toHaveLength(count);
    await user.click(screen.getByRole('button',{name:'← Back to plan chat'}));
    await waitFor(()=>expect(screen.getByRole('textbox',{name:'Message Travella'}).value).toBe('Keep this unsent message'));
  }
  expect(requests.filter(x=>x.endsWith('/events/stream'))).toHaveLength(turns.length);
  expect(requests.some(x=>/checkout|prebook|hotels\/search/.test(x))).toBe(false);
  await act(async()=>{history.forward();});
  await screen.findByRole('region',{name:fixture.mixed || mode==='flights' ? 'Flight search' : 'Accommodation search'});
  await act(async()=>{history.back();});
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Message Travella'}).value).toBe('Keep this unsent message'));
  await user.click(screen.getByRole('button',{name:`View all ${mode}`}));
  expect(Object.keys(history.state).sort()).toEqual(['canvasTravelId','canvasTravelView']);
  mounted.unmount();
  render(<AppearanceProvider><PlanningCanvas selected={{plan_id:fixture.plan_id,title:'Test stays'}} api={api}/></AppearanceProvider>);
  const recovered=await screen.findByRole('region',{name:'Travel result recovery'});
  expect(recovered.textContent).toContain('no longer available');
  expect(within(recovered).queryAllByRole('article')).toHaveLength(0);
  await user.click(screen.getByRole('button',{name:'← Back to plan chat'}));
  await screen.findByRole('textbox',{name:'Message Travella'});
  expect(requests.filter(x=>x.endsWith('/events/stream'))).toHaveLength(turns.length);
});

const hookData=()=>({essentials:{dates:{start:'2027-06-10',end:'2027-06-17',note:'',flexible:false},travelers:2},map:{destination:'Lisbon, Portugal'}});
function snapshot(id='s1',data=hookData()) {
  const now=new Date();
  return {search_id:id,plan_id:'plan-1',generation:1,mode:'stays',criteria:{destination:{city:'Lisbon',country_code:'PT',place_id:null},check_in:'2027-06-10',check_out:'2027-06-17',rooms:[{adults:2,children_ages:[]}],guest_nationality:'HU',currency:'EUR',hotel_id:null},fingerprint:'a'.repeat(64),draft_facts:draftTravelFacts(data),searched_at:now.toISOString(),expires_at:new Date(+now+600000).toISOString(),provider:'LiteAPI',sandbox:true,returned_count:1,truncated:false,notices:[],results:[{id:'stay-1',hotel_id:'hotel-1',image_url:null,stars:null,review_score:null,review_count:null,facilities:[],name:'Observed stay',address:null,price:{amount:'700',currency:'EUR',basis:'stay',estimated:false,excluded_taxes:[]},rooms:[]}],preview_ids:['stay-1'],search_only_dates:false};
}
function deliver(options,s) {options.onEvent({type:'STATE_SNAPSHOT',snapshot:{canvas_edit_result:{suggestions:[],add_ids:[],area:null,travel:[s]}}});}
function hookHarness(editCanvas,data=hookData()) {
  const api={conversationMessages:vi.fn(async()=>[]),editCanvas,cancelAgentTurn:vi.fn(async()=>{})};
  const initialProps={selected:{plan_id:'plan-1'},api,data,blocked:false,onAdd:vi.fn(()=>true)};
  return {...renderHook(props=>useCanvasConversation(props),{initialProps}),api,initialProps};
}

test('cancelled staged snapshot and late terminal never publish, newer run survives',async()=>{
  let release,oldOptions;let first=true;
  const h=hookHarness(vi.fn(async(_s,_d,_m,_id,options)=>{
    if(first){first=false;oldOptions=options;deliver(options,snapshot('old'));return new Promise(resolve=>{release=resolve;});}
    deliver(options,snapshot('new'));return {status:'complete',generation:1};
  }));
  await waitFor(()=>expect(h.result.current.loading).toBe(false));
  let pending;
  act(()=>{pending=h.result.current.send('Find stays');});
  expect(Object.keys(h.result.current.travelSnapshots)).toHaveLength(0);
  await act(async()=>{await h.result.current.stop();});
  expect(oldOptions.signal.aborted).toBe(true);
  await act(async()=>{await h.result.current.send('Find stays again');});
  await act(async()=>{deliver(oldOptions,snapshot('old'));release({status:'complete',generation:1});await pending;});
  expect(Object.keys(h.result.current.travelSnapshots)).toEqual(['new']);
  expect(h.result.current.messages.find(x=>x.status==='stopped').travel).toBeUndefined();
});

test('supersession on request, failures, four-snapshot retention, and Plan switch are honest',async()=>{
  let index=0,fail=false;
  const h=hookHarness(vi.fn(async(_s,_d,_m,_id,o)=>{if(fail)return {status:'error'};deliver(o,snapshot(`s${++index}`));return {status:'complete',generation:1};}));
  await waitFor(()=>expect(h.result.current.loading).toBe(false));
  await act(async()=>{await h.result.current.send('Find stays');});
  const old=h.result.current.travelSnapshots.s1;fail=true;
  await act(async()=>{await h.result.current.send('Find stays again');});
  expect(h.result.current.travelReason(old)).toContain('replaced');fail=false;
  for(let n=0;n<4;n++) await act(async()=>{await h.result.current.send('Find stays');});
  expect(Object.keys(h.result.current.travelSnapshots)).toHaveLength(4);
  expect(h.result.current.travelReason(old)).toContain('no longer available');
  expect(h.result.current.messages.find(x=>x.travel?.[0]?.search_id==='s1').travel[0].results).toBeUndefined();
  h.rerender({...h.initialProps,selected:{plan_id:'plan-2'}});
  await waitFor(()=>expect(Object.keys(h.result.current.travelSnapshots)).toHaveLength(0));
  expect(h.result.current.travelReason(snapshot())).toContain('no longer available');
});

test('search-only dates survive notes, relevant changes invalidate, and expiry rechecks current time',async()=>{
  vi.useFakeTimers();vi.setSystemTime('2026-10-16T12:00:00Z');
  const s=snapshot();s.criteria.check_in='2027-06-11';s.search_only_dates=true;
  const h=hookHarness(vi.fn(async(_s,_d,_m,_id,o)=>{deliver(o,s);return {status:'complete',generation:1};}));
  await act(async()=>{await Promise.resolve();});
  await act(async()=>{await h.result.current.send('Find stays');});
  expect(h.result.current.travelReason(s)).toBe('');
  const notes=hookData();notes.essentials.dates.note='Only a note';h.rerender({...h.initialProps,data:notes});
  expect(h.result.current.travelReason(s)).toBe('');
  const changed=hookData();changed.essentials.travelers=3;h.rerender({...h.initialProps,data:changed});
  expect(h.result.current.travelReason(s)).toContain('changed');
  h.rerender(h.initialProps);
  await act(async()=>{vi.advanceTimersByTime(600001);});
  expect(h.result.current.travelReason(s)).toContain('expired');
  expect(h.api.editCanvas).toHaveBeenCalledTimes(1);
});

test('criteria intents invalidate their mode and unrelated note changes do not',()=>{
  expect(requestedTravelModes('nationality: FR',['stays','flights'])).toEqual(['stays']);
  expect(requestedTravelModes('cabin: BUSINESS',['stays','flights'])).toEqual(['flights']);
  expect(requestedTravelModes('currency: USD',['stays','flights'])).toEqual(['stays','flights']);
  expect(requestedTravelModes('Find a park',['stays','flights'])).toEqual([]);
  const s=snapshot();const data=hookData();data.essentials.dates.start='2027-06-11';
  expect(travelState(s,data)).toContain('changed');
});

test('strict snapshot rejects Unicode byte overflow and historical offers cannot be reconstructed',async()=>{
  const s=snapshot();s.results=Array.from({length:100},(_,i)=>({...s.results[0],id:`s${i}`,name:'旅'.repeat(240),address:'旅'.repeat(240)}));s.returned_count=100;s.preview_ids=['s0','s1','s2'];
  expect(()=>canvasTravelResultSchema.parse({suggestions:[],add_ids:[],area:null,travel:[s]})).toThrow();
  const api={conversationMessages:vi.fn(async()=>[{role:'assistant',content:'Old offers',travel:[snapshot()]}]),cancelAgentTurn:vi.fn(async()=>{})};
  const h=renderHook(()=>useCanvasConversation({selected:{plan_id:'plan-1'},api,data:hookData()}));
  await waitFor(()=>expect(h.result.current.loading).toBe(false));
  expect(h.result.current.messages[0].travel).toBeUndefined();
});
