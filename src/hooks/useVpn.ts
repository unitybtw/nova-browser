import { useState, useEffect, useCallback } from 'react';
import type { VpnLocation } from '../types/browser';
import { DEFAULT_VPN_LOCATION, DEFAULT_VPN_LOCATIONS } from '../utils/appConstants';
import { isValidProxyUrl } from '../utils/proxyValidation';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseVpnOptions {
  isDemo?: boolean;
}

export function useVpn(options: UseVpnOptions = {}) {
  const { isDemo } = options;

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnLocations, setVpnLocations] = useState<VpnLocation[]>(() => {
    if (isDemo) return DEFAULT_VPN_LOCATIONS;
    try {
      const saved = localStorage.getItem('nova_vpn_locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.map((l: any) => {
            if (!l || typeof l.url !== 'string') return null;
            // '' = Direct Connection entry, always kept. Only secure proxies pass.
            if (l.url === '' || isValidProxyUrl(l.url)) {
              return l as VpnLocation;
            }
            console.warn(`[VPN] Dropped insecure proxy location "${l?.name ?? l?.id ?? 'unknown'}": Secure proxy required (https:// or socks5:// only)`);
            return null;
          }).filter(Boolean) as VpnLocation[];
          if (valid.length > 0) return valid;
        }
      }
    } catch (err) {
      logger.warn('App:VPN', 'Failed to parse saved VPN locations', err);
    }
    return DEFAULT_VPN_LOCATIONS;
  });
  const [vpnLocation, setVpnLocation] = useState<VpnLocation>(() => vpnLocations[0] || DEFAULT_VPN_LOCATION);

  const handleAddVpnLocation = useCallback((newLoc: VpnLocation) => {
    setVpnLocations(prev => {
      const updated = [...prev, newLoc];
      if (!isDemo) {
        try {
          localStorage.setItem('nova_vpn_locations', JSON.stringify(updated.filter(l => l.type === 'custom')));
        } catch (err) {
          logger.warn('App:VPN', 'Failed to persist new VPN location', err);
        }
      }
      return updated;
    });
  }, [isDemo]);

  const handleRemoveVpnLocation = useCallback((id: string) => {
    setVpnLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (!isDemo) {
        try {
          localStorage.setItem('nova_vpn_locations', JSON.stringify(updated.filter(l => l.type === 'custom')));
        } catch (err) {
          logger.warn('App:VPN', 'Failed to persist updated VPN locations after removal', err);
        }
      }
      return updated;
    });
  }, [isDemo]);

  useEffect(() => {
    const savedVpn = localStorage.getItem('nova_vpn');
    if (savedVpn) {
      try {
        const { enabled, location, customLocations } = JSON.parse(savedVpn);
        setVpnEnabled(Boolean(enabled));
        if (location && typeof location.url === 'string') {
          if (location.url === '' || isValidProxyUrl(location.url)) {
            setVpnLocation(location);
          } else {
            console.warn('[VPN] Dropped insecure saved proxy location: Secure proxy required (https:// or socks5:// only)');
          }
        }
        if (customLocations && Array.isArray(customLocations)) {
          const validLocations = customLocations.map((l: any) => {
            if (!l || typeof l.url !== 'string') return null;
            if (l.url === '' || isValidProxyUrl(l.url)) {
              return l as VpnLocation;
            }
            console.warn(`[VPN] Dropped insecure saved proxy "${l?.name ?? l?.id ?? 'unknown'}": Secure proxy required (https:// or socks5:// only)`);
            return null;
          }).filter(Boolean) as VpnLocation[];
          if (validLocations.length > 0) {
            setVpnLocations(validLocations);
          }
          if (!location && validLocations.length > 0) {
            setVpnLocation(validLocations[0]);
          }
        }
      } catch (err) {
        logger.warn('App:VPN', 'Failed to parse nova_vpn from localStorage', err);
      }
    }
  }, []);

  useEffect(() => {
    if (isDemo) return;
    const customLocations = vpnLocations.filter(loc => loc.type === 'custom');
    try {
      localStorage.setItem('nova_vpn', JSON.stringify({ enabled: vpnEnabled, location: vpnLocation, customLocations }));
    } catch (err) {
      logger.warn('App:VPN', 'Failed to persist nova_vpn to localStorage', err);
    }

    if (typeof window !== 'undefined' && getElectronAPI()?.setVpn) {
      const isValidProxy = Boolean(vpnLocation?.url) && isValidProxyUrl(vpnLocation.url);
      if (vpnEnabled && !isValidProxy) {
        // K2: keep UI truthful — IPC below sends enabled:false, so the
        // toggle state must fall back too (Popover reads isEnabled).
        console.warn("Proxy URL rejected: Secure proxy required (https:// or socks5:// only)");
        setVpnEnabled(false);
      }
      getElectronAPI()?.setVpn({
        enabled: vpnEnabled && isValidProxy,
        proxyUrl: isValidProxy ? vpnLocation.url : ''
      })?.then((res: boolean | { error?: string } | void) => {
        if (typeof res === 'object' && res !== null && 'error' in res && (res as { error?: string }).error) {
          console.error("Failed to set proxy via electron:", (res as { error?: string }).error);
        } else if (res === false && vpnEnabled && isValidProxy) {
          console.error("Failed to set proxy via electron");
        }
      })?.catch((err: unknown) => {
        console.error("Failed to set proxy via electron:", err);
      });
    }
  }, [vpnEnabled, vpnLocation, vpnLocations, isDemo]);

  return {
    vpnEnabled,
    setVpnEnabled,
    vpnLocations,
    vpnLocation,
    setVpnLocation,
    handleAddVpnLocation,
    handleRemoveVpnLocation,
  };
}
