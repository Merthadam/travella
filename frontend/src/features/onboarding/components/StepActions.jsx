import React from 'react';

export function StepActions({ step, busy, canContinue, onBack, onSkip }) {
  return <div className="ts-actions">
    <button className="ts-back" type="button" disabled={busy || step === 0} onClick={onBack}>← Back</button>
    <div>{step > 0 && <button className="ts-skip" type="button" disabled={busy} onClick={onSkip}>Skip for now</button>}
      <button className="ts-continue" type="submit" disabled={busy || !canContinue}>{busy ? 'Saving…' : step === 3 ? 'Make it mine' : 'Continue'} <span aria-hidden="true">↗</span></button>
    </div>
  </div>;
}
