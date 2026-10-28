import React, { useEffect, useState } from 'react';

export function safeCarrierLogo(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[\s\\\x00-\x1f\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'assets.nuitee.flights' && !url.port &&
      !url.username && !url.password && !url.search && !url.hash ? value : null;
  } catch { return null; }
}

export function flightCarriers(item) {
  const carriers = new Map();
  for (const segment of [...(item.outbound?.segments || []), ...(item.inbound?.segments || [])]) {
    const name = segment.airline || segment.marketing_code;
    if (!name) continue;
    const code = segment.marketing_code || null, key = JSON.stringify([code, name]);
    const previous = carriers.get(key);
    carriers.set(key, { name, code, logo: previous?.logo || safeCarrierLogo(segment.marketing_logo) });
  }
  if (!carriers.size) for (const name of item.airlines || []) carriers.set(name, { name, code: null, logo: null });
  return [...carriers.values()];
}

export function CarrierMark({ name, code, logo, showName = true }) {
  const source = safeCarrierLogo(logo), [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  const label = name || code || 'Carrier unavailable';
  const size = { width: 32, height: 32, flex: '0 0 32px', objectFit: 'contain' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginInlineEnd: 12, maxWidth: '100%' }}>
    {source && !failed
      ? <img src={source} alt={`${label} logo`} width="32" height="32" style={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : <span aria-hidden="true" style={{ ...size, display: 'inline-grid', placeItems: 'center' }}><svg width="24" height="24" viewBox="0 0 48 48" focusable="false"><path d="m43 21-15-8V5a4 4 0 0 0-8 0v8L5 21v6l15-4v13l-5 4v4l9-2 9 2v-4l-5-4V23l15 4z" fill="currentColor"/></svg></span>}
    <span hidden={!showName}>{label}</span>
  </span>;
}

export function CarrierMarks({ item, showName = true }) {
  const carriers = flightCarriers(item);
  return <div aria-label="Airlines" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {carriers.length ? carriers.map(carrier => <CarrierMark key={JSON.stringify([carrier.code, carrier.name])} {...carrier} showName={showName}/>) : <CarrierMark showName={showName}/>}
  </div>;
}
