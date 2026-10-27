import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { readCanvasView, writeCanvasView, clearCanvasViews, forgetCanvasView, validViewport } from './canvasViewState';
import * as recovery from './canvasViewState';
import { initialWorkspace } from './travel/useTravelWorkspace';
beforeEach(()=>{sessionStorage.clear();clearCanvasViews();});
afterEach(()=>vi.restoreAllMocks());
test('travel recovery stores only bounded typed references under a verified opaque session scope', () => {
  expect(typeof recovery.bindTravelRecoveryScope).toBe('function');
  const scope = 'a'.repeat(32);
  recovery.bindTravelRecoveryScope(scope);
  const state = initialWorkspace({ planId: 'one', topic: 'stays' });
  recovery.writeTravelWorkspace(scope, 'one', 'stays', { ...state, snapshot: { secret: 'RAW-INVENTORY' }, inverse: { secret: 'PRIVATE-HANDLE' }, authority: { token: 'TOKEN' } });
  const stored = Object.values(sessionStorage).join('');
  expect(stored).not.toMatch(/RAW-INVENTORY|PRIVATE-HANDLE|TOKEN|snapshot|inverse|authority/);
  expect(recovery.readTravelWorkspace(scope, 'one', 'stays').draftCriteria).toEqual(state.draftCriteria);
  expect(recovery.readTravelWorkspace(scope, 'one', 'flights')).toBeNull();
  expect(recovery.readTravelWorkspace('b'.repeat(32), 'one', 'stays')).toBeNull();
  forgetCanvasView('one'); expect(recovery.readTravelWorkspace(scope, 'one', 'stays')).toBeNull();
  recovery.writeTravelWorkspace(scope, 'one', 'stays', state);
  recovery.bindTravelRecoveryScope('b'.repeat(32));
  expect(recovery.readTravelWorkspace(scope, 'one', 'stays')).toBeNull();
  expect(Object.values(sessionStorage).join('')).not.toContain('"draftCriteria"');
});
test('keeps view settings isolated per plan and supports deletion and sign-out cleanup',()=>{
  writeCanvasView('one',{canvas:true,filter:'food'});writeCanvasView('two',{chatOpen:false});
  expect(readCanvasView('two')).toEqual({chatOpen:false});
  forgetCanvasView('one');expect(readCanvasView('one')).toEqual({});
  clearCanvasViews();expect(readCanvasView('two')).toEqual({});
});
test('malformed and unavailable storage do not prevent editing a plan',()=>{
  sessionStorage.setItem('travella.canvas-view.v1:bad','{');expect(readCanvasView('bad')).toEqual({});
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
  writeCanvasView('one',{chatOpen:false});expect(readCanvasView('one')).toEqual({chatOpen:false});
  expect(validViewport({center:{lat:100,lng:10},zoom:4})).toBe(false);
  expect(validViewport({center:{lat:40,lng:10},zoom:14})).toBe(true);
});
