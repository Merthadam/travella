import React from 'react';

export function AppHeader({ leading, children, className = '' }) {
  return <header className={`plans-header app-header${className ? ` ${className}` : ''}`}><div>
    {leading}
    <nav className="app-nav" aria-label="Application navigation">{children}</nav>
  </div></header>;
}
