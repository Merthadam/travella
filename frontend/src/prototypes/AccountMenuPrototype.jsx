// THROWAWAY: three account-menu variants on /plans?prototype=account-menu&variant=A.
import React, { useEffect, useRef, useState } from 'react';
import './account-menu-prototype.css';
const names = { A: 'Account dropdown', B: 'Avatar & account card', C: 'Account in navigation' };
function Icon({ kind = 'person' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'person' ? <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></> : kind === 'exit' ? <><path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4"/></> : <path d="M4 6h16M4 12h16M4 18h16"/>}</svg>;
}
export function AccountMenuPrototype() {
  const [variant, setVariant] = useState(() => names[new URLSearchParams(location.search).get('variant')] ? new URLSearchParams(location.search).get('variant') : 'A');
  const [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState('Try the header controls. All actions are simulated.');
  const trigger = useRef(null);
  const wrapper = useRef(null);
  const close = () => { setPanel(null); trigger.current?.focus(); };
  const change = delta => {
    const next = ['A','B','C'][(['A','B','C'].indexOf(variant) + delta + 3) % 3];
    const url = new URL(location.href); url.searchParams.set('variant', next); history.replaceState(history.state, '', url);
    setVariant(next); setPanel(null); setNotice('Try the header controls. All actions are simulated.');
  };
  useEffect(() => {
    const key = event => {
      if (event.key === 'Escape') close();
      if (event.target.closest('input,textarea,select,[contenteditable]') || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); change(event.key === 'ArrowRight' ? 1 : -1); }
    };
    const outside = event => { if (!wrapper.current?.contains(event.target)) setPanel(null); };
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', outside); };
  }, [variant]);
  const act = label => { setNotice(`${label} — simulated only; your session and data are unchanged.`); close(); };
  const actions = <><button onClick={() => act('Open account settings')}><Icon/>Account settings<span>›</span></button><hr/><button className="amp-signout" onClick={() => act('Sign out')}><Icon kind="exit"/>Sign out</button></>;
  return <>
    <header className="plans-header app-header amp-header" ref={wrapper}><div>
      <div className="chat-nav-leading"><button className="sidebar-toggle" aria-label="Open navigation" aria-expanded={panel === 'navigation'} onClick={e => { trigger.current = e.currentTarget; setPanel(panel === 'navigation' ? null : 'navigation'); }}><Icon kind="menu"/></button><a className="brand" href="#" onClick={e => { e.preventDefault(); act('Go to My plans'); }}>Travella</a></div>
      {variant !== 'C' && <div className="amp-anchor"><button className={`amp-trigger ${variant === 'B' ? 'amp-avatar' : ''}`} aria-label="Open account menu" aria-expanded={panel === 'account'} onClick={e => { trigger.current = e.currentTarget; setPanel(panel === 'account' ? null : 'account'); }}><Icon/>{variant === 'A' && <>Account <span className="amp-chevron">⌄</span></>}</button>
        {panel === 'account' && <section className={`amp-panel amp-popover amp-${variant}`} aria-label="Account menu">{variant === 'B' && <div className="amp-profile"><div className="amp-profile-icon"><Icon/></div><div><strong>Your account</strong><small>Personal details & preferences</small></div></div>}{actions}</section>}
      </div>}
    </div>
    {panel === 'navigation' && <section className="amp-panel amp-drawer" aria-label="Navigation preview"><div className="amp-drawer-heading"><strong>Your workspace</strong><button aria-label="Close navigation" onClick={close}>×</button></div><button onClick={() => act('Open My plans')}>My plans</button><button onClick={() => act('Open Recently deleted')}>Recently deleted</button><div className="amp-drawer-spacer"/><div className="amp-drawer-account">{variant === 'C' ? <><small>ACCOUNT</small>{actions}</> : <small>Account controls are in the top-right menu.</small>}</div></section>}
    </header>
    <aside className="amp-switcher" aria-label="Prototype controls"><div className="amp-switcher-row"><button aria-label="Previous variant" onClick={() => change(-1)}>←</button><div><small>INTERACTIVE PROTOTYPE</small><strong>{variant} · {names[variant]}</strong></div><button aria-label="Next variant" onClick={() => change(1)}>→</button></div><p role="status">{notice}</p><small>State: {variant} · {panel || 'closed'} · simulated actions</small><button className="amp-theme" onClick={() => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; }}>Toggle light / dark</button></aside>
  </>;
}
