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

// Three of the four dictionaries are fetched on demand, so the first paint waits
// for the saved one. Without this gate a non-English user sees the app in
// English and has it re-render under them, which is a visible flash and a wrong
// document.dir (LTR) for Arabic. English is bundled, so the wait is zero for the
// default case and a single chunk for everyone else.
void ensureLanguageLoaded(getLanguage()).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});
