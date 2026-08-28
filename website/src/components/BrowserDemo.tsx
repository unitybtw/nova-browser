import React from 'react';
import App, { BrowserDemoOptions } from '@/App';

const WEBSITE_DEMO_OPTIONS: BrowserDemoOptions = {
  isDemo: true,
  feature: 'website',
  theme: 'dark',
  tabs: 'horizontal',
  showTasksWidget: false,
};

/**
 * The website uses the actual browser application instead of a second mockup.
 * This keeps the marketing demo and the shipped Nova UI on the same component
 * and styling source, so visual changes cannot drift between them.
 */
export const BrowserDemo: React.FC = () => (
  <div className="browser-demo browser-demo--no-window-chrome aspect-[16/10] max-h-[760px] min-h-[520px] w-full overflow-hidden rounded-[18px] border border-slate-700/80 bg-[#151122] shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
    <App demo={WEBSITE_DEMO_OPTIONS} />
  </div>
);

export default BrowserDemo;
