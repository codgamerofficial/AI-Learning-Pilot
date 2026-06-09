/**
 * recentStore.ts
 * Recently played tracks — persisted manually to AsyncStorage.
 * Does NOT use zustand/middleware (which imports import.meta.env and crashes Metro web).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'neotunes:recent';

export interface RecentTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  color: string;
  playedAt: number;
}

interface RecentState {
  recentTracks: RecentTrack[];
  loaded: boolean;
  addRecentTrack: (track: Omit<RecentTrack, 'playedAt'>) => void;
  clearRecent: () => void;
  loadFromStorage: () => void;
  resetStore: () => void;
}

export const useRecentStore = create<RecentState>((set, get) => ({
  recentTracks: [],
  loaded: false,

  loadFromStorage: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const tracks: RecentTrack[] = JSON.parse(raw);
        set({ recentTracks: tracks, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  addRecentTrack: (track) => {
    const existing = get().recentTracks.filter(t => t.id !== track.id);
    const updated = [{ ...track, playedAt: Date.now() }, ...existing].slice(0, 20);
    set({ recentTracks: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  clearRecent: () => {
    set({ recentTracks: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  /** Full reset: clears data AND resets loaded flag so next user can reload fresh. */
  resetStore: () => {
    set({ recentTracks: [], loaded: false });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
