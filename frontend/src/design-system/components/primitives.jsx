import React from 'react';
export function Icon({ name = 'spark', size = 20, ...props }) {
  const paths = {
    plane: <><path d="m3 11 7 2 1 7 2-1 1-6 6-8-1-2-8 6-6-1z"/><path d="m14 13 5 4-2 2-4-5"/></>,
    bed: <><path d="M3 18V7m18 11V9M3 15h18M3 9h18v6"/><path d="M6 9V6h5v3m2 0V6h5v3"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    cup: <><path d="M5 8h11v6a5 5 0 0 1-10 0V8m11 1h2a3 3 0 0 1 0 6h-2M4 21h15M8 2v3m5-3v3"/></>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h3m3 0h3"/></>,
    book: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/></>,
    link: <><path d="m10 14 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 8a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    edit: <><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.spark}</svg>;
}
export function Card({ title, eyebrow, icon, className = '', children, action, data, onAction, empty = 'Add a few details to make this yours.' }) {
  return <section className={`ds-card ${className}`} aria-label={title}>
    <header className="ds-card-head"><div>{eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}<h2>{icon && <Icon name={icon}/>} {title}</h2></div>{React.isValidElement(action) && (action.type === 'button' || action.type === EditButton) && data?.status !== 'ready' ? React.cloneElement(action, { disabled: true }) : action}</header>
    {data?.status === 'loading' ? <div role="status" className="ds-loading"><div/><div/><div/><span>Gathering the details…</span></div> : data?.status === 'error' ? <div role="alert" className="ds-empty"><Icon name="pin"/><h3>A little detour</h3><p>{data.error || 'This component couldn’t load. Your other details are still here.'}</p><button className="ds-button" onClick={() => onAction?.('retry', {})}>Try again</button></div> : data?.status === 'empty' ? <div className="ds-empty"><Icon name={icon} size={28}/><h3>A little room for possibility</h3><p>{empty}</p></div> : children}
  </section>;
}
export function EditButton({ onClick, label = 'Edit details', disabled }) { return <button className="ds-icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name="edit" size={17}/></button>; }
export function FormActions({ cancel, busy = false }) { return <div className="ds-form-actions"><button type="button" className="ds-button ghost" onClick={cancel}>Cancel</button><button className="ds-button primary" disabled={busy}>Save changes</button></div>; }
