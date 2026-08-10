import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { BrowserWindow } from './BrowserWindow';

export const SplitMockup = () => {
  return (
    <BrowserWindow url="nova://split-view">
      <div className="flex h-full relative">
        {/* Left Pane */}
        <div className="flex-1 border-r border-border bg-background p-6 flex flex-col">
           <div className="h-4 w-24 bg-orange-500/20 rounded-md mb-6" />
           <div className="h-2 w-full bg-muted/50 rounded-full mb-3" />
           <div className="h-2 w-5/6 bg-muted/50 rounded-full mb-3" />
           <div className="h-2 w-4/6 bg-muted/50 rounded-full mb-8" />
           
           <div className="grid grid-cols-2 gap-4 mt-auto">
              <motion.div 
                whileHover={{ y: -2 }}
                className="h-20 bg-muted/30 rounded-xl border border-border/50 shadow-sm" 
              />
              <motion.div 
                whileHover={{ y: -2 }}
                className="h-20 bg-muted/30 rounded-xl border border-border/50 shadow-sm" 
              />
           </div>
        </div>
        
        {/* Resizer Handle */}
        <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           whileInView={{ scale: 1, opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.5, type: "spring" }}
           className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center text-white z-10 cursor-col-resize"
        >
           <GripVertical className="w-4 h-4" />
        </motion.div>
        
        {/* Right Pane */}
        <div className="flex-1 bg-muted/5 p-6 flex flex-col">
           <div className="h-4 w-24 bg-blue-500/20 rounded-md mb-6 ml-auto" />
           
           <div className="flex-1 flex flex-col gap-3 justify-center">
             <motion.div 
               initial={{ x: 20, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="w-full h-16 bg-background border border-border shadow-sm rounded-xl p-3 flex flex-col gap-2"
             >
                <div className="h-2 w-1/3 bg-muted rounded-full" />
                <div className="h-2 w-1/4 bg-muted/50 rounded-full" />
             </motion.div>
             <motion.div 
               initial={{ x: 20, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               viewport={{ once: true }}
               transition={{ delay: 0.4 }}
               className="w-full h-16 bg-background border border-border shadow-sm rounded-xl p-3 flex flex-col gap-2"
             >
                <div className="h-2 w-1/2 bg-muted rounded-full" />
                <div className="h-2 w-1/3 bg-muted/50 rounded-full" />
             </motion.div>
           </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
