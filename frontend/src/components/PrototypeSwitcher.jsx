import React, { useEffect } from 'react';

export function PrototypeSwitcher({ variants, value, onChange }) {
  const keys = Object.keys(variants);
  const cycle = offset => onChange(keys[(keys.indexOf(value) + offset + keys.length) % keys.length]);
  useEffect(() => {
    const handler = event => {
      if (event.target.closest('input,textarea,select,[contenteditable],[role="slider"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [value]);
  if (!import.meta.env.DEV) return null;
  return <nav className="fc-switcher" aria-label="Checkout prototype variants">
    <button aria-label="Previous variant" onClick={() => cycle(-1)}>←</button>
    {keys.map(key => <button key={key} aria-pressed={key === value} onClick={() => onChange(key)}><b>{key}</b><span>{variants[key]}</span></button>)}
    <button aria-label="Next variant" onClick={() => cycle(1)}>→</button>
  </nav>;
}
