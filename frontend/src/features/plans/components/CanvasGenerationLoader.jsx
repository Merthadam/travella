import React from 'react';
import './canvas-generation-loader.css';

export function CanvasGenerationLoader({ phase = 'research', count = 0, destination = '' }) {
  const assembling = phase === 'canvas';
  return <section className="canvas-generation-loader" aria-label="Generating your plan">
    <nav className="generation-stages" aria-label="Generation progress">
      <ol>
        <li className={assembling ? 'complete' : 'active'} aria-current={!assembling ? 'step' : undefined}><span className="generation-step">{assembling ? '✓' : '1'}</span>Research</li>
        <li className="generation-rail" aria-hidden="true"><span/></li>
        <li className={assembling ? 'active' : ''} aria-current={assembling ? 'step' : undefined}><span className="generation-step">2</span>Canvas</li>
      </ol>
    </nav>
    <div className="generation-focus">
      <p className="generation-meta">YOUR NEXT CHAPTER</p>
      <div className="generation-content">
        <div className="generation-globe" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="81" className="generation-sphere"/>
            <g className="generation-latitudes"><ellipse cx="100" cy="100" rx="81" ry="25"/><path d="M33 55 Q100 86 167 55 M33 145 Q100 114 167 145 M19 100H181"/></g>
            <g className="generation-longitude"><ellipse cx="100" cy="100" rx="61" ry="81"/></g>
            <g className="generation-longitude generation-longitude-two"><ellipse cx="100" cy="100" rx="61" ry="81"/></g>
            <path className="generation-axis" d="M100 19V181"/>
            <circle cx="139" cy="66" r="8" className="generation-location-halo"/><circle cx="139" cy="66" r="3.5" className="generation-location"/>
          </svg>
        </div>
        <div className="generation-copy">
          <p className="generation-eyebrow">FROM AN IDEA TO YOUR ITINERARY</p>
          <h1>{destination || 'Your plan'} is<br/>taking shape.</h1>
          <div role="status" aria-live="polite" aria-atomic="true">
            <p className="generation-description">{assembling ? 'Creating your planning canvas…' : destination ? `Researching your ${destination} trip…` : 'Researching your trip…'}</p>
            <p className="generation-counter"><span>{String(count).padStart(2, '0')}</span>{count === 1 ? 'item ready' : 'items ready'}</p>
          </div>
          <p className="generation-note">Everything opens together, when it’s ready.</p>
        </div>
      </div>
      <p className="generation-footer"><i aria-hidden="true"/>Putting your plan together</p>
    </div>
  </section>;
}
