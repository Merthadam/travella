import React, { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';
import { A2uiTripBrief } from './A2uiTripBrief';
import { useTripContext } from '../useTripContext';

const safeSources = values => (Array.isArray(values) ? values : []).filter(item => {
  if (!item?.url || !item?.title) return false;
  try { return new URL(item.url).protocol === 'https:'; } catch { return false; }
});

function hydrateMessage(item) {
  const content = String(item.content || '');
  const marker = content.lastIndexOf('\n\nSources:\n');
  if (marker < 0) return item;
  const sources = content.slice(marker + 11).split('\n').map(line => {
    const match = line.match(/^- \[(.{1,120})\]\((https:\/\/[^)\s]{1,320})\)$/);
    return match ? { title: match[1], url: match[2] } : null;
  }).filter(Boolean);
  return { ...item, content: content.slice(0, marker), sources: safeSources([...(item.sources || []), ...sources]) };
}

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
  const brief = useTripContext(api, planId, onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    let mounted = true;
    setMessages([]); setError(''); setLoading(true); setActive(null);
    api.conversationMessages({ plan_id: planId }).then(result => {
      if (mounted) setMessages(Array.isArray(result) ? result.map(hydrateMessage) : []);
    }).catch(err => {
      if (!mounted) return;
      if (err.status === 401) onExpiredRef.current();
      else setError(err.message || 'Could not load this conversation.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; activeRef.current?.controller.abort(); activeRef.current = null; };
  }, [api, planId]);

  useEffect(() => {
    if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages]);

  function updateMessage(id, update) {
    setMessages(current => current.map(item => item.client_id === id || item.message_id === id ? { ...item, ...update } : item));
  }

  async function runTurn(message) {
    const eventId = requestId();
    const assistantId = `assistant-${eventId}`;
    const timestamp = new Date().toISOString();
    const controller = new AbortController();
    const surfaceMessages = [];
    activeRef.current = { eventId, assistantId, controller, stopped: false };
    setActive({ eventId, assistantId }); setError('');
    setMessages(current => [...current, { client_id: `user-${eventId}`, message_id: `user-${eventId}`, event_id: `${eventId}:user`, role: 'user', content: message, status: 'complete', created_at: timestamp }]);
    setMessages(current => [...current, { client_id: assistantId, message_id: assistantId, event_id: `${eventId}:assistant`, role: 'assistant', content: '', status: 'streaming', sources: [], created_at: timestamp }]);
    try {
      if (!api.agentTurnStream) throw new Error('Live replies are unavailable. Try again.');
      const result = await api.agentTurnStream(selected, message, eventId, {
        signal: controller.signal,
        onEvent(event) {
          if (activeRef.current?.eventId !== eventId) return;
          if (event.type === 'CUSTOM' && event.name === 'a2ui') {
            surfaceMessages.push(event.value);
          } else if (event.type === 'STATE_SNAPSHOT' && event.snapshot?.trip_context) {
            brief.accept({ ...event.snapshot.trip_context, a2ui_messages: surfaceMessages });
          } else if (event.type === 'TEXT_MESSAGE_CONTENT' && typeof event.delta === 'string') {
            setMessages(current => current.map(item => item.client_id === assistantId ? { ...item, content: item.content + event.delta } : item));
          } else if (event.type === 'TERMINAL' || event.type === 'RUN_FINISHED') {
            const status = event.status || event.outcome?.type || 'complete';
            updateMessage(assistantId, { status: status === 'success' || ['needs your input', 'shortlist_ready'].includes(status) ? 'complete' : status === 'error' ? 'interrupted' : status, sources: safeSources(event.sources) });
            if (status === 'error') setError(event.message || 'The reply could not be completed. You can retry.');
          }
        },
      });
      if (activeRef.current?.eventId !== eventId) return;
      if (result?.sources?.length) updateMessage(assistantId, { sources: safeSources(result.sources) });
      if (result?.status) updateMessage(assistantId, { status: ['needs your input', 'shortlist_ready'].includes(result.status) ? 'complete' : result.status });
    } catch (err) {
      if (activeRef.current?.eventId !== eventId) return;
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
    if (!message || active || brief.loading || brief.saving || brief.locked || brief.error) return;
    setDraft('');
    await runTurn(message);
  }

  async function stop() {
    const turn = activeRef.current;
    if (!turn) return;
    try {
      if (api.cancelAgentTurn) {
        const result = await api.cancelAgentTurn(selected, turn.eventId);
        if (result?.cancelled === false) return;
      } else turn.controller.abort();
      turn.stopped = true;
      updateMessage(turn.assistantId, { status: 'stopped' });
    } catch {
      turn.controller.abort();
    }
  }

  function retry(message) {
    if (active || brief.loading || brief.saving || brief.locked || brief.error) return;
    runTurn(message);
  }

  return <div className="chat-layout">
    <main className="chat-page" id="conversation-main">
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
      }} rows={1} maxLength={2000} placeholder="Ask anything about your trip…" disabled={loading || brief.loading || Boolean(active) || brief.locked} />
      {active ? <button className="chat-stop" type="button" onClick={stop}>Stop</button> : <button className="chat-send" type="submit" disabled={loading || brief.loading || brief.saving || brief.locked || Boolean(brief.error) || !draft.trim()}>Send</button>}
      <p className="chat-composer-hint">Enter to send · Shift+Enter for a new line</p>
    </form>
    </main>
    <A2uiTripBrief key={planId} messages={brief.messages} value={brief.context} onChange={brief.update} locked={Boolean(active) || brief.loading || brief.locked} saving={brief.saving} error={brief.error} />
  </div>;
}
