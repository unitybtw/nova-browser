import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { BrowserWindow } from './BrowserWindow';

export const AiMockup = () => {
  return (
    <BrowserWindow url="nova.ai/chat">
      <div className="flex h-full text-xs">
        {/* Main Content */}
        <div className="flex-1 p-6 border-r border-border bg-background flex flex-col">
          <div className="h-4 w-1/3 bg-muted rounded-full mb-6" />
          <div className="h-2 w-full bg-muted/50 rounded-full mb-2" />
          <div className="h-2 w-5/6 bg-muted/50 rounded-full mb-2" />
          <div className="h-2 w-4/6 bg-muted/50 rounded-full mb-8" />
          
          <div className="h-4 w-1/4 bg-muted rounded-full mb-6" />
          <div className="h-2 w-full bg-muted/50 rounded-full mb-2" />
          <div className="h-2 w-2/3 bg-muted/50 rounded-full mb-2" />
          <div className="h-2 w-full bg-muted/50 rounded-full mb-2" />
          <div className="h-2 w-1/2 bg-muted/50 rounded-full mb-2" />
        </div>
        
        {/* AI Sidebar */}
        <div className="w-56 lg:w-64 bg-muted/10 flex flex-col p-4 gap-4 border-l border-border/50 shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
             <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-purple-500" /> Nova AI
             </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-4 justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-background border border-border p-3 rounded-2xl rounded-br-none self-end max-w-[85%] shadow-sm text-foreground/80 leading-relaxed"
            >
              Can you summarize this page?
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-3 rounded-2xl rounded-bl-none self-start max-w-[95%] text-purple-900 dark:text-purple-100 shadow-sm leading-relaxed"
            >
               <motion.span
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 1.5, duration: 1 }}
               >
                 Sure! This page is about modern web design principles, focusing on minimal aesthetics and smooth animations.
               </motion.span>
               {!true && <span className="inline-block w-1.5 h-3 bg-purple-500 animate-pulse ml-1 align-middle" />}
            </motion.div>
          </div>
          
          <div className="h-10 bg-background border border-border rounded-full flex items-center px-4 shadow-sm justify-between mt-2">
             <span className="text-foreground/30 font-medium">Ask Nova anything...</span>
             <ArrowRight className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
