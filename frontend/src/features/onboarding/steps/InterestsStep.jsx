import React, { useState } from 'react';
import { interests } from '../catalogs';

const normalized = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
const selectedLabels = data => [...data.interest_ids.map(id => interests.find(item => item.id === id)?.label || id), ...data.custom_interests];
export function interestCount(data) {
  return new Set(selectedLabels(data).map(normalized)).size;
}

export function InterestsStep({ data, update }) {
  const [custom, setCustom] = useState('');
  const [notice, setNotice] = useState('');
  const count = interestCount(data);
  function fitsProfile(label) {
    if ([...selectedLabels(data), label].join(', ').length <= 1000) return true;
    setNotice('Please shorten or remove a custom interest before adding more.');
    return false;
  }
  function toggle(id) {
    const selected = data.interest_ids.includes(id);
    if (!selected && !fitsProfile(interests.find(item => item.id === id)?.label || id)) return;
    update({ interest_ids: selected ? data.interest_ids.filter(value => value !== id) : [...data.interest_ids, id] });
    setNotice('');
  }
  function addCustom() {
    const text = custom.trim().replace(/\s+/g, ' ');
    if (!text) return;
    const known = interests.find(item => normalized(item.label) === normalized(text));
    if (known && data.interest_ids.includes(known.id) || data.custom_interests.some(value => normalized(value) === normalized(text))) { setNotice('That interest is already selected.'); return; }
    if (!known && data.custom_interests.length >= 20) { setNotice('You can add up to 20 custom interests. Remove one before adding another.'); return; }
    if (!fitsProfile(known?.label || text)) return;
    update(known ? { interest_ids: [...data.interest_ids, known.id] } : { custom_interests: [...data.custom_interests, text] });
    setCustom(''); setNotice(`${text} added.`);
  }
  return <div className="ts-fields">
    {data._legacy_interests && <div className="ts-legacy"><strong>Your previously saved interests</strong><p>{data._legacy_interests}</p><p>Choose five interests to replace this text, or skip to keep it.</p></div>}
    <div className="ts-interest-count" aria-live="polite"><span aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} className={count > index ? 'filled' : ''} />)}</span><strong>{count >= 5 ? `${count} picked. Very you.` : `${count} of 5 picked`}</strong><small>Keep going, or skip for now.</small></div>
    <div className="ts-bubble-field" role="group" aria-label="Travel interests">{interests.map((item, index) => <button key={item.id} type="button" className={`ts-bubble size-${index % 4} ${data.interest_ids.includes(item.id) ? 'selected' : ''}`} style={{ '--delay': `${index * -.29}s`, '--tilt': `${index % 5 - 2}deg` }} aria-pressed={data.interest_ids.includes(item.id)} onClick={() => toggle(item.id)}><span aria-hidden="true">{data.interest_ids.includes(item.id) ? '✓' : item.icon}</span>{item.label}</button>)}
      {data.custom_interests.map(value => <button key={value} type="button" className="ts-bubble selected" aria-pressed="true" aria-label={`Remove ${value} interest`} onClick={() => update({ custom_interests: data.custom_interests.filter(item => item !== value) })}><span aria-hidden="true">✓</span>{value}<span aria-hidden="true">×</span></button>)}
    </div>
    <label htmlFor="ts-custom">Something else you love?</label><div className="ts-custom-input"><input id="ts-custom" value={custom} maxLength={60} onChange={event => { setCustom(event.target.value); setNotice(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} placeholder="Add your own interest" /><button type="button" disabled={!custom.trim()} onClick={addCustom}>+ Add</button></div>
    <p className="ts-help" role="status">{notice}</p>
  </div>;
}
