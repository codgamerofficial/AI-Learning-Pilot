import { Share } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { usePlayerStore, type RepeatMode, type Track } from './playerStore';

type JamRole = 'host' | 'guest';

type JamSnapshot = {
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  currentTime: number;
  updatedAt: number;
};

type JamStatePayload = {
  senderId: string;
  snapshot: JamSnapshot;
  reason?: string;
};

const ROOM_CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLIENT_ID = Math.random().toString(36).slice(2, 10);

let activeChannel: RealtimeChannel | null = null;
let unsubscribePlayer: (() => void) | null = null;

const normalizeRoomCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);

const createRoomCode = () => {
  let output = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    output += CODE_ALPHABET[index];
  }
  return output;
};

const waitForSubscribe = (channel: RealtimeChannel) =>
  new Promise<string>((resolve) => {
    channel.subscribe((status) => {
      if (
        status === 'SUBSCRIBED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        resolve(status);
      }
    });
  });

const readPlayerSnapshot = (): JamSnapshot => {
  const playerState = usePlayerStore.getState();
  return {
    queue: playerState.queue,
    currentTrack: playerState.currentTrack,
    isPlaying: playerState.isPlaying,
    shuffleEnabled: playerState.shuffleEnabled,
    repeatMode: playerState.repeatMode,
    currentTime: playerState.currentTime,
    updatedAt: Date.now(),
  };
};

interface JamStoreState {
  sessionCode: string | null;
  role: JamRole | null;
  isConnected: boolean;
  participantCount: number;
  applyingRemoteState: boolean;
  lastSyncAt: number | null;
  error: string | null;

  createSession: (displayName: string) => Promise<boolean>;
  joinSession: (roomCode: string, displayName: string) => Promise<boolean>;
  leaveSession: () => Promise<void>;
  shareSession: () => Promise<void>;
  requestSync: () => Promise<void>;
  broadcastNow: (reason?: string) => Promise<void>;
}

export const useJamStore = create<JamStoreState>((set, get) => {
  const resetState = () => {
    set({
      sessionCode: null,
      role: null,
      isConnected: false,
      participantCount: 0,
      applyingRemoteState: false,
      lastSyncAt: null,
      error: null,
    });
  };

  const cleanupChannel = async () => {
    if (unsubscribePlayer) {
      unsubscribePlayer();
      unsubscribePlayer = null;
    }
    if (!activeChannel) return;

    try {
      await supabase.removeChannel(activeChannel);
    } catch {
      // Ignore cleanup errors.
    }

    activeChannel = null;
  };

  const applySnapshot = async (snapshot: JamSnapshot) => {
    if (!snapshot) return;

    set({ applyingRemoteState: true });

    try {
      const playerState = usePlayerStore.getState();
      const currentTrackId = playerState.currentTrack?.id;
      const incomingTrackId = snapshot.currentTrack?.id;

      if (Array.isArray(snapshot.queue)) {
        playerState.replaceQueue(snapshot.queue);
      }

      if (snapshot.currentTrack && incomingTrackId !== currentTrackId) {
        await playerState.setCurrentTrack(snapshot.currentTrack);
      }

      if (typeof snapshot.shuffleEnabled === 'boolean') {
        playerState.setShuffleEnabled(snapshot.shuffleEnabled);
      }

      if (snapshot.repeatMode === 'off' || snapshot.repeatMode === 'all' || snapshot.repeatMode === 'one') {
        playerState.setRepeatMode(snapshot.repeatMode);
      }

      if (typeof snapshot.currentTime === 'number') {
        const localTime = usePlayerStore.getState().currentTime;
        if (Math.abs(localTime - snapshot.currentTime) > 1.5) {
          playerState.seekTo(snapshot.currentTime);
        }
      }

      if (snapshot.isPlaying) {
        playerState.play();
      } else {
        playerState.pause();
      }

      set({ lastSyncAt: Date.now() });
    } finally {
      set({ applyingRemoteState: false });
    }
  };

  const connectToSession = async (roomCode: string, role: JamRole, displayName: string) => {
    await cleanupChannel();

    const channel = supabase.channel(`jam-session-${roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: CLIENT_ID },
      },
    });

    channel.on('broadcast', { event: 'player-state' }, ({ payload }) => {
      const message = payload as JamStatePayload;
      if (!message?.senderId || message.senderId === CLIENT_ID || !message.snapshot) return;
      if (get().role === 'guest') {
        void applySnapshot(message.snapshot);
      }
    });

    channel.on('broadcast', { event: 'request-sync' }, ({ payload }) => {
      const senderId = (payload as { senderId?: string } | null)?.senderId;
      if (!senderId || senderId === CLIENT_ID) return;
      if (get().role === 'host') {
        void get().broadcastNow('sync-request');
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presenceMap = channel.presenceState();
      set({ participantCount: Object.keys(presenceMap).length });
    });

    const subscribeStatus = await waitForSubscribe(channel);
    if (subscribeStatus !== 'SUBSCRIBED') {
      await supabase.removeChannel(channel).catch(() => {});
      set({ error: 'Could not connect to Jam session. Please try again.' });
      return false;
    }

    await channel.track({
      userId: CLIENT_ID,
      displayName,
      role,
      joinedAt: new Date().toISOString(),
    }).catch(() => {});

    activeChannel = channel;
    set({
      sessionCode: roomCode,
      role,
      isConnected: true,
      participantCount: 1,
      error: null,
      lastSyncAt: null,
    });

    if (role === 'host') {
      let lastTrackId = usePlayerStore.getState().currentTrack?.id;
      let lastIsPlaying = usePlayerStore.getState().isPlaying;
      let lastShuffle = usePlayerStore.getState().shuffleEnabled;
      let lastRepeat = usePlayerStore.getState().repeatMode;
      let lastTime = usePlayerStore.getState().currentTime;

      unsubscribePlayer = usePlayerStore.subscribe((state) => {
        const hasTrackChanged = state.currentTrack?.id !== lastTrackId;
        const hasPlayChanged = state.isPlaying !== lastIsPlaying;
        const hasShuffleChanged = state.shuffleEnabled !== lastShuffle;
        const hasRepeatChanged = state.repeatMode !== lastRepeat;
        const hasSeeked = Math.abs(state.currentTime - lastTime) > 1.8;

        lastTrackId = state.currentTrack?.id;
        lastIsPlaying = state.isPlaying;
        lastShuffle = state.shuffleEnabled;
        lastRepeat = state.repeatMode;
        lastTime = state.currentTime;

        if (hasTrackChanged || hasPlayChanged || hasShuffleChanged || hasRepeatChanged || hasSeeked) {
          void get().broadcastNow('player-state-changed');
        }
      });

      await get().broadcastNow('session-start');
    } else {
      await get().requestSync();
    }

    return true;
  };

  return {
    sessionCode: null,
    role: null,
    isConnected: false,
    participantCount: 0,
    applyingRemoteState: false,
    lastSyncAt: null,
    error: null,

    createSession: async (displayName) => {
      set({ error: null });
      const roomCode = createRoomCode();
      return connectToSession(roomCode, 'host', displayName);
    },

    joinSession: async (roomCode, displayName) => {
      set({ error: null });
      const normalized = normalizeRoomCode(roomCode);
      if (normalized.length !== ROOM_CODE_LENGTH) {
        set({ error: 'Enter a valid 6-character room code.' });
        return false;
      }
      return connectToSession(normalized, 'guest', displayName);
    },

    leaveSession: async () => {
      await cleanupChannel();
      resetState();
    },

    shareSession: async () => {
      const code = get().sessionCode;
      if (!code) return;

      await Share.share({
        message: `Join my NeoTunes Jam: ${code}`,
      }).catch(() => {});
    },

    requestSync: async () => {
      if (!activeChannel || !get().isConnected) return;

      await activeChannel.send({
        type: 'broadcast',
        event: 'request-sync',
        payload: { senderId: CLIENT_ID },
      }).catch(() => {});
    },

    broadcastNow: async (reason = 'manual') => {
      if (!activeChannel || !get().isConnected || get().applyingRemoteState) return;
      if (get().role !== 'host') return;

      const payload: JamStatePayload = {
        senderId: CLIENT_ID,
        reason,
        snapshot: readPlayerSnapshot(),
      };

      await activeChannel.send({
        type: 'broadcast',
        event: 'player-state',
        payload,
      }).catch(() => {});
    },
  };
});
