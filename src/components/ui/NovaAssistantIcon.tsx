import { MessageSquareText } from 'lucide-react';

interface NovaAssistantIconProps {
  className?: string;
  size?: number;
  active?: boolean;
}

export function NovaAssistantIcon({ className = '', size = 16, active = false }: NovaAssistantIconProps) {
  return <MessageSquareText size={size} strokeWidth={active ? 2 : 1.75} className={`shrink-0 ${className}`} aria-hidden="true" />;
}
