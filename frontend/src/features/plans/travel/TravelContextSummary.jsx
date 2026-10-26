import React from 'react';

function fact(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value).filter(([, item]) => ['string', 'number'].includes(typeof item)).map(([key, item]) => `${key.replaceAll('_', ' ')}: ${item}`).join(' · ');
}

function tripDates(dates) {
  if (dates?.flexible) return 'Flexible dates';
  function format(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return [format(dates?.start), format(dates?.end)].filter(Boolean).join(' – ');
}

export function TravelContextSummary({ brief }) {
  if (!brief) return null;
  const themes = (brief.themes || []).map(item => typeof item === 'string' ? item : item.label || item.title || item.name || item.text).filter(Boolean);
  return <details className="travel-context-summary">
    <summary><strong>Using your trip</strong><span>{[fact(brief.destination), tripDates(brief.dates), brief.travelers ? `${brief.travelers} ${brief.travelers === 1 ? 'traveler' : 'travelers'}` : ''].filter(Boolean).join(' · ') || 'Saved trip details'}</span></summary>
    <div className="travel-context-detail">
      {themes.length > 0 && <p><strong>Theme:</strong> {themes.join(' · ')}</p>}
      {brief.budget && <p><strong>Budget:</strong> {fact(brief.budget)}</p>}
      {brief.selected_places?.length > 0 && <><strong>Selected activities and places</strong><ul>{brief.selected_places.map((place, i) => <li key={place.id || i}>{typeof place === 'string' ? place : place.name || place.title}{place.reason ? ` — ${place.reason}` : ''}</li>)}</ul></>}
      {brief.omitted_places > 0 && <p>{brief.omitted_places} other selected places omitted to keep this discussion focused.</p>}
      {Array.isArray(brief.accepted_choices) && brief.accepted_choices.map(choice => <p key={choice.topic}><strong>{choice.topic === 'stays' ? 'Stay' : 'Flight'} selected:</strong> {choice.title || choice.summary} · {choice.needs_review ? 'needs review · ' : ''}not booked</p>)}
      <p>Only saved trip details are shared. This discussion keeps its own preferences and research.</p>
    </div>
  </details>;
}
