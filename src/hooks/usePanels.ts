import { useState, useCallback } from 'react';

export interface UsePanelsOptions {
  /** Initial visibility of the AI side panel (the demo showcase opens it). */
  initialSidePanelOpen?: boolean;
}

/**
 * Panel / modal visibility booleans extracted from App.
 *
 * Declaration order mirrors the original App.tsx useState order (share →
 * screenshot → workspaceManager → help → account → sidePanel → reader →
 * find → spotlight → extensions → sidebarCollapsed) so hook call order is
 * unchanged and every setter stays referentially stable — mount-time IPC /
 * window listeners and the global shortcut effect keep working untouched.
 *
 * Intentionally NOT owned here:
 * - isVpnPopoverOpen: App-local UI state closed by App.closeAllModals
 *   (App composes closePanelModals + the VPN close, preserving the full set).
 * - screenshotDataUrl / helpInitialTab: payload state, not visibility flags.
 * - isHoverRevealing / drag states / onboarding: transient UI, out of scope.
 */
export function usePanels(options: UsePanelsOptions = {}) {
  const { initialSidePanelOpen = false } = options;

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(() => initialSidePanelOpen);
  const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Closes every hook-owned modal. Original App.closeAllModals order was:
  // share → screenshot → spotlight → vpnPopover → extensions → help → account.
  // isVpnPopoverOpen stays App-local, so it is closed by the composed
  // App.closeAllModals; the relative order of the moved ones is kept 1:1
  // here. All are independent batched setState(false) calls, so the rendered
  // result is identical regardless of position.
  const closeAllModals = useCallback(() => {
    setIsShareOpen(false);
    setIsScreenshotOpen(false);
    setIsSpotlightOpen(false);
    setIsExtensionsOpen(false);
    setIsHelpOpen(false);
    setIsAccountModalOpen(false);
  }, []);

  return {
    isShareOpen,
    setIsShareOpen,
    isScreenshotOpen,
    setIsScreenshotOpen,
    isWorkspaceManagerOpen,
    setIsWorkspaceManagerOpen,
    isHelpOpen,
    setIsHelpOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    isSidePanelOpen,
    setIsSidePanelOpen,
    isReaderModeOpen,
    setIsReaderModeOpen,
    isFindInPageOpen,
    setIsFindInPageOpen,
    isSpotlightOpen,
    setIsSpotlightOpen,
    isExtensionsOpen,
    setIsExtensionsOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    closeAllModals,
  };
}
