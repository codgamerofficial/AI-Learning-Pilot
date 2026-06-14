/**
 * Simple in-memory + AsyncStorage cache for YouTube API results.
 * Prevents hitting the API quota on every render.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'yt_cache_';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory layer to avoid AsyncStorage reads on hot path
const memCache = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(key: string): Promise<T | null> {
  // 1. Check memory
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.timestamp < TTL_MS) {
    return mem.data as T;
  }

  // 2. Check AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp < TTL_MS) {
        memCache.set(key, entry as CacheEntry<unknown>);
        return entry.data;
      }
    }
  } catch {
    // Storage read failed, proceed without cache
  }
  return null;
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memCache.set(key, entry as CacheEntry<unknown>);
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage write failed, in-memory cache still helps
  }
}

export async function clearCache(): Promise<void> {
  memCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch { /* ignore */ }
}
