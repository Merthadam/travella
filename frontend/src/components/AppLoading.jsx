import React from 'react';
import './app-loading.css';

// Public shell only: never render cached traveler or Plan data before authentication.
export function AppLoading({ label = /^\/plans\/[0-9a-f-]{36}(?:\/conversation)?$/i.test(window.location.pathname) ? 'Opening plan…' : 'Loading Travella…', error, onRetry }) {
  return <div className="app-loading">
    <header className="app-loading-header"><a href="/plans">Travella</a></header>
    <main className="app-loading-content" aria-busy={!error}>
      {error ? <div><p role="alert">We couldn’t open Travella. Please try again.</p><button type="button" onClick={onRetry}>Retry</button></div>
        : <h1><span role="status">{label}</span></h1>}
    </main>
  </div>;
}
