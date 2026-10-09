import React from 'react';
import { useAppearance } from '../../appearance/AppearanceProvider';

export function CanvasAppearance() {
  const { theme, setTheme } = useAppearance();
  return <div className="canvas-appearance-bar">
    <span>Appearance</span>
    <div className="canvas-theme-options" role="group" aria-label="Canvas appearance">
      {['light', 'dark'].map(value => <button key={value} type="button" aria-label={`Use ${value} mode`} aria-pressed={theme === value} onClick={() => setTheme(value)}>{value === 'light' ? 'Light' : 'Dark'}</button>)}
    </div>
  </div>;
}
