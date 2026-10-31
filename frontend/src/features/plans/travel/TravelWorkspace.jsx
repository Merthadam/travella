import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlanChatToggle } from '../../../components/PlanChatToggle';
import { PlanHeaderSlot } from '../../../components/PlanHeaderContext';
import { requestId } from '../../../plansApi';
import { comparisonEntry } from './TravelComparison';
import { draftTravelFacts, parseTravelRegistrySnapshot } from './CanvasTravel';
import { reviewExactTravelOption, travelRequest } from './travelApi';
import { TravelSearch } from './TravelSearch';
import { TravelConversation } from './TravelConversation';
import { useTravelConversation } from './useTravelConversation';
import { useTravelWorkspace } from './useTravelWorkspace';
import './travel-workspace.css';

const noteLabels = { user_preference: 'Your preference', assistant_inference: 'Assistant suggestion', rejection: 'Ruled out', research_override: 'Exploratory search' };
const optionId = option => option.evidence_id || option.id;
export function TravelWorkspace({ backNavigation, travelerProfile, sandbox, selected, api, mode, active, initialData, pendingEdits, blocked, onExpired, onBusyChange, registerStop, onChoiceSaved, onFlightCheckout, onStayCheckout, importedSnapshot, importRequest, importReason }) {
  const topic = mode === 'accommodation' ? 'stays' : 'flights';
  const stop = useRef(null);
  const workspace = useTravelWorkspace({ owner: selected.owner_id || selected.subject || 'session', planId: selected.plan_id, topic, initialData, travelerProfile, active, onExpired, onManualChange: () => stop.current?.() });
  const comparisonScope = workspace.state.instanceId;
  const displayedComparison = useRef(null);
  const onComparisonChange = useCallback(references => { displayedComparison.current = { scope: comparisonScope, references }; }, [comparisonScope]);
  const chat = useTravelConversation({ selected, api, topic, visible: active, blocked, onExpired, onBusyChange, getDiscussionContext: () => displayedComparison.current?.scope === comparisonScope && displayedComparison.current.references.length ? { intent: 'discuss', options: displayedComparison.current.references } : undefined, getWorkspaceContext: workspace.getWorkspaceContext, onWorkspaceRunStart: workspace.onWorkspaceRunStart, onWorkspaceRunEnd: workspace.onWorkspaceRunEnd, onWorkspaceUpdate: workspace.applyWorkspaceUpdate });
  const [pane, setPane] = useState('options'), [chatOpen, setChatOpen] = useState(true), [contextOptions, setContextOptions] = useState([]);
  const chatToggle = useRef(null);
  const [narrow, setNarrow] = useState(() => window.matchMedia?.('(max-width: 760px)').matches || false);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 760px)');
    if (!query) return;
    const changed = () => setNarrow(query.matches);
    changed(); query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  const chatVisible = chatOpen && (!narrow || pane === 'chat');
  function openChat() {
    setChatOpen(true); setPane('chat');
    requestAnimationFrame(() => document.querySelector(`#travel-${topic}-chat textarea`)?.focus());
  }
  function closeChat() { setChatOpen(false); setPane('options'); requestAnimationFrame(() => chatToggle.current?.focus()); }
  const [historicalOption, setHistoricalOption] = useState(null);
  const [review, setReview] = useState(null), [saving, setSaving] = useState(false), [choiceError, setChoiceError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const dialog = useRef(null), returnFocus = useRef(null);
  const [receipt, setReceipt] = useState(null);
  const scope = `${selected.owner_id || selected.subject || 'session'}:${selected.plan_id}:${topic}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const operationEpoch = useRef(0), isActive = useRef(active); isActive.current = active;
  const current = version => currentScope.current === scope && isActive.current && operationEpoch.current === version;
  useEffect(() => {
    operationEpoch.current++; setReview(null); setSaving(false);
    return () => { operationEpoch.current++; };
  }, [scope, active]);
  useEffect(() => { setReceipt(null); setReview(null); setChoiceError(''); }, [scope]);
  const snapshot = receipt?.scope === scope && receipt.value.revision >= (chat.snapshot?.revision ?? -1) ? receipt.value : chat.snapshot;
  const briefFacts = JSON.stringify(draftTravelFacts(initialData)), briefDigest = snapshot?.brief?.digest || '';
  const previousBrief = useRef({ scope, facts: briefFacts, digest: briefDigest });
  useEffect(() => {
    const previous = previousBrief.current;
    previousBrief.current = { scope, facts: briefFacts, digest: briefDigest };
    // The first authenticated receipt can supply a previously unavailable brief.
    // Only a changed known brief or saved traveler facts revoke its challenge.
    if (previous.scope !== scope || previous.facts === briefFacts && (!previous.digest || previous.digest === briefDigest)) return;
    operationEpoch.current++;
    setReview(null); setSaving(false);
  }, [scope, briefFacts, briefDigest]);
  function acceptReceipt(value) { setReceipt({ scope, value }); chat.acceptReceipt?.(value); }
  const unavailable = blocked || chat.active || chat.loading || snapshot?.locked || Boolean(chat.historyError);
  stop.current = chat.stop;
  useEffect(() => { registerStop?.(mode, () => stop.current()); return () => registerStop?.(mode, null); }, [mode, registerStop]);
  useEffect(() => { if (importedSnapshot) { setPane('options'); } }, [importRequest, importedSnapshot?.search_id]);
  useEffect(() => { if (review) { returnFocus.current = document.activeElement; dialog.current?.showModal(); } else { dialog.current?.close(); returnFocus.current?.focus?.(); } }, [review]);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setClock(Date.now()), 10000); return () => clearInterval(timer); }, [active]);
  const options = snapshot?.comparison?.options || [];
  const shortlist = snapshot?.shortlist || [];
  const preferred = snapshot?.preferred;
  const readiness = snapshot?.readiness === 'ready' ? 'Ready · selected, not booked' : snapshot?.readiness === 'needs_review' ? 'Needs review · trip details changed' : 'Researching';
  function discuss(items) {
    setContextOptions(items.filter(item => item.reference)); openChat();
  }
  async function compare(items) {
    return await chat.send('Compare these options for my trip.', { intent: 'compare', options: items.map(item => item.reference) }, { explicitComparison: true });
  }
  async function openReference(option) {
    const version = operationEpoch.current;
    setChoiceError(''); setPane('options');
    if (!option.reference) { setHistoricalOption(option); return; }
    try {
      const value = parseTravelRegistrySnapshot(await travelRequest(selected.plan_id, 'research/snapshot', { search_id: option.reference.search_id }));
      if (!current(version)) return;
      const entry = value.plan_id === selected.plan_id && value.mode === topic && comparisonEntry(value, option.reference);
      if (!entry) throw new Error('Reference unavailable');
      workspace.dispatch({ type: 'details', value: { ...entry, historical: true } });
    } catch (err) {
      if (!current(version)) return;
      if (err.status === 401) onExpired?.();
      setChoiceError('This earlier observation is no longer available. Its reply remains as history. Search explicitly for current options.');
    }
  }
  async function chooseManual(item, action = 'prefer') {
    if (blocked || saving || !active) return;
    const version = operationEpoch.current;
    setSaving(true); setChoiceError('');
    try {
      // Stop an owned reply first. The authenticated review endpoint remains the
      // authority on its durable lease even when history refresh is unavailable.
      if (chat.active) await chat.stop();
      if (!current(version)) return;
      const latest = await reviewExactTravelOption(api, selected, topic, item.reference);
      if (!current(version)) return;
      acceptReceipt(latest);
      await prepareChallenge(action, latest.comparison.options[0], latest.revision, version);
    } catch (err) { if (current(version)) { if (err.status === 401) onExpired?.(); setChoiceError(err.message || 'This exact option could not be reviewed. Try again.'); } }
    finally { if (current(version)) setSaving(false); }
  }
  async function prepareChallenge(action, option, revision, version) {
    const body = { action, evidence_id: optionId(option) };
    const challenge = await api.prepareTravelChoice(selected, topic, body, revision);
    if (current(version)) setReview({ body, option, revision: challenge.revision, challenge: challenge.challenge, id: requestId() });
  }
  async function prepare(action, option, revision = snapshot.revision) {
    if (blocked || saving || !active) return;
    const version = operationEpoch.current;
    setSaving(true); setChoiceError('');
    try {
      await prepareChallenge(action, option, revision, version);
    } catch (err) { if (current(version)) { if (err.status === 401) onExpired?.(); setChoiceError(err.message || 'This option changed. Refresh your research and try again.'); await chat.refresh().catch(() => {}); } }
    finally { if (current(version)) setSaving(false); }
  }
  async function confirm() {
    if (!review || saving || !active) return;
    const version = operationEpoch.current;
    setSaving(true); setChoiceError('');
    try {
      const result = await api.commitTravelChoice(selected, topic, review.body, review.revision, review.challenge, review.id);
      if (!current(version)) return;
      acceptReceipt(result); setReview(null);
      onChoiceSaved?.(review.revision, result.revision);
      // A committed receipt is authoritative; transcript hydration is optional.
      await chat.refresh().catch(() => {});
    } catch (err) { if (current(version)) { if (err.status === 401) onExpired?.(); setChoiceError(err.message || 'Your choice could not be saved. Retry or cancel.'); } }
    finally { if (current(version)) setSaving(false); }
  }
  function card(option, saved = false, comparisonStale = snapshot?.comparison_stale) {
    const id = optionId(option), chosen = preferred && optionId(preferred) === id;
    const isSaved = shortlist.some(item => optionId(item) === id);
    const stale = (!saved && comparisonStale) || !Number.isFinite(Date.parse(option.observed_at)) || Math.max(clock, Date.now()) - Date.parse(option.observed_at) > 600000;
    return <article className="travel-research-option" key={id}>
      <div className="travel-option-heading"><h3>{option.title}</h3>{chosen && <span className="travel-choice-label">Selected · not booked</span>}</div>
      {option.price_label && <p className="travel-option-price">{option.price_label}</p>}
      {option.summary && <p>{option.summary}</p>}
      <details className="travel-suggestion-details" open><summary>Details & tradeoffs</summary>
      {option.facts?.length > 0 && <ul>{option.facts.map((value, i) => <li key={i}>{value}</li>)}</ul>}
      {option.unknowns?.length > 0 && <p className="travel-option-unknowns"><strong>Still to check:</strong> {option.unknowns.join(' · ')}</p>}
      <p className="travel-option-source">{option.provider} · Observed {new Date(option.observed_at).toLocaleString()}<br/>Historical research. Price and availability may change; no reservation is held.</p></details>
      {stale && <p className="travel-option-unknowns">This observed offer has expired. Search again for current options.</p>}
      <div className="travel-option-actions"><button type="button" className="ds-button small" disabled={unavailable || !option.reference || stale} onClick={() => discuss([option])}>Discuss this option</button>{<button type="button" className="ds-button small" disabled={unavailable} onClick={() => { openChat(); void chat.send(`Search again for current options similar to ${option.title}.`); }}>Search again</button>}{!isSaved && !chosen && <button type="button" className="ds-button small" disabled={blocked || saving || stale || shortlist.length >= 5} onClick={() => prepare('shortlist', option)}>Save to shortlist</button>}{(!chosen || snapshot.readiness === 'needs_review') && <button type="button" className="ds-button primary small" disabled={blocked || saving || stale} onClick={() => prepare('prefer', option)}>{chosen ? 'Review choice' : 'Choose for trip'}</button>}{(isSaved || chosen || saved) && <button type="button" className="ds-text-button" disabled={blocked || saving} onClick={() => prepare('remove', option)}>Remove {chosen ? 'choice' : 'from shortlist'}</button>}</div>
    </article>;
  }
  const renderReferences = message => message.comparison?.options?.length ? <section className="travel-reply-references" aria-label="Referenced options">
    <p>Earlier observations · prices and availability may change</p>
    <ul>{message.comparison.options.map(item => <li key={optionId(item)}><button type="button" className="ds-text-button" aria-label={`View ${item.title}`} onClick={() => openReference(item)}>{item.title}</button>{item.price_label && <span>{item.price_label}</span>}{item.reference && <button type="button" className="ds-text-button" aria-label={`Discuss ${item.title}`} disabled={unavailable} onClick={() => discuss([item])}>Discuss</button>}</li>)}</ul>
  </section> : null;
  // Legacy histories predate reply attachments. Keep their latest research visible.
  const savedSuggestions = <>
    {!workspace.state.snapshot && !receipt && !chat.messages.some(item => item.comparison) && options.length > 0 && <details className="travel-saved-options" open><summary>Earlier research</summary>{options.filter(item => !shortlist.some(saved => optionId(saved) === optionId(item))).map(item => card(item))}</details>}
    {historicalOption && <section aria-label="Earlier research details"><button type="button" onClick={() => setHistoricalOption(null)}>Close earlier details</button>{card(historicalOption)}</section>}
    {snapshot?.readiness === 'needs_review' && <p className="canvas-notice">Your trip details changed. Research again before confirming the previous choice still fits.</p>}
    {preferred && <details className="travel-saved-options"><summary>Your choice · {preferred.title}</summary><section aria-label="Preferred option">{card(preferred, true)}</section></details>}
    {topic === 'stays' && shortlist.filter(item => optionId(item) !== optionId(preferred || {})).length > 0 && <details className="travel-saved-options"><summary>Saved shortlist</summary>{shortlist.filter(item => optionId(item) !== optionId(preferred || {})).map(item => card(item, true))}</details>}
    {choiceError && !review && <p role="alert" className="canvas-chat-error">{choiceError}</p>}
  </>;
  const notes = <>{snapshot?.notes?.items?.length > 0 && <details className="travel-research-notes"><summary>What we’ve learned</summary><ul>{snapshot.notes.items.map((note, index) => <li key={index}><strong>{noteLabels[note.kind] || 'Research note'}:</strong> {note.text}</li>)}</ul></details>}</>;
  return <div hidden={!active} className={`travel-workspace travel-pane-${pane} ${chatOpen ? "travel-chat-open" : "travel-chat-closed"}`}>
    {active && <PlanHeaderSlot slot="actions"><PlanChatToggle ref={chatToggle} expanded={chatVisible} label={`${chatVisible ? 'Collapse' : 'Open'} ${topic === 'stays' ? 'accommodation' : 'flight'} chat`} controls={`travel-${topic}-chat`} replying={chat.active} onClick={chatVisible ? closeChat : openChat}/></PlanHeaderSlot>}
    <div className="travel-workspace-panes">
      <section hidden={narrow && chatVisible} className="travel-options-pane" aria-label={`${topic === 'stays' ? 'Accommodation' : 'Flight'} options`}>
        {backNavigation}
        <div className="travel-substage-status" role="status">{readiness}<span className="travel-provider-label">{sandbox ? 'LiteAPI sandbox · test inventory' : 'Search with LiteAPI'}</span></div>
        {workspace.state.recoveredDetails && <button type="button" className="ds-text-button" onClick={() => workspace.dispatch({ type: 'details', value: workspace.state.recoveredDetails })}>Reopen previous details</button>}
        {saving && !review && <p role="status">Preparing your exact choice…</p>}
        {workspace.state.notice && <div className="canvas-notice"><p role="status">{workspace.state.notice}</p>{workspace.state.inverse && <button type="button" className="ds-text-button" aria-label="Undo workspace change" onClick={workspace.undo}>Undo</button>}</div>}
        {workspace.state.view.dismissed_ids.length > 0 && <details className="travel-saved-options" open><summary>Dismissed from these results ({workspace.state.view.dismissed_ids.length})</summary>
          {workspace.state.snapshot?.results.filter(item => workspace.state.view.dismissed_ids.includes(item.id)).map(item => <div key={item.id}><span>{topic === 'stays' ? item.name : item.airlines.join(' / ') || 'Flight'}</span>{' '}<button type="button" className="ds-text-button" disabled={workspace.state.draftDirty} onClick={() => workspace.restore({ search_id: workspace.state.searchId, option_id: item.id, room_id: null })}>Restore {topic === 'stays' ? item.name : item.airlines.join(' / ') || 'flight'}</button></div>)}
        </details>}
        <TravelSearch workspace={workspace} planId={selected.plan_id} mode={mode} active={active} initialData={initialData} onExpired={onExpired} onFlightCheckout={onFlightCheckout} onStayCheckout={onStayCheckout} importedSnapshot={importedSnapshot} importRequest={importRequest} importReason={importReason} onDiscuss={item => discuss([item])} onChoose={chooseManual} onShortlist={item => chooseManual(item, 'shortlist')} onCompare={compare} onComparisonChange={onComparisonChange} discussionDisabled={unavailable || saving} choiceDisabled={blocked || saving}/>
        {savedSuggestions}
      </section>
      <div id={`travel-${topic}-chat`} className="travel-chat-pane" hidden={!chatVisible}><TravelConversation chat={chat} topic={topic} visible={active && chatVisible} disabled={blocked || snapshot?.locked && !chat.active} contextOptions={contextOptions} onClearContext={() => setContextOptions([])} brief={snapshot?.brief} pendingEdits={pendingEdits} renderReferences={renderReferences} notes={notes}/></div>

    </div>
    <dialog className="canvas-confirm travel-choice-review" ref={dialog} aria-labelledby={`travel-${topic}-review`} onCancel={event => { event.preventDefault(); if (!saving) setReview(null); }}>
      <h2 id={`travel-${topic}-review`}>{review?.body.action === 'prefer' ? 'Choose this option for your trip?' : review?.body.action === 'remove' ? 'Remove this saved option?' : 'Save this option to your shortlist?'}</h2>
      <div className="travel-choice-review-details">
        <h3>{review?.option.title}</h3><p className="travel-option-price">{review?.option.price_label}</p><p>{review?.option.summary}</p>
        {review?.option.facts?.length > 0 && <ul aria-label="Option details">{review.option.facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
        {review?.option.unknowns?.length > 0 && <p className="travel-option-unknowns"><strong>Still to check:</strong> {review.option.unknowns.join(' · ')}</p>}
        {review?.option.observed_at && <p className="travel-option-source">{review.option.provider} · Observed {new Date(review.option.observed_at).toLocaleString()}<br/>Price and availability may change; no reservation is held.</p>}
      </div>
      {review?.body.action === 'prefer' && preferred && optionId(preferred) !== optionId(review.option) && <p>This replaces your current choice: {preferred.title}.</p>}
      <p>{review?.body.action === 'remove' ? 'Removing your preferred option returns this substage to research.' : 'This saves a research choice only. It does not book, pay for, or hold this option.'}</p>
      {review && choiceError && <p role="alert" className="canvas-chat-error">{choiceError}</p>}
      <div className="travel-choice-review-actions"><button type="button" className="ds-button" autoFocus disabled={saving} onClick={() => setReview(null)}>Keep researching</button><button type="button" className="ds-button primary" disabled={saving} onClick={confirm}>{saving ? 'Saving…' : review?.body.action === 'remove' ? 'Confirm removal' : review?.body.action === 'prefer' ? 'Confirm choice · not booked' : 'Confirm shortlist'}</button></div>
    </dialog>
  </div>;
}
