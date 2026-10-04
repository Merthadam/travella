import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, createBinderlessComponentImplementation } from '@a2ui/react/v0_9';
import { emptyTripContext, TripBrief } from './TripBrief';

const Controls = createContext({});
const catalogId = 'urn:travella:catalog:trip-brief:v1';
const surfaceId = 'trip-brief';

const TripBriefComponent = createBinderlessComponentImplementation({
  name: 'TripBrief',
  schema: z.object({ value: z.object({ path: z.literal('/tripContext/context') }).strict() }).strict(),
}, function BoundTripBrief({ context }) {
  const controls = useContext(Controls);
  const [value, setValue] = useState(emptyTripContext);
  useEffect(() => {
    const subscription = context.dataContext.subscribeDynamicValue(context.componentModel.properties.value, next => setValue(next || emptyTripContext()));
    setValue(subscription.value || emptyTripContext());
    return () => subscription.unsubscribe();
  }, [context]);
  function edit(next) {
    if (controls.locked) return;
    context.dataContext.set('/tripContext/context', next);
    void context.dispatchAction({ event: { name: 'update_trip_context', context: { value: next } } });
  }
  return <TripBrief value={value} onChange={edit} {...controls} />;
});

// Only this catalog/component is registered. No generated code or remote catalogs.
const catalog = new Catalog(catalogId, 'v0.9', [TripBriefComponent], []);

export function A2uiTripBrief({ messages, value, onChange, locked, saving, error }) {
  const processor = useRef(null);
  const edit = useRef(onChange);
  edit.current = onChange;
  const [surface, setSurface] = useState(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!processor.current) processor.current = new MessageProcessor([catalog], action => {
      if (action.name === 'update_trip_context' && action.surfaceId === surfaceId && action.sourceComponentId === 'root') {
        edit.current(action.context.value, action);
      }
    });
    try {
      const allowed = (messages || []).filter(message => {
        if (message.version !== 'v0.9') return false;
        if (message.createSurface) return message.createSurface.surfaceId === surfaceId && message.createSurface.catalogId === catalogId && !processor.current.model.surfacesMap.has(surfaceId);
        if (message.updateComponents) return message.updateComponents.surfaceId === surfaceId && message.updateComponents.components.every(component => component.id === 'root' && component.component === 'TripBrief');
        return message.updateDataModel?.surfaceId === surfaceId && message.updateDataModel.path === '/tripContext';
      });
      processor.current.processMessages(allowed);
      setSurface(processor.current.model.surfacesMap.get(surfaceId) || null);
      setRenderError('');
    } catch {
      setRenderError('The Trip Brief could not be displayed. Refresh to try again.');
    }
  }, [messages]);

  useEffect(() => {
    // Keep pending local edits and accepted AG-UI snapshots in the same A2UI model.
    surface?.dataModel.set('/tripContext/context', value);
  }, [surface, value]);
  useEffect(() => () => { processor.current?.dispose(); processor.current = null; }, []);

  if (!surface || renderError) return <aside className="trip-brief"><p role={renderError || error ? 'alert' : 'status'}>{renderError || error || 'Loading Trip Brief…'}</p></aside>;
  return <Controls.Provider value={{ locked, saving, error }}><A2uiSurface surface={surface} /></Controls.Provider>;
}
