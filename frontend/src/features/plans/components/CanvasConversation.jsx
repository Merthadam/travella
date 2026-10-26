import React, { useEffect, useRef, useState } from 'react';
import { ActivitySuggestions } from '../../../design-system/a2ui/ActivitySuggestions';
import { Icon } from '../../../design-system/components/primitives';
import { ChatMarkdown } from './ChatMarkdown';
import { ChatHeader, ChatComposer } from './ChatControls';
import { TravelPreviews } from '../travel/CanvasTravel';

export function CanvasConversation({ chat, data, disabled, generating, onClose, onPreview, onAdd, area, onClearArea, collapseRef, visible, onOpenTravel }) {
  const [input, setInput] = useState('');
  const history = useRef(null); const nearBottom = useRef(true); const composer = useRef(null);
  useEffect(() => { if (visible && nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [chat.messages, chat.active, visible]);
  const blocked = disabled || chat.loading || Boolean(chat.historyError) || chat.active;
  async function send(event) { event.preventDefault(); const text = input.trim(); if (!text || blocked) return; setInput(''); await chat.send(text, area); requestAnimationFrame(() => composer.current?.focus()); }
  const pins = data?.map?.pins || [];
  const isAdded = place => pins.some(pin => pin.id === place.id || (pin.name === place.name && pin.position.lat === place.position.lat && pin.position.lng === place.position.lng));
  return <aside className="canvas-chat" aria-label="Plan editing chat">
    <ChatHeader title="Plan chat" subtitle={data?.map?.destination || 'Find places and update your draft'} collapseRef={collapseRef} collapseLabel="Collapse plan chat" panelId="plan-chat-panel" onClose={onClose}/>
    <div className="canvas-chat-history" ref={history} aria-label="Plan conversation" aria-busy={chat.loading || chat.active} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      {chat.loading && <p className="canvas-chat-status" role="status">Loading conversation…</p>}
      {chat.historyError && <div className="canvas-chat-error" role="alert"><p>{chat.historyError}</p><button type="button" className="ds-button small" onClick={chat.retryHistory}>Retry loading conversation</button></div>}
      {chat.messages.map(item => <article className={`canvas-chat-message canvas-chat-message-${item.role}`} key={item.message_id}>
        <p className="canvas-chat-author">{item.role === 'user' ? 'You' : 'Travella'}</p>
        {item.role === 'assistant' ? <div className="canvas-chat-markdown"><ChatMarkdown content={item.content}/></div> : <p className="canvas-chat-user-text">{item.content}</p>}
        {item.status === 'streaming' && !item.content && <div className="canvas-chat-thinking" role="status"><span/><span/><span/><p>Looking into your trip…</p></div>}
        {item.travel?.map(snapshot => <TravelPreviews key={snapshot.search_id} snapshot={snapshot} reason={chat.travelReason(snapshot)} onOpen={onOpenTravel}/>)}
        {item.suggestions?.length > 0 && <ActivitySuggestions surfaceId={`activity-${item.message_id}`} suggestions={item.suggestions} added={item.suggestions.filter(isAdded).map(place => place.id)} disabled={blocked || pins.length >= 50} onAction={(name, payload) => { const place = item.suggestions.find(value => value.id === payload?.id); if (!place) return; if (name === 'preview_activity') onPreview(place); else if (!blocked && pins.length < 50) onAdd([place]); }}/>} 
        {['stopped', 'interrupted'].includes(item.status) && <div className="canvas-chat-reply-status"><span>{item.status === 'stopped' ? 'Reply stopped' : 'Reply interrupted'}</span>{item.request && <button type="button" className="ds-text-button" disabled={blocked} onClick={() => chat.send(item.request, item.area)}>Retry</button>}</div>}
      </article>)}
      {!chat.loading && !chat.historyError && chat.messages.length === 0 && <div className="canvas-chat-handoff"><strong>{generating ? 'Your draft is taking shape.' : 'Find places for your trip.'}</strong><p>{generating ? 'When generation finishes, we can find activities and add your favorites to the map.' : 'Ask for a place by name or describe what you want to do. Preview results on the map, then choose Add to plan.'}</p></div>}
      {chat.error && <p className="canvas-chat-error" role="alert">{chat.error}</p>}
      {!chat.loading && !chat.historyError && chat.messages.length === 0 && <div className="canvas-chat-starters"><button type="button" disabled={blocked} onClick={() => chat.send('Find a few activities that fit this trip.', area)}>Find activities</button><button type="button" disabled={blocked} onClick={() => chat.send('Find a few relaxed outdoor places to explore.', area)}>Find parks and walks</button></div>}
    </div>
    <ChatComposer id="canvas-chat-message" label="Message Travella" placeholder="Ask about your trip…" input={input} setInput={setInput} composerRef={composer} visible={visible} blocked={blocked} active={chat.active} onSend={send} onStop={chat.stop} hint={generating ? 'Preparing your draft…' : undefined} footer="Places you add are saved automatically to your draft.">
      {area && <div className="canvas-chat-area"><Icon name="pin" size={13}/><span>Search within the map area</span><button type="button" className="ds-text-button" disabled={chat.active} onClick={onClearArea}>Use destination</button></div>}
    </ChatComposer>
  </aside>;
}
