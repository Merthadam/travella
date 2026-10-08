import { useEffect, useRef, useState } from 'react';
import { requestId } from '../../plansApi';
import { canvasEditResultSchema } from '../../design-system/a2ui/ActivitySuggestions';

export function useCanvasConversation({ selected, api, data, blocked, onExpired, onAdd, onBusyChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const runRef = useRef(null);
  const epoch = useRef(0);
  const callbacks = useRef(null); callbacks.current = { onExpired, onAdd, onBusyChange };
  const latest = useRef(null); latest.current = { data, blocked, loading, historyError, suggestions };
  function update(id, change) { setMessages(current => current.map(item => item.message_id === id ? { ...item, ...change } : item)); }

  useEffect(() => {
    const generation = ++epoch.current;
    setMessages([]); setLoading(true); setHistoryError(''); setError(''); setSuggestions([]); setActive(false);
    api.conversationMessages(selected).then(items => {
      if (generation !== epoch.current) return;
      setMessages((Array.isArray(items) ? items : []).map((item, index) => ({ ...item, message_id: item.message_id || `history-${index}`, content: String(item.content || '') })));
    }).catch(err => {
      if (generation !== epoch.current) return;
      if (err.status === 401) callbacks.current.onExpired?.();
      setHistoryError('Your conversation could not load. Retry to continue with its context.');
    }).finally(() => { if (generation === epoch.current) setLoading(false); });
    return () => {
      epoch.current += 1;
      const run = runRef.current; runRef.current = null;
      if (run) { run.controller.abort(); api.cancelAgentTurn(selected, run.id).catch(() => {}); }
      callbacks.current.onBusyChange?.(false);
    };
  }, [api, selected.plan_id, historyVersion]);

  async function send(message, area = null) {
    const current = latest.current;
    if (!message.trim() || runRef.current || current.blocked || current.loading || current.historyError || !current.data) return false;
    const id = requestId(); const assistantId = `canvas-assistant-${id}`;
    const run = { id, assistantId, controller: new AbortController(), epoch: epoch.current };
    const draft = structuredClone(current.data);
    runRef.current = run; setActive(true); callbacks.current.onBusyChange?.(true); setError('');
    setMessages(items => [...items, { message_id: `canvas-user-${id}`, role: 'user', content: message, status: 'complete' }, { message_id: assistantId, role: 'assistant', content: '', status: 'streaming', request: message, area }]);
    let pending = null;
    try {
      const terminal = await api.editCanvas(selected, { draft: { components: draft }, suggestions: current.suggestions, area }, message, id, {
        signal: run.controller.signal,
        onEvent(event) {
          if (runRef.current !== run || epoch.current !== run.epoch) return;
          if (event.type === 'TEXT_MESSAGE_CONTENT') setMessages(items => items.map(item => item.message_id === assistantId ? { ...item, content: item.content + event.delta } : item));
          if (event.type === 'STATE_SNAPSHOT' && event.snapshot.canvas_edit_result) pending = canvasEditResultSchema.parse(event.snapshot.canvas_edit_result);
        },
      });
      if (runRef.current !== run || epoch.current !== run.epoch) return false;
      if (['error', 'interrupted'].includes(terminal.status)) throw new Error(terminal.message || 'The reply could not finish. Your draft is safe.');
      if (terminal.status === 'stopped') { update(assistantId, { status: 'stopped' }); return false; }
      if (!pending) throw new Error('The reply ended without a complete update. Your draft is unchanged.');
      const known = new Map([...current.suggestions, ...pending.suggestions].map(place => [place.id, place]));
      const additions = pending.add_ids.map(placeId => known.get(placeId));
      if (additions.some(place => !place)) throw new Error('An unrecognized place update was rejected. Your draft is unchanged.');
      if (additions.length && !callbacks.current.onAdd(additions, JSON.stringify(draft))) throw new Error('Your draft changed during the reply. Review the suggestions and add them again.');
      if (pending.suggestions.length) setSuggestions(pending.suggestions);
      update(assistantId, { status: 'complete', suggestions: pending.suggestions, resultArea: pending.area });
      return true;
    } catch (err) {
      if (runRef.current !== run || epoch.current !== run.epoch) return false;
      if (err.status === 401) callbacks.current.onExpired?.();
      if (err.status === 422 || /suggestions expired or changed/i.test(err.message || '')) setSuggestions([]);
      update(assistantId, { status: err.name === 'AbortError' ? 'stopped' : 'interrupted' });
      if (err.name !== 'AbortError') setError(err.message || 'The connection stopped. Your draft is safe; retry the reply.');
      await api.cancelAgentTurn(selected, id).catch(() => {});
      return false;
    } finally {
      if (runRef.current === run && epoch.current === run.epoch) { runRef.current = null; setActive(false); callbacks.current.onBusyChange?.(false); }
    }
  }

  async function stop() {
    const run = runRef.current; if (!run) return;
    // Ignore late events immediately, while keeping editing locked until the
    // cancellation request returns. A stopped run never applies draft changes.
    runRef.current = null; run.controller.abort(); update(run.assistantId, { status: 'stopped' });
    try { await api.cancelAgentTurn(selected, run.id); }
    catch { if (epoch.current === run.epoch) setError('The reply stopped locally. Cancellation could not be confirmed; retry in a moment.'); }
    finally { if (epoch.current === run.epoch) { setActive(false); callbacks.current.onBusyChange?.(false); } }
  }
  return { messages, loading, historyError, error, active, suggestions, send, stop, retryHistory: () => setHistoryVersion(value => value + 1) };
}
