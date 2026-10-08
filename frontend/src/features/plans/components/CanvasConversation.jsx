import React, { useEffect, useRef, useState } from 'react';
import { ActivitySuggestions } from '../../../design-system/a2ui/ActivitySuggestions';
import { Icon } from '../../../design-system/components/primitives';
import { ChatMarkdown } from './ChatMarkdown';

export function CanvasConversation({ chat, data, disabled, generating, onClose, onPreview, onAdd, area, onClearArea }) {
  const [input, setInput] = useState('');
  const history = useRef(null); const nearBottom = useRef(true); const composer = useRef(null);
  useEffect(() => { if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [chat.messages, chat.active]);
  const blocked = disabled || chat.loading || Boolean(chat.historyError) || chat.active;
  async function send(event) { event.preventDefault(); const text = input.trim(); if (!text || blocked) return; setInput(''); await chat.send(text, area); requestAnimationFrame(() => composer.current?.focus()); }
  const pins = data?.map?.pins || [];
  const isAdded = place => pins.some(pin => pin.id === place.id || (pin.name === place.name && pin.position.lat === place.position.lat && pin.position.lng === place.position.lng));
  const hasHandoff = chat.messages.some(item => item.role === 'assistant' && item.content.includes('Preview places on the map, then choose Add to plan.'));
  return <aside className="canvas-chat" aria-label="Plan editing chat">
    <header className="canvas-chat-header"><div className="canvas-guide-heading"><span className="canvas-guide-icon" aria-hidden="true">✧</span><div><strong>Your travel companion</strong><small>Same conversation. A little more possibility.</small></div></div><button type="button" className="ds-icon-button" aria-label="Close plan chat" onClick={onClose}><Icon name="close" size={16}/></button></header>
    <div className="canvas-chat-history" ref={history} aria-label="Plan conversation" aria-busy={chat.loading || chat.active} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      {chat.loading && <p className="canvas-chat-status" role="status">Bringing your conversation with you…</p>}
      {chat.historyError && <div className="canvas-chat-error" role="alert"><p>{chat.historyError}</p><button type="button" className="ds-button small" onClick={chat.retryHistory}>Retry loading conversation</button></div>}
      {chat.messages.map(item => <article className={`canvas-chat-message canvas-chat-message-${item.role}`} key={item.message_id}>
        <p className="canvas-chat-author">{item.role === 'user' ? 'You' : '✧ Travella'}</p>
        {item.role === 'assistant' ? <ChatMarkdown content={item.content}/> : <p className="canvas-chat-user-text">{item.content}</p>}
        {item.status === 'streaming' && !item.content && <div className="canvas-chat-thinking" role="status"><span/><span/><span/><p>Looking into your trip…</p></div>}
        {item.suggestions?.length > 0 && <ActivitySuggestions surfaceId={`activity-${item.message_id}`} suggestions={item.suggestions} added={item.suggestions.filter(isAdded).map(place => place.id)} disabled={blocked || pins.length >= 50} onAction={(name, payload) => { const place = item.suggestions.find(value => value.id === payload?.id); if (!place) return; if (name === 'preview_activity') onPreview(place); else if (!blocked && pins.length < 50) onAdd([place]); }}/>} 
        {['stopped', 'interrupted'].includes(item.status) && <div className="canvas-chat-reply-status"><span>{item.status === 'stopped' ? 'Reply stopped' : 'Reply interrupted'}</span>{item.request && <button type="button" className="ds-text-button" disabled={blocked} onClick={() => chat.send(item.request, item.area)}>Retry</button>}</div>}
      </article>)}
      {!chat.loading && !hasHandoff && !chat.messages.some(item => item.message_id.startsWith('canvas-')) && <div className="canvas-chat-handoff"><strong>{generating ? 'Your draft is taking shape.' : 'Keep shaping your plan here.'}</strong><p>{generating ? 'When generation finishes, we can find activities and add your favorites to the map.' : 'Your trip context and conversation are with me. Find activities, compare a few ideas, and add the ones you like to your draft.'}</p><small>Choose Save plan when you’re ready to keep your changes.</small></div>}
      {chat.error && <p className="canvas-chat-error" role="alert">{chat.error}</p>}
      {!chat.loading && !chat.historyError && !chat.messages.some(item => item.message_id.startsWith('canvas-')) && <div className="canvas-chat-starters"><button type="button" disabled={blocked} onClick={() => chat.send('Find a few activities that fit this trip.', area)}>Find activities for my trip ↗</button><button type="button" disabled={blocked} onClick={() => chat.send('Find a few relaxed outdoor places to explore.', area)}>A little time outdoors ↗</button></div>}
    </div>
    <form className="canvas-chat-composer" onSubmit={send}>
      {area && <div className="canvas-chat-area"><Icon name="pin" size={13}/><span>Search within the map area</span><button type="button" className="ds-text-button" disabled={chat.active} onClick={onClearArea}>Use destination</button></div>}
      <div className="canvas-chat-input"><label className="sr-only" htmlFor="canvas-chat-message">Message your travel companion</label><textarea id="canvas-chat-message" ref={composer} value={input} onChange={event => setInput(event.target.value)} rows={2} maxLength={2000} placeholder="Ask a question or shape your plan…" disabled={blocked} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}/><div className="canvas-chat-send-row"><span>{generating ? 'Preparing your draft…' : 'Editing your draft'}</span>{chat.active ? <button type="button" className="ds-button small" onClick={chat.stop}>Stop</button> : <button type="submit" className="ds-button primary small" disabled={blocked || !input.trim()}>Send ↑</button>}</div></div>
      <p>Enter to send · Shift+Enter for a new line</p>
    </form>
  </aside>;
}
