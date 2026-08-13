import { Sparkles, Brain, Send } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const AiMockup = () => {
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative bg-slate-900 border border-slate-800">
      <img src="/browser-assets/mockup-ai.jpg" alt="Nova AI Assistant" className="w-full h-full object-cover" />
    </div>
  );
};
