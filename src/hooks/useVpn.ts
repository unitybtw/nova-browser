import { useState, useEffect, useCallback, useRef } from 'react';
import type { VpnLocation } from '../types/browser';
import { DEFAULT_VPN_LOCATION, DEFAULT_VPN_LOCATIONS } from '../utils/appConstants';
import { isValidProxyUrl } from '../utils/proxyValidation';
import { getElectronAPI, type ElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseVpnOptions {
  isDemo?: boolean;
}

const LEGACY_VPN_LOCATIONS_KEY = 'nova_vpn_locations';
const LEGACY_VPN_STATE_KEY = 'nova_vpn';

/** A location the app can actually connect through. */
function isUsableLocation(loc: unknown): loc is VpnLocation {
  const url = (loc as { url?: unknown })?.url;
  return Boolean(loc) && typeof url === 'string' && (url === '' || isValidProxyUrl(url));
}

/**
 * Move a legacy plaintext VPN list into the OS secure store.
 *
 * Returns the accepted locations, or null when the payload is not a usable list.
 * The legacy key is scrubbed ONLY once the secure write actually landed:
 * `secureStoreSet` resolves false on every failure path instead of rejecting, the
 * migration runs once per app version, and the plaintext copy is the user's only
 * remaining data — so an unconditional `removeItem` turned a failed secure write
 * into permanent, unrecoverable loss of the user's proxies.
 */
export async function migrateLegacyVpnLocations(
  raw: string,
  api: Pick<NonNullable<ElectronAPI>, 'secureStoreSet'> | undefined
): Promise<VpnLocation[] | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.warn('App:VPN', 'Legacy VPN locations are not readable JSON — keeping the legacy copy', err);
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const locations = parsed.filter(isUsableLocation);
  if (locations.length !== parsed.length) {
    logger.warn('App:VPN', `Skipped ${parsed.length - locations.length} legacy VPN location(s) with an unsupported proxy URL — they are not migrated and are removed from the list.`);
  }

  if (api?.secureStoreSet) {
    const migrated = await api.secureStoreSet(LEGACY_VPN_LOCATIONS_KEY, JSON.stringify(locations));
    if (!migrated) {
      logger.error('App:VPN', 'VPN location migration to secureStore failed — legacy copy kept so it can be retried');
      return locations;
    }
  }
  localStorage.removeItem(LEGACY_VPN_LOCATIONS_KEY);
  return locations;
}

/**
 * Move the legacy plaintext VPN toggle/active-location into the OS secure store,
 * under the same rule as the location list: the plaintext key survives a failed
 * secure write.
 */
export async function migrateLegacyVpnState(
  raw: string,
  api: Pick<NonNullable<ElectronAPI>, 'secureStoreSet'> | undefined
): Promise<{ enabled: boolean; location: VpnLocation | null } | null> {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.warn('App:VPN', 'Legacy nova_vpn is not readable JSON — keeping the legacy copy', err);
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const migrated: { enabled: boolean; location: VpnLocation | null } = {
    enabled: Boolean(parsed.enabled),
    location: isUsableLocation(parsed.location) ? parsed.location : null
  };

  if (api?.secureStoreSet) {
    const ok = await api.secureStoreSet(LEGACY_VPN_STATE_KEY, raw);
    if (!ok) {
      logger.error('App:VPN', 'VPN state migration to secureStore failed — legacy copy kept so it can be retried');
      return migrated;
    }
  }
  localStorage.removeItem(LEGACY_VPN_STATE_KEY);
  return migrated;
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
  const isHydratedRef = useRef(Boolean(isDemo));

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
              locationsLoaded = parsed.filter(isUsableLocation);
            }
          }
          const rawVpn = await api.secureStoreGet('nova_vpn');
          if (rawVpn) {
            const parsed = JSON.parse(rawVpn);
            enabledLoaded = Boolean(parsed.enabled);
            if (isUsableLocation(parsed.location)) {
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
          const legacyLocs = localStorage.getItem(LEGACY_VPN_LOCATIONS_KEY);
          if (legacyLocs) {
            locationsLoaded = await migrateLegacyVpnLocations(legacyLocs, api);
          }
        } catch (err) {
          logger.warn('App:VPN', 'Failed to migrate legacy VPN locations', err);
        }
      }

      if (!activeLocationLoaded) {
        try {
          const legacyVpn = localStorage.getItem(LEGACY_VPN_STATE_KEY);
          if (legacyVpn) {
            const migrated = await migrateLegacyVpnState(legacyVpn, api);
            if (migrated) {
              enabledLoaded = migrated.enabled;
              activeLocationLoaded = migrated.location;
            }
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
      isHydratedRef.current = true;
    };

    loadSecureVpnData();

    return () => {
      isMounted = false;
    };
  }, [isDemo]);

  // Persist custom VPN locations when updated (only after hydration is complete)
  useEffect(() => {
    if (isDemo || !isHydratedRef.current) return;
    const customOnly = vpnLocations.filter(l => l.type === 'custom');
    const api = getElectronAPI();
    if (api?.secureStoreSet) {
      api.secureStoreSet('nova_vpn_locations', JSON.stringify(customOnly)).catch(err => {
        logger.warn('App:VPN', 'Failed to persist VPN locations to secureStore', err);
      });
    }
    localStorage.removeItem('nova_vpn_locations');
  }, [vpnLocations, isDemo]);

  const handleAddVpnLocation = useCallback((newLoc: VpnLocation) => {
    setVpnLocations(prev => [...prev, newLoc]);
  }, []);

  const handleRemoveVpnLocation = useCallback((id: string) => {
    setVpnLocations(prev => prev.filter(l => l.id !== id));
  }, []);

  useEffect(() => {
    if (isDemo || !isHydratedRef.current) return;
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
