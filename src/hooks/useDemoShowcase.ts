import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Tab, BrowserDemoOptions } from '../types/browser';

export interface UseDemoShowcaseOptions {
  isDemo?: boolean;
  demoOptions?: BrowserDemoOptions;
  feature?: string;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  setIsSidePanelOpen: Dispatch<SetStateAction<boolean>>;
}

export function useDemoShowcase({
  isDemo,
  demoOptions,
  feature,
  setTabs,
  setActiveTabId,
  setIsSidePanelOpen,
}: UseDemoShowcaseOptions) {
  useEffect(() => {
    if (!isDemo || demoOptions || (feature !== 'default' && feature !== 'tour')) return;

    let cycle = 0;
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        pendingTimers.delete(timer);
        callback();
      }, delay);
      pendingTimers.add(timer);
    };

    const runCycle = () => {
      if (cycle === 0) {
        // Scene 1: arXiv AI Research + AI Sidepanel + Glowing Cursor
        setTabs([
          { id: '1', url: 'https://arxiv.org/list/cs.AI/recent', title: 'arXiv / cs.AI Research', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }
        ]);
        setActiveTabId('1');
        setIsSidePanelOpen(true);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'move' }
          }));
        }, 800);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'click' }
          }));
        }, 2200);
      } else if (cycle === 1) {
        // Scene 2: New Tab Page with Clock, Tasks, Speed Dials
        setIsSidePanelOpen(false);
        setActiveTabId('2');

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.5), y: 230, action: 'move' }
          }));
        }, 800);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.5), y: 230, action: 'click' }
          }));
        }, 2000);
      } else if (cycle === 2) {
        // Scene 3: Dual Split Screen Multitasking (React 19 & Tailwind CSS)
        setIsSidePanelOpen(false);
        setTabs([
          { id: '1', url: 'https://react.dev/reference/react', title: 'React 19 Docs', isLoading: false, canGoBack: false, canGoForward: false, splitWith: '2' },
          { id: '2', url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS Docs', isLoading: false, canGoBack: false, canGoForward: false, splitWith: '1' }
        ]);
        setActiveTabId('1');
      }

      cycle = (cycle + 1) % 3;
    };

    runCycle();
    const interval = setInterval(runCycle, 6500);

    return () => {
      clearInterval(interval);
      pendingTimers.forEach(timer => clearTimeout(timer));
      pendingTimers.clear();
    };
  }, [isDemo, demoOptions, feature, setTabs, setActiveTabId, setIsSidePanelOpen]);
}
