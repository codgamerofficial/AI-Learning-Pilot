import { Platform } from 'react-native';
import { create } from 'zustand';
import { useRecentStore } from './recentStore';

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

  setCurrentTrack: async (track) => {
    const nextTrack = { ...track };
    set({ currentTrack: nextTrack, isPlaying: true, currentTime: 0, duration: 0 });
    useRecentStore.getState().addRecentTrack(nextTrack);

    const resolveQuery = track.searchQuery?.trim() || `${track.title} ${track.artist}`.trim();
    const shouldResolve = (!track.url && !track.playbackId) || track.source === 'spotify_proxy';

    if (!shouldResolve || !resolveQuery) {
      return;
    }

    try {
      const { fetchResolve } = require('../lib/apiClient');
      const resolved = await fetchResolve(resolveQuery);

      if (!resolved) {
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
    } catch {
      // Keep the original track if resolution fails.
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
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
}));
