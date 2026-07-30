import { motion } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, Zap, EyeOff, LayoutPanelLeft, FolderTree } from 'lucide-react';

const features = [
  {
    icon: <FolderTree className="w-6 h-6 text-primary" />,
    title: 'Tab Folders',
    description: 'Organize your digital life with native drag-and-drop tab folders. Keep work, research, and personal browsing perfectly separated.'
  },
  {
    icon: <LayoutPanelLeft className="w-6 h-6 text-accent" />,
    title: 'Split Screen',
    description: 'View two tabs side-by-side natively without opening new windows. Perfect for research, coding, or comparing documents.'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-secondary" />,
    title: 'Built-in Ad Blocker',
    description: 'Experience a cleaner, faster web. Nova blocks trackers and intrusive ads at the network level by default.'
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    title: 'Lightning Fast',
    description: 'Built on Electron and optimized for performance. Minimal memory footprint with suspended background tabs.'
  },
  {
    icon: <EyeOff className="w-6 h-6 text-purple-500" />,
    title: 'Privacy First',
    description: 'Your data stays yours. No telemetry, no tracking. We don\'t even know what you\'re browsing.'
  },
  {
    icon: <LayoutDashboard className="w-6 h-6 text-blue-500" />,
    title: 'Workspaces',
    description: 'Switch between entire contexts instantly. One click changes your tabs, bookmarks, and history context.'
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-foreground mb-6"
          >
            Everything you need. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Nothing you don't.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-foreground/70"
          >
            Nova is built from the ground up for productivity and privacy. Say goodbye to clutter and hello to focus.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass p-8 rounded-3xl hover:bg-white/60 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
