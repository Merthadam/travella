import React from 'react';
import { createRoot } from 'react-dom/client';
import { AccountApp } from './AccountApp';
import './styles.css';
import './tailwind.css';

const root = createRoot(document.getElementById('root'));
root.render(<AccountApp />);
