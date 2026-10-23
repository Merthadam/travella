import React from 'react';

export function ResearchProgress({ onOpenDraft, disabled }) {
  return <nav className="research-progress" aria-label="Plan stages"><ol>
    <li aria-current="step"><span aria-hidden="true">1</span>Research</li>
    <li><button type="button" disabled={disabled} onClick={onOpenDraft}><span aria-hidden="true">2</span>Draft plan</button></li>
  </ol></nav>;
}
