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
  
  // Stable initial theme ref so the iframe src NEVER reloads on theme toggle
  const initialThemeRef = useRef(currentTheme);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Post message to iframe for instant, zero-reload theme update
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'NOVA_THEME_CHANGE', theme: currentTheme }, '*');
    }
  }, [currentTheme]);

  const handleIframeLoad = () => {
    setIsReady(true);
    iframeRef.current?.contentWindow?.postMessage({ type: 'NOVA_THEME_CHANGE', theme: currentTheme }, '*');
  };

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden relative border transition-colors duration-300 ${
      isDark 
        ? 'border-white/10 bg-slate-950/90 shadow-2xl' 
        : 'border-slate-200/80 bg-white/95 shadow-xl'
    } ${className}`}>
      {/* Loading Spinner */}
      {!isReady && (
        <div className={`absolute inset-0 flex items-center justify-center z-40 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Real Nova Browser iframe */}
      {scale !== 1 ? (
        <div className="w-full h-full overflow-hidden relative">
          <iframe 
            ref={iframeRef}
            src={`/browser-demo/index.html?demo=true&feature=${feature}&bg=${bg}&theme=${initialThemeRef.current}`}
            onLoad={handleIframeLoad}
            style={{
              width: `${(100 / scale).toFixed(1)}%`,
              height: `${(100 / scale).toFixed(1)}%`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
            className={`border-none transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
            title={`Nova Browser Demo - ${feature}`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <iframe 
          ref={iframeRef}
          src={`/browser-demo/index.html?demo=true&feature=${feature}&bg=${bg}&theme=${initialThemeRef.current}`}
          onLoad={handleIframeLoad}
          className={`w-full h-full border-none transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
          title={`Nova Browser Demo - ${feature}`}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
      
      {/* Subtle overlay reflection for glass effect */}
      <div className={`absolute inset-0 pointer-events-none mix-blend-overlay ${isDark ? 'bg-gradient-to-tr from-white/[0.04] to-transparent' : 'bg-gradient-to-tr from-black/[0.02] to-transparent'}`} />
    </div>
  );
};
