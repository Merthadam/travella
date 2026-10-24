import React from 'react';
import { AccountMenuPrototype } from '../prototypes/AccountMenuPrototype';

export function AppHeader({ leading, children, className = '' }) {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('prototype') === 'account-menu') return <AccountMenuPrototype />;
  return <header className={`plans-header app-header${className ? ` ${className}` : ''}`}><div>
    {leading}
    <nav className="app-nav" aria-label="Application navigation">{children}</nav>
  </div></header>;
}
