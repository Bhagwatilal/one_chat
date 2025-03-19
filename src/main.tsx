import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPlayAI } from './lib/playai';

// Initialize PlayAI when the script is loaded
const script = document.querySelector('script[src*="play-ai"]');
if (script) {
  script.addEventListener('load', initPlayAI);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);