import { useState, useEffect } from 'react';

interface InteractiveMockupProps {
  feature?: string;
  bg?: string;
  className?: string;
  interactive?: boolean;
}

export const InteractiveMockup = ({ 
  feature = 'default', 
  bg = 'nebula',
  className = '',
  interactive = false
}: InteractiveMockupProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Smooth fade in
    const timer = setTimeout(() => setIsReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 bg-slate-950/80 backdrop-blur-3xl group transition-all duration-700 ${className}`}>
      {/* Loading Spinner */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-40">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Real Nova Browser iframe */}
      <iframe 
        src={`/browser-demo/index.html?demo=true&feature=${feature}&bg=${bg}`}
        className={`w-full h-full border-none transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        title={`Nova Browser Interactive Demo - ${feature}`}
        sandbox="allow-scripts allow-same-origin"
      />
      
      {/* Subtle overlay reflection for glass effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] to-transparent pointer-events-none mix-blend-overlay" />
    </div>
  );
};
