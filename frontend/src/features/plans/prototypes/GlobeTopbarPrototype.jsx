// THROWAWAY: three top loading indicators alongside the selected B globe.
// Progress is indeterminate; only completed-item counts come from simulated events.
import React from 'react';
import './globe-topbar-prototype.css';

export const topbarVariants = { A: 'Thin line', B: 'Status strip', C: 'Journey steps' };

function Rail({ status }) {
  return <div className={`gt-rail gt-rail-${status}`} role={status === 'generating' ? 'progressbar' : undefined} aria-label={status === 'generating' ? 'Building your Lisbon plan' : undefined}><span /></div>;
}

export function GlobeTopbarPrototype({ variant, status, count }) {
  const active = status === 'generating';
  const done = status === 'complete';
  const label = active ? 'Building your Lisbon plan' : done ? 'Your Lisbon canvas is ready' : status === 'error' ? 'Generation paused — please retry' : 'Generation cancelled';
  if (variant === 'A') return <div className={`gt-topbar gt-thin gt-${status}`} aria-label="Top loading indicator"><Rail status={status} /><span className="sr-only" role="status">{label}</span></div>;
  if (variant === 'B') return <div className={`gt-topbar gt-strip gt-${status}`} aria-label="Top loading indicator"><div className="gt-strip-content"><div><span className="gt-status-icon" aria-hidden="true">{done ? '✓' : active ? '✳' : '—'}</span><span role="status">{label}<span className="gt-working-dots" aria-hidden="true">{active ? '…' : ''}</span></span></div><span className="gt-top-count" aria-live="polite"><b>{count}</b> items ready</span></div><Rail status={status} /></div>;
  return <div className={`gt-topbar gt-steps gt-${status}`} aria-label="Top loading indicator"><ol aria-label="Your plan’s progress"><li className="gt-step-done"><span className="gt-step-number">✓</span><span>Destination confirmed</span></li><li className="gt-step-link" aria-hidden="true"><span /></li><li className={done ? 'gt-step-done' : active ? 'gt-step-active' : 'gt-step-paused'} aria-current={active ? 'step' : undefined}><span className="gt-step-number">{done ? '✓' : '2'}</span><span>{active ? 'Building your canvas' : done ? 'Canvas built' : status === 'error' ? 'Generation paused' : 'Generation cancelled'}</span></li><li className="gt-step-link gt-step-link-last" aria-hidden="true"><span /></li><li className={done ? 'gt-step-done' : 'gt-step-pending'} aria-current={done ? 'step' : undefined}><span className="gt-step-number">{done ? '✓' : '3'}</span><span>Ready to explore</span></li></ol><span className="gt-steps-count" aria-live="polite">{count} items ready</span></div>;
}
