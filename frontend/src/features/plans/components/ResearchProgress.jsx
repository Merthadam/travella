import React from 'react';

export function ResearchProgress({ onOpenDraft, disabled, hasDraft = false }) {
  return <nav className="research-progress" aria-label="Plan stages"><ol>
    <li aria-current="step"><span aria-hidden="true">1</span>Research</li>
    <li><button type="button" disabled={disabled || !hasDraft} title={hasDraft ? 'Open draft plan' : 'Review your trip details to create your first draft'} onClick={onOpenDraft}><span aria-hidden="true">2</span>Draft plan</button></li>
  </ol></nav>;
}
