/**
 * Nova Pure Daily 4K Ultra HD Wallpaper Engine
 * Delivers true 4K UHD (3840x2160) wallpapers daily.
 * Synchronized across all tabs, windows, and settings in real time.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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

export const STORAGE_KEYS = {
  ACTIVE_WALLPAPER_ID: 'nova_wallpaper_active_id',
  ACTIVE_WALLPAPER_DATE: 'nova_wallpaper_active_date',
  USER_OVERRIDE: 'nova_wallpaper_user_override',
  CUSTOM_PHOTO: 'nova_wallpaper_custom_photo',
  DAILY_CACHE_PREFIX: 'nova_daily_4k_'
} as const;

/**
 * Curated 4K Ultra HD Widescreen Wallpaper Collection (3840x2160)
 * Spans diverse nature, cosmic, oceans, aurora, architecture, and desert landscapes.
 */
export const CURATED_4K_WALLPAPERS: WallpaperPhoto[] = [
  {
    id: 'daily-alpine-lake',
    title: 'Alpine Lake & Mountain Panorama 4K',
    author: 'Luca Bravo',
    authorUrl: 'https://unsplash.com/@lucabravo',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-dolomites',
    title: 'Dolomites Peaks at Sunrise 4K',
    author: 'Ales Krivec',
    authorUrl: 'https://unsplash.com/@aleskrivec',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-aurora',
    title: 'Northern Lights over Arctic Fjord 4K',
    author: 'Jonatan Pie',
    authorUrl: 'https://unsplash.com/@jonatanpie',
    imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Polar',
    resolution: '3840x2160'
  },
  {
    id: 'daily-patagonia',
    title: 'Mount Fitz Roy Glacier Summit 4K',
    author: 'Christopher Burns',
    authorUrl: 'https://unsplash.com/@clbphotos',
    imageUrl: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-matterhorn',
    title: 'Matterhorn Twilight Peak 4K',
    author: 'Samuel Ferrara',
    authorUrl: 'https://unsplash.com/@samferrara',
    imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-moraine-lake',
    title: 'Moraine Lake Turquoise Waters 4K',
    author: 'James Wheeler',
    authorUrl: 'https://unsplash.com/@souvenirpixels',
    imageUrl: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-fuji-cherry',
    title: 'Mount Fuji & Spring Blossom 4K',
    author: 'Manuel Cosentino',
    authorUrl: 'https://unsplash.com/@the_lost_explorer',
    imageUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Asia',
    resolution: '3840x2160'
  },
  {
    id: 'daily-iceland-canyon',
    title: 'Iceland Canyon & Glacier River 4K',
    author: 'Roberto Nickson',
    authorUrl: 'https://unsplash.com/@rpnickson',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Iceland',
    resolution: '3840x2160'
  },
  {
    id: 'daily-deep-space',
    title: 'Earth & Satellite Orbit Panorama 4K',
    author: 'NASA Space Agency',
    authorUrl: 'https://unsplash.com/@nasa',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Cosmic',
    resolution: '3840x2160'
  },
  {
    id: 'daily-milky-way',
    title: 'Milky Way Celestial Arch over Alps 4K',
    author: 'Benjamin Voros',
    authorUrl: 'https://unsplash.com/@vorosbenisop',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Cosmos',
    resolution: '3840x2160'
  },
  {
    id: 'daily-cosmic-stellar',
    title: 'Cosmic Stellar Nebula 4K',
    author: 'Graham Holtshausen',
    authorUrl: 'https://unsplash.com/@graham_holtshausen',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Cosmos',
    resolution: '3840x2160'
  },
  {
    id: 'daily-earth-horizon',
    title: 'Earth Atmospheric Horizon 4K',
    author: 'NASA Earth Observatory',
    authorUrl: 'https://unsplash.com/@nasa',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Space',
    resolution: '3840x2160'
  },
  {
    id: 'daily-stargazer',
    title: 'Stargazer Under Ancient Mountain 4K',
    author: 'Greg Rakozy',
    authorUrl: 'https://unsplash.com/@grakozy',
    imageUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Cosmos',
    resolution: '3840x2160'
  },
  {
    id: 'daily-maldives-lagoon',
    title: 'Tropical Turquoise Ocean Lagoon 4K',
    author: 'Sean Oulashin',
    authorUrl: 'https://unsplash.com/@oulashin',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Ocean',
    resolution: '3840x2160'
  },
  {
    id: 'daily-big-sur',
    title: 'Big Sur Pacific Coastal Cliffs 4K',
    author: 'Joseph Barrientos',
    authorUrl: 'https://unsplash.com/@jbcreate_',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Coastal',
    resolution: '3840x2160'
  },
  {
    id: 'daily-faroe-cliffs',
    title: 'Faroe Islands Atlantic Ocean Cliffs 4K',
    author: 'Annie Spratt',
    authorUrl: 'https://unsplash.com/@anniespratt',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Coastal',
    resolution: '3840x2160'
  },
  {
    id: 'daily-golden-sunset',
    title: 'Golden Sunset Ocean Horizon 4K',
    author: 'Sebastian Voortman',
    authorUrl: 'https://unsplash.com/@sebastianvoortman',
    imageUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Ocean',
    resolution: '3840x2160'
  },
  {
    id: 'daily-lofoten-fjord',
    title: 'Lofoten Islands Fjord Panorama 4K',
    author: 'Johnyvino',
    authorUrl: 'https://unsplash.com/@johnyvino',
    imageUrl: 'https://images.unsplash.com/photo-1513553404607-988bf2703777?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513553404607-988bf2703777?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nordic',
    resolution: '3840x2160'
  },
  {
    id: 'daily-tromso-emerald',
    title: 'Tromso Emerald Aurora Skies 4K',
    author: 'Vincent Guth',
    authorUrl: 'https://unsplash.com/@vincentguth',
    imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Polar',
    resolution: '3840x2160'
  },
  {
    id: 'daily-cinque-terre',
    title: 'Cinque Terre Mediterranean Coast 4K',
    author: 'Bjorn Snelders',
    authorUrl: 'https://unsplash.com/@bjornsnelders',
    imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Coastal',
    resolution: '3840x2160'
  },
  {
    id: 'daily-glacial-ridge',
    title: 'Glacial Alpine Mountain Ridge 4K',
    author: 'Kalen Emsley',
    authorUrl: 'https://unsplash.com/@kalenemsley',
    imageUrl: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-tokyo-night',
    title: 'Tokyo Twilight Skyline & Lights 4K',
    author: 'Louie Martinez',
    authorUrl: 'https://unsplash.com/@louiemartinez',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Urban',
    resolution: '3840x2160'
  },
  {
    id: 'daily-redwood-canopy',
    title: 'Redwood Forest Morning Canopy 4K',
    author: 'Sebastian Unrau',
    authorUrl: 'https://unsplash.com/@sebastian_unrau',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Forest',
    resolution: '3840x2160'
  },
  {
    id: 'daily-misty-pines',
    title: 'Misty Pine Forest at Dawn 4K',
    author: 'Dave Hoefler',
    authorUrl: 'https://unsplash.com/@davehoefler',
    imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Forest',
    resolution: '3840x2160'
  },
  {
    id: 'daily-tokyo-tower',
    title: 'Tokyo Tower Twilight Panorama 4K',
    author: 'Su San Lee',
    authorUrl: 'https://unsplash.com/@susan_lee',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Urban',
    resolution: '3840x2160'
  },
  {
    id: 'daily-singapore-marina',
    title: 'Singapore Marina Bay Night Lights 4K',
    author: 'Victor Garcia',
    authorUrl: 'https://unsplash.com/@victorgarcia',
    imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Urban',
    resolution: '3840x2160'
  },
  {
    id: 'daily-cyberpunk-neon',
    title: 'Cyberpunk Neon Metropolis Streets 4K',
    author: 'Alexander Popov',
    authorUrl: 'https://unsplash.com/@alexanderpopov',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Cyber',
    resolution: '3840x2160'
  },
  {
    id: 'daily-santorini-terrace',
    title: 'Santorini Caldera White Architecture 4K',
    author: 'Heidi Kaden',
    authorUrl: 'https://unsplash.com/@heidikaden',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Architecture',
    resolution: '3840x2160'
  },
  {
    id: 'daily-antelope-canyon',
    title: 'Antelope Canyon Sandstone Beams 4K',
    author: 'Justin Kauffman',
    authorUrl: 'https://unsplash.com/@justindkauffman',
    imageUrl: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Desert',
    resolution: '3840x2160'
  },
  {
    id: 'daily-grand-canyon',
    title: 'Grand Canyon Sunset Panorama 4K',
    author: 'Omer Salom',
    authorUrl: 'https://unsplash.com/@omersalom',
    imageUrl: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Landscape',
    resolution: '3840x2160'
  },
  {
    id: 'daily-sahara-stars',
    title: 'Sahara Starlight & Desert Dunes 4K',
    author: 'John Fowler',
    authorUrl: 'https://unsplash.com/@johnfowler',
    imageUrl: 'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Desert',
    resolution: '3840x2160'
  },
  {
    id: 'daily-serene-lake',
    title: 'Serene Scandinavian Lake Mirror 4K',
    author: 'Kalen Emsley',
    authorUrl: 'https://unsplash.com/@kalenemsley',
    imageUrl: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-yosemite-mist',
    title: 'Yosemite Valley & Half Dome 4K',
    author: 'Bailey Zindel',
    authorUrl: 'https://unsplash.com/@baileyzindel',
    imageUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-sunset-ocean',
    title: 'Golden Pacific Horizon Glow 4K',
    author: 'Frank McKenna',
    authorUrl: 'https://unsplash.com/@frankiefoto',
    imageUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Ocean',
    resolution: '3840x2160'
  },
  {
    id: 'daily-alps-valley',
    title: 'High Alps Mountain Valley 4K',
    author: 'Luca Bravo',
    authorUrl: 'https://unsplash.com/@lucabravo',
    imageUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Nature',
    resolution: '3840x2160'
  },
  {
    id: 'daily-shibuya-rain',
    title: 'Shibuya Neon Rain Reflections 4K',
    author: 'Redd F',
    authorUrl: 'https://unsplash.com/@reddf',
    imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=3840&q=95',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    source: '4K Ultra HD Urban',
    resolution: '3840x2160'
  }
];

// In-memory pool of available wallpapers (initialized with curated collection)
let cachedDailyWallpapers: WallpaperPhoto[] = [...CURATED_4K_WALLPAPERS];

/**
 * Validates that a wallpaper URL is a secure, well-formed HTTP/HTTPS URL.
 * Strips quotes, backslashes, and control characters to prevent CSS injection.
 */
export function isValidWallpaperUrl(urlStr: unknown): urlStr is string {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return false;
  const trimmed = urlStr.trim();
  if (/["'\r\n\\]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes an incoming wallpaper photo object from external providers or storage.
 */
export function sanitizeWallpaperPhoto(item: any): WallpaperPhoto | null {
  if (!item || typeof item !== 'object') return null;
  if (!isValidWallpaperUrl(item.imageUrl) || !isValidWallpaperUrl(item.thumbnailUrl || item.imageUrl)) {
    return null;
  }

  const rawId = String(item.id || item.imageUrl).trim();
  const safeId = rawId.slice(0, 100).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!safeId) return null;

  const rawTitle = String(item.title || 'Daily 4K UHD Wallpaper').trim();
  const safeTitle = rawTitle.slice(0, 150).replace(/[\r\n\t]/g, ' ');

  const rawAuthor = String(item.author || 'Nova 4K Engine').trim();
  const safeAuthor = rawAuthor.slice(0, 100).replace(/[\r\n\t]/g, ' ');

  const safeAuthorUrl = isValidWallpaperUrl(item.authorUrl) ? item.authorUrl.trim() : undefined;

  return {
    id: safeId,
    title: safeTitle,
    author: safeAuthor,
    authorUrl: safeAuthorUrl,
    imageUrl: item.imageUrl.trim(),
    thumbnailUrl: (item.thumbnailUrl || item.imageUrl).trim(),
    source: String(item.source || '4K Ultra HD').slice(0, 50),
    resolution: String(item.resolution || '3840x2160').slice(0, 30),
    date: item.date ? String(item.date).slice(0, 30) : undefined
  };
}

/**
 * Returns current date string in local timezone (YYYY-MM-DD)
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes a deterministic integer index for any date string and pool size.
 * Guarantees that on a specific day, all clients pick the exact same wallpaper.
 */
export function getDailyWallpaperIndex(dateStr: string, poolSize: number): number {
  if (poolSize <= 0) return 0;
  const safeStr = typeof dateStr === 'string' ? dateStr : '';
  let hash = 0;
  for (let i = 0; i < safeStr.length; i++) {
    hash = ((hash << 5) - hash) + safeStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % poolSize;
}

/**
 * Reads the active wallpaper ID, ensuring deterministic daily selection if no manual override is active.
 * Retains custom user choices across browser restarts even before external providers finish loading.
 */
export function getInitialActiveWallpaper(pool: WallpaperPhoto[]): WallpaperPhoto {
  const currentPool = pool && pool.length > 0 ? pool : CURATED_4K_WALLPAPERS;
  const todayStr = getLocalDateString();

  if (typeof localStorage === 'undefined') {
    const idx = getDailyWallpaperIndex(todayStr, currentPool.length);
    return currentPool[idx] || currentPool[0];
  }

  try {
    const isOverride = localStorage.getItem(STORAGE_KEYS.USER_OVERRIDE) === 'true';
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLPAPER_ID);
    const savedDate = localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLPAPER_DATE);

    // If user explicitly picked a wallpaper, retain it across sessions
    if (isOverride && savedId) {
      const found = currentPool.find(p => p.id === savedId);
      if (found) return found;

      // Check persisted custom photo object for online/external wallpapers
      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PHOTO);
      if (customRaw) {
        try {
          const parsedCustom = JSON.parse(customRaw);
          const sanitized = sanitizeWallpaperPhoto(parsedCustom);
          if (sanitized && sanitized.id === savedId) {
            return sanitized;
          }
        } catch (_) {}
      }

      // If not yet available in pool, return first pool photo temporarily
      // but DO NOT reset USER_OVERRIDE to false so preference is preserved
      return currentPool[0];
    }

    // If it's the same day and we already have a saved active ID, preserve it
    if (savedDate === todayStr && savedId) {
      const found = currentPool.find(p => p.id === savedId);
      if (found) return found;
    }

    // Otherwise, compute today's deterministic daily wallpaper
    const dailyIdx = getDailyWallpaperIndex(todayStr, currentPool.length);
    const dailyPhoto = currentPool[dailyIdx] || currentPool[0];

    localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_ID, dailyPhoto.id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_DATE, todayStr);
    localStorage.setItem(STORAGE_KEYS.USER_OVERRIDE, 'false');

    return dailyPhoto;
  } catch (e) {
    const idx = getDailyWallpaperIndex(todayStr, currentPool.length);
    return currentPool[idx] || currentPool[0];
  }
}

// In-memory subscribers for real-time same-window updates
type WallpaperListener = (photo: WallpaperPhoto, pool: WallpaperPhoto[], isUserOverride: boolean) => void;
const subscribers = new Set<WallpaperListener>();

function broadcastWallpaperSync(photo: WallpaperPhoto, pool: WallpaperPhoto[], isUserOverride: boolean) {
  for (const listener of subscribers) {
    try {
      listener(photo, pool, isUserOverride);
    } catch (e) {
      console.warn('Wallpaper listener error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('nova-wallpaper-sync', {
        detail: { photo, pool, isUserOverride }
      }));
    } catch (e) {}
  }
}

/**
 * Loads cached wallpapers from localStorage on module init so frame 0 has zero delay
 */
function initializeFromStorage() {
  if (typeof localStorage === 'undefined') return;
  const todayKey = getLocalDateString();
  try {
    const local = localStorage.getItem(`${STORAGE_KEYS.DAILY_CACHE_PREFIX}${todayKey}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validated: WallpaperPhoto[] = [];
        for (const p of parsed) {
          const s = sanitizeWallpaperPhoto(p);
          if (s) validated.push(s);
        }
        if (validated.length > 0) {
          const existingIds = new Set(validated.map(p => p.id));
          const merged = [...validated];
          for (const item of CURATED_4K_WALLPAPERS) {
            if (!existingIds.has(item.id)) {
              merged.push(item);
              existingIds.add(item.id);
            }
          }
          cachedDailyWallpapers = merged;
        }
      }
    }
  } catch (e) {}
}

initializeFromStorage();

/**
 * Fetches official Daily 4K UHD wallpapers from Electron IPC and Bing
 */
export async function fetchDaily4KWallpapers(): Promise<WallpaperPhoto[]> {
  const todayKey = getLocalDateString();
  const fetchedResults: WallpaperPhoto[] = [];

  // 1. Try Native Electron IPC pipeline
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchWallpaperPhotos) {
      const ipcResults = await (window as any).electronAPI.fetchWallpaperPhotos('daily');
      if (ipcResults && Array.isArray(ipcResults) && ipcResults.length > 0) {
        for (const item of ipcResults) {
          const sanitized = sanitizeWallpaperPhoto(item);
          if (sanitized) {
            fetchedResults.push(sanitized);
          }
        }
      }
    }
  } catch (err) {
    console.warn('IPC daily wallpaper error:', err);
  }

  // 2. Direct browser fetch for Bing Daily 4K Archive
  if (fetchedResults.length === 0 && typeof fetch !== 'undefined') {
    try {
      const bingRes = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US');
      if (bingRes.ok) {
        const bingData = await bingRes.json();
        if (bingData.images && Array.isArray(bingData.images)) {
          for (const img of bingData.images) {
            const uhdUrl = img.urlbase ? `https://www.bing.com${img.urlbase}_UHD.jpg` : `https://www.bing.com${img.url}`;
            const sanitized = sanitizeWallpaperPhoto({
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
            if (sanitized) {
              fetchedResults.push(sanitized);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Bing daily direct fetch error:', e);
    }
  }

  // Merge fetched results with curated wallpapers
  const finalPool: WallpaperPhoto[] = [];
  const seenIds = new Set<string>();

  for (const photo of fetchedResults) {
    if (!seenIds.has(photo.id)) {
      seenIds.add(photo.id);
      finalPool.push(photo);
    }
  }

  for (const photo of CURATED_4K_WALLPAPERS) {
    if (!seenIds.has(photo.id)) {
      seenIds.add(photo.id);
      finalPool.push(photo);
    }
  }

  cachedDailyWallpapers = finalPool;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEYS.DAILY_CACHE_PREFIX}${todayKey}`, JSON.stringify(finalPool));

      // Prune stale cache entries older than 7 days
      const prefix = STORAGE_KEYS.DAILY_CACHE_PREFIX;
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const ts = Date.parse(key.slice(prefix.length));
        if (!Number.isNaN(ts) && ts < cutoff) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {}

  return finalPool;
}

export function resolveUnsplashPhoto(): WallpaperPhoto {
  return getInitialActiveWallpaper(cachedDailyWallpapers);
}

export function getUnsplashPhotoUrl(): string {
  return resolveUnsplashPhoto().imageUrl;
}

export function getUnsplashThumbnailUrl(): string {
  return resolveUnsplashPhoto().thumbnailUrl;
}

/**
 * Sets the active wallpaper across all tabs, windows, and settings.
 */
export function setActiveWallpaper(photoOrId: string | WallpaperPhoto, isUserOverride = true): WallpaperPhoto | undefined {
  const targetId = typeof photoOrId === 'string' ? photoOrId : photoOrId.id;
  const photo = cachedDailyWallpapers.find(p => p.id === targetId) ||
    (typeof photoOrId !== 'string' ? sanitizeWallpaperPhoto(photoOrId) || undefined : undefined);

  if (!photo) return undefined;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_ID, photo.id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_DATE, getLocalDateString());
      localStorage.setItem(STORAGE_KEYS.USER_OVERRIDE, isUserOverride ? 'true' : 'false');
      if (isUserOverride) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PHOTO, JSON.stringify(photo));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_PHOTO);
      }
    }
  } catch (e) {}

  broadcastWallpaperSync(photo, cachedDailyWallpapers, isUserOverride);
  return photo;
}

/**
 * Resets selection back to today's official deterministic daily 4K wallpaper.
 */
export function resetToDailyWallpaper(): WallpaperPhoto {
  const todayStr = getLocalDateString();
  const dailyIdx = getDailyWallpaperIndex(todayStr, cachedDailyWallpapers.length);
  const dailyPhoto = cachedDailyWallpapers[dailyIdx] || cachedDailyWallpapers[0];

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_ID, dailyPhoto.id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLPAPER_DATE, todayStr);
      localStorage.setItem(STORAGE_KEYS.USER_OVERRIDE, 'false');
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_PHOTO);
    }
  } catch (e) {}

  broadcastWallpaperSync(dailyPhoto, cachedDailyWallpapers, false);
  return dailyPhoto;
}

/**
 * Synchronized React Hook for Daily 4K Wallpapers.
 * Keeps all tabs and settings pages in lockstep with zero flicker.
 */
export function useLiveUnsplashPhoto(enabled = true) {
  const [photoPool, setPhotoPool] = useState<WallpaperPhoto[]>(() => cachedDailyWallpapers);
  const [currentPhoto, setCurrentPhoto] = useState<WallpaperPhoto>(() => getInitialActiveWallpaper(cachedDailyWallpapers));
  const [isUserOverride, setIsUserOverride] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.USER_OVERRIDE) === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  const poolRef = useRef(photoPool);
  poolRef.current = photoPool;

  const currentPhotoRef = useRef(currentPhoto);
  currentPhotoRef.current = currentPhoto;

  useEffect(() => {
    // 1. Subscribe to in-memory synchronizer (same-window / components)
    const listener: WallpaperListener = (newPhoto, newPool, override) => {
      setCurrentPhoto(newPhoto);
      setPhotoPool(newPool);
      setIsUserOverride(override);
    };
    subscribers.add(listener);

    // 2. Subscribe to cross-tab storage events (different tabs / windows)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACTIVE_WALLPAPER_ID && e.newValue) {
        const pool = poolRef.current;
        const found = pool.find(p => p.id === e.newValue);
        if (found) {
          setCurrentPhoto(found);
          const override = localStorage.getItem(STORAGE_KEYS.USER_OVERRIDE) === 'true';
          setIsUserOverride(override);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Subscribe to custom event fallback
    const handleCustomSync = (e: Event) => {
      const customEvt = e as CustomEvent<{ photo: WallpaperPhoto; pool: WallpaperPhoto[]; isUserOverride: boolean }>;
      if (customEvt.detail?.photo) {
        setCurrentPhoto(customEvt.detail.photo);
        if (customEvt.detail.pool) setPhotoPool(customEvt.detail.pool);
        if (typeof customEvt.detail.isUserOverride === 'boolean') {
          setIsUserOverride(customEvt.detail.isUserOverride);
        }
      }
    };
    window.addEventListener('nova-wallpaper-sync', handleCustomSync);

    return () => {
      subscribers.delete(listener);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nova-wallpaper-sync', handleCustomSync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    setIsLoading(true);

    fetchDaily4KWallpapers().then(photos => {
      if (!isMounted) return;
      if (photos && photos.length > 0) {
        setPhotoPool(photos);
        // Important: Preserve the currently selected photo so there is no jump
        const activeId = currentPhotoRef.current.id;
        const stillPresent = photos.find(p => p.id === activeId);
        if (!stillPresent) {
          // If previous active photo is missing from updated pool, recalculate
          const refreshed = getInitialActiveWallpaper(photos);
          setCurrentPhoto(refreshed);
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  const selectedIndex = photoPool.findIndex(p => p.id === currentPhoto.id);

  const shuffleNext = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    const currentId = currentPhotoRef.current.id;
    const currentIndex = pool.findIndex(p => p.id === currentId);
    const nextIndex = (currentIndex + 1) % pool.length;
    const nextPhoto = pool[nextIndex];

    setActiveWallpaper(nextPhoto, true);
  }, []);

  const selectPhoto = useCallback((photoOrId: string | WallpaperPhoto) => {
    setActiveWallpaper(photoOrId, true);
  }, []);

  const resetToDaily = useCallback(() => {
    resetToDailyWallpaper();
  }, []);

  return {
    photo: currentPhoto,
    photoUrl: currentPhoto.imageUrl,
    photos: photoPool,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
    isUserOverride,
    shuffleNext,
    selectPhoto,
    resetToDaily,
    isLoading
  };
}
