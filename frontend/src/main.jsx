import React from 'react';
import { createRoot } from 'react-dom/client';
import { AccountApp } from './AccountApp';
import './styles.css';
import './tailwind.css';

const root = createRoot(document.getElementById('root'));
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'account') {
  import('./prototypes/AccountSettingsPrototype').then(({ AccountSettingsPrototype }) => root.render(<AccountSettingsPrototype />));
} else {
  root.render(<AccountApp />);
}
