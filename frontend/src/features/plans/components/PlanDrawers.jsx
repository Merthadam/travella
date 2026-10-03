import React, { useEffect, useRef, useState } from 'react';
import { requestId } from '../../../plansApi';

function SwipeDrawer({ side, onClose, children, className, label }) {
  const [offset, setOffset] = useState(0);
  const drag = useRef(null);
  const isLeft = side === 'left';
  const start = event => {
    if (event.target.closest?.('button, a, input, textarea, select, [role="button"], [contenteditable="true"]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, offset: 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const delta = event.clientX - drag.current.x;
    const next = isLeft ? Math.min(0, delta) : Math.max(0, delta);
    drag.current.offset = next;
    setOffset(next);
  };
  const end = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const distance = Math.abs(drag.current.offset);
    drag.current = null;
    if (distance > 90) onClose();
    else setOffset(0);
  };
  return <aside className={`${className} shadow-2xl`} aria-label={label} style={{ transform: `translateX(${offset}px)`, transition: drag.current ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>{children}</aside>;
}

export function PlanDrawer({ plans, loading, selected, actions, onClose, onOpen, onNew }) {
  return <><button className="drawer-backdrop" aria-label="Close plans navigation" onClick={onClose} /><SwipeDrawer side="left" className="plan-drawer" label="Your plans" onClose={onClose}><div className="drawer-header"><div><p className="eyebrow">TRAVELLA</p><h2>Plans</h2></div><button aria-label="Close plans navigation" onClick={onClose}>Close</button></div><a className="drawer-all" href="/plans" onClick={event => onOpen(event, null)}>All plans</a>{loading && <p role="status">Loading plans…</p>}<ul className="drawer-list">{plans.map(plan => <li key={plan.plan_id}><a className={selected?.plan_id === plan.plan_id ? 'current' : ''} href={`/plans/${plan.plan_id}`} onClick={event => onOpen(event, plan.plan_id)}><strong>{plan.title}</strong><span>{plan.destination_summary || 'No destination yet'}</span></a>{selected?.plan_id === plan.plan_id && <div className="drawer-plan-actions">{actions(plan)}</div>}</li>)}</ul>{!loading && !plans.length && <p className="drawer-empty">No active plans yet.</p>}<button className="primary drawer-new" onClick={onNew}>New plan</button></SwipeDrawer></>;
}

export function ConversationDrawer({ selected, onClose, api, onExpired }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const history = useRef(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const planId = selected?.plan_id;

  useEffect(() => {
    let active = true;
    setMessages([]);
    setError('');
    setLoading(true);
    api.conversationMessages({ plan_id: planId }).then(result => {
      if (active) setMessages(result);
    }).catch(err => {
      if (!active) return;
      if (err.status === 401) onExpiredRef.current();
      else setError(err.message || 'Could not load this conversation.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, planId]);

  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages, sending]);

  async function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await api.agentTurn(selected, message, requestId());
      const timestamp = new Date().toISOString();
      setMessages(current => [
        ...current,
        { message_id: `user-${result.event_id}`, role: 'user', content: message, created_at: timestamp },
        {
          message_id: `assistant-${result.event_id}`,
          role: 'assistant',
          content: result.assistant_text || result.question || result.error || 'I’m ready to help plan this trip.',
          created_at: timestamp,
          candidates: result.candidates || [],
        },
      ]);
      setDraft('');
    } catch (err) {
      if (err.status === 401) onExpiredRef.current();
      else setError(err.message || 'Copilot could not respond. Try again.');
    } finally { setSending(false); }
  }

  return <><button className="drawer-backdrop" aria-label="Close Copilot" onClick={onClose} /><SwipeDrawer side="right" className="conversation-drawer !w-[min(420px,calc(100vw-32px))]" label="Copilot" onClose={onClose}><div className="flex h-full flex-col"><div className="drawer-header shrink-0"><div><p className="eyebrow">COPILOT</p><h2>{selected?.title}</h2></div><button aria-label="Close Copilot" onClick={onClose}>Close</button></div><div ref={history} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-5" aria-live="polite" aria-busy={loading || sending}>
    {loading && <p className="text-sm text-slate-300" role="status">Loading conversation…</p>}
    {!loading && !messages.length && <div className="my-8"><span className="plan-badge">TRAVEL COPILOT</span><h3 className="mt-3 text-xl font-semibold">Where would you like to go?</h3><p className="mt-2 text-sm leading-6 text-slate-300">Tell me what kind of trip you have in mind. I’ll help shape the destination shortlist for this plan.</p></div>}
    {messages.map(item => <article key={item.message_id || `${item.event_id}-${item.role}`} className={`max-w-[94%] rounded-2xl px-4 py-3 ${item.role === 'user' ? 'ml-auto bg-teal-700 text-white' : 'mr-auto border border-slate-700 bg-slate-800 text-slate-100'}`}><p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>{item.candidates?.length > 0 && <ul className="mt-3 space-y-2" aria-label="Suggested destinations">{item.candidates.map((candidate, index) => <li key={candidate.candidate_id || candidate.place_id || index} className="rounded-xl border border-slate-600 bg-slate-900/60 p-3"><strong className="block text-sm">{candidate.name || candidate.title || candidate.destination || 'Destination idea'}</strong>{(candidate.location || candidate.address || candidate.summary) && <span className="mt-1 block text-xs leading-5 text-slate-300">{candidate.location || candidate.address || candidate.summary}</span>}</li>)}</ul>}</article>)}
    {error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</p>}
    {sending && <p role="status" className="text-sm text-slate-300">Copilot is thinking…</p>}
  </div><form onSubmit={send} className="shrink-0 border-t border-slate-700 pt-4"><label htmlFor="copilot-message" className="sr-only">Message Copilot</label><textarea id="copilot-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="Describe the trip you have in mind…" disabled={sending || loading} className="w-full resize-y rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 disabled:opacity-60" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">For {selected?.title}</span><button type="submit" disabled={sending || loading || !draft.trim()} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Thinking…' : 'Send'}</button></div></form></div></SwipeDrawer></>;
}
