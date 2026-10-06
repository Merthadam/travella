import React from 'react';
import { createRoot } from 'react-dom/client';
import { ComponentGallery } from './ComponentGallery';
import '../tokens.css';
import '../components.css';
import './studio.css';
createRoot(document.getElementById('root')).render(<ComponentGallery />);
