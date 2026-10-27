import React, { useEffect, useRef, useState } from 'react';
import { TravelSearch, useTravelCapabilities } from '../travel/TravelSearch';
import { useFlightBookingSync } from '../travel/useFlightBookingSync';
import { TripBriefing } from './TripBriefing';
import { TripEssentials } from '../../../design-system/components/TripEssentials';
import { readCanvasView, writeCanvasView } from '../canvasViewState';
import { CanvasSurface } from '../../../design-system/a2ui/CanvasSurface';
import { Icon } from '../../../design-system/components/primitives';
import { CanvasDestinationMap, CanvasMapContext } from './CanvasDestinationMap';
import { usePlanningCanvas } from '../usePlanningCanvas';
import { confirmFlightNeed } from '../flightNeeds';
import { useCanvasConversation } from '../useCanvasConversation';
import { CanvasPlaceDetails } from './CanvasPlaceDetails';
import { DestinationPhoto } from './DestinationPhoto';
import { CanvasPlacePhoto } from './CanvasPlacePhoto';
import { CanvasConversation } from './CanvasConversation';
import '../../../design-system/tokens.css';
import '../../../design-system/components.css';
import './planning-canvas.css';
import './canvas-conversation.css';
import { CanvasGenerationReview, PlanStages } from './CanvasGenerationReview';
import { CanvasGenerationLoader } from './CanvasGenerationLoader';
import './single-canvas.css';

const groupLabel = { all: 'plan', themes: 'themes and preferences', research: 'trip briefing research' };

export function PlanningCanvas({ selected, api, onBack, onExpired, onSaved, onDirtyChange, onBusyChange, autoGenerate = false }) {
  const [chatBusy, setChatBusy] = useState(false);
  const canvas = usePlanningCanvas({ selected, api, onExpired, onSaved, externalBusy: chatBusy });
  const chat = useCanvasConversation({ selected, api, data: canvas.data, blocked: Boolean(canvas.activeGroup || canvas.saving || canvas.loading), onExpired, onAdd: canvas.addActivities, onBusyChange: setChatBusy });
  const [viewState] = useState(() => readCanvasView(selected.plan_id));
  const [chatOpen, setChatOpen] = useState(viewState.chatOpen !== false);
  useEffect(() => { writeCanvasView(selected.plan_id, { canvas: true, chatOpen }); }, [selected.plan_id, chatOpen]);
  const chatCollapseButton = useRef(null);
  const chatReopenButton = useRef(null);
  const mobileChatButton = useRef(null);
  const planContent = useRef(null);
  function openChat() {
    setChatOpen(true); setMobileView('chat');
    requestAnimationFrame(() => chatCollapseButton.current?.focus());
  }
  function collapseChat() {
    setChatOpen(false); setMobileView('canvas');
    requestAnimationFrame(() => (window.matchMedia('(max-width: 760px)').matches ? mobileChatButton : chatReopenButton).current?.focus());
  }
  const [mobileView, setMobileView] = useState(autoGenerate ? 'chat' : 'canvas');
  const [preview, setPreview] = useState(null);
  const restoredScroll = useRef(false);
  useEffect(() => {
    if (canvas.loading || !canvas.data || restoredScroll.current) return;
    const element = planContent.current;
    let frame;
    const restore = () => {
      if (!element?.querySelector('.places-content')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.scrollTop = Number.isFinite(viewState.scrollTop) ? Math.max(0, viewState.scrollTop) : 0;
        restoredScroll.current = true;
        observer.disconnect();
      });
    };
    const observer = new MutationObserver(restore);
    observer.observe(element, { childList: true, subtree: true });
    restore();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [canvas.loading, canvas.data]);
  const generated = useRef(false);
  const fullGeneration = useRef(false);
  const [screen, setScreen] = useState(null);
  const travelScreen = useRef(null);
  useEffect(() => {
    if (screen) { travelScreen.current.scrollTop = 0; travelScreen.current.querySelector('button')?.focus(); }
  }, [screen]);
  function returnToCanvas() {
    if (resultsOpen.current) closeTravelResults();
    else { travelReturnFocus.current = screen; setScreen(null); }
  }
  const [travelResultId, setTravelResultId] = useState(null);
  const [travelImports, setTravelImports] = useState({});
  const [travelNavigationRequest, setTravelNavigationRequest] = useState(0);
  const resultReturnFocus = useRef(null);
  const resultsOpen = useRef(false);
  const resultsPath = useRef('');
  const resultOwnedEntries = useRef(new Set());
  function restorePlanChat() {
    resultsOpen.current = false; setScreen(null); setTravelResultId(null); setChatOpen(true); setMobileView('chat');
    requestAnimationFrame(() => {
      const button = [...document.querySelectorAll('[data-travel-search]')].find(el => el.dataset.travelSearch === resultReturnFocus.current);
      (button || chatCollapseButton.current)?.focus();
    });
  }
  function openTravelResults(searchId) {
    const snapshot = chat.travelSnapshots[searchId];
    if (!snapshot || snapshot.plan_id !== selected.plan_id || chat.travelReason(snapshot)) return;
    resultReturnFocus.current = searchId; resultsOpen.current = true; resultsPath.current = location.pathname;
    resultOwnedEntries.current.add(searchId);
    history.pushState({ canvasTravelView: 'results', canvasTravelId: searchId }, '', location.href);
    setTravelNavigationRequest(value => value + 1);
    setTravelResultId(searchId); setScreen('travel-results'); setMobileView('canvas');
  }
  function closeTravelResults() {
    if (history.state?.canvasTravelView === 'results' && resultOwnedEntries.current.has(history.state.canvasTravelId)) history.back();
    else { history.replaceState({},'',location.href); restorePlanChat(); }
  }
  useEffect(() => {
    const path=location.pathname;
    resultOwnedEntries.current.clear();
    function pop(event) {
      if(location.pathname!==path) return;
      if (event.state?.canvasTravelView === 'results') {
        event.stopImmediatePropagation(); resultsOpen.current = true; resultsPath.current = location.pathname;
        setTravelNavigationRequest(value => value + 1);
        setTravelResultId(event.state.canvasTravelId); setScreen('travel-results'); setMobileView('canvas');
      } else if (resultsOpen.current) {
        event.stopImmediatePropagation(); restorePlanChat();
      }
    }
    if (history.state?.canvasTravelView === 'results') {
      resultsOpen.current = true; resultsPath.current = location.pathname;
      setTravelResultId(history.state.canvasTravelId); setScreen('travel-results'); setMobileView('canvas');
    }
    window.addEventListener('popstate', pop, true);
    return () => window.removeEventListener('popstate', pop, true);
  }, [selected.plan_id]);
  useFlightBookingSync(selected.plan_id, !screen && !canvas.loading && canvas.data?.flights?.need === 'needed', canvas.updateMockBooking);
  const travel = useTravelCapabilities(selected.plan_id, onExpired);
  const [visitedTravel, setVisitedTravel] = useState({});
  const selectedTravel = chat.travelSnapshots[travelResultId];
  const resultMode = selectedTravel?.mode === 'stays' ? 'accommodation' : selectedTravel?.mode === 'flights' ? 'flights' : null;
  const activeTravel = screen === 'travel-results' ? resultMode : screen;
  // An explicit preview handoff permits read-only flight browsing even when the
  // saved generation preference hides the flight card. It does not change it.
  const flightBrowsing = canvas.data?.flights?.need === 'needed' || Boolean(travelImports.flights);
  useEffect(() => {
    if (screen === 'travel-results' && selectedTravel && resultMode) {
      setVisitedTravel(prev => ({...prev,[resultMode]:true}));
      setTravelImports(prev => prev[resultMode]?.searchId === travelResultId && prev[resultMode]?.request === travelNavigationRequest ? prev : {...prev,[resultMode]:{searchId:travelResultId,request:travelNavigationRequest}});
    }
  }, [screen, travelResultId, resultMode, travelNavigationRequest]);
  const travelReturnFocus = useRef(null);
  useEffect(() => {
    if (screen || !travelReturnFocus.current) return;
    // A2UI constructs its surface asynchronously after the canvas remounts.
    const restore = () => {
      const button = document.querySelector(`.planning-canvas .ds-${travelReturnFocus.current} .ds-travel-link`);
      if (button) { button.focus(); travelReturnFocus.current = null; observer.disconnect(); }
    };
    const observer = new MutationObserver(restore);
    observer.observe(document.getElementById('canvas-main'), { childList: true, subtree: true });
    restore();
    return () => observer.disconnect();
  }, [screen]);
  const [confirm, setConfirm] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const reviewPending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const started = useRef(false);
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  const dirty = canvas.dirty || canvas.editing;
  const busy = Boolean(canvas.activeGroup || canvas.saving || chatBusy || reviewLoading);
  const callbacks = useRef({ onDirtyChange, onBusyChange }); callbacks.current = { onDirtyChange, onBusyChange };

  useEffect(() => { callbacks.current.onDirtyChange?.(dirty); }, [dirty]);
  useEffect(() => { callbacks.current.onBusyChange?.(busy); }, [busy]);
  useEffect(() => () => { callbacks.current.onDirtyChange?.(false); callbacks.current.onBusyChange?.(false); }, []);
  useEffect(() => {
    if (preview && canvas.data?.map.pins.some(pin => pin.id === preview.id || (pin.name === preview.name && pin.position.lat === preview.position.lat && pin.position.lng === preview.position.lng))) setPreview(null);
  }, [canvas.data?.map.pins, preview]);
  useEffect(() => {
    if (canvas.activeGroup) {
      generated.current = true; fullGeneration.current = canvas.activeGroup === 'all'; setChatOpen(true);
      if (fullGeneration.current) document.getElementById('canvas-main')?.focus();
    } else if (generated.current) {
      generated.current = false; chat.retryHistory(); setChatOpen(true); setMobileView(fullGeneration.current ? 'canvas' : 'chat');
      if (fullGeneration.current) {
        // Let the mobile view switch from chat to canvas before focusing it.
        const frame = requestAnimationFrame(() => planContent.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [canvas.activeGroup]);
  useEffect(() => {
    const warn = event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  useEffect(() => {
    if (!autoGenerate || started.current || canvas.loading || !canvas.data) return;
    started.current = true;
    if (Number.isInteger(autoGenerate.revision)) {
      if (canvas.saved) setConfirm({ kind: 'generate', group: 'all', revision: autoGenerate.revision });
      else void canvas.generate('all', autoGenerate.revision, autoGenerate.researchEntryReceipt);
    } else void reviewGeneration();
  }, [autoGenerate, canvas.loading, canvas.data, canvas.saved]);
  useEffect(() => {
    if (confirm) { returnFocus.current = document.activeElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); returnFocus.current?.focus?.(); }
  }, [confirm]);

  async function reviewGeneration() {
    if (reviewPending.current) return;
    reviewPending.current = true; setReviewLoading(true); setReviewError('');
    try {
      const snapshot = await api.researchContext(selected);
      if (!mounted.current) return;
      if (snapshot.locked || !Number.isInteger(snapshot.revision) || !snapshot.context) throw new Error('Trip details are still being updated. Try again when the reply finishes.');
      setReview(snapshot);
    } catch (error) {
      if (!mounted.current) return;
      if (error.status === 401) onExpired?.();
      setReviewError(error.message || 'Could not load trip details. Try again.');
    } finally {
      reviewPending.current = false;
      if (mounted.current) setReviewLoading(false);
    }
  }
  function generate(group) {
    if (canvas.editing || busy) return;
    if (group === 'all') { void reviewGeneration(); return; }
    const components = group === 'themes' ? ['themes'] : group === 'research' ? ['findings', 'links'] : ['themes', 'findings', 'links'];
    if (components.some(id => canvas.data?.[id]?.items?.length)) setConfirm({ kind: 'generate', group });
    else void canvas.generate(group);
  }
  function leave() { if (dirty || busy) setConfirm({ kind: 'leave' }); else onBack(); }
  function reload() { if (dirty) setConfirm({ kind: 'reload' }); else canvas.reload(); }
  async function confirmed() {
    const choice = confirm; setConfirm(null);
    if (choice.kind === 'generate') void canvas.generate(choice.group, choice.revision);
    if (choice.kind === 'reload') canvas.reload();
    if (choice.kind === 'leave') { if (canvas.activeGroup) await canvas.stop(); if (chat.active) await chat.stop(); onBack(); }
  }
  function action(id, name, payload) {
    if (name === 'clear_place_preview') { setPreview(null); return; }
    if (name === 'open_flights' && canvas.data?.flights?.need !== 'needed') return;
    if (name === 'open_flights' || name === 'open_accommodation') { const mode = name === 'open_flights' ? 'flights' : 'accommodation'; setVisitedTravel(prev => ({ ...prev, [mode]: true })); setScreen(mode); setMobileView('canvas'); return; }
    if (name === 'retry') { generate(id === 'themes' ? 'themes' : id === 'findings' || id === 'links' ? 'research' : 'all'); return; }
    if (name === 'editor_state' || !chatBusy) canvas.action(id, name, payload);
  }
  function showPlace(place) { setPreview(place); setScreen(null); setMobileView('canvas'); requestAnimationFrame(() => document.querySelector('.planning-canvas .ds-map-card')?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })); }
  const progress = canvas.activeGroup ? canvas.notice || 'Preparing your trip…' : canvas.saveError ? 'Changes not saved' : canvas.saving || canvas.dirty ? 'Saving draft…' : canvas.editing ? 'Editing draft' : canvas.saved ? 'Draft saved automatically' : 'Changes save automatically';
  // Cover the handoff while the saved snapshot loads, before generate can
  // acquire its context lease, so the empty workspace never flashes first.
  const generating = canvas.activeGroup === 'all' || Boolean(autoGenerate && !started.current && !canvas.error);
  return <main id="canvas-main" className={`planning-canvas canvas-workspace canvas-unified ${chatOpen && !screen ? 'with-chat' : 'chat-closed'} mobile-${mobileView} ${screen ? 'travel-open' : ''} ${generating ? 'is-generating' : ''}`} aria-label="Planning canvas" tabIndex={-1}>
    {generating ? <CanvasGenerationLoader destination={canvas.data?.map.final ? canvas.data.map.destination : ''} {...canvas.generationProgress}/> : null}
    {review && <CanvasGenerationReview context={review.context} replacing={Boolean(canvas.saved || canvas.data?.themes.items.length || canvas.data?.findings.items.length || canvas.data?.links.items.length)} cancelLabel="Keep editing" onCancel={() => setReview(null)} onConfirm={async flights => {
      const confirmed = await confirmFlightNeed(api, selected, review, flights);
      setReview(null); void canvas.generate('all', confirmed.revision);
    }}/>}
    <nav hidden={generating || Boolean(screen)} inert={generating || Boolean(screen)} className="canvas-mobile-tabs" aria-label="Plan workspace view"><button ref={mobileChatButton} type="button" aria-controls="plan-chat-panel" aria-expanded={mobileView === 'chat' && chatOpen} onClick={mobileView === 'chat' && chatOpen ? collapseChat : openChat}>{mobileView === 'chat' && chatOpen ? 'Close chat' : 'Plan chat'} {chat.active ? '· replying' : ''}</button></nav>
    <div className="canvas-workspace-body" hidden={generating} inert={generating}>
    <div ref={planContent} hidden={Boolean(screen)} className="planning-canvas-inner" tabIndex={0} role="region" aria-label="Plan content" onScroll={event => { if (!screen && restoredScroll.current) writeCanvasView(selected.plan_id, { scrollTop: event.currentTarget.scrollTop }); }}>
      <PlanStages canvas/>
      <header className="canvas-page-heading" aria-hidden={screen ? true : undefined} inert={Boolean(screen)}>
        <div className="canvas-trip-title"><span className="canvas-destination-monogram" aria-hidden="true">{(canvas.data?.map.destination || selected.title || 'T').charAt(0)}</span><div><span className="ds-eyebrow">{canvas.data?.map.destination || 'YOUR PLAN'}</span><h1>{selected.title === 'Untitled plan' && canvas.data?.map.destination ? `Your time in ${canvas.data.map.destination}` : selected.title || 'Your travel plan'}</h1></div></div>
        {canvas.data?.essentials && <TripEssentials compact preview={false} data={canvas.data.essentials} disabled={busy} onAction={(name, payload) => action('essentials', name, payload)}/>}
        <div className="canvas-main-actions"><span className="canvas-save-state" role="status" aria-live="polite">{chatBusy ? 'Your companion is replying…' : progress}</span>{canvas.activeGroup ? <button type="button" className="ds-button" onClick={canvas.stop}>Stop generation</button> : <button type="button" className="ds-button canvas-generate" disabled={canvas.loading || busy || canvas.editing || Boolean(canvas.saveError) || !canvas.data} onClick={() => generate('all')}><Icon name="spark" size={16}/>{canvas.saved || canvas.data?.themes.items.length ? 'Regenerate plan' : 'Generate plan'}</button>}</div>
      </header>
      {!canvas.loading && (canvas.saved || (canvas.groups.themes === 'ready' && canvas.groups.research === 'ready')) && <DestinationPhoto destination={canvas.data?.map.final ? canvas.data.map.destination : ''} generated className="canvas-destination-photo"/>}
      {reviewLoading && <p role="status" className="canvas-notice">Loading trip details for review…</p>}
      {reviewError && <p role="alert" className="canvas-error">{reviewError}</p>}
      {canvas.loading && <p role="status" className="canvas-notice">Loading your draft…</p>}
      {canvas.error && <div className="canvas-error" role="alert"><p>{canvas.error}</p>{(!canvas.data) && <button className="ds-button small" disabled={busy} onClick={reload}>{canvas.conflict ? 'Review latest saved plan' : 'Retry loading'}</button>}</div>}
      {canvas.saveError && <div className="canvas-error" role="alert"><p>{canvas.saveError}</p><button className="ds-button small" disabled={busy || canvas.editing} onClick={canvas.conflict ? reload : canvas.save}>{canvas.conflict ? 'Review latest draft' : 'Retry saving'}</button></div>}
      {canvas.staleContext && <div className="canvas-notice"><p>The conversation has newer trip details. This canvas still shows the version you reviewed. Regenerate the plan to bring the current details into this draft.</p></div>}
      {!screen && canvas.editing && <p className="canvas-notice" role="status">Your card edit stays open while you chat or explore travel. Finish the edit to save it automatically, or cancel it to keep the previous details.</p>}
      {!screen && !busy && canvas.notice && canvas.dirty && <p className="canvas-notice" role="status">{canvas.notice}</p>}

      {travel.error && <p role="alert" className="canvas-error">{travel.error} <button className="ds-button" onClick={travel.retry}>Retry travel connection</button></p>}

      {canvas.renderData && <div aria-hidden={screen ? true : undefined} inert={Boolean(screen)}><CanvasMapContext.Provider value={{ preview, viewStateKey: selected.plan_id, destinationHint: canvas.mapDestinationHint, onClearPreview: () => setPreview(null), onAddPreview: place => canvas.addActivities([place]), disabled: busy || canvas.data.map.pins.length >= 50 }}><CanvasSurface surfaceId={`planning-canvas-${selected.plan_id}`} data={canvas.renderData} combinedPlaces viewStateKey={selected.plan_id} visible={['map', 'flights', 'accommodation'].filter(id => canvas.renderData[id] && (id !== 'flights' || canvas.renderData.flights.need === 'needed'))} onAction={action} disabled={busy} mapAdapter={CanvasDestinationMap} placePhoto={CanvasPlacePhoto} placeDetails={CanvasPlaceDetails} placePreview={preview} preview={false} travelCapabilities={travel.capabilities}/></CanvasMapContext.Provider></div>}
      {canvas.renderData && <TripBriefing key={selected.plan_id} data={canvas.renderData} groups={canvas.groups} disabled={busy || Boolean(canvas.saveError)} editing={canvas.editing} onAction={action} onRefresh={generate}/>}
      <dialog className="canvas-confirm" ref={dialog} aria-labelledby="canvas-confirm-title" onCancel={event => { event.preventDefault(); setConfirm(null); }}>
        <h2 id="canvas-confirm-title">{confirm?.kind === 'generate' ? `Replace the draft ${groupLabel[confirm.group]}?` : confirm?.kind === 'reload' ? 'Discard edits and load the saved plan?' : 'Leave with changes still pending?'}</h2>
        <p>{confirm?.kind === 'generate' ? 'New results replace the selected generated sections, including edits in those sections. Your essentials and saved map places stay in the draft. Completed results are saved automatically to your draft.' : 'Changes that have not finished saving and unfinished edits may be lost. Keep editing to let your draft finish saving.'}</p>
        <div><button type="button" className="ds-button" autoFocus onClick={() => setConfirm(null)}>Keep editing</button><button type="button" className="ds-button primary" onClick={confirmed}>{confirm?.kind === 'generate' ? 'Replace draft sections' : confirm?.kind === 'reload' ? 'Load saved plan' : 'Leave canvas'}</button></div>
      </dialog>
    </div>
      <section ref={travelScreen} hidden={!screen} className="canvas-travel-screen" aria-label={activeTravel === 'flights' ? 'Explore flights' : 'Explore stays'}>
      {screen && <nav className="travel-navigation" aria-label="Travel search"><button autoFocus onClick={returnToCanvas}>{resultsOpen.current ? '← Back to plan chat' : '← Back to canvas'}</button>{[['accommodation', 'Stays', 'hotels'], ['flights', 'Flights', 'flights']].filter(([mode, , key]) => travel.capabilities?.[key] && (mode !== 'flights' || flightBrowsing)).map(([mode, label]) => <button key={mode} aria-pressed={activeTravel === mode} onClick={() => { setVisitedTravel(prev => ({ ...prev, [mode]: true })); setScreen(mode); }}>{label}</button>)}<span>{travel.capabilities?.sandbox ? 'LiteAPI sandbox · test inventory' : 'Search with LiteAPI'}</span></nav>}
      {screen && <header className="canvas-travel-heading"><p>{selected.title}</p><h1>{activeTravel === 'flights' ? 'Flights' : 'Stays'}</h1></header>}
      {screen === 'travel-results' && !selectedTravel && <section aria-label="Travel result recovery"><p role="status">These results are no longer available. Return to Plan chat to search again.</p></section>}
      {['accommodation', 'flights'].filter(mode => visitedTravel[mode] && (mode !== 'flights' || flightBrowsing)).map(mode => <TravelSearch key={`${selected.plan_id}-${mode}`} planId={selected.plan_id} mode={mode} active={activeTravel === mode} importedSnapshot={chat.travelSnapshots[travelImports[mode]?.searchId]} importRequest={travelImports[mode]?.request} importReason={travelImports[mode] ? chat.travelReason(chat.travelSnapshots[travelImports[mode].searchId]) : ''} initialData={canvas.data} onExpired={onExpired} onBookingResult={canvas.updateMockBooking}/>)}
      </section>
    <div id="plan-chat-panel" className="canvas-chat-panel" hidden={!chatOpen || Boolean(screen)}><CanvasConversation collapseRef={chatCollapseButton} visible={chatOpen && !screen} chat={chat} data={canvas.data} disabled={Boolean(canvas.activeGroup || canvas.saving || canvas.loading)} generating={Boolean(canvas.activeGroup)} onClose={collapseChat} onPreview={showPlace} onAdd={canvas.addActivities} onOpenTravel={openTravelResults}/></div>
    {!chatOpen && !screen && <div className="canvas-chat-rail"><button ref={chatReopenButton} type="button" className="canvas-chat-expand" aria-label="Expand plan chat" title="Expand plan chat" aria-controls="plan-chat-panel" aria-expanded={false} onClick={openChat}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4v16m15-8H8m5-5-5 5 5 5"/></svg><span>Chat</span>{chat.active && <span className="canvas-chat-rail-status" aria-label="Travella is replying"/>}</button></div>}
    </div>
  </main>;
}
