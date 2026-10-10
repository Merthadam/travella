import { useEffect, useRef, useState } from 'react';
import { normalizeTitle, requestId } from '../../plansApi';

const unknown = error => !error.status || error.status >= 500 || error.code === 'request_pending';

// Both presentations use the same revision, confirmation and retry contract.
export function usePlanAction({ value, onDone, onExpired, api }) {
  const [plan, setPlan] = useState(value.plan);
  const [draft, setDraft] = useState(value.plan.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef(null), lock = useRef(false), alive = useRef(true);
  const normalized = normalizeTitle(draft);
  const rename = value.operation === 'rename';
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || unavailable) return;
    if (rename && normalized.error) { setError(normalized.error); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (!pending.current) {
        const confirmation = await api.prepare(plan, value.operation, normalized.title);
        if (!alive.current) return;
        pending.current = { plan, operation: value.operation, title: confirmation.title, challenge: confirmation.challenge, id: requestId() };
      }
      const result = await api.commit(pending.current);
      if (alive.current) onDone(result, value.operation);
    } catch (err) {
      if (!alive.current) return;
      if (err.status === 401) { onExpired(); return; }
      if (unknown(err)) {
        setUncertain(Boolean(pending.current));
        setError('We couldn’t confirm the result. Retry to check your request.');
      } else {
        pending.current = null; setUncertain(false);
        if (err.status === 409) {
          try {
            const latest = await api.get(plan.plan_id, value.operation === 'restore' ? 'deleted' : 'active');
            if (!alive.current) return;
            setPlan(latest); setConflict(true);
            setError(rename ? 'This plan changed since you opened it. Review the latest saved name and apply your name again.' : 'This plan changed. Review the current plan before confirming again.');
          } catch (readError) {
            if (!alive.current) return;
            if (readError.status === 401) onExpired();
            else { setUnavailable(true); setError('This plan isn’t available. Close this review and refresh your plans.'); }
          }
        } else if (err.status === 410 || err.status === 404) {
          setUnavailable(true); setError('This plan’s recovery period has ended or the plan is no longer available.');
        } else setError(err.message || 'We couldn’t save this change. Try again.');
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function changeDraft(value) { setDraft(value); pending.current = null; }
  return { plan, draft, changeDraft, normalized, rename, busy, error, conflict, unavailable, uncertain, submit };
}
