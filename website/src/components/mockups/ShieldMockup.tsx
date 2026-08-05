import { motion } from 'framer-motion';
import { ShieldAlert, Cookie, EyeOff } from 'lucide-react';
import { BrowserWindow } from './BrowserWindow';

export const ShieldMockup = () => {
  return (
    <BrowserWindow url="nova://privacy">
      <div className="flex flex-col h-full bg-gradient-to-br from-emerald-500/5 to-teal-500/10 p-6 items-center justify-center gap-8 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
        >
           <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
           <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] relative z-10 border border-emerald-400/50">
             <ShieldAlert className="w-12 h-12" />
           </div>
        </motion.div>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs relative z-10">
           <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-emerald-500/20 shadow-lg flex flex-col gap-2"
           >
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                 <EyeOff className="w-3.5 h-3.5" /> Trackers
              </div>
              <motion.span 
                 initial={{ opacity: 0 }} 
                 whileInView={{ opacity: 1 }} 
                 viewport={{ once: true }}
                 transition={{ delay: 0.5 }}
                 className="text-2xl font-black text-foreground"
              >
                 1,204
              </motion.span>
           </motion.div>
           
           <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-emerald-500/20 shadow-lg flex flex-col gap-2"
           >
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                 <Cookie className="w-3.5 h-3.5" /> Ads
              </div>
              <motion.span 
                 initial={{ opacity: 0 }} 
                 whileInView={{ opacity: 1 }} 
                 viewport={{ once: true }}
                 transition={{ delay: 0.7 }}
                 className="text-2xl font-black text-foreground"
              >
                 8,432
              </motion.span>
           </motion.div>
        </div>
      </div>
    </BrowserWindow>
  );
};
