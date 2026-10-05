import React from 'react';

export function NeedsStep({ data, update }) {
  return <div className="ts-fields ts-needs">
    <div className="ts-note"><span aria-hidden="true">♡</span><p>A little context can make a big difference.<br/>Both fields are completely optional.</p></div>
    <label htmlFor="ts-accessibility">What makes travel more accessible for you?</label>
    <textarea id="ts-accessibility" rows={4} maxLength={1000} value={data.accessibility_needs} onChange={event => update({ accessibility_needs: event.target.value })} placeholder="For example, wheelchair access or avoiding lots of stairs…" />
    <label htmlFor="ts-food">Any food allergies or dietary requirements?</label>
    <textarea id="ts-food" rows={4} maxLength={1000} value={data.food_needs} onChange={event => update({ food_needs: event.target.value })} placeholder="For example, a peanut allergy or vegetarian meals…" />
    <p className="ts-help">Your words, your preferences. Saved details help shape your later trip conversations.</p>
  </div>;
}
