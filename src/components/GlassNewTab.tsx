import React from 'react';

export const GlassNewTab: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto rounded-2xl glass-modal p-xl relative shadow-2xl w-full h-full text-on-background">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2 mb-12">
          <h1 className="font-display-lg text-display-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">
            Good morning, Alex.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Here is a summary of your workspace today.</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Focus Card */}
          <div className="md:col-span-2 md:row-span-2 rounded-3xl p-6 bg-surface-container/30 border border-white/10 hover:border-primary/30 transition-colors flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 z-0"></div>
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-primary">Active Project: Project Nova</h2>
              </div>
              <span className="text-xs font-mono-sm px-2 py-1 rounded-full border border-primary/30 text-primary bg-primary/10">In Progress</span>
            </div>
            
            <div className="relative z-10 mt-auto flex flex-col gap-6 pt-12">
              <img 
                className="w-full h-48 rounded-2xl object-cover border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity" 
                alt="Visualization" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbJSiIJSQjr-QuRzs8fOYvumH24FsyOFVIc-1g1nZlH1QOwYD1xSQRp6MrrIxmTKiHIQrfDpkMksxjqAHHl3mcF9ElLa-Py8mPPTfnhonvpfB2QOBOO-D3ESwFOezCoRWTXCPgEVqgFrOFbgqBm3FAYwvvTWIdWOmde35KIWILrOd7EnZGFyEvE_EJoSDF0fPfv2urB85oUM7CJgM8etpklP4SOasHEwXaktFxJSiGQIg_a9V8i3xn"
              />
              <div className="flex gap-4">
                <button className="px-6 py-2.5 bg-primary text-on-primary font-medium rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-primary-container transition-colors">
                  Resume Session
                </button>
                <button className="px-6 py-2.5 bg-transparent border border-white/20 text-on-surface font-medium rounded-xl hover:bg-white/5 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="rounded-3xl p-6 bg-surface-container/30 border border-white/10 hover:border-white/30 transition-colors flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-tertiary/20 text-tertiary">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-tertiary">Upcoming</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-on-surface">Design Review</span>
                  <span className="text-xs text-on-surface-variant">10:00 AM - Figma</span>
                </div>
                <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_forward</span>
              </li>
              <li className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-on-surface">Sync with Dev</span>
                  <span className="text-xs text-on-surface-variant">1:30 PM - Meet</span>
                </div>
                <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_forward</span>
              </li>
            </ul>
          </div>

          {/* Stats Card */}
          <div className="rounded-3xl p-6 bg-surface-container/30 border border-white/10 hover:border-secondary/30 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-secondary">System Status</h3>
            </div>
            <div className="space-y-6 mt-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-on-surface-variant">Memory Usage</span>
                  <span className="font-mono-sm text-secondary">42%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-secondary-container to-secondary h-2 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-on-surface-variant">Network Load</span>
                  <span className="font-mono-sm text-tertiary">18%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-tertiary-container to-tertiary h-2 rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
