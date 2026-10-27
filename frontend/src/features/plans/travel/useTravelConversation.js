import { useCallback, useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';

// Each mounted workspace owns its transcript and draft. A stopped run remains
// locked until the server acknowledges cancellation, including a pending commit.
export function useTravelConversation({ api, selected, topic, visible, blocked, onExpired, onBusyChange, getWorkspaceContext, onWorkspaceRunStart, onWorkspaceRunEnd, onWorkspaceUpdate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const run = useRef(null), epoch = useRef(0), callbacks = useRef({});
  callbacks.current = { onExpired, onBusyChange, getWorkspaceContext, onWorkspaceRunStart, onWorkspaceRunEnd, onWorkspaceUpdate };
  const refresh = useCallback(async () => {
    const version = epoch.current;
    const result = await api.travelTopic(selected, topic);
    if (version !== epoch.current) return;
    if (result.plan_id !== selected.plan_id || result.topic !== topic) throw new Error('This discussion could not be loaded safely.');
    setSnapshot(result); setMessages(result.messages || []); setHistoryError('');
    return result;
  }, [api, selected.plan_id, topic]);
  const load = useCallback(async () => {
    setLoading(true); setHistoryError('');
    try { await refresh(); }
    catch (err) { if (err.status === 401) callbacks.current.onExpired?.(); setHistoryError('Your discussion could not load. Retry to continue.'); }
    finally { setLoading(false); }
  }, [refresh]);
  useEffect(() => {
    epoch.current++; void load();
    return () => { epoch.current++; const current = run.current; run.current = null; if (current) { callbacks.current.onWorkspaceRunEnd?.(current.id); current.controller.abort(); api.cancelAgentTurn(selected, current.id).catch(() => {}); } callbacks.current.onBusyChange?.(topic, false); };
  }, [load]);
  useEffect(() => { if (visible && snapshot && !run.current) void refresh().catch(err => { if (err.status === 401) callbacks.current.onExpired?.(); setHistoryError('Refresh this discussion before continuing.'); }); }, [visible]);

  function finish(current) {
    if (run.current !== current) return;
    callbacks.current.onWorkspaceRunEnd?.(current.id);
    run.current = null; setActive(false); callbacks.current.onBusyChange?.(topic, false);
  }
  async function stop() {
    const current = run.current; if (!current) return true;
    if (current.stopping) return current.stopping;
    current.cancelled = true; callbacks.current.onWorkspaceRunEnd?.(current.id); current.controller.abort();
    current.stopping = (async () => {
      try {
        await api.cancelAgentTurn(selected, current.id);
        let latest;
        for (let attempt = 0; attempt < 20; attempt++) {
          latest = await refresh();
          if (!latest?.locked) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (latest?.locked) throw new Error('The server is still finishing the reply.');
        finish(current); return true;
      } catch (err) {
        if (err.status === 401) callbacks.current.onExpired?.();
        setError('Cancellation could not be confirmed. Retry Stop before leaving or sending another message.'); return false;
      } finally { current.stopping = null; }
    })();
    return current.stopping;
  }
  async function send(text, travelDiscussion, options = {}) {
    const message = text.trim();
    const explicitComparison = options.explicitComparison === true && travelDiscussion?.intent === 'compare' && travelDiscussion.options?.length >= 2 && travelDiscussion.options.length <= 3;
    if (!message || blocked || loading || historyError || run.current || (!visible && !explicitComparison)) return false;
    const current = { id: requestId(), controller: new AbortController(), epoch: epoch.current, cancelled: false,
      workspaceContext: callbacks.current.getWorkspaceContext?.(), briefDigest: snapshot?.brief?.digest, pendingUpdate: null };
    callbacks.current.onWorkspaceRunStart?.({ run_id: current.id, brief_digest: current.briefDigest });
    run.current = current; setActive(true); callbacks.current.onBusyChange?.(topic, true); setError('');
    setMessages(items => [...items, { message_id: `${current.id}-user`, role: 'user', content: message }, { message_id: current.id, role: 'assistant', content: '', status: 'streaming' }]);
    try {
      const terminal = await api.travelTurn(selected, topic, message, current.id, {
        signal: current.controller.signal, travelDiscussion, workspaceContext: current.workspaceContext,
        onEvent(event) {
          if (run.current !== current || current.cancelled || current.epoch !== epoch.current) return;
          if (event.type === 'STATE_SNAPSHOT' && event.snapshot?.workspace_update) current.pendingUpdate = event.snapshot.workspace_update;
          if (event.type === 'TEXT_MESSAGE_CONTENT') setMessages(items => items.map(item => item.message_id === current.id ? { ...item, content: item.content + event.delta } : item));
        },
      });
      if (current.cancelled || run.current !== current) return false;
      const latest = await refresh();
      if (!current.cancelled && run.current === current && current.epoch === epoch.current &&
          ['complete', 'needs your input', 'shortlist_ready'].includes(terminal.status) && latest?.brief?.digest === current.briefDigest) {
        const update = terminal.workspace_update || current.pendingUpdate;
        if (update) callbacks.current.onWorkspaceUpdate?.(update);
      }
      if (['error', 'interrupted'].includes(terminal.status)) setError(terminal.message || 'The reply was interrupted. Your saved choices are safe.');
      return !['error', 'interrupted', 'stopped'].includes(terminal.status) && latest;
    } catch (err) {
      if (current.cancelled || current.epoch !== epoch.current) return false;
      if (err.status === 401) callbacks.current.onExpired?.();
      setError(err.message || 'The connection stopped before the reply finished.');
      await stop(); return false;
    } finally { if (!current.cancelled && current.epoch === epoch.current) finish(current); }
  }
  function acceptReceipt(value) {
    if (value?.plan_id !== selected.plan_id || value.topic !== topic) return;
    setSnapshot(previous => !previous || value.revision >= previous.revision ? value : previous);
    // Only a successfully completed host operation can reconcile an interrupted
    // local run. Its receipt proves the server accepted the operation's lease.
    if (run.current?.cancelled && !value.locked) finish(run.current);
  }
  return { snapshot, messages, loading, historyError, error, active, send, stop, refresh, acceptReceipt, retryHistory: load };
}
