import { useState, useEffect } from 'react';

export const InteractiveMockup = ({ bg = 'nebula' }: { bg?: string }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto h-[700px] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.15)] relative border border-white/10 bg-slate-950/80 backdrop-blur-3xl group transition-all duration-700 hover:shadow-[0_0_150px_rgba(59,130,246,0.25)]">
      {/* Browser MacOS Title Bar Controls (Decorative) */}
      <div className="absolute top-4 left-4 flex gap-1.5 z-50 transition-opacity duration-300 opacity-50 group-hover:opacity-100">
        <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500" />
      </div>

      {/* Loading State */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-40">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Real Browser iframe */}
      <iframe 
        src={`/browser-demo/index.html?demo=true&bg=${bg}`}
        className={`w-full h-full border-none transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'} pointer-events-none`}
        title="Nova Browser Interactive Demo"
        sandbox="allow-scripts allow-same-origin"
      />
      
      {/* Subtle overlay reflection for glass effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none mix-blend-overlay" />
    </div>
  );
};
