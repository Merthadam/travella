import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './account-menu.css';

function MenuIcon({ exit = false }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{exit ? <path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" /> : <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>}</svg>;
}

export function AccountMenu({ onAccount, onSignOut, disabled = false, current = false, placement = 'header' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const first = useRef(null);
  const last = useRef(null);
  const initialFocus = useRef('first');
  const id = useId();
  const expanded = open && !disabled;

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (expanded) (initialFocus.current === 'last' ? last : first).current?.focus({ preventScroll: true });
  }, [expanded]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!expanded) return;
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [expanded]);

  function activate(action) {
    close(true);
    action?.();
  }
  function navigate(event) {
    const items = [first.current, last.current];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (index + items.length - 1) % items.length;
    else if (event.key === 'Home' || event.key.toLowerCase() === 'a') next = 0;
    else if (event.key === 'End' || event.key.toLowerCase() === 's') next = 1;
    if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
  }

  return <div className={`account-menu account-menu--${placement}`} ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }} onKeyDown={event => {
    if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); close(true); }
  }}>
    <button ref={trigger} className="account-menu__trigger" type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={expanded} aria-controls={expanded ? id : undefined} disabled={disabled} onClick={() => { initialFocus.current = 'first'; setOpen(value => !value); }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'; setOpen(true); }
    }}><MenuIcon />{placement === 'drawer' && <span>Your account</span>}</button>
    {expanded && <div className="account-menu__card">
      <div className="account-menu__profile"><div className="account-menu__avatar"><MenuIcon /></div><div><strong>Your account</strong><p>Personal details &amp; preferences</p></div></div>
      <div id={id} role="menu" aria-label="Account" onKeyDown={navigate}>
        <button ref={first} type="button" role="menuitem" tabIndex={-1} aria-current={current ? 'page' : undefined} onClick={() => activate(current ? undefined : onAccount)}><MenuIcon /><span>Account settings</span><span className="account-menu__chevron" aria-hidden="true">›</span></button>
        <div className="account-menu__divider" role="separator" />
        <button ref={last} type="button" role="menuitem" tabIndex={-1} onClick={() => activate(onSignOut)}><MenuIcon exit /><span>Sign out</span></button>
      </div>
    </div>}
  </div>;
}
