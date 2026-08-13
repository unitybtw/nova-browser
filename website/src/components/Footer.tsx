import { useLang } from '../i18n/LanguageContext';

export const Footer = () => {
  const { t } = useLang();

  return (
    <footer className="border-t border-primary/10 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
              <img src="/browser-assets/nova-icon-clean.png" alt="Nova Browser Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-foreground">Nova</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-foreground/60">
            <a href="#" className="hover:text-primary transition-colors">{t.footer.privacy}</a>
            <a href="#" className="hover:text-primary transition-colors">{t.footer.terms}</a>
            <a href="#" className="hover:text-primary transition-colors">{t.footer.contact}</a>
          </div>

          <div className="text-sm text-foreground/40">
            &copy; {new Date().getFullYear()} {t.footer.copy}
          </div>
        </div>
      </div>
    </footer>
  );
};
