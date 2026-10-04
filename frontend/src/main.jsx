import React from 'react';
import { createRoot } from 'react-dom/client';
import { AccountApp } from './AccountApp';
import './styles.css';
import './tailwind.css';

const root = createRoot(document.getElementById('root'));
// Throwaway onboarding exploration; never mounted by production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'onboarding') {
  import('./prototypes/OnboardingPrototype').then(({ OnboardingPrototype }) => root.render(<OnboardingPrototype />));
} else root.render(<AccountApp />);
