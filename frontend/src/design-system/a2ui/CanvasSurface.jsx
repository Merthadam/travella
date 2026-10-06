import React, { useEffect, useRef, useState } from 'react';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { catalog, projectCanvas, RendererOptions, surfaceId } from './catalog';
import { ids } from '../schemas';
export function CanvasSurface({ data, visible, onAction, disabled, mapAdapter, onMessages }) {
  const processor = useRef(null); const callback = useRef(onAction); callback.current = onAction;
  const report = useRef(onMessages); report.current = onMessages;
  const [surface, setSurface] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    try {
      const messages = projectCanvas(data,visible,!processor.current);
      if (!processor.current) processor.current = new MessageProcessor([catalog], action => {
        if (action.surfaceId === surfaceId && ids.includes(action.sourceComponentId)) callback.current(action.sourceComponentId,action.name,action.context);
      });
      processor.current.processMessages(messages);
      setSurface(processor.current.model.surfacesMap.get(surfaceId)); setError(''); report.current?.(messages);
    } catch { setError('This update was rejected. The last valid components are still shown.'); }
  }, [data,visible]);
  useEffect(() => () => {processor.current?.dispose();processor.current=null;},[]);
  return <RendererOptions.Provider value={{ disabled,mapAdapter }}>{error && <div role="alert" className="ds-render-error">{error}</div>}{surface && <A2uiSurface surface={surface}/>}</RendererOptions.Provider>;
}
