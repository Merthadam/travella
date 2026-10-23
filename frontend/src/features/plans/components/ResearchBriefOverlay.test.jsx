import React, { useRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResearchBriefOverlay } from './ResearchBriefOverlay';
import { emptyTripContext } from './TripBrief';
import { ResearchProgress } from './ResearchProgress';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function Workspace() {
  const workspace = useRef(null), composer = useRef(null);
  return <main ref={workspace}><ResearchProgress /><p>Conversation stays here</p><form ref={composer}><input aria-label="Message" /></form>
    <ResearchBriefOverlay context={emptyTripContext()} workspaceRef={workspace} composerRef={composer}><input aria-label="Brief edit" defaultValue="Lisbon" /></ResearchBriefOverlay>
  </main>;
}

test('portals the brief outside conversation, retains editor state on close, and restores focus', async () => {
  const user = userEvent.setup(); const { container } = render(<Workspace/>);
  const trigger = screen.getByRole('button', { name: /^Trip brief,/ });
  const original = container.innerHTML;
  await user.click(trigger);
  expect(container.innerHTML).toBe(original);
  expect(container.querySelector('.research-brief-panel')).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Brief edit' }), ' waterfront');
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(trigger);
  expect(screen.queryByRole('textbox', { name: 'Brief edit' })).toBeNull();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('textbox', { name: 'Brief edit' }).value).toBe('Lisbon waterfront');
});

test('default position docks at the progress bar and keyboard movement clamps after a viewport resize', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.classList.contains('research-brief-anchor')) return { left: 932, top: 96, right: 984, bottom: 148 };
    return this.tagName === 'FORM' ? { left: 0, right: 1024, top: 650, bottom: 768 } : { left: 0, right: 1024, top: 80, bottom: 768 };
  });
  render(<Workspace/>);
  const trigger = screen.getByRole('button', { name: /^Trip brief,/ });
  expect(parseInt(trigger.style.left)).toBe(932);
  expect(parseInt(trigger.style.top)).toBe(96);
  fireEvent.keyDown(trigger, { key: 'ArrowLeft' });
  expect(parseInt(trigger.style.left)).toBe(920);
  vi.stubGlobal('innerWidth', 400); vi.stubGlobal('innerHeight', 400);
  fireEvent(window, new Event('resize'));
  expect(parseInt(trigger.style.left) + 52).toBeLessThanOrEqual(384);
  expect(parseInt(trigger.style.top) + 52).toBeLessThanOrEqual(384);
});

test('a drag never clicks open and arrow movement does not activate the brief', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(<Workspace/>);
  const trigger = screen.getByRole('button', { name: /^Trip brief,/ });
  const originalX = parseInt(trigger.style.left);
  fireEvent.pointerDown(trigger, { button: 0, clientX: originalX + 26, clientY: 42 });
  fireEvent.pointerMove(trigger, { clientX: originalX + 206, clientY: 242 });
  fireEvent.pointerUp(trigger, { clientX: originalX + 206, clientY: 242 });
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(parseInt(trigger.style.left)).toBe(originalX + 180);
  fireEvent.keyDown(trigger, { key: 'ArrowUp' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
});
