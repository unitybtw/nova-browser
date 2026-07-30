import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

export const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-dark rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl"
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/40 rounded-full mix-blend-screen filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to take back control of your browser?
            </h2>
            <p className="text-lg text-white/80 mb-10">
              Join thousands of users who have switched to Nova for a faster, cleaner, and more private web experience. Fully open source and free forever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://github.com/nova-browser/releases" target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download for Mac
              </a>
              <a 
                href="https://github.com/nova-browser" 
                target="_blank" 
                rel="noreferrer"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all backdrop-blur-md border border-white/20 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                Star on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
