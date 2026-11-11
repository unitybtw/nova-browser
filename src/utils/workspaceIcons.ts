import {
  LayoutGrid,
  Briefcase,
  User,
  Code,
  Sparkles,
  Gamepad2,
  GraduationCap,
  DollarSign,
  ShoppingCart,
  Folder
} from 'lucide-react';
import type { ComponentType } from 'react';

export const WORKSPACE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b'
};

export interface WorkspaceIconItem {
  id: string;
  component: ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const WORKSPACE_ICONS: WorkspaceIconItem[] = [
  { id: 'LayoutGrid', component: LayoutGrid },
  { id: 'Briefcase', component: Briefcase },
  { id: 'User', component: User },
  { id: 'Code', component: Code },
  { id: 'Sparkles', component: Sparkles },
  { id: 'Gamepad2', component: Gamepad2 },
  { id: 'GraduationCap', component: GraduationCap },
  { id: 'DollarSign', component: DollarSign },
  { id: 'ShoppingCart', component: ShoppingCart },
  { id: 'Folder', component: Folder },
];

export const getWorkspaceIcon = (
  iconName?: string,
  name?: string
): ComponentType<{ className?: string; style?: React.CSSProperties }> => {
  if (iconName) {
    const match = WORKSPACE_ICONS.find(i => i.id === iconName);
    if (match) return match.component;
  }

  const lower = (name || '').toLowerCase();
  if (lower.includes('work') || lower.includes('iş') || lower.includes('office') || lower.includes('şirket')) return Briefcase;
  if (lower.includes('dev') || lower.includes('code') || lower.includes('yazılım') || lower.includes('kod')) return Code;
  if (lower.includes('personal') || lower.includes('kişisel') || lower.includes('özel') || lower.includes('ben')) return User;
  if (lower.includes('game') || lower.includes('oyun') || lower.includes('eğlence')) return Gamepad2;
  if (lower.includes('study') || lower.includes('ders') || lower.includes('okul') || lower.includes('akademi')) return GraduationCap;
  if (lower.includes('finance') || lower.includes('para') || lower.includes('borsa') || lower.includes('kripto')) return DollarSign;
  if (lower.includes('shop') || lower.includes('alışveriş') || lower.includes('market')) return ShoppingCart;
  if (lower.includes('magic') || lower.includes('ai') || lower.includes('spark')) return Sparkles;

  return LayoutGrid;
};
