// Throwaway host: production components with in-memory chat and card fixtures only.
import React, { useEffect, useRef, useState } from 'react';
import { CanvasConversation } from '../components/CanvasConversation';
import { TripEssentials } from '../../../design-system/components/TripEssentials';
import { TripThemes } from '../../../design-system/components/TripThemes';
import { ResearchFindings } from '../../../design-system/components/ResearchFindings';
import { fixtures } from '../../../design-system/preview/fixtures';
import '../../../design-system/tokens.css';
import '../../../design-system/components.css';
import '../components/planning-canvas.css';
import '../components/canvas-conversation.css';
import './aligned-loading-prototype.css';

export function AlignedSampleCanvas({ background = false }) {
  const [data, setData] = useState(fixtures);
  const [notice, setNotice] = useState('');
  function action(name, value) {
    if (name === 'edit_essentials') setData(current => ({ ...current, essentials: value }));
    if (['add_theme', 'edit_theme', 'remove_theme'].includes(name)) setData(current => ({ ...current, themes: { ...current.themes, items: name === 'remove_theme' ? current.themes.items.filter(item => item.id !== value.id) : name === 'add_theme' ? [...current.themes.items, value] : current.themes.items.map(item => item.id === value.id ? value : item) } }));
    if (name === 'remove_finding') setData(current => ({ ...current, findings: { ...current.findings, items: current.findings.items.filter(item => item.id !== value.id) } }));
    if (name === 'open_source') setNotice('Source preview only. No external navigation.');
  }
  return <div className={`cg-aligned-samples ${background ? 'cg-sample-background' : ''}`} inert={background || undefined} aria-hidden={background || undefined}>
    <p className="canvas-notice">Interactive sample canvas · changes stay in this preview.</p>
    <TripEssentials data={data.essentials} onAction={action} disabled={background}/>
    <TripThemes data={data.themes} onAction={action} disabled={background}/>
    <ResearchFindings data={data.findings} onAction={action} disabled={background}/>
    {notice && <p role="status" className="canvas-notice">{notice}</p>}
  </div>;
}

export function AlignedLoadingWorkspace({ children, loading, phase, status, generationKey }) {
  const [open, setOpen] = useState(false);
  const [mobileView, setMobileView] = useState('canvas');
  const [messages, setMessages] = useState([]);
  const collapse = useRef(null);
  const expand = useRef(null);
  const mobileTab = useRef(null);
  useEffect(() => {
    setOpen(false); setMobileView('canvas'); setMessages([]);
    const timer = setTimeout(() => setOpen(true), 180);
    return () => clearTimeout(timer);
  }, [generationKey]);
  function closeChat() {
    setOpen(false); setMobileView('canvas');
    requestAnimationFrame(() => (matchMedia('(max-width:760px)').matches ? mobileTab.current : expand.current)?.focus());
  }
  function openChat() { setOpen(true); setMobileView('chat'); requestAnimationFrame(() => collapse.current?.focus()); }
  const chat = {
    messages, loading: false, active: false, historyError: '', error: '',
    send: async text => setMessages(current => [...current, { message_id: `user-${current.length}`, role: 'user', content: text }, { message_id: `reply-${current.length}`, role: 'assistant', content: 'This is an interaction preview. Your message stays here; no research runs and no Plan changes are saved.' }]),
    retryHistory() {}, stop() {},
  };
  return <section className={`cg-aligned-workspace ${open ? 'copilot-open' : 'copilot-closed'} mobile-${mobileView}`}>
    <nav className="canvas-mobile-tabs" aria-label="Plan workspace view"><button type="button" aria-pressed={mobileView === 'canvas'} onClick={() => setMobileView('canvas')}>Plan & map</button><button ref={mobileTab} type="button" aria-controls="plan-chat-panel" aria-expanded={mobileView === 'chat' && open} aria-pressed={mobileView === 'chat' && open} onClick={openChat}>Conversation</button></nav>
    <div className="cg-aligned-columns">
      <div className="cg-aligned-main">
        <header className="canvas-page-heading"><div><span className="ds-eyebrow">YOUR PLAN, TAKING SHAPE</span><h1>Lisbon, at your pace</h1><p>Lisbon, Portugal · Destination confirmed</p></div><span className="canvas-save-state" role="status">{loading ? phase === 'research' ? 'Researching your trip…' : 'Creating your canvas…' : status === 'complete' ? 'Preview ready' : 'Generation paused'}</span></header>
        {children}
      </div>
      <div className="cg-copilot-slot" id="plan-chat-panel" inert={!open || undefined} aria-hidden={!open || undefined}>
        <CanvasConversation chat={chat} data={{ map: { destination: 'Lisbon, Portugal', pins: [] } }} disabled={status !== 'complete'} generating={loading} visible={open} collapseRef={collapse} onClose={closeChat}/>
      </div>
      {!open && <div className="canvas-chat-rail"><button ref={expand} className="canvas-chat-expand" type="button" aria-label="Expand plan chat" aria-controls="plan-chat-panel" aria-expanded={false} onClick={openChat}><span aria-hidden="true">←</span><span>Chat</span></button></div>}
    </div>
  </section>;
}
