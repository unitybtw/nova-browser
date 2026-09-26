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
    // Direct sync fallback without credentials
    return DEFAULT_VPN_LOCATIONS;
  });
  const [vpnLocation, setVpnLocation] = useState<VpnLocation>(() => vpnLocations[0] || DEFAULT_VPN_LOCATION);

  // Security: Asynchronously load custom VPN locations and credentials from OS safeStorage
  useEffect(() => {
    if (isDemo) return;

    let isMounted = true;
    const loadSecureVpnData = async () => {
      const api = getElectronAPI();
      let locationsLoaded: VpnLocation[] | null = null;
      let activeLocationLoaded: VpnLocation | null = null;
      let enabledLoaded = false;

      // 1. Try loading from secureStore
      if (api?.secureStoreGet) {
        try {
          const rawLocs = await api.secureStoreGet('nova_vpn_locations');
          if (rawLocs) {
            const parsed = JSON.parse(rawLocs);
            if (Array.isArray(parsed)) {
              locationsLoaded = parsed.filter(l => l && typeof l.url === 'string' && (l.url === '' || isValidProxyUrl(l.url)));
            }
          }
          const rawVpn = await api.secureStoreGet('nova_vpn');
          if (rawVpn) {
            const parsed = JSON.parse(rawVpn);
            enabledLoaded = Boolean(parsed.enabled);
            if (parsed.location && (parsed.location.url === '' || isValidProxyUrl(parsed.location.url))) {
              activeLocationLoaded = parsed.location;
            }
          }
        } catch (err) {
          logger.warn('App:VPN', 'Failed to read VPN data from secureStore', err);
        }
      }

      // 2. Fallback / Migration: If not in secureStore, check legacy localStorage
      if (!locationsLoaded) {
        try {
          const legacyLocs = localStorage.getItem('nova_vpn_locations');
          if (legacyLocs) {
            const parsed = JSON.parse(legacyLocs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              locationsLoaded = parsed.filter(l => l && typeof l.url === 'string' && (l.url === '' || isValidProxyUrl(l.url)));
              // Migrate to secureStore and purge from insecure localStorage
              if (api?.secureStoreSet) {
                await api.secureStoreSet('nova_vpn_locations', JSON.stringify(locationsLoaded));
              }
            }
            localStorage.removeItem('nova_vpn_locations');
          }
        } catch (err) {
          logger.warn('App:VPN', 'Failed to migrate legacy VPN locations', err);
        }
      }

      if (!activeLocationLoaded) {
        try {
          const legacyVpn = localStorage.getItem('nova_vpn');
          if (legacyVpn) {
            const parsed = JSON.parse(legacyVpn);
            enabledLoaded = Boolean(parsed.enabled);
            if (parsed.location && (parsed.location.url === '' || isValidProxyUrl(parsed.location.url))) {
              activeLocationLoaded = parsed.location;
            }
            if (api?.secureStoreSet) {
              await api.secureStoreSet('nova_vpn', legacyVpn);
            }
            localStorage.removeItem('nova_vpn');
          }
        } catch (err) {
          logger.warn('App:VPN', 'Failed to migrate legacy nova_vpn', err);
        }
      }

      if (!isMounted) return;

      if (locationsLoaded && locationsLoaded.length > 0) {
        const mergedLocations = [
          DEFAULT_VPN_LOCATION,
          ...locationsLoaded.filter(l => l.id !== DEFAULT_VPN_LOCATION.id)
        ];
        setVpnLocations(mergedLocations);
        if (activeLocationLoaded) {
          setVpnLocation(activeLocationLoaded);
        }
      } else if (activeLocationLoaded) {
        setVpnLocation(activeLocationLoaded);
      }
      setVpnEnabled(enabledLoaded);
    };

    loadSecureVpnData();

    return () => {
      isMounted = false;
    };
  }, [isDemo]);

  const handleAddVpnLocation = useCallback((newLoc: VpnLocation) => {
    setVpnLocations(prev => {
      const updated = [...prev, newLoc];
      if (!isDemo) {
        const customOnly = updated.filter(l => l.type === 'custom');
        const api = getElectronAPI();
        if (api?.secureStoreSet) {
          api.secureStoreSet('nova_vpn_locations', JSON.stringify(customOnly)).catch(err => {
            logger.warn('App:VPN', 'Failed to persist VPN locations to secureStore', err);
          });
        }
        // Do not store plaintext credentials in localStorage
        localStorage.removeItem('nova_vpn_locations');
      }
      return updated;
    });
  }, [isDemo]);

  const handleRemoveVpnLocation = useCallback((id: string) => {
    setVpnLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (!isDemo) {
        const customOnly = updated.filter(l => l.type === 'custom');
        const api = getElectronAPI();
        if (api?.secureStoreSet) {
          api.secureStoreSet('nova_vpn_locations', JSON.stringify(customOnly)).catch(err => {
            logger.warn('App:VPN', 'Failed to persist VPN locations after removal', err);
          });
        }
        localStorage.removeItem('nova_vpn_locations');
      }
      return updated;
    });
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) return;
    const customLocations = vpnLocations.filter(loc => loc.type === 'custom');
    const api = getElectronAPI();
    if (api?.secureStoreSet) {
      api.secureStoreSet('nova_vpn', JSON.stringify({ enabled: vpnEnabled, location: vpnLocation, customLocations })).catch(err => {
        logger.warn('App:VPN', 'Failed to persist nova_vpn to secureStore', err);
      });
    }
    // Prevent plaintext storage in localStorage
    localStorage.removeItem('nova_vpn');

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
