import { useState, useCallback } from 'react';

export type HelpTab = 'help' | 'shortcuts' | 'ai' | 'privacy' | 'about';
export type ModalName = 'share' | 'spotlight' | 'extensions';

export function useModalState() {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('help');
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isVpnPopoverOpen, setIsVpnPopoverOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);

  const closeAllModals = useCallback(() => {
    setIsShareOpen(false);
    setIsScreenshotOpen(false);
    setIsSpotlightOpen(false);
    setIsVpnPopoverOpen(false);
    setIsExtensionsOpen(false);
    setIsHelpOpen(false);
    setIsAccountModalOpen(false);
  }, []);

  const openModal = useCallback((modalName: ModalName) => {
    closeAllModals();
    if (modalName === 'share') setIsShareOpen(true);
    else if (modalName === 'spotlight') setIsSpotlightOpen(true);
    else if (modalName === 'extensions') setIsExtensionsOpen(true);
  }, [closeAllModals]);

  return {
    isShareOpen,
    setIsShareOpen,
    isScreenshotOpen,
    setIsScreenshotOpen,
    screenshotDataUrl,
    setScreenshotDataUrl,
    isWorkspaceManagerOpen,
    setIsWorkspaceManagerOpen,
    isHelpOpen,
    setIsHelpOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    helpInitialTab,
    setHelpInitialTab,
    isSpotlightOpen,
    setIsSpotlightOpen,
    isVpnPopoverOpen,
    setIsVpnPopoverOpen,
    isExtensionsOpen,
    setIsExtensionsOpen,
    closeAllModals,
    openModal
  };
}
