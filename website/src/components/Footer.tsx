

export const Footer = () => {
  return (
    <footer className="border-t border-primary/10 bg-white/30 backdrop-blur-md pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/browser-assets/nova-icon.jpg" alt="Nova Browser Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-foreground">Nova</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-foreground/60">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>

          <div className="text-sm text-foreground/40">
            &copy; {new Date().getFullYear()} Nova Browser. Open Source.
          </div>
        </div>
      </div>
    </footer>
  );
};
