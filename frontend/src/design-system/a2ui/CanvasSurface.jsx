import React, { useEffect, useRef, useState } from 'react';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { catalog, projectCanvas, RendererOptions, surfaceId as previewSurfaceId } from './catalog';
import { ids } from '../schemas';
export function CanvasSurface({ data, visible, onAction, disabled, mapAdapter, placePhoto, placePreview, preview = true, travelCapabilities, onMessages, surfaceId = previewSurfaceId }) {
  const processor = useRef(null); const currentId = useRef(null);
  const callback = useRef(onAction); callback.current = onAction;
  const report = useRef(onMessages); report.current = onMessages;
  const [surface, setSurface] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    if (currentId.current !== surfaceId) {
      processor.current?.dispose(); processor.current = null; currentId.current = surfaceId; setSurface(null);
    }
    try {
      const messages = projectCanvas(data, visible, !processor.current, surfaceId);
      if (!processor.current) processor.current = new MessageProcessor([catalog], action => {
        if (action.surfaceId === currentId.current && ids.includes(action.sourceComponentId)) callback.current(action.sourceComponentId, action.name, action.context);
      });
      processor.current.processMessages(messages);
      setSurface(processor.current.model.surfacesMap.get(surfaceId)); setError(''); report.current?.(messages);
    } catch { setError('This update was rejected. The last valid components are still shown.'); }
  }, [data, visible, surfaceId]);
  useEffect(() => () => { processor.current?.dispose(); processor.current = null; currentId.current = null; }, []);
  return <RendererOptions.Provider value={{ disabled, mapAdapter, placePhoto, placePreview, preview, travelCapabilities }}>{error && <div role="alert" className="ds-render-error">{error}</div>}{surface && <A2uiSurface surface={surface}/>}</RendererOptions.Provider>;
}
