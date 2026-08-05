import React from 'react';
import { Lock, Plus, X, Maximize2, Minus } from 'lucide-react';

interface BrowserWindowProps {
  url?: string;
  children: React.ReactNode;
  className?: string;
}

export const BrowserWindow = ({ url = 'novabrowser.com', children, className = '' }: BrowserWindowProps) => {
  return (
    <div className={`flex flex-col rounded-xl overflow-hidden border border-border shadow-2xl bg-background w-full h-full ${className}`}>
      {/* Titlebar */}
      <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive flex items-center justify-center opacity-80 hover:opacity-100">
             <X className="w-2 h-2 opacity-0 hover:opacity-100 text-black/50" />
          </div>
          <div className="w-3 h-3 rounded-full bg-yellow-400 flex items-center justify-center opacity-80 hover:opacity-100">
             <Minus className="w-2 h-2 opacity-0 hover:opacity-100 text-black/50" />
          </div>
          <div className="w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center opacity-80 hover:opacity-100">
             <Maximize2 className="w-2 h-2 opacity-0 hover:opacity-100 text-black/50" />
          </div>
        </div>
        
        <div className="flex-1 max-w-sm mx-auto h-6 bg-background rounded-md border border-border/50 flex items-center justify-center px-2 text-xs text-foreground/50 gap-1.5 shadow-sm">
          <Lock className="w-3 h-3" />
          {url}
        </div>
        
        <div className="w-10 flex justify-end">
          <Plus className="w-4 h-4 text-foreground/50" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
};
