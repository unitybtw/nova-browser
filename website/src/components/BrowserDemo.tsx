import React from 'react';
import BrowserApp from '../../../src/App';

/**
 * The website preview uses the same browser application as the desktop build.
 * Electron-only APIs are optional in the browser, so BrowserView falls back to
 * the app's built-in demo pages instead of a second, hand-written mockup.
 */
export const BrowserDemo: React.FC = () => {
  return (
    <div className="browser-demo isolate w-full h-[min(720px,78vh)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-[0_25px_70px_rgba(0,0,0,0.14)] text-left">
      <BrowserApp
        demo={{
          isDemo: true,
          feature: 'vertical_tabs',
          theme: 'light',
          tabs: 'vertical',
          bg: 'default',
        }}
      />
    </div>
  );
};

export default BrowserDemo;
