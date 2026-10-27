import React, { useEffect, useRef, useState } from 'react';
import { ChatMarkdown } from '../components/ChatMarkdown';
import { ChatHeader, ChatComposer } from '../components/ChatControls';
import { TravelContextSummary } from './TravelContextSummary';

export function TravelConversation({ chat, topic, visible, disabled, contextOptions = [], onClearContext, onClose, brief, pendingEdits, renderReferences, notes }) {
  const [input, setInput] = useState('');
  const history = useRef(null), nearBottom = useRef(true), composer = useRef(null);
  const title = topic === 'stays' ? 'Accommodation assistant' : 'Flight assistant';
  const prompts = topic === 'stays' ? ['Find stays near my activities', 'Help me choose an area', 'Look for an apartment with a kitchen'] : ['Find flights that fit my trip', 'Help me compare baggage and fares', 'Prioritize convenient flight times'];
  function draft(text) { setInput(text); requestAnimationFrame(() => composer.current?.focus()); }
  useEffect(() => { if (visible && nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [chat.messages, chat.active, visible]);
  useEffect(() => { if (contextOptions.length) composer.current?.focus(); }, [contextOptions]);
  const blocked = disabled || chat.loading || chat.active || Boolean(chat.historyError);
  async function send(event) {
    event.preventDefault(); const text = input.trim(); if (!text || blocked) return;
    const submitted = input;
    const sent = await chat.send(text, contextOptions.length ? { intent: 'discuss', options: contextOptions.map(item => item.reference) } : undefined);
    if (sent) { setInput(current => current === submitted ? '' : current); onClearContext?.(); }
  }
  return <aside className="canvas-chat travel-conversation" aria-label={title}>
    <ChatHeader title={topic === 'stays' ? 'Stay chat' : 'Flight chat'} subtitle="Your trip, with a focused discussion" collapseLabel={`Collapse ${topic === 'stays' ? 'accommodation' : 'flight'} chat`} panelId={`travel-${topic}-chat`} onClose={onClose}/>
    <div className="travel-chat-context"><TravelContextSummary brief={brief}/>{pendingEdits && <p className="travel-pending-context" role="status">Your unfinished canvas edits are not included yet. Finish saving them to update this discussion.</p>}</div>
    <div className="canvas-chat-history" ref={history} aria-label={`${topic === 'stays' ? 'Accommodation' : 'Flight'} discussion`} aria-busy={chat.active || chat.loading} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      {chat.loading && <p role="status">Loading your discussion…</p>}
      {chat.historyError && <div className="canvas-chat-error" role="alert"><p>{chat.historyError}</p><button type="button" className="ds-button" onClick={chat.retryHistory}>Retry loading discussion</button></div>}
      {!chat.loading && !chat.historyError && !chat.messages.length && <div className="canvas-chat-handoff"><strong>{topic === 'stays' ? 'What makes a stay right for you?' : 'What makes a flight right for you?'}</strong><p>Tell me what matters, or ask about an option as you browse.</p><div className="canvas-chat-starters">{prompts.map(prompt => <button key={prompt} type="button" disabled={blocked} onClick={() => draft(prompt)}>{prompt}</button>)}</div></div>}
      {chat.messages.map((item, index) => <article key={item.message_id || index} className={`canvas-chat-message canvas-chat-message-${item.role}`}>
        <p className="canvas-chat-author">{item.role === 'user' ? 'You' : 'Travella'}</p>
        {item.role === 'assistant' ? <div className="canvas-chat-markdown"><ChatMarkdown content={item.content || ''}/></div> : <p className="canvas-chat-user-text">{item.content}</p>}
        {item.status === 'streaming' && !item.content && <div className="canvas-chat-thinking" role="status"><span/><span/><span/><p>Researching your options…</p></div>}
        {item.role === 'assistant' && renderReferences?.(item)}
        {['stopped', 'interrupted'].includes(item.status) && <p className="canvas-chat-status">{item.status === 'stopped' ? 'Reply stopped' : 'Reply interrupted'}</p>}
      </article>)}
      {notes}
      {chat.error && <p role="alert" className="canvas-chat-error">{chat.error}</p>}
    </div>
    <ChatComposer id={`travel-${topic}-message`} label={`Message ${title.toLowerCase()}`} placeholder={topic === 'stays' ? 'Ask about stays…' : 'Ask about flights…'} input={input} setInput={setInput} composerRef={composer} visible={visible} blocked={disabled || chat.loading || Boolean(chat.historyError)} active={chat.active} onSend={send} onStop={chat.stop} footer="Choose what to save. Nothing is booked.">{contextOptions.length > 0 && <div className="travel-discussion-context" role="status"><span>Discussing {contextOptions.map(item => item.title).join(' · ')}</span><button type="button" className="ds-text-button" aria-label="Remove discussion context" disabled={chat.active} onClick={onClearContext}>×</button></div>}</ChatComposer>
  </aside>;
}
