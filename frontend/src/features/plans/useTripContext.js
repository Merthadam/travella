import { useCallback, useEffect, useRef, useState } from 'react';
import { requestId } from '../../plansApi';
import { emptyTripContext } from './components/TripBrief';

const fields = ['finalDestination', 'dateStart', 'dateEnd', 'dateNote', 'flexibleDates', 'travelers', 'budget', 'noFixedBudget', 'flights', 'accommodation'];

function changesBetween(before, after) {
  const change = (operation, field, value) => ({ operation, field, value, source: 'user_edit', source_quote: '' });
  const changes = [];
  for (const name of before.candidates) if (!after.candidates.includes(name)) changes.push(change('remove_candidate', 'candidates', name));
  for (const name of after.candidates) if (!before.candidates.includes(name)) changes.push(change('add_candidate', 'candidates', name));
  for (const field of fields) {
    const value = field === 'travelers' ? after[field] === '' || after[field] == null ? null : Number(after[field]) : after[field];
    if (before[field] !== value) changes.push(change(value === '' || value === null ? 'clear' : 'set', field, value === '' ? null : value));
  }
  return changes;
}

export function useTripContext(api, planId, onExpired) {
  const [context, setContext] = useState(emptyTripContext);
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const lastAction = useRef(null);
  const server = useRef(null);
  const desired = useRef(null);
  const version = useRef(0);
  const epoch = useRef(0);
  const timer = useRef(null);
  const inFlight = useRef(false);
  const expired = useRef(onExpired);
  expired.current = onExpired;

  const accept = useCallback(snapshot => {
    if (!snapshot?.context || !Number.isInteger(snapshot.revision)) return;
    if (server.current && snapshot.revision < server.current.revision) return;
    server.current = snapshot;
    desired.current = snapshot.context;
    setContext(snapshot.context);
    setRevision(snapshot.revision);
    setLocked(Boolean(snapshot.locked));
    if (snapshot.a2ui_messages) setMessages(snapshot.a2ui_messages);
  }, []);

  useEffect(() => {
    const currentEpoch = ++epoch.current;
    server.current = null; desired.current = null; inFlight.current = false;
    setRevision(null); setContext(emptyTripContext()); setMessages([]); setLoading(true); setSaving(false); setError(''); setLocked(false);
    api.researchContext({ plan_id: planId }).then(snapshot => {
      if (epoch.current === currentEpoch) accept(snapshot);
    }).catch(err => {
      if (epoch.current !== currentEpoch) return;
      if (err.status === 401) expired.current();
      setError('Could not load the Trip Brief. Refresh to try again.');
    }).finally(() => { if (epoch.current === currentEpoch) setLoading(false); });
    return () => {
      clearTimeout(timer.current);
      // Start any pending debounced save before leaving this Plan; stale results
      // are ignored by the epoch guard when they return.
      if (!inFlight.current && server.current && desired.current) void flush();
      epoch.current++;
    };
  }, [api, planId, accept]);

  // Reopening a running Plan shows the lock until its committed snapshot arrives.
  useEffect(() => {
    if (!locked) return undefined;
    const currentEpoch = epoch.current;
    let disposed = false;
    const poll = setInterval(() => {
      api.researchContext({ plan_id: planId }).then(snapshot => {
        if (!disposed && epoch.current === currentEpoch) accept(snapshot);
      }).catch(() => {});
    }, 2500);
    return () => { disposed = true; clearInterval(poll); };
  }, [api, planId, locked, accept]);

  async function flush() {
    if (inFlight.current || !server.current || !desired.current) return;
    const currentEpoch = epoch.current;
    inFlight.current = true;
    try {
      while (epoch.current === currentEpoch) {
        const changes = changesBetween(server.current.context, desired.current);
        if (!changes.length) break;
        const editVersion = version.current;
        const saved = await api.updateResearchContext({ plan_id: planId }, changes, server.current.revision, requestId(), lastAction.current);
        if (epoch.current !== currentEpoch) return;
        server.current = saved;
        if (editVersion === version.current) accept(saved);
      }
    } catch (err) {
      if (epoch.current !== currentEpoch) return;
      if (err.status === 401) expired.current();
      setError(err.message || 'Trip details could not be saved. Refresh and try again.');
      try {
        const snapshot = await api.researchContext({ plan_id: planId });
        if (epoch.current === currentEpoch) accept(snapshot);
      } catch { /* Keep error visible and sending disabled until reload. */ }
    } finally {
      if (epoch.current === currentEpoch) { inFlight.current = false; setSaving(false); }
    }
  }

  function update(next, action) {
    if (locked || loading || !server.current) return;
    version.current++;
    lastAction.current = action;
    desired.current = next;
    setContext(next); setError(''); setSaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 450);
  }

  return { context, revision, messages, update, accept, loading, saving, locked, error };
}
