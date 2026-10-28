import React, { useId, useState } from 'react';
import { TripThemes } from '../../../design-system/components/TripThemes';
import { websiteUrl } from '../../../design-system/schemas';
import './trip-briefing.css';

const certaintyLabels = { uncertain: 'Worth double-checking', conflicting: 'Sources disagree', unavailable: 'Source unavailable' };
const preferenceLabels = { theme: 'Interests', pace: 'Pace', priority: 'Priorities', must_do: 'Must do', avoid: 'Prefer to avoid' };
const list = values => new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(values);
const sentence = value => /[.!?]$/.test(value) ? value : `${value}.`;

function Source({ source }) {
  if (!websiteUrl.safeParse(source.url).success) return null;
  return <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || new URL(source.url).hostname}<span aria-hidden="true"> ↗</span><span className="trip-briefing-sr"> (opens in a new tab)</span></a>;
}

export function briefingOverview(data) {
  const destination = data.map?.final ? data.map.destination : '';
  const themes = data.themes?.items || [];
  const interests = themes.filter(item => item.kind === 'theme').slice(0, 2).map(item => item.text);
  const direction = themes.find(item => ['pace', 'priority'].includes(item.kind));
  const travelers = data.essentials?.travelers;
  return [destination ? `A trip to ${destination}${travelers ? ` for ${travelers === 1 ? 'one traveler' : `${travelers} travelers`}` : ''}.` : 'Your trip is still taking shape.',
    interests.length ? sentence(`Your interests: ${list(interests)}`) : '',
    direction ? sentence(`${preferenceLabels[direction.kind]}: ${direction.text}`) : '',
  ].filter(Boolean).join(' ');
}

function Finding({ item, detail = false, links }) {
  const sources = [...new Map((item.sources || []).map(source => [source.url, source])).values()];
  const visibleSources = detail ? sources : sources.slice(0, item.certainty === 'conflicting' ? 2 : 1);
  return <div className="trip-briefing-finding">
    <p><strong>{item.title}{/[.!?]$/.test(item.title) ? '' : '.'}</strong> {item.summary}{' '}
      {visibleSources.map(source => <React.Fragment key={source.url}><Source source={{ ...source, title: links.find(link => link.url === source.url)?.purpose || source.title }}/>{' '}</React.Fragment>)}
    </p>
    {certaintyLabels[item.certainty] && <small className="trip-briefing-certainty">{certaintyLabels[item.certainty]}</small>}
    {detail && item.researchedAt && !Number.isNaN(Date.parse(item.researchedAt)) && <small>Source read {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(item.researchedAt))}</small>}
  </div>;
}

export function TripBriefing({ data, groups = {}, disabled = false, editing = false, onAction, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const findings = data.findings?.items || [];
  const links = data.links?.items || [];
  const themes = data.themes || { status: 'ready', items: [] };
  const loading = ['themes', 'research'].some(group => groups[group] === 'loading');
  const failed = ['themes', 'research'].some(group => groups[group] === 'error');
  const cited = new Set(findings.flatMap(item => (item.sources || []).map(source => source.url)));
  const otherLinks = [...new Map(links.filter(link => !cited.has(link.url)).map(link => [link.url, link])).values()];
  const places = data.map?.pins || [];
  const retryGroup = groups.themes === 'error' ? 'all' : 'research';
  return <section className="trip-briefing" aria-labelledby={`${id}-title`} aria-busy={loading}>
    <header className="trip-briefing-heading"><h2 id={`${id}-title`}>Your trip, in brief</h2>{data.map?.final && <span>{data.map.destination}</span>}</header>
    <p className="trip-briefing-intro">{briefingOverview(data)}</p>
    {findings.length > 0 && <ul className="trip-briefing-highlights">{findings.slice(0, 3).map(item => <li key={item.id}><Finding item={item} links={links}/></li>)}</ul>}
    {loading && <p className="trip-briefing-status" role="status">Gathering useful details and sources for your trip…</p>}
    {failed && <p className="trip-briefing-status" role="status">Some details couldn’t be refreshed. Your existing information is still here.</p>}
    {!findings.length && !loading && !failed && <p className="trip-briefing-status">Useful local context and sources will appear here when you generate your briefing.</p>}
    <div id={`${id}-more`} className="trip-briefing-more" hidden={!expanded}>
      <h3>The shape of your trip</h3>
      {places.length > 0 && <p>On your map: {list(places.slice(0, 5).map(place => place.name))}{places.length > 5 ? ` and ${places.length - 5} more` : ''}.</p>}
      {data.essentials?.dates?.flexible && <p>Your dates are flexible.</p>}
      {!data.essentials?.dates?.flexible && data.essentials?.dates?.start && <p>Travel dates: {data.essentials.dates.start}{data.essentials.dates.end ? ` to ${data.essentials.dates.end}` : ''}.</p>}
      {data.essentials?.budget?.label && <p>Budget: {data.essentials.budget.label}</p>}
      {data.essentials?.budget?.noFixedBudget && <p>No fixed budget.</p>}
      {findings.length > 3 && <div className="trip-briefing-extra"><h3>A little more local context</h3>{findings.slice(3).map(item => <Finding key={item.id} item={item} detail links={links}/>)}</div>}
      {findings.slice(0, 3).some(item => item.sources?.length > 1) && <div><h3>More sources</h3>{[...new Map(findings.slice(0, 3).flatMap(item => item.sources || []).map(source => [source.url, source])).values()].map(source => <p key={source.url}><Source source={source}/></p>)}</div>}
      {otherLinks.length > 0 && <div><h3>Useful for your trip</h3>{otherLinks.map(link => <p key={link.url}><Source source={link}/>{link.purpose && <span> — {link.purpose}</span>}</p>)}</div>}
      <TripThemes data={themes} embedded preview={false} disabled={disabled} onAction={(name, payload) => onAction?.('themes', name, payload)}/>
      <p className="trip-briefing-provenance">Suggestions aren’t saved places or bookings. Check linked sources for current details and availability for your dates.</p>
    </div>
    <footer className="trip-briefing-footer">
      <button type="button" aria-expanded={expanded} aria-controls={`${id}-more`} disabled={editing} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Read more'} <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></button>
      <button type="button" disabled={disabled || editing || loading} onClick={() => onRefresh?.(retryGroup)}>{failed ? 'Retry briefing' : findings.length ? 'Refresh briefing' : 'Generate briefing'}</button>
    </footer>
  </section>;
}
