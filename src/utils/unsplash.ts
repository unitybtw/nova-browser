/**
 * Nova Pure Daily 4K Ultra HD Wallpaper Engine
 * Automatically delivers true 4K UHD (3840x2160) wallpapers daily.
 * Powered by Bing Daily 4K UHD Archive & Curated 4K Widescreen Masterpieces.
 */

import { useState, useEffect, useCallback } from 'react';

export interface WallpaperPhoto {
  id: string;
  title: string;
  author: string;
  authorUrl?: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  resolution?: string;
  date?: string;
}

export type UnsplashPhoto = WallpaperPhoto;

// In-memory cache for daily 4K wallpapers
let cachedDailyWallpapers: WallpaperPhoto[] = [];

/**
 * Fetches the official Daily 4K UHD wallpapers
 */
export async function fetchDaily4KWallpapers(): Promise<WallpaperPhoto[]> {
  if (cachedDailyWallpapers.length > 0) {
    return cachedDailyWallpapers;
  }

  // Check localStorage persistent daily cache
  const todayKey = new Date().toISOString().slice(0, 10);
  try {
    const local = localStorage.getItem(`nova_daily_4k_${todayKey}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedDailyWallpapers = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  const results: WallpaperPhoto[] = [];

  // 1. Try Native Electron IPC pipeline for full network access
  try {
    if ((window as any).electronAPI?.fetchWallpaperPhotos) {
      const ipcResults = await (window as any).electronAPI.fetchWallpaperPhotos('daily');
      if (ipcResults && Array.isArray(ipcResults) && ipcResults.length > 0) {
        for (const item of ipcResults) {
          if (item.imageUrl && item.imageUrl.startsWith('http')) {
            results.push({
              id: item.id || item.imageUrl,
              title: item.title || 'Daily 4K UHD Wallpaper',
              author: item.author || 'Daily 4K',
              authorUrl: item.authorUrl,
              imageUrl: item.imageUrl,
              thumbnailUrl: item.thumbnailUrl || item.imageUrl,
              source: item.source || '4K UHD Daily',
              resolution: item.resolution || '3840x2160'
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('IPC daily wallpaper error:', err);
  }

  // 2. Direct browser fetch for Bing Daily 4K Archive
  if (results.length === 0) {
    try {
      const bingRes = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US');
      if (bingRes.ok) {
        const bingData = await bingRes.json();
        if (bingData.images && Array.isArray(bingData.images)) {
          for (const img of bingData.images) {
            const uhdUrl = img.urlbase ? `https://www.bing.com${img.urlbase}_UHD.jpg` : `https://www.bing.com${img.url}`;
            results.push({
              id: `bing-${img.hsh || img.startdate}`,
              title: img.title || 'Bing Daily 4K Wallpaper',
              author: img.copyright || 'Microsoft Bing Daily',
              authorUrl: 'https://bing.com',
              imageUrl: uhdUrl,
              thumbnailUrl: `https://www.bing.com${img.url}`,
              source: 'Bing 4K UHD Daily',
              resolution: '3840x2160',
              date: img.startdate
            });
          }
        }
      }
    } catch (e) {
      console.warn('Bing daily direct fetch error:', e);
    }
  }

  // 3. Guaranteed High-Resolution 4K Fallback Pool
  if (results.length === 0) {
    results.push(
      {
        id: 'daily-alpine-lake',
        title: 'Alpine Lake & Mountain Panorama 4K',
        author: 'Luca Bravo',
        authorUrl: 'https://unsplash.com',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=95',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        source: '4K Ultra HD',
        resolution: '3840x2160'
      },
      {
        id: 'daily-dolomites',
        title: 'Dolomites Peaks at Sunrise 4K',
        author: 'Ales Krivec',
        authorUrl: 'https://unsplash.com',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=95',
        thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        source: '4K Ultra HD',
        resolution: '3840x2160'
      },
      {
        id: 'daily-aurora',
        title: 'Northern Lights over Arctic Fjord 4K',
        author: 'Jonatan Pie',
        authorUrl: 'https://unsplash.com',
        imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=3840&q=95',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
        source: '4K Ultra HD',
        resolution: '3840x2160'
      }
    );
  }

  cachedDailyWallpapers = results;
  try {
    localStorage.setItem(`nova_daily_4k_${todayKey}`, JSON.stringify(results));
  } catch (e) {}

  // Prune stale daily cache entries so localStorage doesn't grow forever
  // (one ~10KB JSON blob per day would otherwise accumulate indefinitely).
  // Keep the last 7 days; delete anything older. Unknown-format keys are left
  // alone rather than guessed at.
  try {
    const prefix = 'nova_daily_4k_';
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const ts = Date.parse(key.slice(prefix.length));
      if (!Number.isNaN(ts) && ts < cutoff) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  return results;
}

// Initial default photo
const DEFAULT_PHOTO: WallpaperPhoto = {
  id: 'daily-default',
  title: 'Daily 4K UHD Wallpaper',
  author: 'Nova 4K Engine',
  imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=95',
  thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  source: '4K Ultra HD',
  resolution: '3840x2160'
};

export function resolveUnsplashPhoto(): WallpaperPhoto {
  if (cachedDailyWallpapers.length > 0) {
    return cachedDailyWallpapers[0];
  }
  return DEFAULT_PHOTO;
}

export function getUnsplashPhotoUrl(): string {
  return resolveUnsplashPhoto().imageUrl;
}

export function getUnsplashThumbnailUrl(): string {
  return resolveUnsplashPhoto().thumbnailUrl;
}

/**
 * Main React Hook for Daily 4K Wallpapers
 */
export function useLiveUnsplashPhoto() {
  const [photoList, setPhotoList] = useState<WallpaperPhoto[]>(() => {
    return cachedDailyWallpapers.length > 0 ? cachedDailyWallpapers : [DEFAULT_PHOTO];
  });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDaily4KWallpapers().then(photos => {
      if (!isMounted) return;
      if (photos && photos.length > 0) {
        setPhotoList(photos);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPhoto = photoList[photoIndex % photoList.length] || photoList[0] || DEFAULT_PHOTO;

  const shuffleNext = useCallback(() => {
    setPhotoIndex(prev => (prev + 1) % Math.max(photoList.length, 1));
  }, [photoList.length]);

  const selectPhoto = useCallback((index: number) => {
    setPhotoIndex(index);
  }, []);

  return {
    photo: currentPhoto,
    photoUrl: currentPhoto.imageUrl,
    photos: photoList,
    selectedIndex: photoIndex,
    shuffleNext,
    selectPhoto,
    isLoading
  };
}
