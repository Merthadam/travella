import React, { useEffect, useRef, useState } from 'react';
import { ChatMarkdown } from '../components/ChatMarkdown';

export function TravelConversation({ chat, topic, visible, disabled, onDraftMessage }) {
  const [input, setInput] = useState('');
  const history = useRef(null), nearBottom = useRef(true), composer = useRef(null);
  const title = topic === 'stays' ? 'Accommodation assistant' : 'Flight assistant';
  useEffect(() => { if (visible && nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [chat.messages, visible]);
  useEffect(() => { if (onDraftMessage?.text) { setInput(onDraftMessage.text); composer.current?.focus(); } }, [onDraftMessage]);
  const blocked = disabled || chat.loading || chat.active || Boolean(chat.historyError);
  async function send(event) {
    event.preventDefault(); const text = input.trim(); if (!text || blocked) return;
    setInput(''); await chat.send(text); requestAnimationFrame(() => composer.current?.focus());
  }
  return <aside className="canvas-chat travel-conversation" aria-label={title}>
    <header className="canvas-chat-header"><div className="canvas-guide-heading"><div><strong>{title}</strong><small>Find the best fit among the options we check.</small></div></div></header>
    <div className="canvas-chat-history" ref={history} aria-label={`${topic === 'stays' ? 'Accommodation' : 'Flight'} discussion`} aria-busy={chat.active || chat.loading} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      {chat.loading && <p role="status">Loading your discussion…</p>}
      {chat.historyError && <div className="canvas-chat-error" role="alert"><p>{chat.historyError}</p><button type="button" className="ds-button" onClick={chat.retryHistory}>Retry loading discussion</button></div>}
      {!chat.loading && !chat.historyError && !chat.messages.length && <div className="canvas-chat-handoff"><strong>{topic === 'stays' ? 'Let’s find your base for this trip.' : 'Let’s work out your journey.'}</strong><p>{topic === 'stays' ? 'Tell me what matters in a stay: location, apartment space, a kitchen, or a quieter neighborhood.' : 'Tell me your departure airport and what matters most: price, convenient times, baggage, or fewer stops.'}</p><p>I’ll use your saved trip details, research a few options, and ask when a tradeoff needs your decision.</p></div>}
      {chat.messages.map((item, index) => <article key={item.message_id || index} className={`canvas-chat-message canvas-chat-message-${item.role}`}>
        <p className="canvas-chat-author">{item.role === 'user' ? 'You' : title}</p>
        {item.role === 'assistant' ? <div className="canvas-chat-markdown"><ChatMarkdown content={item.content || ''}/></div> : <p className="canvas-chat-user-text">{item.content}</p>}
        {item.status === 'streaming' && !item.content && <p role="status" className="canvas-chat-status">Researching your options…</p>}
        {['stopped', 'interrupted'].includes(item.status) && <p className="canvas-chat-status">{item.status === 'stopped' ? 'Reply stopped' : 'Reply interrupted'}</p>}
      </article>)}
      {chat.error && <p role="alert" className="canvas-chat-error">{chat.error}</p>}
    </div>
    <form className="canvas-chat-composer" onSubmit={send}>
      <div className="canvas-chat-input"><label className="sr-only" htmlFor={`travel-${topic}-message`}>Message {title.toLowerCase()}</label><textarea ref={composer} id={`travel-${topic}-message`} rows={3} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} disabled={blocked} placeholder={topic === 'stays' ? 'What would make a stay right for you?' : 'What matters most for your flight?'} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}/><div className="canvas-chat-send-row"><span>Enter to send · Shift + Enter for a new line</span>{chat.active ? <button type="button" className="ds-button" onClick={chat.stop}>Stop</button> : <button type="submit" className="ds-button primary" disabled={blocked || !input.trim()}>Send</button>}</div></div>
      <p>Only your explicit choices are saved to the trip. Nothing is booked.</p>
    </form>
  </aside>;
}
