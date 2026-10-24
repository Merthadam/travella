import { useCallback, useEffect, useRef, useState } from 'react';
import { requestId } from '../../plansApi';
import { confirmFlightNeed } from './flightNeeds';

const staleMessage = 'Your trip details changed. Review the latest version.';
const missingDetail = { destination_required: 'Confirm a destination.', context_locked: 'Wait for the current reply to finish.' };
const stale = () => new Error(staleMessage);
const withoutFlights = context => ({ ...context, flights: undefined, provenance: { ...context.provenance, flights: undefined } });
const comparable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export function useResearchOffer(api, planId, revision, onExpired) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const epoch = useRef(0);
  const sequence = useRef(0);
  const busy = useRef(false);
  const currentPlan = useRef(planId); currentPlan.current = planId;
  const expired = useRef(onExpired); expired.current = onExpired;

  const refresh = useCallback(async () => {
    const generation = epoch.current, request = ++sequence.current;
    const result = await api.researchOffer({ plan_id: planId });
    if (epoch.current !== generation || currentPlan.current !== planId) return null;
    if (request === sequence.current) setSnapshot(result);
    return result;
  }, [api, planId]);

  useEffect(() => {
    epoch.current++; busy.current = false; setPending(false); setSnapshot(null); setError(''); setLoading(true);
    return () => { epoch.current++; };
  }, [api, planId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    refresh().then(() => { if (live) setError(''); }).catch(err => {
      if (!live) return;
      if (err.status === 401) expired.current?.();
      setError('Could not check draft readiness. Try again.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refresh, revision]);

  async function perform(operation) {
    if (busy.current) return null;
    const generation = epoch.current;
    const valid = () => epoch.current === generation && currentPlan.current === planId;
    busy.current = true; setPending(true); setError(''); ++sequence.current;
    const action = async (name, atRevision, offerId) => {
      if (!valid()) throw stale();
      const result = await api.researchOfferAction({ plan_id: planId }, { action: name, ...(offerId ? { offer_id: offerId } : {}) }, atRevision, requestId());
      if (!valid()) throw stale();
      ++sequence.current; setSnapshot(result);
      return result;
    };
    try { return await operation(action, valid); }
    catch (err) {
      if (valid()) {
        if (err.status === 401) expired.current?.();
        setError(err.status === 409 ? staleMessage : err.message || 'Could not update draft readiness. Try again.');
        void refresh().catch(() => {});
      }
      throw err;
    } finally { if (valid()) { busy.current = false; setPending(false); } }
  }

  function requestReview(offer) {
    return perform(async action => {
      const latest = await refresh();
      if (!latest) return null;
      if (offer && (offer.id !== latest.offer?.id || offer.revision !== latest.revision)) throw stale();
      if (!latest.readiness?.eligible || latest.locked) throw new Error('Confirm a destination before reviewing a draft.');
      const result = await action('request_review', latest.revision, offer?.id);
      return structuredClone(result);
    });
  }

  function defer(offer) {
    return perform(async action => {
      const latest = await refresh();
      if (!latest) return null;
      if (latest.offer?.id !== offer.id || latest.revision !== offer.revision) throw stale();
      return action('defer', latest.revision, offer.id);
    });
  }

  function confirm(reviewed, flights) {
    return perform(async (action, valid) => {
      const latest = await refresh();
      if (!latest) return null;
      if (latest.revision !== reviewed.revision || latest.locked || !latest.readiness?.eligible || latest.offer?.id !== reviewed.offer?.id) throw stale();
      const confirmed = await confirmFlightNeed(api, { plan_id: planId }, reviewed, flights);
      if (!valid()) return null;
      if (comparable(withoutFlights(confirmed.context)) !== comparable(withoutFlights(reviewed.context))) throw stale();
      let bound = reviewed;
      if (confirmed.revision !== reviewed.revision) {
        bound = await action('request_review', confirmed.revision);
        if (bound.revision !== confirmed.revision || comparable(bound.context) !== comparable(confirmed.context)) throw stale();
      }
      const receipt = await action('confirm', bound.revision, bound.offer.id);
      if (!receipt.research_entry_receipt || receipt.revision !== bound.revision) throw stale();
      return receipt;
    });
  }

  const isStale = snapshot && snapshot.revision !== revision;
  const readiness = error || (loading ? 'Checking draft readiness…' : isStale ? staleMessage : snapshot?.deferred ? 'We’ll keep researching. You can review a draft from your Trip brief when you’re ready.' : snapshot?.readiness?.eligible ? 'Ready to review a draft.' : 'Confirm a destination to create your draft. Other trip details can stay undecided.');
  async function retry() {
    const generation = epoch.current;
    setLoading(true);
    try {
      const result = await refresh();
      if (result && epoch.current === generation) setError('');
    } catch (err) {
      if (epoch.current !== generation) return;
      if (err.status === 401) expired.current?.();
      setError('Could not check draft readiness. Try again.');
    } finally { if (epoch.current === generation) setLoading(false); }
  }
  const missingDetails = snapshot?.readiness?.eligible ? [] : (snapshot?.readiness?.reasons || []).map(reason => missingDetail[reason]).filter(Boolean);
  return { snapshot, loading, pending, error, readiness, missingDetails, eligible: Boolean(snapshot?.readiness?.eligible && !snapshot?.locked && !isStale && !loading && !error), refresh, retry, requestReview, defer, confirm };
}
