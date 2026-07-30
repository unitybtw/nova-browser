import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Download } from 'lucide-react';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-3' : 'py-5'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between rounded-2xl px-6 py-3 transition-all ${
          scrolled ? 'glass' : 'bg-transparent'
        }`}>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-primary/30">
              <img src="/browser-assets/nova-icon.jpg" alt="Nova Browser Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Nova</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-foreground/80">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#design" className="hover:text-primary transition-colors">Design</a>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">GitHub</a>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center">
            <a href="https://github.com/unitybtw/nova-browser/releases" target="_blank" rel="noreferrer" className="bg-foreground hover:bg-foreground/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 glass rounded-2xl p-4 flex flex-col gap-4">
          <a href="#features" className="px-4 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#privacy" className="px-4 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Privacy</a>
          <a href="#design" className="px-4 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>Design</a>
          <a href="https://github.com/unitybtw/nova-browser/releases" target="_blank" rel="noreferrer" className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium w-full mt-2 text-center transition-colors">
            Download
          </a>
        </div>
      )}
    </motion.header>
  );
};
