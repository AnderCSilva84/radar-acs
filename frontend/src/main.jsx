import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/portal.css';
// No StrictMode double effect: exactly one initial GET, no polling.
createRoot(document.getElementById('root')).render(<App />);
