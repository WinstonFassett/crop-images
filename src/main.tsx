import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ImageCropper from './components/ImageCropper';

import './index.css';
import { initializeTheme, setupThemeListener } from './lib/theme-script';

// Initialize theme as early as possible
initializeTheme();

function App() {
  // Set up theme listener for system preference changes
  useEffect(() => {
    setupThemeListener();
  }, []);
  
  return <ImageCropper />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
