import React, { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';
import { A2uiTripBrief } from './A2uiTripBrief';
import { ChatMarkdown } from './ChatMarkdown';
import { useTripContext } from '../useTripContext';
import './research-conversation.css';
import { CanvasGenerationReview, PlanStages } from './CanvasGenerationReview';

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

export function PlanConversation({ selected, api, onExpired, onBack, onCanvas }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [slowReply, setSlowReply] = useState(false);
  const [review, setReview] = useState(null);
  const history = useRef(null);
  const composer = useRef(null);
  const activeRef = useRef(null);
  const onExpiredRef = useRef(onExpired);
  const nearBottom = useRef(true);
  const planId = selected?.plan_id;
  const brief = useTripContext(api, planId, onExpired);
  onExpiredRef.current = onExpired;
  const replyContent = active ? messages.find(item => item.client_id === active.assistantId)?.content : '';
  const replyStatus = active?.stopping ? 'Stopping reply…' : slowReply ? 'Still waiting for a response…' : replyContent ? 'Receiving reply…' : 'Waiting for Travella…';

  useEffect(() => {
    setSlowReply(false);
    if (!active) return;
    const timer = setTimeout(() => setSlowReply(true), 20000);
    return () => clearTimeout(timer);
  }, [active?.eventId, replyContent]);

  useEffect(() => {
    const input = composer.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [draft]);

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
      if (result?.status) updateMessage(assistantId, { status: ['needs your input', 'shortlist_ready'].includes(result.status) ? 'complete' : result.status === 'error' ? 'interrupted' : result.status });
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
    if (!message || loading || activeRef.current || brief.loading || brief.saving || brief.locked || brief.error) return;
    nearBottom.current = true;
    setDraft('');
    await runTurn(message);
  }

  async function stop() {
    const turn = activeRef.current;
    if (!turn) return;
    setActive(current => current ? { ...current, stopping: true } : current);
    try {
      if (api.cancelAgentTurn) {
        const result = await api.cancelAgentTurn(selected, turn.eventId);
        if (result?.cancelled === false) {
          setActive(current => current ? { ...current, stopping: false } : current);
          return;
        }
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
    {onCanvas && <div className="chat-canvas-entry"><PlanStages/><div className="research-canvas-actions"><button type="button" onClick={() => onCanvas(false)} disabled={Boolean(active) || brief.loading || brief.saving || brief.locked || Boolean(brief.error)}>Open canvas</button><button type="button" className="primary" onClick={() => setReview({ context: structuredClone(brief.context), revision: brief.revision })} disabled={loading || Boolean(active) || brief.loading || brief.saving || brief.locked || Boolean(brief.error)}>Review & generate</button></div></div>}
    {review && <CanvasGenerationReview context={review.context} onCancel={() => setReview(null)} onConfirm={() => { setReview(null); onCanvas(true, review.revision); }}/>}
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
          <div className="chat-message-content"><p className="chat-message-author">{item.role === 'user' ? 'You' : 'Travella'}</p>
            {item.role === 'assistant' ? <ChatMarkdown content={item.content} /> : <p className="chat-message-text">{item.content}</p>}
            {active?.assistantId === item.client_id && !item.content && <div className="research-reply-pending" aria-hidden="true"><span/><span/><span/></div>}
            <SourceLinks sources={item.sources} />
            {['stopped', 'interrupted'].includes(item.status) && <p className="chat-message-status">{item.status === 'stopped' ? 'Stopped' : 'Interrupted'}</p>}
            {retryMessage && !active && <button className="chat-retry" onClick={() => retry(retryMessage)}>Retry</button>}
          </div>
        </article>;
      })}
    </section>
    <form className="chat-composer research-composer" onSubmit={send}>
      <div className="research-composer-box">
      <label className="sr-only" htmlFor="conversation-message">Message Travella</label>
      <textarea ref={composer} id="conversation-message" aria-label="Message Travella" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} rows={1} maxLength={2000} aria-describedby="research-composer-status" placeholder="Ask about your trip…" disabled={loading || brief.loading || Boolean(active) || brief.locked} />
      <div className="research-composer-tools"><span className="research-keyboard-hint">Enter to send <span>· Shift + Enter for a new line</span></span>
      {active ? <button className="chat-stop" type="button" disabled={active.stopping} onClick={stop} aria-label="Stop" title="Stop reply"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg></button> : <button className="chat-send" type="submit" aria-label="Send" title="Send message" disabled={loading || brief.loading || brief.saving || brief.locked || Boolean(brief.error) || !draft.trim()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>}
      </div></div>
      <p className={`research-composer-status${active ? ' is-active' : ''}`} id="research-composer-status" role="status" aria-label="Reply status" aria-live="polite" aria-atomic="true">{active ? <><span className="research-status-dot" aria-hidden="true"/>{replyStatus}</> : loading || brief.loading ? 'Loading your conversation…' : brief.saving ? 'Saving trip details…' : brief.locked ? 'Another reply is in progress…' : brief.error ? 'Trip details unavailable. Refresh to try again.' : error ? 'Reply interrupted. You can retry above.' : ''}</p>
    </form>
    </main>
    <A2uiTripBrief key={planId} messages={brief.messages} value={brief.context} onChange={brief.update} locked={Boolean(active) || brief.loading || brief.locked} saving={brief.saving} error={brief.error} />
  </div>;
}
