// Throwaway shared switcher; rendered only by the development prototype.
import React, { useEffect } from 'react';
export function TripEssentialsPrototypeSwitcher({ variants, value, onChange, blocked }) {
  const keys=Object.keys(variants);
  const cycle=step=>onChange(keys[(keys.indexOf(value)+step+keys.length)%keys.length]);
  useEffect(()=>{const handler=event=>{if(blocked||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target?.closest('input,textarea,select,[contenteditable],dialog,[role="tablist"]'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();cycle(event.key==='ArrowLeft'?-1:1);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[value,blocked,onChange]);
  if(!import.meta.env.DEV)return null;
  return <nav className="te-switcher" aria-label="Trip essentials design directions"><span className="te-switcher-label">DESIGN</span><button aria-label="Previous design" onClick={()=>cycle(-1)}>←</button>{keys.map(key=><button key={key} aria-pressed={key===value} onClick={()=>onChange(key)}><b>{key}</b><span>{variants[key]}</span></button>)}<button aria-label="Next design" onClick={()=>cycle(1)}>→</button></nav>;
}
