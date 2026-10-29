import React, { forwardRef } from 'react';

// The visible control stays the same; each workspace owns its chat state.
export const PlanChatToggle = forwardRef(function PlanChatToggle({ expanded, label, controls, replying, ...props }, ref) {
  return <button {...props} ref={ref} type="button" className="focused-chat-toggle" aria-label={label} title={label} aria-controls={controls} aria-expanded={expanded}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>{expanded && <path d="M18 8v8"/>}</svg>
    <span aria-hidden="true">Chat</span>{replying && <span className="focused-replying" aria-label="Replying"/>}
  </button>;
});
