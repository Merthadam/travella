import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlansApp } from './PlansApp';
vi.mock('./features/plans/components/PlanningCanvas', () => ({ PlanningCanvas: () => <h1>Saved canvas workspace</h1> }));
vi.mock('./features/plans/components/PlanConversation', () => ({ PlanConversation: ({ onCanvas }) => <button onClick={() => onCanvas(false)}>Enter canvas</button> }));
const id = '9f2d2f35-186c-4d57-a2fa-e5a7820f3783';
const plan = { plan_id:id,title:'Resume test',lifecycle:'active',revision:1,resume_target:'conversation' };
const api = { list:async()=>({plans:[plan]}),get:async()=>plan,activity:async()=>plan };
beforeEach(()=>{sessionStorage.clear();history.replaceState({},'',`/plans/${id}`);});
afterEach(cleanup);
test('reopening an entered canvas does not return to research even before its first save',async()=>{
  const user=userEvent.setup();const props={api,onAccount:vi.fn(),onExpired:vi.fn(),onSignOut:vi.fn()};
  const first=render(<PlansApp {...props}/>);
  await user.click(await screen.findByRole('button',{name:'Enter canvas'}));
  expect(screen.getByRole('heading',{name:'Saved canvas workspace'})).toBeTruthy();
  first.unmount();render(<PlansApp {...props}/>);
  expect(await screen.findByRole('heading',{name:'Saved canvas workspace'})).toBeTruthy();
});

test('account suspension keeps the mounted canvas instead of falling back to research',async()=>{
  const user=userEvent.setup();const onAccount=vi.fn();const props={api,onAccount,onExpired:vi.fn(),onSignOut:vi.fn()};
  const view=render(<PlansApp {...props}/>);
  await user.click(await screen.findByRole('button',{name:'Enter canvas'}));
  await user.click(screen.getByRole('button',{name:'Open plans navigation'}));
  await user.click(screen.getByRole('button',{name:'Account menu'}));
  await user.click(screen.getByRole('menuitem',{name:'Account settings'}));
  expect(onAccount).toHaveBeenCalledOnce();
  view.rerender(<PlansApp {...props} inactive/>);
  view.rerender(<PlansApp {...props} inactive={false}/>);
  expect(screen.getByRole('heading',{name:'Saved canvas workspace'})).toBeTruthy();
});
