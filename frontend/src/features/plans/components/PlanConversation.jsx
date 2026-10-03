import React, { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';

const safeSources = values => (Array.isArray(values) ? values : []).filter(item => {
  if (!item?.url || !item?.title) return false;
  try { return new URL(item.url).protocol === 'https:'; } catch { return false; }
});

function SourceLinks({ sources }) {
  const links = safeSources(sources);
  if (!links.length) return null;
  return <ul className="chat-sources" aria-label="Sources">
    {links.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a></li>)}
  </ul>;
}

function messageKey(message) { return message.message_id || `${message.role}-${message.event_id || message.sequence || message.created_at}`; }

export function PlanConversation({ selected, api, onExpired, onBack }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const history = useRef(null);
  const composer = useRef(null);
  const activeRef = useRef(null);
  const onExpiredRef = useRef(onExpired);
  const nearBottom = useRef(true);
  const planId = selected?.plan_id;
  onExpiredRef.current = onExpired;

  useEffect(() => {
    let mounted = true;
    setMessages([]); setError(''); setLoading(true);
    api.conversationMessages({ plan_id: planId }).then(result => {
      if (mounted) setMessages(Array.isArray(result) ? result : []);
    }).catch(err => {
      if (!mounted) return;
      if (err.status === 401) onExpiredRef.current();
      else setError(err.message || 'Could not load this conversation.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; activeRef.current?.controller.abort(); };
  }, [api, planId]);

  useEffect(() => {
    if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages]);

  function updateMessage(id, update) {
    setMessages(current => current.map(item => item.client_id === id || item.message_id === id ? { ...item, ...update } : item));
  }

  async function runTurn(message, { retry = false } = {}) {
    const eventId = requestId();
    const assistantId = `assistant-${eventId}`;
    const timestamp = new Date().toISOString();
    const controller = new AbortController();
    activeRef.current = { eventId, assistantId, controller, stopped: false };
    setActive({ eventId, assistantId }); setError('');
    if (!retry) setMessages(current => [...current, { client_id: `user-${eventId}`, message_id: `user-${eventId}`, event_id: `${eventId}:user`, role: 'user', content: message, status: 'complete', created_at: timestamp }]);
    setMessages(current => [...current, { client_id: assistantId, message_id: assistantId, event_id: `${eventId}:assistant`, role: 'assistant', content: '', status: 'streaming', sources: [], created_at: timestamp }]);
    try {
      if (!api.agentTurnStream) throw new Error('Live replies are unavailable. Try again.');
      const result = await api.agentTurnStream(selected, message, eventId, {
        signal: controller.signal,
        onEvent(event) {
          if (activeRef.current?.eventId !== eventId) return;
          if (event.type === 'TEXT_MESSAGE_CONTENT' && typeof event.delta === 'string') {
            setMessages(current => current.map(item => item.client_id === assistantId ? { ...item, content: item.content + event.delta } : item));
          } else if (event.type === 'TERMINAL' || event.type === 'RUN_FINISHED') {
            const status = event.status || event.outcome?.type || 'complete';
            updateMessage(assistantId, { status: status === 'success' ? 'complete' : status, sources: safeSources(event.sources) });
          }
        },
      });
      if (result?.sources?.length) updateMessage(assistantId, { sources: safeSources(result.sources) });
      if (result?.status) updateMessage(assistantId, { status: result.status });
    } catch (err) {
      const stopped = activeRef.current?.eventId === eventId && activeRef.current.stopped;
      if (err.status === 401) onExpiredRef.current();
      if (stopped || err.name === 'AbortError') updateMessage(assistantId, { status: 'stopped' });
      else {
        updateMessage(assistantId, { status: 'interrupted' });
        if (!err.status || err.status >= 500) setError(err.message || 'The connection stopped. You can retry this reply.');
        else setError(err.message || 'The reply could not be completed.');
      }
    } finally {
      if (activeRef.current?.eventId === eventId) activeRef.current = null;
      setActive(current => current?.eventId === eventId ? null : current);
      requestAnimationFrame(() => composer.current?.focus());
    }
  }

  async function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || active) return;
    setDraft('');
    await runTurn(message);
  }

  function stop() {
    const turn = activeRef.current;
    if (!turn) return;
    turn.stopped = true;
    updateMessage(turn.assistantId, { status: 'stopped' });
    turn.controller.abort();
  }

  function retry(message) {
    if (active) return;
    runTurn(message, { retry: true });
  }

  return <main className="chat-page" id="conversation-main">
    <section className="chat-transcript" aria-label="Plan conversation" aria-busy={loading || Boolean(active)} ref={history} onScroll={event => {
      const node = event.currentTarget;
      nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
    }}>
      {loading && <p className="chat-status" role="status">Loading conversation…</p>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      {!loading && !messages.length && <div className="chat-empty"><p className="eyebrow">YOUR TRAVEL RESEARCHER</p><h2>Where would you like to go?</h2><p>Ask about a place, or tell me what kind of trip you’re imagining.</p></div>}
      {messages.map((item, index) => {
        const previous = messages[index - 1];
        const retryMessage = item.role === 'assistant' && item.status === 'interrupted' && previous?.role === 'user' ? previous.content : '';
        return <article key={messageKey(item)} className={`chat-message chat-message-${item.role}`}>
          <div className="chat-message-content"><p className="chat-message-author">{item.role === 'user' ? 'You' : 'Travella'}</p><p className="chat-message-text">{item.content}</p>
            <SourceLinks sources={item.sources} />
            {['stopped', 'interrupted'].includes(item.status) && <p className="chat-message-status">{item.status === 'stopped' ? 'Stopped' : 'Interrupted'}</p>}
            {retryMessage && !active && <button className="chat-retry" onClick={() => retry(retryMessage)}>Retry</button>}
          </div>
        </article>;
      })}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{active ? 'Travella is replying.' : ''}</div>
    </section>
    <form className="chat-composer" onSubmit={send}>
      <label className="sr-only" htmlFor="conversation-message">Message Travella</label>
      <textarea ref={composer} id="conversation-message" aria-label="Message Travella" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} rows={1} maxLength={2000} placeholder="Ask anything about your trip…" disabled={loading || Boolean(active)} />
      {active ? <button className="chat-stop" type="button" onClick={stop}>Stop</button> : <button className="chat-send" type="submit" disabled={loading || !draft.trim()}>Send</button>}
      <p className="chat-composer-hint">Enter to send · Shift+Enter for a new line</p>
    </form>
  </main>;
}
