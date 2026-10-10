import React, { useEffect, useRef, useState } from 'react';
import { TravelSearch, useTravelCapabilities } from '../travel/TravelSearch';
import { useFlightBookingSync } from '../travel/useFlightBookingSync';
import { CanvasSurface } from '../../../design-system/a2ui/CanvasSurface';
import { ids } from '../../../design-system/schemas';
import { Icon } from '../../../design-system/components/primitives';
import { CanvasDestinationMap, CanvasMapContext } from './CanvasDestinationMap';
import { usePlanningCanvas } from '../usePlanningCanvas';
import { useCanvasConversation } from '../useCanvasConversation';
import { CanvasPlacePhoto } from './CanvasPlacePhoto';
import { CanvasConversation } from './CanvasConversation';
import '../../../design-system/tokens.css';
import '../../../design-system/components.css';
import './planning-canvas.css';
import './canvas-conversation.css';

const groupLabel = { all: 'plan', themes: 'themes and preferences', research: 'research and useful websites' };

export function PlanningCanvas({ selected, api, onBack, onExpired, onSaved, onDirtyChange, onBusyChange, autoGenerate = false }) {
  const [chatBusy, setChatBusy] = useState(false);
  const canvas = usePlanningCanvas({ selected, api, onExpired, onSaved, externalBusy: chatBusy });
  const chat = useCanvasConversation({ selected, api, data: canvas.data, blocked: Boolean(canvas.activeGroup || canvas.saving || canvas.loading), onExpired, onAdd: canvas.addActivities, onBusyChange: setChatBusy });
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileView, setMobileView] = useState(autoGenerate ? 'chat' : 'canvas');
  const [preview, setPreview] = useState(null);
  const [searchArea, setSearchArea] = useState(null);
  const generated = useRef(false);
  const [screen, setScreen] = useState(null);
  useFlightBookingSync(selected.plan_id, !screen && !canvas.loading && Boolean(canvas.data), canvas.updateMockBooking);
  const travel = useTravelCapabilities(selected.plan_id, onExpired);
  const [visitedTravel, setVisitedTravel] = useState({});
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
  const started = useRef(false);
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  const dirty = canvas.dirty || canvas.editing;
  const busy = Boolean(canvas.activeGroup || canvas.saving || chatBusy);
  const callbacks = useRef({ onDirtyChange, onBusyChange }); callbacks.current = { onDirtyChange, onBusyChange };

  useEffect(() => { callbacks.current.onDirtyChange?.(dirty); }, [dirty]);
  useEffect(() => { callbacks.current.onBusyChange?.(busy); }, [busy]);
  useEffect(() => () => { callbacks.current.onDirtyChange?.(false); callbacks.current.onBusyChange?.(false); }, []);
  useEffect(() => {
    if (preview && canvas.data?.map.pins.some(pin => pin.id === preview.id || (pin.name === preview.name && pin.position.lat === preview.position.lat && pin.position.lng === preview.position.lng))) setPreview(null);
  }, [canvas.data?.map.pins, preview]);
  useEffect(() => {
    if (canvas.activeGroup) { generated.current = true; setChatOpen(true); }
    else if (generated.current) { generated.current = false; chat.retryHistory(); setChatOpen(true); setMobileView('chat'); }
  }, [canvas.activeGroup]);
  useEffect(() => {
    const warn = event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  useEffect(() => {
    if (!autoGenerate || started.current || canvas.loading || !canvas.data) return;
    started.current = true;
    if (canvas.saved) setConfirm({ kind: 'generate', group: 'all' });
    else void canvas.generate('all');
  }, [autoGenerate, canvas.loading, canvas.data, canvas.saved]);
  useEffect(() => {
    if (confirm) { returnFocus.current = document.activeElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); returnFocus.current?.focus?.(); }
  }, [confirm]);

  function generate(group) {
    if (canvas.editing || busy) return;
    const components = group === 'themes' ? ['themes'] : group === 'research' ? ['findings', 'links'] : ['themes', 'findings', 'links'];
    if (components.some(id => canvas.data?.[id]?.items?.length)) setConfirm({ kind: 'generate', group });
    else void canvas.generate(group);
  }
  function leave() { if (dirty || busy) setConfirm({ kind: 'leave' }); else onBack(); }
  function reload() { if (dirty) setConfirm({ kind: 'reload' }); else canvas.reload(); }
  async function confirmed() {
    const choice = confirm; setConfirm(null);
    if (choice.kind === 'generate') void canvas.generate(choice.group);
    if (choice.kind === 'reload') canvas.reload();
    if (choice.kind === 'leave') { if (canvas.activeGroup) await canvas.stop(); if (chat.active) await chat.stop(); onBack(); }
  }
  function action(id, name, payload) {
    if (name === 'clear_place_preview') { setPreview(null); return; }
    if (name === 'open_flights' || name === 'open_accommodation') { const mode = name === 'open_flights' ? 'flights' : 'accommodation'; setVisitedTravel(prev => ({ ...prev, [mode]: true })); setScreen(mode); setMobileView('canvas'); return; }
    if (name === 'retry') { generate(id === 'themes' ? 'themes' : id === 'findings' || id === 'links' ? 'research' : 'all'); return; }
    if (name === 'editor_state' || !chatBusy) canvas.action(id, name, payload);
  }
  function showPlace(place) { setPreview(place); setScreen(null); setMobileView('canvas'); requestAnimationFrame(() => document.querySelector('.planning-canvas .ds-map-card')?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })); }
  function searchMapArea(area) { if (busy) return; setSearchArea(area); setChatOpen(true); setMobileView('chat'); void chat.send('Find a few activities that fit my trip within this map area.', area); }
  const progress = canvas.activeGroup ? canvas.notice || 'Preparing your trip…' : canvas.saving ? 'Saving your plan…' : canvas.dirty || canvas.editing ? 'Unsaved changes' : canvas.saved ? 'Saved' : 'Ready to plan';
  return <main id="canvas-main" className={`planning-canvas canvas-workspace ${chatOpen && !screen ? 'with-chat' : 'chat-closed'} mobile-${mobileView} ${screen ? 'travel-open' : ''}`} aria-label="Planning canvas" tabIndex={-1}>
    <nav className="canvas-mobile-tabs" aria-label="Plan workspace view"><button type="button" aria-pressed={mobileView === 'canvas'} onClick={() => setMobileView('canvas')}>Plan & map {canvas.data?.map.pins.length ? `(${canvas.data.map.pins.length})` : ''}</button><button type="button" aria-pressed={mobileView === 'chat' && chatOpen} onClick={() => { setChatOpen(true); setMobileView('chat'); }}>Conversation {chat.active ? '· replying' : ''}</button></nav>
    <div className="canvas-workspace-body">
    <div className="planning-canvas-inner" tabIndex={screen ? 0 : undefined} role={screen ? 'region' : undefined} aria-label={screen ? 'Travel search' : undefined}>
      <header className="canvas-page-heading"><div><button type="button" className="ds-text-button" onClick={leave} disabled={canvas.saving}>← Back to conversation</button><span className="ds-eyebrow">YOUR PLAN, TAKING SHAPE</span><h1>{selected.title || 'Your travel plan'}</h1><p>Review the details, make it yours, and save when you’re ready.</p></div><div className="canvas-main-actions"><span className="canvas-save-state" role="status" aria-live="polite">{chatBusy ? 'Your companion is replying…' : progress}</span>{canvas.activeGroup ? <button type="button" className="ds-button" onClick={canvas.stop}>Stop generation</button> : <button type="button" className="ds-button" disabled={canvas.loading || busy || canvas.editing || !canvas.data} onClick={() => generate('all')}><Icon name="spark" size={16}/>{canvas.saved || canvas.data?.themes.items.length ? 'Regenerate plan' : 'Generate plan'}</button>}<button type="button" className="ds-button primary" disabled={canvas.loading || busy || canvas.editing || !canvas.valid || canvas.conflict || !canvas.dirty} onClick={canvas.save}>{canvas.saving ? 'Saving…' : 'Save plan'}</button>{!chatOpen && <button type="button" className="ds-button" onClick={() => { setChatOpen(true); setMobileView('chat'); }}>Open chat</button>}</div></header>
      {canvas.loading && <p role="status" className="canvas-notice">Loading your saved plan…</p>}
      {canvas.error && <div className="canvas-error" role="alert"><p>{canvas.error}</p>{(!canvas.data || canvas.conflict) && <button className="ds-button small" disabled={busy} onClick={reload}>{canvas.conflict ? 'Review latest saved plan' : 'Retry loading'}</button>}</div>}
      {canvas.staleContext && <div className="canvas-notice"><p>The conversation has newer trip details. This canvas still shows the version you reviewed. Regenerate the plan to bring the current details into this draft.</p></div>}
      {!screen && canvas.editing && <p className="canvas-notice" role="status">Your card edit stays open while you chat or explore travel. Finish or cancel it before saving or regenerating the plan.</p>}
      {!screen && !busy && canvas.notice && <p className="canvas-notice" role="status">{canvas.notice}</p>}
      {canvas.data && <div className="canvas-group-actions" aria-label="Generate individual plan sections">{['themes', 'research'].map(group => <div key={group}><span>{group === 'themes' ? 'Themes & preferences' : 'Research & websites'}</span><button type="button" className="ds-text-button" disabled={busy || canvas.editing} onClick={() => generate(group)}>{canvas.groups[group] === 'error' ? 'Retry' : 'Regenerate'}</button>{canvas.groups[group] === 'error' && <small role="status">Couldn’t finish. Completed details are still here.</small>}</div>)}</div>}
      {travel.error && <p role="alert" className="canvas-error">{travel.error} <button className="ds-button" onClick={travel.retry}>Retry travel connection</button></p>}
      {screen && <nav className="travel-navigation" aria-label="Travel search"><button autoFocus onClick={() => { travelReturnFocus.current = screen; setScreen(null); }}>← Back to canvas</button>{[['accommodation', 'Stays', 'hotels'], ['flights', 'Flights', 'flights']].filter(([, , key]) => travel.capabilities?.[key]).map(([mode, label]) => <button key={mode} aria-pressed={screen === mode} onClick={() => { setVisitedTravel(prev => ({ ...prev, [mode]: true })); setScreen(mode); }}>{label}</button>)}<span>{travel.capabilities?.sandbox ? 'LiteAPI sandbox · test inventory' : 'Search with LiteAPI'}</span></nav>}
      {['accommodation', 'flights'].filter(mode => visitedTravel[mode]).map(mode => <TravelSearch key={`${selected.plan_id}-${mode}`} planId={selected.plan_id} mode={mode} active={screen === mode} initialData={canvas.data} onExpired={onExpired} onBookingResult={canvas.updateMockBooking}/>)}
      {canvas.renderData && <div hidden={Boolean(screen)}><CanvasMapContext.Provider value={{ preview, destinationHint: canvas.mapDestinationHint, onClearPreview: () => setPreview(null), onSearchArea: searchMapArea, onAddPreview: place => canvas.addActivities([place]), disabled: busy || canvas.data.map.pins.length >= 50 }}><CanvasSurface surfaceId={`planning-canvas-${selected.plan_id}`} data={canvas.renderData} visible={ids} onAction={action} disabled={busy} mapAdapter={CanvasDestinationMap} placePhoto={CanvasPlacePhoto} placePreview={preview} preview={false} travelCapabilities={travel.capabilities}/></CanvasMapContext.Provider></div>}
      <dialog className="canvas-confirm" ref={dialog} aria-labelledby="canvas-confirm-title" onCancel={event => { event.preventDefault(); setConfirm(null); }}>
        <h2 id="canvas-confirm-title">{confirm?.kind === 'generate' ? `Replace the draft ${groupLabel[confirm.group]}?` : confirm?.kind === 'reload' ? 'Discard edits and load the saved plan?' : 'Leave without saving?'}</h2>
        <p>{confirm?.kind === 'generate' ? 'New results replace the selected generated sections, including edits in those sections. Your essentials and saved map places stay in the draft. Save plan is still required to keep the result.' : 'Your unsaved canvas edits will be discarded. Your last saved plan will remain available.'}</p>
        <div><button type="button" className="ds-button" autoFocus onClick={() => setConfirm(null)}>Keep editing</button><button type="button" className="ds-button primary" onClick={confirmed}>{confirm?.kind === 'generate' ? 'Replace draft sections' : confirm?.kind === 'reload' ? 'Load saved plan' : 'Leave canvas'}</button></div>
      </dialog>
    </div>
    <div className="canvas-chat-panel" hidden={Boolean(screen)}><CanvasConversation chat={chat} data={canvas.data} disabled={Boolean(canvas.activeGroup || canvas.saving || canvas.loading)} generating={Boolean(canvas.activeGroup)} onClose={() => { setChatOpen(false); setMobileView('canvas'); }} onPreview={showPlace} onAdd={canvas.addActivities} area={searchArea} onClearArea={() => setSearchArea(null)}/></div>
    </div>
  </main>;
}
