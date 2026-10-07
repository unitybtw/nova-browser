import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { getLanguage, ensureLanguageLoaded } from './services/i18n';

window.addEventListener('vite:preloadError', () => {
  try {
    const hasReloaded = sessionStorage.getItem('nova_preload_reload');
    if (!hasReloaded) {
      sessionStorage.setItem('nova_preload_reload', '1');
      window.location.reload();
      return;
    }
  } catch {}
  console.error('[Vite] Preload error: asset reload failed, stopping infinite loop.');
});

// The English interface is bundled and available before the first render.
void ensureLanguageLoaded(getLanguage()).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});
