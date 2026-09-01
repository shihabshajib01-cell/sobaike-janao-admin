/**
 * Reverse Geocoding Service
 * Resolves human-readable addresses from latitude/longitude coordinates
 * Uses OpenStreetMap Nominatim endpoint with in-memory caching and concurrency control.
 * Privacy safe: Only latitude and longitude coordinates are sent for resolution.
 */

export interface ResolvedLocation {
  shortLabel: string;
  fullAddress: string;
  locality?: string;
  city?: string;
  district?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

// In-memory cache keyed by normalized "lat,lng:lang"
const locationCache = new Map<string, ResolvedLocation | null>();

// In-flight active request promises to prevent duplicate network calls
const inFlightPromises = new Map<string, Promise<ResolvedLocation | null>>();

// Maximum concurrent network requests to Nominatim
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestCount = 0;
const requestQueue: Array<() => void> = [];

/**
 * Normalizes coordinates into a cache key (rounded to 5 decimal places ~1.1m precision)
 */
export function getCoordinateKey(lat: number, lng: number, lang = 'en'): string {
  const roundedLat = Number(lat).toFixed(5);
  const roundedLng = Number(lng).toFixed(5);
  return `${roundedLat},${roundedLng}:${lang}`;
}

/**
 * Deduplicates and builds a clean short label (e.g. "Dhanmondi, Dhaka")
 */
export function buildShortLocationLabel(address: Record<string, string | undefined>): string {
  if (!address) return '';

  const pointOrRoad =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.street ||
    address.path ||
    '';

  const neighborhoodOrArea =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.residential ||
    address.hamlet ||
    address.village ||
    address.town ||
    address.locality ||
    '';

  const cityOrDistrict =
    address.city ||
    address.municipality ||
    address.county ||
    address.district ||
    address.state_district ||
    '';

  const stateOrRegion = address.state || address.region || address.province || '';
  const country = address.country || '';

  // Select candidates with prioritized hierarchy
  const parts: string[] = [];

  const addIfNew = (part?: string) => {
    if (!part || !part.trim()) return;
    const clean = part.trim();
    const cleanLower = clean.toLowerCase();
    // Avoid duplicates or substring collisions (e.g. "Dhaka City" vs "Dhaka")
    const isDuplicate = parts.some(
      (existing) =>
        existing.toLowerCase() === cleanLower ||
        existing.toLowerCase().includes(cleanLower) ||
        cleanLower.includes(existing.toLowerCase())
    );
    if (!isDuplicate) {
      parts.push(clean);
    }
  };

  // 1. Primary place/road/area
  if (neighborhoodOrArea) {
    addIfNew(neighborhoodOrArea);
  } else if (pointOrRoad) {
    addIfNew(pointOrRoad);
  }

  // 2. City / District
  if (cityOrDistrict) {
    addIfNew(cityOrDistrict);
  }

  // 3. Fallback to state or country if too short
  if (parts.length < 2) {
    if (stateOrRegion) {
      addIfNew(stateOrRegion);
    } else if (country) {
      addIfNew(country);
    }
  }

  // If still empty, try road or anything available
  if (parts.length === 0) {
    if (pointOrRoad) addIfNew(pointOrRoad);
    if (country) addIfNew(country);
  }

  // Limit to max 2-3 concise tokens
  return parts.slice(0, 2).join(', ');
}

/**
 * Concurrency worker: queues requests when max concurrency is reached
 */
function acquireWorkerSlot(): Promise<void> {
  if (activeRequestCount < MAX_CONCURRENT_REQUESTS) {
    activeRequestCount++;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    requestQueue.push(() => {
      activeRequestCount++;
      resolve();
    });
  });
}

function releaseWorkerSlot(): void {
  activeRequestCount--;
  if (requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) next();
  }
}

/**
 * Reverse geocode a single coordinate pair.
 * Returns normalized ResolvedLocation or null if resolution failed.
 */
export async function reverseGeocode(
  lat: number | null | undefined,
  lng: number | null | undefined,
  language = 'en'
): Promise<ResolvedLocation | null> {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const cacheKey = getCoordinateKey(lat, lng, language);

  // Check in-memory cache first
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey) || null;
  }

  // Check in-flight requests to avoid redundant fetches
  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<ResolvedLocation | null> => {
    await acquireWorkerSlot();

    try {
      const acceptLanguage = language === 'bn' ? 'bn,en;q=0.8' : 'en,bn;q=0.8';
      const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18&accept-language=${encodeURIComponent(
        acceptLanguage
      )}`;

      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': acceptLanguage,
        },
      });

      if (!response.ok) {
        // Safe null on HTTP error
        locationCache.set(cacheKey, null);
        return null;
      }

      const data = await response.json();
      if (!data || data.error) {
        locationCache.set(cacheKey, null);
        return null;
      }

      const address = (data.address || {}) as Record<string, string | undefined>;
      const shortLabel = buildShortLocationLabel(address) || data.name || data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const fullAddress = data.display_name || shortLabel;

      const resolved: ResolvedLocation = {
        shortLabel,
        fullAddress,
        locality: address.neighbourhood || address.suburb || address.quarter || address.village || address.town,
        city: address.city || address.municipality || address.town,
        district: address.county || address.district || address.state_district,
        region: address.state || address.region,
        country: address.country,
        countryCode: address.country_code?.toUpperCase(),
        latitude: lat,
        longitude: lng,
      };

      locationCache.set(cacheKey, resolved);
      return resolved;
    } catch (err) {
      console.warn('Reverse geocoding lookup failed gracefully:', err);
      locationCache.set(cacheKey, null);
      return null;
    } finally {
      releaseWorkerSlot();
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Lookup synchronously from cache if already resolved
 */
export function getCachedLocation(
  lat: number | null | undefined,
  lng: number | null | undefined,
  language = 'en'
): ResolvedLocation | null | undefined {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  const cacheKey = getCoordinateKey(lat, lng, language);
  return locationCache.get(cacheKey);
}

export const reverseGeocodingService = {
  reverseGeocode,
  getCachedLocation,
  getCoordinateKey,
  buildShortLocationLabel,
};

export default reverseGeocodingService;
