import { motion } from 'framer-motion';
import { FolderOpen, FileText, ChevronRight, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { BrowserWindow } from './BrowserWindow';

export const TabsMockup = () => {
  return (
    <BrowserWindow url="workspace.nova">
      <div className="flex h-full text-sm">
        {/* Vertical Tabs */}
        <div className="w-48 bg-muted/20 border-r border-border flex flex-col p-3 gap-1 shadow-inner">
           <div className="text-[10px] font-bold text-foreground/40 mb-2 px-2 uppercase tracking-widest">Workspaces</div>
           
           <div className="flex items-center gap-2 px-2 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg font-semibold cursor-pointer border border-blue-500/20 shadow-sm">
              <FolderOpen className="w-4 h-4 fill-blue-500/20" /> Design Project
           </div>
           
           <motion.div 
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: "auto", opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="pl-6 flex flex-col gap-1 overflow-hidden"
           >
              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded-md text-foreground/70 cursor-pointer mt-1">
                 <div className="flex items-center gap-2">
                   <FileText className="w-3.5 h-3.5 text-orange-500" /> Figma
                 </div>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 bg-background border border-border shadow-sm rounded-md text-foreground cursor-pointer font-medium">
                 <div className="flex items-center gap-2">
                   <FileText className="w-3.5 h-3.5 text-blue-500" /> Inspiration
                 </div>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded-md text-foreground/70 cursor-pointer">
                 <div className="flex items-center gap-2">
                   <FileText className="w-3.5 h-3.5 text-emerald-500" /> Assets
                 </div>
                 <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-50" />
              </div>
           </motion.div>
           
           <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-lg text-foreground/60 font-medium cursor-pointer mt-3">
              <ChevronRight className="w-4 h-4" /> Personal
           </div>
           <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-lg text-foreground/60 font-medium cursor-pointer">
              <ChevronRight className="w-4 h-4" /> Research
           </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-8 bg-background flex flex-col items-center justify-center text-foreground/10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/30 via-background to-background">
           <LayoutGrid className="w-16 h-16 mb-4" />
           <div className="h-3 w-32 bg-muted/50 rounded-full" />
        </div>
      </div>
    </BrowserWindow>
  );
};
