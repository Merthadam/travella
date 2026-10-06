import React, { useState } from 'react';
import { themeItem } from '../schemas';
import { Card, Icon, FormActions } from './primitives';
const kinds = { theme: 'Interest', pace: 'Pace', priority: 'Priority', must_do: 'Must do', avoid: 'Prefer to avoid' };
export function TripThemes({ data, onAction, disabled }) {
  const [draft, setDraft] = useState(null); const [error, setError] = useState('');
  function save(e) { e.preventDefault(); const result = themeItem.safeParse(draft); if (!result.success) { setError(result.error.issues[0].message); return; } onAction(data.items.some(i => i.id === draft.id) ? 'edit_theme' : 'add_theme', result.data); setDraft(null); }
  return <Card title="The feel of your trip" eyebrow="YOUR TRAVEL DNA" data={data} onAction={onAction} icon="spark" className="ds-themes" empty="What makes a trip feel like you? Add an interest, a pace or a priority." action={<button className="ds-icon-button" aria-label="Add preference" disabled={disabled || data.items.length >= 20} onClick={() => {setError('');setDraft({ id: `theme-${Date.now()}`, kind: 'theme', text: '', source: 'You' });}}><Icon name="plus" size={18}/></button>}>
    <div className="ds-theme-chips">{data.items.filter(i => i.kind === 'theme').map((i,n) => <button className={`ds-chip tone-${n % 3}`} key={i.id} disabled={disabled} title={`Edit ${i.text} · ${i.source || 'Sample'}`} onClick={() => {setError('');setDraft({ ...i });}}>{i.text}<span>↗</span></button>)}</div>
    {data.items.filter(i => i.kind !== 'theme').map(i => <button className="ds-preference" key={i.id} disabled={disabled} onClick={() => {setError('');setDraft({ ...i });}}><span>{kinds[i.kind]} <Icon name="edit" size={14}/></span><strong>{i.text}</strong><small>{i.source || 'Sample preference'}</small></button>)}
    {!data.items.length && <p className="ds-muted">No preferences yet. Start with one thing you love.</p>}
    {draft && <form className="ds-form" onSubmit={save}><label>Preference<input autoFocus required maxLength={160} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })}/></label><label>Type<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>{Object.entries(kinds).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>{error && <p role="alert" className="ds-error">{error}</p>}<FormActions cancel={() => setDraft(null)} busy={disabled}/>{data.items.some(i => i.id === draft.id) && <button type="button" className="ds-text-button danger" disabled={disabled} onClick={() => { onAction('remove_theme', { id: draft.id }); setDraft(null); }}>Remove preference</button>}</form>}
  </Card>;
}
