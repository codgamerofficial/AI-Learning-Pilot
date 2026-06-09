import { Platform } from 'react-native';
import { create } from 'zustand';
import { useRecentStore } from './recentStore';

export const OFFLINE_FALLBACK_AUDIO = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  url?: string;
  color: string;
  source?: string;
  searchQuery?: string;
  playbackId?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

const dedupeTracks = (tracks: Track[]) => {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

const pickDifferentRandomIndex = (length: number, currentIndex: number) => {
  if (length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
};

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;

  // Playback time (in seconds) — updated by audio engine every 500ms
  currentTime: number;
  duration: number;

  // Seek bridge — audio engine registers this fn so store can call it
  _seekFn: ((seconds: number) => void) | null;

  // Actions
  setCurrentTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setQueue: (tracks: Track[]) => void;
  replaceQueue: (tracks: Track[]) => void;
  enqueueTrack: (track: Track) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setShuffleEnabled: (enabled: boolean) => void;
  toggleShuffle: () => void;
  setRepeatMode: (repeatMode: RepeatMode) => void;
  cycleRepeatMode: () => void;

  // Time actions
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  seekTo: (seconds: number) => void;
  registerSeekFn: (fn: (seconds: number) => void) => void;

  // Preferences
  crossfadeSeconds: number;
  gaplessEnabled: boolean;
  setCrossfadeSeconds: (sec: number) => void;
  setGaplessEnabled: (enabled: boolean) => void;

  // Errors / Notifications
  playbackError: string | null;
  setPlaybackError: (err: string | null) => void;

  preloadNextTrack: () => Promise<void>;
}

function ensureAudioContext() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let ctx = (window as any).__activeAudioContext;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
        (window as any).__activeAudioContext = ctx;
      }
    }
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  queue: [],
  shuffleEnabled: false,
  repeatMode: 'off',
  currentTime: 0,
  duration: 0,
  _seekFn: null,
  crossfadeSeconds: 3,
  gaplessEnabled: true,
  playbackError: null,

  setCurrentTrack: async (track) => {
    ensureAudioContext();
    const nextTrack = { ...track };
    set({ currentTrack: nextTrack, isPlaying: true, currentTime: 0, duration: 0 });
    useRecentStore.getState().addRecentTrack(nextTrack);

    const resolveQuery = track.searchQuery?.trim() || `${track.title} ${track.artist}`.trim();
    const shouldResolve = (!track.url && !track.playbackId) || track.source === 'spotify_proxy';

    if (!shouldResolve || !resolveQuery) {
      void get().preloadNextTrack();
      return;
    }

    try {
      const { fetchResolve } = require('../lib/apiClient');
      const resolved = await fetchResolve(resolveQuery);

      if (!resolved) {
        void get().preloadNextTrack();
        return;
      }

      set((state) => {
        if (state.currentTrack?.id !== track.id) {
          return state;
        }

        if (resolved.url) {
          return {
            currentTrack: {
              ...track,
              url: resolved.url,
              source: resolved.resolvedSource ?? track.source,
            },
          };
        }

        if (resolved.id) {
          return {
            currentTrack: {
              ...track,
              playbackId: resolved.id,
              source: resolved.resolvedSource ?? track.source,
            },
          };
        }

        return state;
      });
      void get().preloadNextTrack();
    } catch {
      // Keep the original track if resolution fails.
      void get().preloadNextTrack();
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  play: () => {
    ensureAudioContext();
    set({ isPlaying: true });
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => {
    ensureAudioContext();
    set((state) => ({ isPlaying: !state.isPlaying }));
  },
  setQueue: (tracks) => set((state) => {
    const deduped = dedupeTracks(tracks);
    if (state.currentTrack && !deduped.some((track) => track.id === state.currentTrack?.id)) {
      deduped.unshift(state.currentTrack);
    }
    return { queue: deduped };
  }),
  replaceQueue: (tracks) => set({ queue: dedupeTracks(tracks) }),
  enqueueTrack: (track) => set((state) => {
    if (state.queue.some((queuedTrack) => queuedTrack.id === track.id)) {
      return state;
    }
    return { queue: [...state.queue, track] };
  }),

  nextTrack: () => {
    const { currentTrack, queue, shuffleEnabled, repeatMode } = get();
    if (!currentTrack || queue.length === 0) return;

    const index = queue.findIndex((track) => track.id === currentTrack.id);
    if (index < 0) {
      void get().setCurrentTrack(queue[0]);
      return;
    }

    if (repeatMode === 'one') {
      get().seekTo(0);
      set({ isPlaying: true });
      return;
    }

    let nextIndex = index;
    if (shuffleEnabled && queue.length > 1) {
      nextIndex = pickDifferentRandomIndex(queue.length, index);
    } else if (index < queue.length - 1) {
      nextIndex = index + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      set({ isPlaying: false });
      return;
    }

    void get().setCurrentTrack(queue[nextIndex]);
  },

  prevTrack: () => {
    const { currentTrack, queue, currentTime, shuffleEnabled, repeatMode } = get();
    if (!currentTrack || queue.length === 0) return;

    if (currentTime > 3) {
      get().seekTo(0);
      return;
    }

    const index = queue.findIndex((track) => track.id === currentTrack.id);
    if (index < 0) {
      void get().setCurrentTrack(queue[0]);
      return;
    }

    let prevIndex = index;
    if (shuffleEnabled && queue.length > 1) {
      prevIndex = pickDifferentRandomIndex(queue.length, index);
    } else if (index > 0) {
      prevIndex = index - 1;
    } else if (repeatMode === 'all') {
      prevIndex = queue.length - 1;
    } else {
      get().seekTo(0);
      return;
    }

    void get().setCurrentTrack(queue[prevIndex]);
  },

  setShuffleEnabled: (enabled) => set({ shuffleEnabled: enabled }),
  toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  cycleRepeatMode: () => set((state) => {
    const nextMode: RepeatMode = state.repeatMode === 'off'
      ? 'all'
      : state.repeatMode === 'all'
        ? 'one'
        : 'off';
    return { repeatMode: nextMode };
  }),

  // Time
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  seekTo: (seconds) => {
    const fn = get()._seekFn;
    if (fn) fn(seconds);
    set({ currentTime: seconds });
  },
  registerSeekFn: (fn) => set({ _seekFn: fn }),

  // Preferences
  setCrossfadeSeconds: (crossfadeSeconds) => set({ crossfadeSeconds }),
  setGaplessEnabled: (gaplessEnabled) => set({ gaplessEnabled }),

  preloadNextTrack: async () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;
    const index = queue.findIndex((track) => track.id === currentTrack.id);
    if (index < 0 || index >= queue.length - 1) return;

    const nextTrack = queue[index + 1];
    const shouldResolve = (!nextTrack.url && !nextTrack.playbackId) || nextTrack.source === 'spotify_proxy';
    if (!shouldResolve) return;

    const resolveQuery = nextTrack.searchQuery?.trim() || `${nextTrack.title} ${nextTrack.artist}`.trim();
    if (!resolveQuery) return;

    try {
      const { fetchResolve } = require('../lib/apiClient');
      const resolved = await fetchResolve(resolveQuery);
      if (!resolved) return;

      set((state) => {
        const idx = state.queue.findIndex((t) => t.id === nextTrack.id);
        if (idx < 0) return state;

        const updatedQueue = [...state.queue];
        updatedQueue[idx] = {
          ...nextTrack,
          url: resolved.url || nextTrack.url,
          playbackId: resolved.id || nextTrack.playbackId,
          source: resolved.resolvedSource ?? nextTrack.source,
        };
        return { queue: updatedQueue };
      });
    } catch (e) {
      console.warn('[PlayerStore] preloadNextTrack failed:', e);
    }
  },

  setPlaybackError: (playbackError) => {
    set({ playbackError });
    if (playbackError) {
      setTimeout(() => {
        if (get().playbackError === playbackError) {
          set({ playbackError: null });
        }
      }, 4000);
    }
  },
}));
