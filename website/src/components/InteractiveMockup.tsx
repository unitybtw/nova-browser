import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

interface InteractiveMockupProps {
  feature?: string;
  bg?: string;
  className?: string;
  interactive?: boolean;
  scale?: number;
}

export const InteractiveMockup = ({ 
  feature = 'default', 
  bg = 'nebula',
  className = '',
  interactive = false,
  scale = 1
}: InteractiveMockupProps) => {
  const [isReady, setIsReady] = useState(false);
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const currentTheme = isDark ? 'dark' : 'light';

  useEffect(() => {
    // Smooth fade in
    const timer = setTimeout(() => setIsReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  // Post message to iframe on theme change for instant seamless switch
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'NOVA_THEME_CHANGE', theme: currentTheme }, '*');
    }
  }, [currentTheme]);

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden shadow-2xl relative border transition-all duration-700 ${
      isDark 
        ? 'border-white/10 bg-slate-950/90 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
        : 'border-slate-200/80 bg-white/95 shadow-[0_10px_40px_rgba(0,0,0,0.08)]'
    } ${className}`}>
      {/* Loading Spinner */}
      {!isReady && (
        <div className={`absolute inset-0 flex items-center justify-center z-40 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Real Nova Browser iframe (with crisp scale transformation when scaled) */}
      {scale !== 1 ? (
        <div className="w-full h-full overflow-hidden relative">
          <iframe 
            ref={iframeRef}
            src={`/browser-demo/index.html?demo=true&feature=${feature}&bg=${bg}&theme=${currentTheme}`}
            style={{
              width: `${(100 / scale).toFixed(1)}%`,
              height: `${(100 / scale).toFixed(1)}%`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
            className={`border-none transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
            title={`Nova Browser Demo - ${feature}`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <iframe 
          ref={iframeRef}
          src={`/browser-demo/index.html?demo=true&feature=${feature}&bg=${bg}&theme=${currentTheme}`}
          className={`w-full h-full border-none transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
          title={`Nova Browser Demo - ${feature}`}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
      
      {/* Subtle overlay reflection for glass effect */}
      <div className={`absolute inset-0 pointer-events-none mix-blend-overlay ${isDark ? 'bg-gradient-to-tr from-white/[0.04] to-transparent' : 'bg-gradient-to-tr from-black/[0.02] to-transparent'}`} />
    </div>
  );
};
