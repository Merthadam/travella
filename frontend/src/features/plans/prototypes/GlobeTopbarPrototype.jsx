// THROWAWAY: three top loading indicators alongside the selected B globe.
// Progress is indeterminate; only completed-item counts come from simulated events.
import React from 'react';
import './globe-topbar-prototype.css';

export const topbarVariants = { A: 'Thin line', B: 'Status strip', C: 'Research → Canvas' };

function Rail({ status }) {
  return <div className={`gt-rail gt-rail-${status}`} role={status === 'generating' ? 'progressbar' : undefined} aria-label={status === 'generating' ? 'Building your Lisbon plan' : undefined}><span /></div>;
}

export function GlobeTopbarPrototype({ variant, status, count, phase = 'research' }) {
  const active = status === 'generating';
  const done = status === 'complete';
  const label = active ? 'Building your Lisbon plan' : done ? 'Your Lisbon canvas is ready' : status === 'error' ? 'Generation paused — please retry' : 'Generation cancelled';
  if (variant === 'A') return <div className={`gt-topbar gt-thin gt-${status}`} aria-label="Top loading indicator"><Rail status={status} /><span className="sr-only" role="status">{label}</span></div>;
  if (variant === 'B') return <div className={`gt-topbar gt-strip gt-${status}`} aria-label="Top loading indicator"><div className="gt-strip-content"><div><span className="gt-status-icon" aria-hidden="true">{done ? '✓' : active ? '✳' : '—'}</span><span role="status">{label}<span className="gt-working-dots" aria-hidden="true">{active ? '…' : ''}</span></span></div><span className="gt-top-count" aria-live="polite"><b>{count}</b> items ready</span></div><Rail status={status} /></div>;
  const researchDone = done || phase === 'canvas';
  const stepClass = (current, complete) => complete ? 'gt-step-done' : current ? active ? 'gt-step-active' : 'gt-step-paused' : 'gt-step-pending';
  return <div className={`gt-topbar gt-steps gt-${status}`} aria-label="Top loading indicator">
    <ol aria-label="Your plan’s progress">
      <li className={stepClass(phase === 'research', researchDone)} aria-current={active && phase === 'research' ? 'step' : undefined}><span className="gt-step-number">{researchDone ? '✓' : '1'}</span><span>Research</span></li>
      <li className="gt-step-link gt-step-link-last" aria-hidden="true"><span /></li>
      <li className={stepClass(phase === 'canvas', done)} aria-current={active && phase === 'canvas' ? 'step' : undefined}><span className="gt-step-number">{done ? '✓' : '2'}</span><span>Canvas</span></li>
    </ol>
    <span className="gt-steps-count" aria-live="polite">{done ? 'Canvas ready' : active ? `${count} items ready` : status === 'error' ? 'Paused — retry to continue' : 'Cancelled'}</span>
  </div>;
}
