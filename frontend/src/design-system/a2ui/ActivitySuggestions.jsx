import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, createBinderlessComponentImplementation } from '@a2ui/react/v0_9';
import { Icon } from '../components/primitives';
import { loadGoogleMaps } from '../../lib/googleMaps';

const placeId = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const mapsUrl = z.string().max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname) && (url.hostname === 'maps.google.com' || url.pathname.startsWith('/maps')); } catch { return false; }
}, 'Invalid Google Maps link.');
export const activitySuggestionSchema = z.object({
  id: placeId, place_id: z.string().min(1).max(300), name: z.string().min(1).max(120), address: z.string().max(240),
  position: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict(),
  rating: z.number().min(0).max(5).nullable(), rating_count: z.number().int().nonnegative().nullable(),
  types: z.array(z.string().max(80)).max(10), maps_url: mapsUrl, reason: z.string().max(240), ticket: z.string().min(1).max(4096),
}).strict();
const areaSchema = z.object({ south: z.number().min(-90).max(90), north: z.number().min(-90).max(90), west: z.number().min(-180).max(180), east: z.number().min(-180).max(180) }).strict().refine(value => value.south < value.north && value.west < value.east);
export const canvasEditResultSchema = z.object({ suggestions: z.array(activitySuggestionSchema).max(5), add_ids: z.array(placeId).max(5), area: areaSchema.nullable() }).strict().refine(value => new Set(value.suggestions.map(place => place.id)).size === value.suggestions.length, 'Duplicate suggestions.');
const surfaceDataSchema = z.object({ suggestions: z.array(activitySuggestionSchema).max(5), added: z.array(placeId).max(50) }).strict();
const Options = createContext({ disabled: false });
const categoryName = place => (place.types.find(type => !['point_of_interest', 'establishment'].includes(type)) || 'Place to explore').replaceAll('_', ' ');

// Photos are fetched only for the expanded place and kept for this mounted
// surface. Never store provider photos in the saved plan or browser storage.
function PlacePhoto({ place }) {
  const cache = useRef(new Map());
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let alive = true; setPhoto(null);
    if (!cache.current.has(place.place_id)) cache.current.set(place.place_id, loadGoogleMaps({ libraries: ['places'] }).then(async ({ libraries }) => {
      const detail = new libraries.places.Place({ id: place.place_id });
      await detail.fetchFields({ fields: ['photos'] });
      const first = detail.photos?.[0];
      return first ? { uri: first.getURI({ maxWidth: 800, maxHeight: 360 }), authors: first.authorAttributions || [] } : null;
    }).catch(() => null));
    cache.current.get(place.place_id).then(value => { if (alive) setPhoto(value); });
    return () => { alive = false; };
  }, [place.place_id]);
  if (photo) return <figure className="activity-real-photo"><img src={photo.uri} alt={place.name} onError={() => setPhoto(null)}/>{photo.authors.length > 0 && <figcaption>{photo.authors.map((author, index) => { let href; try { const uri = new URL(author.uri); if (uri.protocol === 'https:') href = uri.href; } catch { /* Attribution remains plain text. */ } return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer">{author.displayName || 'Photo contributor'}</a> : <span key={index}>{author.displayName || 'Photo contributor'}</span>; })}</figcaption>}</figure>;
  return <div className="activity-place-art" aria-hidden="true"><span className="activity-art-line"/><span className="activity-art-circle"/><span className="activity-art-pin"><Icon name="pin" size={24}/></span><span className="activity-art-label">A LITTLE DISCOVERY</span></div>;
}

function Rating({ place }) {
  return <span className="activity-rating">{place.rating !== null && <><b>{place.rating.toFixed(1)}</b><span aria-label="out of 5 stars">★</span>{place.rating_count !== null && <span>({place.rating_count.toLocaleString()})</span>}<span> · </span></>}<span>{categoryName(place)}</span></span>;
}

function ActivityExplorer({ data, onAction, disabled }) {
  const [selected, setSelected] = useState(data.suggestions[0]?.id);
  const place = data.suggestions.find(item => item.id === selected) || data.suggestions[0];
  if (!place) return <div className="activity-empty"><Icon name="pin"/><h3>No places to show yet.</h3><p>Try another activity or a smaller area. Your existing places are still in the draft.</p></div>;
  const added = data.added.includes(place.id);
  return <div className="activity-explorer">
    <div className="activity-result-meta"><span>Places to explore</span><span>{data.suggestions.length} suggestions</span></div>
    <div className="activity-choice-list" aria-label="Activity choices">{data.suggestions.map((item, index) => <button type="button" className={`activity-choice ${place.id === item.id ? 'is-selected' : ''}`} key={item.id} aria-pressed={place.id === item.id} onClick={() => setSelected(item.id)}>
      <span className="activity-choice-icon" aria-hidden="true"><Icon name="spark" size={20}/></span><span className="activity-choice-copy"><strong>{index + 1}. {item.name}</strong><Rating place={item}/></span><span className="activity-choice-end" aria-label={data.added.includes(item.id) ? 'Added to draft' : undefined}>{data.added.includes(item.id) ? '✓' : '↗'}</span>
    </button>)}</div>
    <article className="activity-focused-place">
      <PlacePhoto place={place}/>
      <div className="activity-place-body"><span className="ds-eyebrow">A CLOSER LOOK</span><h3>{place.name}</h3><p className="activity-address">{place.address}</p><Rating place={place}/>
        {place.reason && <p className="activity-reason"><strong>Why it fits:</strong> {place.reason}</p>}
        <div className="activity-place-actions"><button type="button" className="ds-button small" onClick={() => onAction('preview_activity', { id: place.id })}><Icon name="pin" size={14}/> Show on map</button><button type="button" className={`ds-button small ${added ? 'activity-added' : 'primary'}`} disabled={disabled || added || data.added.length >= 50} onClick={() => onAction('add_activity', { id: place.id })}>{added ? 'Added ✓' : '+ Add to plan'}</button></div>
        <div className="activity-provider"><span>Place data: Google Maps</span><a href={place.maps_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${place.name} in Google Maps`}>Google Maps ↗</a></div>
      </div>
    </article>
    <p className="activity-save-hint">Added places stay in your draft until you choose Save plan.</p>
  </div>;
}

const catalogId = 'urn:travella:catalog:activity-suggestions:v1';
const Explorer = createBinderlessComponentImplementation({ name: 'ActivitySuggestions', schema: z.object({ value: z.object({ path: z.literal('/activities') }).strict() }).strict() }, function BoundExplorer({ context }) {
  const [value, setValue] = useState(null); const { disabled } = useContext(Options);
  useEffect(() => { const subscription = context.dataContext.subscribeDynamicValue(context.componentModel.properties.value, setValue); setValue(subscription.value); return () => subscription.unsubscribe(); }, [context]);
  const checked = surfaceDataSchema.safeParse(value);
  if (!checked.success) return <p role="status">Waiting for valid place suggestions…</p>;
  return <ActivityExplorer data={checked.data} disabled={disabled} onAction={(name, payload) => void context.dispatchAction({ event: { name, context: payload } })}/>;
});
const catalog = new Catalog(catalogId, 'v0.9', [Explorer], []);

// Ephemeral chat cards have their own allow-listed surface and never enter the
// durable canvas snapshot. Only an explicit Add action creates a draft pin.
export function ActivitySuggestions({ surfaceId, suggestions, added, disabled, onAction }) {
  const processor = useRef(null); const callback = useRef(onAction); callback.current = onAction;
  const [surface, setSurface] = useState(null); const [error, setError] = useState(false);
  useEffect(() => {
    try {
      const data = surfaceDataSchema.parse({ suggestions, added });
      const messages = [];
      if (!processor.current) {
        processor.current = new MessageProcessor([catalog], action => {
          if (action.surfaceId === surfaceId && action.sourceComponentId === 'root' && ['preview_activity', 'add_activity'].includes(action.name)) callback.current(action.name, action.context);
        });
        messages.push({ version: 'v0.9', createSurface: { surfaceId, catalogId } });
      }
      messages.push({ version: 'v0.9', updateComponents: { surfaceId, components: [{ id: 'root', component: 'ActivitySuggestions', value: { path: '/activities' } }] } }, { version: 'v0.9', updateDataModel: { surfaceId, path: '/activities', value: data } });
      processor.current.processMessages(messages); setSurface(processor.current.model.surfacesMap.get(surfaceId)); setError(false);
    } catch { setError(true); }
  }, [surfaceId, suggestions, added]);
  useEffect(() => () => { processor.current?.dispose(); processor.current = null; }, []);
  return <Options.Provider value={{ disabled }}>{error ? <p role="alert">This place update could not be displayed. Your draft is unchanged.</p> : surface && <A2uiSurface surface={surface}/>}</Options.Provider>;
}
