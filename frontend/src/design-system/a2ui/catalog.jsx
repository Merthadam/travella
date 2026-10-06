import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { Catalog } from '@a2ui/web_core/v0_9';
import { createBinderlessComponentImplementation } from '@a2ui/react/v0_9';
import { definitions, ids } from '../schemas';
import { TripEssentials } from '../components/TripEssentials';
import { DestinationMap } from '../components/DestinationMap';
import { TripThemes } from '../components/TripThemes';
import { FlightsEntry, AccommodationEntry } from '../components/TravelEntry';
import { ResearchFindings } from '../components/ResearchFindings';
import { ImportantLinks } from '../components/ImportantLinks';
export const catalogId = 'urn:travella:catalog:planning-components:v1';
export const surfaceId = 'planning-components-preview';
export const RendererOptions = createContext({ disabled: false });
const views = { essentials: TripEssentials, map: DestinationMap, themes: TripThemes, flights: FlightsEntry, accommodation: AccommodationEntry, findings: ResearchFindings, links: ImportantLinks };
const implementations = ids.map(id => createBinderlessComponentImplementation({
  name: definitions[id].type,
  schema: z.object({ value: z.object({ path: z.literal(`/components/${id}`) }).strict() }).strict(),
}, function BoundComponent({ context }) {
  const [data, setData] = useState(null); const options = useContext(RendererOptions);
  useEffect(() => {
    const subscription = context.dataContext.subscribeDynamicValue(context.componentModel.properties.value, value => setData(value));
    setData(subscription.value); return () => subscription.unsubscribe();
  }, [context]);
  const checked = definitions[id].schema.safeParse(data);
  if (!checked.success) return <div className="ds-component-unavailable" role="status">Waiting for valid {definitions[id].title.toLowerCase()} data…</div>;
  const View = views[id];
  return <View data={checked.data} disabled={options.disabled} mapAdapter={options.mapAdapter} onAction={(name,payload) => void context.dispatchAction({ event: { name, context: payload } })}/>;
}));
const Root = createBinderlessComponentImplementation({ name: 'PlanningCanvas', schema: z.object({ children: z.array(z.enum(ids)).max(7).describe('REF:common_types.json#/$defs/ChildList') }).strict() }, ({ context, buildChild }) => <div className="ds-canvas-grid">{context.componentModel.properties.children.map(id => <div className={`ds-slot slot-${id} ${!context.componentModel.properties.children.includes({map:'themes',themes:'map',flights:'accommodation',accommodation:'flights',findings:'links',links:'findings'}[id]) ? 'span-all' : ''}`} key={id}>{buildChild(id)}</div>)}</div>);
export const catalog = new Catalog(catalogId, 'v0.9', [Root, ...implementations], []);
// Public projection is intentionally small. Validate the entire batch before mutating the renderer.
export function projectCanvas(data, visible, create = false) {
  if (new TextEncoder().encode(JSON.stringify(data)).length > 65536) throw new Error('The component payload is too large.');
  if (!Array.isArray(visible) || visible.length > 7 || new Set(visible).size !== visible.length || visible.some(id => !ids.includes(id))) throw new Error('Unknown or duplicate component.');
  if (Object.keys(data).some(id => !ids.includes(id))) throw new Error('Unknown component data.');
  const parsed = Object.fromEntries(Object.entries(data).map(([id,value]) => [id,definitions[id].schema.parse(value)]));
  if (visible.some(id => !parsed[id])) throw new Error('Missing component data.');
  const messages = [];
  if (create) messages.push({ version: 'v0.9', createSurface: { surfaceId, catalogId } });
  messages.push({ version: 'v0.9', updateComponents: { surfaceId, components: [{ id: 'root', component: 'PlanningCanvas', children: visible }, ...visible.map(id => ({ id, component: definitions[id].type, value: { path: `/components/${id}` } }))] } });
  messages.push({ version: 'v0.9', updateDataModel: { surfaceId, path: '/components', value: parsed } });
  return messages;
}
