import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { tripBriefProgress } from './TripBrief';

const SIZE = 52;
const MARGIN = 16;
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
const viewport = () => ({ width: window.visualViewport?.width || window.innerWidth, height: window.visualViewport?.height || window.innerHeight });

// Coordinates belong only to this mounted Plan. Neither drag nor toggle edits its data.
export function ResearchBriefOverlay({ context, workspaceRef, composerRef, children, readiness = 'Confirm a destination to create your draft. Other trip details can stay undecided.', actions }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [bounds, setBounds] = useState(viewport);
  const moved = useRef(false);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const trigger = useRef(null);
  const panel = useRef(null);
  const id = useId();
  const progress = tripBriefProgress(context);

  useLayoutEffect(() => {
    function place() {
      const next = viewport();
      setBounds(next);
      setPosition(current => {
        if (moved.current && current) return { x: clamp(current.x, MARGIN, next.width - SIZE - MARGIN), y: clamp(current.y, MARGIN, next.height - SIZE - MARGIN) };
        const workspace = workspaceRef?.current?.getBoundingClientRect();
        const anchor = workspaceRef?.current?.querySelector('.research-brief-anchor')?.getBoundingClientRect();
        // Dock beside the stages until the traveler chooses a position.
        return {
          x: clamp(anchor?.left ?? (workspace?.right || next.width) - SIZE - MARGIN, MARGIN, next.width - SIZE - MARGIN),
          y: clamp(anchor?.top ?? (workspace?.top || 0) + MARGIN, MARGIN, next.height - SIZE - MARGIN),
        };
      });
    }
    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (workspaceRef?.current) observer?.observe(workspaceRef.current);
    const anchor = workspaceRef?.current?.querySelector('.research-brief-anchor');
    if (anchor) observer?.observe(anchor);
    if (composerRef?.current) observer?.observe(composerRef.current);
    const transcript = workspaceRef?.current?.querySelector('.chat-transcript');
    if (transcript) observer?.observe(transcript);
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    return () => { observer?.disconnect(); window.removeEventListener('resize', place); window.visualViewport?.removeEventListener('resize', place); };
  }, [workspaceRef, composerRef]);

  function close() { setOpen(false); trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    function escape(event) {
      // A modal review owns Escape while it is open.
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); close(); }
    }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const point = position || { x: MARGIN, y: MARGIN };
  const panelWidth = Math.min(340, bounds.width - MARGIN * 2);
  const above = point.y > bounds.height / 2;
  const panelHeight = Math.min(560, above ? point.y - MARGIN - 10 : bounds.height - point.y - SIZE - MARGIN - 10);
  return createPortal(<div className="research-brief-layer">
    <button ref={trigger} type="button" className="research-brief-trigger" style={{ left: point.x, top: point.y, '--brief-progress': `${progress.percentage}%` }}
      aria-label={`Trip brief, ${progress.count} of ${progress.total} details complete`} aria-expanded={open} aria-controls={`${id}-panel`} aria-describedby={`${id}-help`}
      title="Trip brief · Drag or use arrow keys to move" onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(value => !value); }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        suppressClick.current = false;
        drag.current = { x: event.clientX, y: event.clientY, start: point, pointerId: event.pointerId, dragging: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }} onPointerMove={event => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.x, dy = event.clientY - current.y;
        if (!current.dragging && Math.hypot(dx, dy) < 5) return;
        current.dragging = true; moved.current = true; suppressClick.current = true;
        setPosition({ x: clamp(current.start.x + dx, MARGIN, bounds.width - SIZE - MARGIN), y: clamp(current.start.y + dy, MARGIN, bounds.height - SIZE - MARGIN) });
      }} onPointerUp={event => { if (drag.current?.pointerId !== event.pointerId) return; drag.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
      onKeyDown={event => {
        const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!delta) { suppressClick.current = false; return; }
        event.preventDefault(); moved.current = true;
        const step = event.shiftKey ? 40 : 12;
        setPosition({ x: clamp(point.x + delta[0] * step, MARGIN, bounds.width - SIZE - MARGIN), y: clamp(point.y + delta[1] * step, MARGIN, bounds.height - SIZE - MARGIN) });
      }}><span>{progress.count}/{progress.total}</span></button>
    {!open && <span className="research-brief-discovery" aria-hidden="true" style={{ left: clamp(point.x + SIZE - 220, MARGIN, bounds.width - 220 - MARGIN), top: point.y > 72 ? point.y - 46 : point.y + SIZE + 10 }}>Trip brief · Drag or use arrow keys to move</span>}
    <span className="sr-only" id={`${id}-help`}>{readiness} Press Enter or Space to open. Use arrow keys to move the brief; Shift moves farther. Escape closes it.</span>
    <section ref={panel} id={`${id}-panel`} hidden={!open} className="research-brief-panel" aria-label="Trip brief details" style={{ left: clamp(point.x + SIZE - panelWidth, MARGIN, bounds.width - panelWidth - MARGIN), width: panelWidth, maxHeight: Math.max(120, panelHeight), ...(above ? { bottom: bounds.height - point.y + 10 } : { top: point.y + SIZE + 10 }) }}>
      <header className="research-brief-heading"><h2>Trip brief</h2><button type="button" onClick={close} aria-label="Close trip brief">×</button></header>
      <p className="research-brief-readiness" role="status">{readiness}</p>
      {children}
      {actions && <div className="research-brief-actions">{actions}</div>}
    </section>
  </div>, document.body);
}
