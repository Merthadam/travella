// THROWAWAY: three account-page structures, ?preview=account&variant=A&theme=light.
// Fictional data; all edits are simulated in memory. No account or provider requests.
import React, { useEffect, useRef, useState } from 'react';
import './account-settings-prototype.css';

const variants = { A: 'The essentials', B: 'Your travel studio', C: 'The control room' };
const initial = {
  first: 'Alex', last: 'Morgan', email: 'alex@example.invalid',
  home: 'Budapest, Hungary', address: 'Budapest, Hungary', airport: 'BUD',
  citizenships: ['Hungary'], food: 'Vegetarian', access: '',
  interests: ['Architecture', 'Local food', 'Nature', 'Art & museums', 'Hidden gems'],
  mfa: true, password: 'Last changed 12 September 2026', recovery: '8 codes remaining',
};
const groups = [
  { id: 'personal', title: 'Personal details', short: 'Personal', icon: 'user', sub: 'The basics that make this account yours.' },
  { id: 'travel', title: 'Travel preferences', short: 'Travel', icon: 'globe', sub: 'A starting point for every new adventure.' },
  { id: 'security', title: 'Security', short: 'Security', icon: 'shield', sub: 'A little peace of mind, wherever you go.' },
];
const sections = {
  name: { title: 'Your name', group: 'personal', icon: 'user', note: 'How we address you across Travella.' },
  email: { title: 'Email address', group: 'personal', icon: 'mail', note: 'Where account and sign-in messages reach you.' },
  home: { title: 'Home base', group: 'travel', icon: 'pin', note: 'Your usual starting point. You can choose another for any trip.' },
  citizenships: { title: 'Citizenships', group: 'travel', icon: 'globe', note: 'Useful context for destination research. Add all that apply.' },
  needs: { title: 'Food & accessibility', group: 'travel', icon: 'heart', note: 'Make room for what makes travel comfortable for you.' },
  interests: { title: 'Your interests', group: 'travel', icon: 'spark', note: 'The things you love finding along the way.' },
  password: { title: 'Password', group: 'security', icon: 'lock', note: 'Update the password you use to sign in.' },
  mfa: { title: 'Two-factor authentication', group: 'security', icon: 'shield', note: 'An extra layer of protection with your authenticator app.' },
  recovery: { title: 'Recovery codes', group: 'security', icon: 'key', note: 'A backup way in when your authenticator is unavailable.' },
};
const icons = {
  user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
  key: <><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
  moon: <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>,
  arrow: <path d="m9 5 7 7-7 7"/>,
};
function Icon({ name, ...props }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name] || icons.spark}</svg>; }
function ThemeControl({ theme, setTheme }) { return <div className="ap-theme" aria-label="Color theme"><button aria-label="Light mode" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Icon name="sun"/><span>Light</span></button><button aria-label="Dark mode" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon name="moon"/><span>Dark</span></button></div>; }
function initials(data) { return `${data.first[0] || ''}${data.last[0] || ''}`; }
function valueFor(id, data) {
  return ({ name: `${data.first} ${data.last}`, email: data.email, home: `${data.home}${data.airport ? ` · ${data.airport}` : ''}`, citizenships: data.citizenships.join(', ') || 'Not provided', needs: [data.food, data.access].filter(Boolean).join(' · ') || 'Not provided', interests: data.interests.join(', ') || 'Not provided', password: data.password, mfa: data.mfa ? 'On · Authenticator app' : 'Not set up', recovery: data.recovery })[id];
}
function SectionSummary({ id, data, onEdit, numbered }) {
  return <button className="ap-summary" onClick={() => onEdit(id)} aria-label={`Edit ${sections[id].title}`}>
    <span className="ap-row-icon">{numbered || <Icon name={sections[id].icon}/>}</span>
    <span className="ap-summary-copy"><strong>{sections[id].title}</strong>{id === 'interests' && data.interests.length ? <span className="ap-chips">{data.interests.map(i => <span key={i}>{i}</span>)}</span> : <span>{valueFor(id, data)}</span>}</span>
    <span className="ap-edit-label">Edit</span><Icon name="arrow"/>
  </button>;
}
function TravelNote() { return <p className="ap-travel-note"><Icon name="spark"/><span>These preferences help shape your suggestions. Your confirmed trip details stay in your control.</span></p>; }
function ProfileCard({ data }) { return <div className="ap-profile-card"><div className="ap-profile-top"><span>TRAVELER PROFILE</span><Icon name="globe"/></div><div className="ap-profile-name">{data.first}'s world</div><div className="ap-profile-home"><span>STARTING FROM</span><strong>{data.home}</strong><small>{data.airport ? `${data.airport} · Preferred airport` : 'No preferred airport'}</small></div><div className="ap-profile-stamps"><span>✳ {data.citizenships[0] || 'Your world'}</span><span>{data.interests.length} interests</span></div><svg className="ap-orbit" viewBox="0 0 240 180" fill="none" aria-hidden="true"><ellipse cx="150" cy="90" rx="110" ry="70"/><ellipse cx="150" cy="90" rx="58" ry="70"/><path d="M40 90h220M150 20v140M55 52q90 60 195 0M55 128q90-60 195 0"/></svg></div>; }

function Editor({ id, data, onSave, onCancel, inline = false }) {
  const [draft, setDraft] = useState(() => structuredClone(data));
  const [custom, setCustom] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const field = (key, label, options = {}) => <label className="ap-field">{label}<input name={key} {...options} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>;
  const toggle = (key, value) => setDraft({ ...draft, [key]: draft[key].includes(value) ? draft[key].filter(v => v !== value) : [...draft[key], value] });
  const addInterest = () => { const value = custom.trim(); if (value && !draft.interests.includes(value)) setDraft({ ...draft, interests: [...draft.interests, value] }); setCustom(''); };
  function submit(e) {
    e.preventDefault();
    if (id === 'email' && !confirmation) { setConfirmation(true); return; }
    onSave({ ...draft, ...(id === 'password' ? { password: 'Updated just now · Demo' } : {}), ...(id === 'recovery' ? { recovery: '8 new demo codes generated' } : {}) });
  }
  return <form className={`ap-editor ${inline ? 'ap-inline-editor' : ''}`} onSubmit={submit}>
    <span className="ap-kicker">{groups.find(g => g.id === sections[id].group).title}</span>
    <h2 id="ap-editor-title">{sections[id].title}</h2><p className="ap-editor-note">{sections[id].note}</p>
    <div className="ap-editor-fields">
      {id === 'name' && <div className="ap-form-grid">{field('first', 'First name', { required: true })}{field('last', 'Last name', { required: true })}</div>}
      {id === 'email' && <>{field('email', 'Email address', { type: 'email', required: true })}<p className="ap-help">Changing your email requires verification before it becomes your sign-in address.</p>{confirmation && <div className="ap-demo-note">Verification preview: in the real flow, you would enter a code sent to the new address. Continue below to simulate confirmation.</div>}</>}
      {id === 'home' && <>{field('address', 'Home location', { required: true })}{field('home', 'City and country', { required: true })}<label className="ap-field">Preferred airport <span>Optional</span><select name="airport" value={draft.airport} onChange={e => setDraft({ ...draft, airport: e.target.value })}><option value="">No preference</option><option value="BUD">BUD — Budapest Ferenc Liszt</option><option value="VIE">VIE — Vienna International</option><option value="LHR">LHR — London Heathrow</option></select></label><div className="ap-map-sketch" aria-label="Decorative map preview"><span className="ap-map-river"/><span className="ap-map-pin"><Icon name="pin"/>{draft.home}</span><small>Illustrative map · Location search simulated</small></div></>}
      {id === 'citizenships' && <><p className="ap-help">Select or remove countries. This information is optional.</p><div className="ap-country-options">{['Hungary', 'United Kingdom', 'United States', 'Germany', 'France', 'Canada'].map(country => <button type="button" key={country} aria-pressed={draft.citizenships.includes(country)} onClick={() => toggle('citizenships', country)}><Icon name="globe"/>{country}<span>{draft.citizenships.includes(country) ? '✓' : '+'}</span></button>)}</div><button className="ap-text-button" type="button" onClick={() => setDraft({ ...draft, citizenships: [] })}>Clear citizenships</button></>}
      {id === 'needs' && <><label className="ap-field">Food preferences & allergies <span>Optional</span><textarea name="food" rows="3" placeholder="Anything you’d like us to keep in mind" value={draft.food} onChange={e => setDraft({ ...draft, food: e.target.value })}/></label><label className="ap-field">Accessibility needs <span>Optional</span><textarea name="accessibility" rows="3" placeholder="What makes travel more comfortable for you?" value={draft.access} onChange={e => setDraft({ ...draft, access: e.target.value })}/></label><p className="ap-help">Share as much or as little as you like. Clear a field to remove it.</p></>}
      {id === 'interests' && <><p className="ap-help">Choose any that feel like you. There’s no minimum.</p><div className="ap-interest-picker">{[...new Set(['Architecture', 'Local food', 'Nature', 'Art & museums', 'Hidden gems', 'Beach days', 'Live music', 'Wellness', 'Hiking', 'Photography', 'Nightlife', 'Slow travel', ...draft.interests])].map(item => <button key={item} type="button" aria-pressed={draft.interests.includes(item)} onClick={() => toggle('interests', item)}>{draft.interests.includes(item) ? '✓' : '+'} {item}</button>)}</div><label className="ap-field">Something else you love?<span className="ap-custom-interest"><input name="custom-interest" aria-label="Custom interest" value={custom} placeholder="Add your own interest" maxLength={80} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}/><button type="button" className="ap-button" onClick={addInterest} disabled={!custom.trim()}>Add</button></span></label><button type="button" className="ap-text-button" onClick={() => setDraft({ ...draft, interests: [] })}>Clear all interests</button></>}
      {id === 'password' && <><div className="ap-demo-note">Security preview only. Use made-up values here.</div><label className="ap-field">Current password<input name="current-password" type="password" autoComplete="off" required/></label><label className="ap-field">New password<input name="new-password" type="password" autoComplete="off" minLength={8} required/></label><p className="ap-help">Use at least 8 characters for this demonstration.</p></>}
      {id === 'mfa' && <><div className="ap-security-illustration"><Icon name="shield"/><strong>{draft.mfa ? 'An extra layer of protection' : 'Protect your next adventure'}</strong><p>Use an authenticator app to confirm it’s you when you sign in.</p></div><button type="button" className="ap-toggle-row" role="switch" aria-checked={draft.mfa} onClick={() => setDraft({ ...draft, mfa: !draft.mfa })}>Authenticator app<span className={draft.mfa ? 'ap-toggle on' : 'ap-toggle'}><i/></span></button><div className="ap-demo-note">Simulated setting. Actual setup or removal will require identity verification.</div></>}
      {id === 'recovery' && <><div className="ap-demo-note">Sample codes only. These cannot access any account.</div><div className="ap-demo-codes">{['DEMO-0001', 'DEMO-0002', 'DEMO-0003', 'DEMO-0004', 'DEMO-0005', 'DEMO-0006', 'DEMO-0007', 'DEMO-0008'].map(c => <code key={c}>{c}</code>)}</div><p className="ap-help">Generating a new set would replace your previous recovery codes.</p></>}
    </div>
    <div className="ap-editor-actions"><button className="ap-button" type="button" onClick={onCancel}>Cancel</button><button className="ap-button ap-primary" type="submit">{id === 'email' ? confirmation ? 'Simulate confirmation' : 'Preview verification' : id === 'recovery' ? 'Generate demo codes' : 'Save changes'}<span aria-hidden="true">↗</span></button></div><p className="ap-save-disclaimer">Prototype only · Changes last until you reload.</p>
  </form>;
}
function EditorDialog({ id, data, onSave, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="ap-dialog" aria-labelledby="ap-editor-title" onCancel={e => { e.preventDefault(); onCancel(); }}><button className="ap-dialog-close" onClick={onCancel} aria-label="Close editor">×</button><Editor id={id} data={data} onSave={onSave} onCancel={onCancel}/></dialog>;
}
function VariantA({ data, onEdit, group, setGroup }) {
  const current = groups.find(g => g.id === group);
  return <main className="ap-layout-a"><aside className="ap-sidebar"><span className="ap-kicker">MAKE YOURSELF AT HOME</span><h1>Account &<br/>preferences<span>.</span></h1><nav aria-label="Settings sections">{groups.map(g => <button key={g.id} aria-current={g.id === group ? 'page' : undefined} onClick={() => setGroup(g.id)}><Icon name={g.icon}/>{g.title}<Icon name="arrow"/></button>)}</nav><div className="ap-sidebar-footer"><span className="ap-avatar">{initials(data)}</span><div><strong>{data.first} {data.last}</strong><span>Your next chapter starts here.</span></div></div></aside><section className="ap-a-content"><header className="ap-section-heading"><span className="ap-kicker">YOUR ACCOUNT / {current.short.toUpperCase()}</span><h2>{current.title}</h2><p>{current.sub}</p></header>{group === 'travel' && <div className="ap-a-banner"><Icon name="globe"/><div><strong>Good journeys start with you.</strong><p>Everything you shared during onboarding, ready to fine-tune.</p></div><span aria-hidden="true">↗</span></div>}<div className="ap-row-list">{Object.keys(sections).filter(id => sections[id].group === group).map(id => <SectionSummary key={id} id={id} data={data} onEdit={onEdit}/>)}</div>{group === 'travel' && <TravelNote/>}<div className="ap-small-footer">A little more you. A world of possibilities.</div></section></main>;
}
function VariantB({ data, onEdit, group, setGroup }) {
  return <main className="ap-layout-b"><aside className="ap-editorial"><span className="ap-kicker">YOUR WORLD, A LITTLE CLOSER</span><h1>Every journey.<br/>A little more <em>you.</em></h1><p>Your home base, your favorite things, your way of traveling. Keep them feeling like you.</p><ProfileCard data={data}/><div className="ap-editorial-foot"><span>✳</span> Thoughtful plans begin with you.</div></aside><section className="ap-b-content"><div className="ap-b-heading"><span className="ap-kicker">THE DETAILS BEHIND THE ADVENTURE</span><h2>Account & preferences</h2><p>A familiar place to make a few changes.</p></div><div className="ap-accordion">{groups.map((g, i) => <section key={g.id} className={group === g.id ? 'ap-accordion-section open' : 'ap-accordion-section'}><button className="ap-accordion-heading" aria-expanded={group === g.id} onClick={() => setGroup(group === g.id ? '' : g.id)}><span className="ap-chapter-number">0{i + 1}</span><span><strong>{g.title}</strong><small>{g.id === 'personal' ? `${data.first} ${data.last}` : g.id === 'travel' ? 'The things you shared at the start' : data.mfa ? 'Protected with two-factor authentication' : 'Manage your sign-in'}</small></span><span className="ap-expand">{group === g.id ? '−' : '+'}</span></button>{group === g.id && <div className="ap-accordion-body">{Object.keys(sections).filter(id => sections[id].group === g.id).map(id => <SectionSummary key={id} id={id} data={data} onEdit={onEdit}/>)}{g.id === 'travel' && <TravelNote/>}</div>}</section>)}</div></section></main>;
}
function VariantC({ data, active, setActive, editing, onEdit, onSave, onCancel }) {
  const id = active || 'home';
  return <main className="ap-layout-c"><header className="ap-c-heading"><div><span className="ap-kicker">YOUR SPACE</span><h1>Account & preferences</h1></div><p>Small details. Better journeys.</p></header><div className="ap-c-workspace"><label className="ap-mobile-section">Choose a setting<select name="setting" value={id} onChange={e => setActive(e.target.value)}>{groups.map(g => <optgroup key={g.id} label={g.title}>{Object.entries(sections).filter(([,s]) => s.group === g.id).map(([key,s]) => <option key={key} value={key}>{s.title}</option>)}</optgroup>)}</select></label><aside className="ap-c-master"><div className="ap-c-person"><span className="ap-avatar">{initials(data)}</span><div><strong>{data.first} {data.last}</strong><span>Your traveler profile</span></div></div>{groups.map(g => <nav key={g.id} aria-label={g.title}><h3>{g.title}</h3>{Object.entries(sections).filter(([,s]) => s.group === g.id).map(([key,s]) => <button key={key} aria-current={id === key ? 'page' : undefined} onClick={() => setActive(key)}><Icon name={s.icon}/><span>{s.title}</span><Icon name="arrow"/></button>)}</nav>)}</aside><section className="ap-c-detail">{editing ? <Editor key={editing} id={editing} data={data} inline onSave={onSave} onCancel={onCancel}/> : <><div className="ap-c-detail-title"><span className="ap-large-icon"><Icon name={sections[id].icon}/></span><span className="ap-kicker">{groups.find(g => g.id === sections[id].group).title}</span><h2>{sections[id].title}</h2><p>{sections[id].note}</p></div>{id === 'home' ? <><div className="ap-c-map"><div className="ap-map-sketch"><span className="ap-map-river"/><span className="ap-map-pin"><Icon name="pin"/>{data.home}</span><small>Illustrative map · Sample location</small></div></div><div className="ap-c-facts"><div><span>HOME LOCATION</span><strong>{data.address}</strong></div><div><span>PREFERRED AIRPORT</span><strong>{data.airport || 'No preference'}</strong></div></div></> : <div className="ap-c-value">{id === 'interests' ? <div className="ap-chips">{data.interests.map(item => <span key={item}>{item}</span>)}</div> : valueFor(id, data)}</div>}<button className="ap-button ap-primary" onClick={() => onEdit(id)}>Edit {sections[id].title.toLowerCase()} <span>↗</span></button>{sections[id].group === 'travel' && <TravelNote/>}</>}</section></div></main>;
}

export function AccountSettingsPrototype() {
  const params = new URLSearchParams(window.location.search);
  const [variant, setVariant] = useState(variants[params.get('variant')] ? params.get('variant') : 'A');
  const [theme, setTheme] = useState(params.get('theme') === 'dark' ? 'dark' : 'light');
  const [data, setData] = useState(initial);
  const [group, setGroup] = useState('travel');
  const [active, setActive] = useState('home');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(null);
  const [showState, setShowState] = useState(false);
  function changeVariant(next) { if (editing) { setPending({ variant: next }); return; } setVariant(next); setNotice(''); }
  const cycle = direction => { const keys = Object.keys(variants); changeVariant(keys[(keys.indexOf(variant) + direction + keys.length) % keys.length]); };
  useEffect(() => {
    const url = new URL(window.location.href); url.searchParams.set('variant', variant); url.searchParams.set('theme', theme); window.history.replaceState({}, '', url);
    document.title = `${variant} · ${variants[variant]} — Travella account prototype`;
    document.documentElement.style.colorScheme = theme;
  }, [variant, theme]);
  useEffect(() => {
    const handler = e => { if (e.target.closest('input,textarea,select,[contenteditable="true"],dialog') || editing || e.altKey || e.ctrlKey || e.metaKey) return; if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); cycle(e.key === 'ArrowLeft' ? -1 : 1); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [variant, editing]);
  function save(next) { setData(next); setNotice(`${sections[editing].title} updated in this preview.`); setEditing(null); }
  function edit(id) { setEditing(id); setNotice(''); }
  function selectActive(id) { if (editing) setPending({ active: id }); else setActive(id); }
  function discard() { setEditing(null); if (pending.variant) setVariant(pending.variant); if (pending.active) setActive(pending.active); setPending(null); }
  return <div className={`account-prototype ap-${theme} ap-variant-${variant}`}>
    <header className="ap-header"><a href={`?preview=account&variant=${variant}&theme=${theme}`} className="ap-brand"><span>✳</span> travella</a><nav aria-label="Application navigation"><button onClick={() => setNotice('Preview only — your Plans remain in the main application.')}>My plans</button><span className="ap-header-active">Account</span></nav><div className="ap-header-end"><ThemeControl theme={theme} setTheme={setTheme}/><span className="ap-avatar" aria-label={`${data.first} ${data.last}`}>{initials(data)}</span></div></header>
    <div className="ap-preview-note"><span className="ap-status-dot"/> INTERACTIVE DESIGN PREVIEW <span className="ap-preview-note-detail">Fictional traveler · All changes are simulated</span></div>
    {variant === 'A' && <VariantA data={data} onEdit={edit} group={group || 'travel'} setGroup={setGroup}/>}
    {variant === 'B' && <VariantB data={data} onEdit={edit} group={group} setGroup={setGroup}/>}
    {variant === 'C' && <VariantC data={data} active={active} setActive={selectActive} editing={editing} onEdit={edit} onSave={save} onCancel={() => setEditing(null)}/>}
    {editing && variant !== 'C' && <EditorDialog key={editing} id={editing} data={data} onSave={save} onCancel={() => setEditing(null)}/>}
    {notice && <div className="ap-toast" role="status"><span>✓</span>{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
    {pending && <div className="ap-discard-backdrop"><div className="ap-discard" role="alertdialog" aria-modal="true" aria-labelledby="ap-discard-title"><h2 id="ap-discard-title">Leave these edits?</h2><p>Your unsaved changes will be discarded.</p><div className="ap-editor-actions"><button className="ap-button" onClick={() => setPending(null)}>Keep editing</button><button className="ap-button ap-primary" onClick={discard}>Discard changes</button></div></div></div>}
    {showState && <aside className="ap-state"><button onClick={() => setShowState(false)} aria-label="Close sample state">×</button><h2>In-memory sample state</h2><pre>{JSON.stringify({ variant, theme, activeSection: variant === 'C' ? active : group, editing, savedSample: data }, null, 2)}</pre><p>Reload resets sample edits. Variant and theme are in the URL.</p></aside>}
    {import.meta.env.DEV && <footer className="ap-switcher"><span className="ap-switcher-tag">EXPLORE DESIGNS</span><button aria-label="Previous design" onClick={() => cycle(-1)}>←</button><div className="ap-variant-options">{Object.entries(variants).map(([key,name]) => <button key={key} aria-pressed={key === variant} onClick={() => changeVariant(key)} aria-label={`Design ${key}: ${name}`}><b>{key}</b><span>{name}</span></button>)}</div><button aria-label="Next design" onClick={() => cycle(1)}>→</button><button className="ap-state-button" aria-label="Show sample state" onClick={() => setShowState(!showState)}>{'{ }'}</button></footer>}
  </div>;
}
