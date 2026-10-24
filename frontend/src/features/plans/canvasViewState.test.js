import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { readCanvasView, writeCanvasView, clearCanvasViews, forgetCanvasView, validViewport } from './canvasViewState';
beforeEach(()=>{sessionStorage.clear();clearCanvasViews();});
afterEach(()=>vi.restoreAllMocks());
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
