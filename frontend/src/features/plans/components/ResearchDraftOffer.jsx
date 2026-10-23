import React from 'react';

// Only committed, typed metadata creates actions; assistant Markdown never does.
export function ResearchDraftOffer({ offer, current, revision, disabled, onReview, onDefer }) {
  if (!offer || !['available', 'review', 'deferred', 'consumed', 'superseded'].includes(offer.status)) return null;
  const state = current?.id === offer.id ? current : offer;
  if (state.status === 'consumed') return null;
  if (state.status === 'deferred') return <p className="research-offer-note">We’ll keep researching. You can review a draft from your Trip brief when you’re ready.</p>;
  if (state.status === 'superseded' || state.revision !== revision || current?.id !== offer.id) return <p className="research-offer-note">Your trip details changed. Review the latest version from your Trip brief.</p>;
  return <div className="research-draft-offer" aria-label="Draft invitation">
    <p>We have enough to shape a first draft. Review your trip details, or keep exploring.</p>
    <div><button type="button" disabled={disabled} onClick={() => onReview(state)}>Review &amp; create draft</button><button type="button" disabled={disabled} onClick={() => onDefer(state)}>Keep researching</button></div>
  </div>;
}
