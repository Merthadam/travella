import React, { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';
import { TravelSearch } from './TravelSearch';
import { TravelConversation } from './TravelConversation';
import { useTravelConversation } from './useTravelConversation';
import './travel-workspace.css';

const noteLabels = { user_preference: 'Your preference', assistant_inference: 'Assistant suggestion', rejection: 'Ruled out', research_override: 'Exploratory search' };
const optionId = option => option.evidence_id || option.id;
export function TravelWorkspace({ selected, api, mode, active, initialData, pendingEdits, blocked, onExpired, onBusyChange, registerStop, onChoiceSaved, onBookingResult, importedSnapshot, importRequest, importReason }) {
  const topic = mode === 'accommodation' ? 'stays' : 'flights';
  const chat = useTravelConversation({ selected, api, topic, visible: active, blocked, onExpired, onBusyChange });
  const [pane, setPane] = useState('options'), [chatOpen, setChatOpen] = useState(true), [draftMessage, setDraftMessage] = useState(null);
  const chatToggle = useRef(null), browseTab = useRef(null);
  function openChat() { setChatOpen(true); setPane('chat'); }
  function closeChat() { setChatOpen(false); setPane('options'); requestAnimationFrame(() => { const target = browseTab.current?.getClientRects().length ? browseTab.current : chatToggle.current; target?.focus(); }); }
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]), [review, setReview] = useState(null), [saving, setSaving] = useState(false), [choiceError, setChoiceError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const dialog = useRef(null), returnFocus = useRef(null);
  const snapshot = chat.snapshot;
  const unavailable = blocked || chat.active || chat.loading || snapshot?.locked || Boolean(chat.historyError);
  const stop = useRef(chat.stop); stop.current = chat.stop;
  useEffect(() => { registerStop?.(mode, () => stop.current()); return () => registerStop?.(mode, null); }, [mode, registerStop]);
  useEffect(() => { if (importedSnapshot) { setPane('options'); } }, [importRequest, importedSnapshot?.search_id]);
  useEffect(() => { if (review) { returnFocus.current = document.activeElement; dialog.current?.showModal(); } else { dialog.current?.close(); returnFocus.current?.focus?.(); } }, [review]);
  useEffect(() => { setSelectedIds([]); }, [snapshot?.comparison]);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setClock(Date.now()), 10000); return () => clearInterval(timer); }, [active]);
  const options = snapshot?.comparison?.options || [];
  const shortlist = snapshot?.shortlist || [];
  const preferred = snapshot?.preferred;
  const allSuggestions = [...(preferred ? [preferred] : []), ...shortlist, ...options];
  const suggestionCount = new Set(allSuggestions.map(optionId)).size;
  const matches = option => [option.title, option.summary, ...(option.facts || []), ...(option.unknowns || [])].join(' ').toLocaleLowerCase().includes(suggestionQuery.trim().toLocaleLowerCase());
  const visibleShortlist = shortlist.filter(item => optionId(item) !== optionId(preferred || {}) && matches(item));
  const visibleOptions = options.filter(item => optionId(item) !== optionId(preferred || {}) && !shortlist.some(saved => optionId(saved) === optionId(item)) && matches(item));
  const readiness = snapshot?.readiness === 'ready' ? 'Ready · selected, not booked' : snapshot?.readiness === 'needs_review' ? 'Needs review · trip details changed' : 'Researching';
  function discuss(items) {
    setDraftMessage({ text: `${items.length > 1 ? 'Compare these options for my trip' : 'Tell me more about this option'}: ${items.map(item => `${item.title} (reference ${optionId(item)})`).join('; ')}.`, nonce: Date.now() }); openChat();
  }
  async function prepare(action, option) {
    if (unavailable || saving) return;
    setSaving(true); setChoiceError('');
    try {
      const body = { action, evidence_id: optionId(option) };
      const challenge = await api.prepareTravelChoice(selected, topic, body, snapshot.revision);
      setReview({ body, option, revision: challenge.revision, challenge: challenge.challenge, id: requestId() });
    } catch (err) { if (err.status === 401) onExpired?.(); setChoiceError(err.message || 'This option changed. Refresh your research and try again.'); await chat.refresh().catch(() => {}); }
    finally { setSaving(false); }
  }
  async function confirm() {
    if (!review || saving) return;
    setSaving(true); setChoiceError('');
    try {
      const result = await api.commitTravelChoice(selected, topic, review.body, review.revision, review.challenge, review.id);
      onChoiceSaved?.(review.revision, result.revision);
      await chat.refresh(); setReview(null);
    } catch (err) { if (err.status === 401) onExpired?.(); setChoiceError(err.message || 'Your choice could not be saved. Retry or cancel.'); }
    finally { setSaving(false); }
  }
  function card(option, saved = false) {
    const id = optionId(option), chosen = preferred && optionId(preferred) === id;
    const isSaved = shortlist.some(item => optionId(item) === id);
    const stale = (!saved && snapshot?.comparison_stale) || !Number.isFinite(Date.parse(option.observed_at)) || Math.max(clock, Date.now()) - Date.parse(option.observed_at) > 600000;
    return <article className="travel-research-option" key={id}>
      <div className="travel-option-heading"><h3>{option.title}</h3>{chosen && <span className="travel-choice-label">Selected · not booked</span>}</div>
      {option.price_label && <p className="travel-option-price">{option.price_label}</p>}
      {option.summary && <p>{option.summary}</p>}
      <details className="travel-suggestion-details"><summary>Details & tradeoffs</summary>
      {option.facts?.length > 0 && <ul>{option.facts.map((value, i) => <li key={i}>{value}</li>)}</ul>}
      {option.unknowns?.length > 0 && <p className="travel-option-unknowns"><strong>Still to check:</strong> {option.unknowns.join(' · ')}</p>}
      <p className="travel-option-source">{option.provider} · Observed {new Date(option.observed_at).toLocaleString()}<br/>Historical research. Price and availability may change; no reservation is held.</p></details>
      {stale && <p className="travel-option-unknowns">This observed offer has expired. Search again for current options.</p>}
      <div className="travel-option-actions"><button type="button" className="ds-button small" disabled={unavailable} onClick={() => discuss([option])}>Discuss this option</button>{<button type="button" className="ds-button small" disabled={unavailable} onClick={() => { setDraftMessage({ text: `Search again for current options similar to ${option.title}.`, nonce: Date.now() }); openChat(); }}>Search again</button>}{!isSaved && !chosen && <button type="button" className="ds-button small" disabled={unavailable || saving || stale || shortlist.length >= 5} onClick={() => prepare('shortlist', option)}>Save to shortlist</button>}{(!chosen || snapshot.readiness === 'needs_review') && <button type="button" className="ds-button primary small" disabled={unavailable || saving || stale} onClick={() => prepare('prefer', option)}>{chosen ? 'Review choice' : 'Choose for trip'}</button>}{(isSaved || chosen || saved) && <button type="button" className="ds-text-button" disabled={unavailable || saving} onClick={() => prepare('remove', option)}>Remove {chosen ? 'choice' : 'from shortlist'}</button>}</div>
      {!saved && <label className="travel-compare-check"><input type="checkbox" checked={selectedIds.includes(id)} disabled={unavailable} onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, id] : ids.filter(value => value !== id))}/> Compare this option</label>}
    </article>;
  }
  const suggestions = <>
        {suggestionCount > 0 && <><header className="travel-suggestions-heading"><h2>Suggestions</h2><p>Options from this discussion</p></header><label className="travel-suggestions-filter">Filter suggestions<input type="search" value={suggestionQuery} placeholder="Name, area or detail…" onChange={event => setSuggestionQuery(event.target.value)}/></label>{!allSuggestions.some(matches) && <p role="status">No suggestions match. Try another word or ask for a new search.</p>}</>}
        {snapshot?.readiness === 'needs_review' && <p className="canvas-notice">Your trip details have changed. The previous choice is kept for reference. Research again before confirming it fits.</p>}
        {preferred && matches(preferred) && <section aria-label="Preferred option"><h2>Your choice</h2>{card(preferred, true)}</section>}
        {visibleShortlist.length > 0 && <section aria-label="Saved shortlist"><h2>Shortlist</h2>{visibleShortlist.map(item => card(item, true))}</section>}
        {visibleOptions.length > 0 && <section aria-label="Research comparison"><div className="travel-comparison-heading"><h2>Latest research</h2><button type="button" className="ds-button small" disabled={unavailable || selectedIds.length < 2} onClick={() => discuss(options.filter(item => selectedIds.includes(optionId(item))))}>Compare selected ({selectedIds.length})</button></div>{visibleOptions.map(item => card(item))}</section>}
        {snapshot?.notes?.items?.length > 0 && <details className="travel-research-notes"><summary>What we’ve learned</summary><ul>{snapshot.notes.items.map((note, index) => <li key={index}><strong>{noteLabels[note.kind] || 'Research note'}:</strong> {note.text}</li>)}</ul>{snapshot.notes.incomplete && <p>This is a partial summary; the discussion keeps the details.</p>}</details>}
        {choiceError && !review && <p role="alert" className="canvas-chat-error">{choiceError}</p>}
  </>;
  return <div hidden={!active} className={`travel-workspace travel-pane-${pane} ${chatOpen ? "travel-chat-open" : "travel-chat-closed"}`}>
    <nav className="travel-pane-tabs" aria-label={`${topic} workspace view`}><button ref={browseTab} type="button" aria-pressed={pane === 'options'} onClick={() => setPane('options')}>Browse {topic === 'stays' ? 'stays' : 'flights'}</button><button type="button" aria-pressed={pane === 'chat'} onClick={openChat}>{topic === 'stays' ? 'Stay' : 'Flight'} chat{chat.active ? ' · replying' : ''}</button></nav>
    <div className="travel-workspace-panes">
      <section className="travel-options-pane" aria-label={`${topic === 'stays' ? 'Accommodation' : 'Flight'} options`}>
        <div className="travel-substage-status" role="status">{readiness}</div>
        <TravelSearch planId={selected.plan_id} mode={mode} active={active} initialData={initialData} onExpired={onExpired} onBookingResult={onBookingResult} importedSnapshot={importedSnapshot} importRequest={importRequest} importReason={importReason} onDiscuss={text => { setDraftMessage({ text, nonce: Date.now() }); openChat(); }}/>

      </section>
      <div id={`travel-${topic}-chat`} className="travel-chat-pane" hidden={!chatOpen}><TravelConversation chat={chat} topic={topic} visible={active && chatOpen} disabled={blocked || snapshot?.locked && !chat.active} onDraftMessage={draftMessage} onClose={closeChat} brief={snapshot?.brief} pendingEdits={pendingEdits} suggestions={suggestions} suggestionCount={suggestionCount}/></div>
      {!chatOpen && <div className="canvas-chat-rail"><button ref={chatToggle} type="button" className="canvas-chat-expand" aria-label={`Open ${topic === 'stays' ? 'accommodation' : 'flight'} chat`} title="Open chat" aria-controls={`travel-${topic}-chat`} aria-expanded={false} onClick={openChat}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4v16m15-8H8m5-5-5 5 5 5"/></svg><span>Chat</span>{chat.active && <span className="canvas-chat-rail-status" aria-label="Travella is replying"/>}</button></div>}
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
      {choiceError && <p role="alert" className="canvas-chat-error">{choiceError}</p>}
      <div className="travel-choice-review-actions"><button type="button" className="ds-button" autoFocus disabled={saving} onClick={() => setReview(null)}>Keep researching</button><button type="button" className="ds-button primary" disabled={saving} onClick={confirm}>{saving ? 'Saving…' : review?.body.action === 'remove' ? 'Confirm removal' : review?.body.action === 'prefer' ? 'Confirm choice · not booked' : 'Confirm shortlist'}</button></div>
    </dialog>
  </div>;
}
