import React, { useEffect, useState } from 'react';
import { TravelPreviews, travelSnapshotSchema } from './CanvasTravel';

export const researchFlightSchema = travelSnapshotSchema.refine(value => value.mode === 'flights', 'Expected flight previews');

export function ResearchFlightPreview({ snapshot }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  if (!snapshot) return <p role="status">These flight previews are no longer current. Ask in Research chat to search again.</p>;
  const reason = Math.max(now, Date.now()) >= Date.parse(snapshot.expires_at)
    ? 'These flight previews have expired. Ask in Research chat to search again; fares may have changed.' : '';
  return <TravelPreviews snapshot={snapshot} reason={reason} chatLabel="Research chat"/>;
}
