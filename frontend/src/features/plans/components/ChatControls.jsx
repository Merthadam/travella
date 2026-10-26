import React, { useEffect } from 'react';

export function ChatHeader({ title, subtitle, onClose, collapseLabel, panelId, collapseRef }) {
  return <header className="canvas-chat-header"><div className="canvas-guide-heading"><div><strong>{title}</strong><small>{subtitle}</small></div></div>{onClose && <button ref={collapseRef} type="button" className="canvas-chat-collapse" aria-label={collapseLabel} title={collapseLabel} aria-controls={panelId} aria-expanded={true} onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 4v16M5 12h11m-5-5 5 5-5 5"/></svg></button>}</header>;
}

export function ChatComposer({ id, label, placeholder, input, setInput, composerRef, visible, blocked, active, onSend, onStop, hint, footer, children }) {
  useEffect(() => {
    const element = composerRef.current;
    if (!visible || !element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(160, Math.max(48, input ? element.scrollHeight : 48))}px`;
  }, [input, visible, composerRef]);
  return <form className="canvas-chat-composer" onSubmit={onSend}>
    {children}
    <div className="canvas-chat-input"><label className="sr-only" htmlFor={id}>{label}</label><textarea id={id} ref={composerRef} value={input} onChange={event => setInput(event.target.value)} rows={2} maxLength={2000} placeholder={placeholder} disabled={blocked} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}/><div className="canvas-chat-send-row"><span>{hint || <>Enter to send<span className="canvas-chat-keyboard-extra"> · Shift + Enter for a new line</span></>}</span>{active ? <button type="button" className="ds-button small" onClick={onStop}>Stop</button> : <button type="submit" className="canvas-chat-send" aria-label="Send message" title="Send message" disabled={blocked || !input.trim()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>}</div></div>
    <p>{footer}</p>
  </form>;
}
