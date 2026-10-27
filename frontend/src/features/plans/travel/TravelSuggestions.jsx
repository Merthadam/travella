import React, { useState } from 'react';

// Same interaction as the Canvas explorer: a compact list, one expanded card.
export function TravelSuggestions({ options, renderCard, disabled, onCompare, onBrowse }) {
  const [selected, setSelected] = useState(options[0]?.id);
  const [compared, setCompared] = useState([]);
  const option = options.find(item => item.id === selected) || options[0];
  const searches = [...new Set(options.map(item => item.reference?.search_id).filter(Boolean))];
  if (!option) return null;
  return <section className="travel-chat-suggestions" aria-label="Travel suggestions">
    <div className="travel-suggestion-list" aria-label="Suggested options">{options.map((item, index) => <div className="travel-suggestion-row" key={item.id}>
      <button type="button" aria-pressed={option.id === item.id} onClick={() => setSelected(item.id)}><span>{index + 1}</span><span><strong>{item.title}</strong><small>{item.price_label}</small></span><span aria-hidden="true">{option.id === item.id ? '⌄' : '›'}</span></button>
      {options.length > 1 && <input type="checkbox" aria-label={`Compare ${item.title}`} checked={compared.includes(item.id)} disabled={disabled || !item.reference || (!compared.includes(item.id) && compared.length >= 3)} onChange={event => setCompared(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))}/>}
    </div>)}</div>
    {renderCard(option)}
    <div className="travel-option-actions">
      {options.length > 1 && <button type="button" className="ds-button small" disabled={disabled || compared.length < 2} onClick={() => onCompare(options.filter(item => compared.includes(item.id)))}>Compare selected ({compared.length})</button>}
      {searches.map((id, index) => <button key={id} type="button" className="ds-text-button" onClick={() => onBrowse(id)}>{searches.length === 1 ? 'View all results' : `View search ${index + 1} results`} →</button>)}
    </div>
  </section>;
}
