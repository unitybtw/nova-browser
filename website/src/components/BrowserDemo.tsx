import React from 'react';
import BrowserApp from '../../../src/App';

/**
 * The website preview uses the same browser application as the desktop build.
 * Keep the preview self-contained so browser-only state cannot leak into the
 * marketing page and make the compact layout unstable.
 */
export const BrowserDemo: React.FC = () => {
  return (
    <div className="browser-demo isolate w-full min-h-[620px] h-[min(760px,82vh)] overflow-hidden rounded-2xl border border-slate-300/90 bg-slate-100 shadow-[0_25px_70px_rgba(0,0,0,0.14)] text-left">
      <BrowserApp
        demo={{
          isDemo: true,
          feature: 'website',
          theme: 'light',
          tabs: 'horizontal',
          showTasksWidget: false,
          bg: 'default',
        }}
      />
    </div>
  );
};

export default BrowserDemo;
