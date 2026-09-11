import React, { useState } from 'react';
import { Globe } from 'lucide-react';

export function normalizeNavigationUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Preserve internal browser navigation schemes
  if (/^nova:\/\/[a-z0-9_-]+/i.test(trimmed)) {
    return trimmed;
  }

  // If scheme already exists, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Default to secure https
  return `https://${trimmed}`;
}

export function getCleanDomain(urlOrDomain: string): string {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') return '';
  const trimmed = urlOrDomain.trim();
  if (/^nova:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return (parsed.hostname || parsed.pathname.replace(/^\/\//, '')).toLowerCase();
    } catch {
      return trimmed.replace(/^nova:\/\//i, '').split('/')[0].toLowerCase();
    }
  }
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
  }
}

interface SpeedDialIconProps {
  name: string;
  url: string;
  domain?: string;
}

export const SpeedDialIcon: React.FC<SpeedDialIconProps> = React.memo(({ name, url, domain }) => {
  const cleanDomain = getCleanDomain(domain || url);
  const [loadErrorStage, setLoadErrorStage] = useState<number>(0);

  // 1. Wikipedia
  if (cleanDomain.includes('wikipedia') || name.toLowerCase().includes('wikipedia')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-6 h-6 text-slate-800 dark:text-white transition-colors"
        aria-hidden="true"
      >
        <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z" />
      </svg>
    );
  }

  // 2. GitHub
  if (cleanDomain.includes('github') || name.toLowerCase().includes('github')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-6 h-6 text-slate-800 dark:text-white transition-colors"
        aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }

  // 3. Google
  if (cleanDomain.startsWith('google.') || cleanDomain === 'google' || name.toLowerCase() === 'google') {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
      </svg>
    );
  }

  // 4. YouTube
  if (cleanDomain.includes('youtube') || cleanDomain === 'youtu.be' || name.toLowerCase().includes('youtube')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#FFFFFF" d="m9.545 15.568 6.273-3.568-6.273-3.568z"/>
      </svg>
    );
  }

  // 5. Reddit
  if (cleanDomain.includes('reddit') || name.toLowerCase().includes('reddit')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF4500" aria-hidden="true">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    );
  }

  // 6. X (Twitter)
  if (cleanDomain === 'x.com' || cleanDomain.includes('twitter') || name.toLowerCase() === 'x' || name.toLowerCase() === 'twitter') {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-5 h-5 text-slate-800 dark:text-white transition-colors"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }

  // 7. Discord
  if (cleanDomain.includes('discord') || name.toLowerCase().includes('discord')) {
    return (
      <svg viewBox="0 0 24 24" fill="#5865F2" className="w-6 h-6" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    );
  }

  // 8. General Website Favicon with Multi-Tier Fallback
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`;
  const duckFaviconUrl = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanDomain)}.ico`;

  if (loadErrorStage === 0) {
    return (
      <img
        src={googleFaviconUrl}
        alt={name}
        className="w-full h-full object-contain rounded-md select-none"
        loading="lazy"
        onError={() => setLoadErrorStage(1)}
      />
    );
  }

  if (loadErrorStage === 1) {
    return (
      <img
        src={duckFaviconUrl}
        alt={name}
        className="w-full h-full object-contain rounded-md select-none"
        loading="lazy"
        onError={() => setLoadErrorStage(2)}
      />
    );
  }

  // Fallback: Elegant Monogram / Globe Icon
  const initialChar = (name || cleanDomain || 'W').charAt(0).toUpperCase();
  return (
    <div className="w-full h-full flex items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-600 dark:text-cyan-300 font-bold text-sm">
      {initialChar.match(/[A-Z0-9]/) ? (
        <span>{initialChar}</span>
      ) : (
        <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400" />
      )}
    </div>
  );
});
