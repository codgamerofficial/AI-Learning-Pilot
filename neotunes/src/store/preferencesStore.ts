import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'neotunes:preferences';

export type ThemeMode = 'dark' | 'light';
export type AudioQuality = 'auto' | 'high' | 'low';

type PreferencesPayload = {
  displayName: string;
  themeMode: ThemeMode;
  audioQuality: AudioQuality;
  notificationsEnabled: boolean;
};

interface PreferencesState extends PreferencesPayload {
  loaded: boolean;
  loadPreferences: () => void;
  setDisplayName: (displayName: string) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleTheme: () => void;
  setAudioQuality: (quality: AudioQuality) => void;
  cycleAudioQuality: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  toggleNotifications: () => void;
  resetStore: () => void;
}

const defaultPreferences: PreferencesPayload = {
  displayName: '',
  themeMode: 'dark',
  audioQuality: 'auto',
  notificationsEnabled: true,
};

/** Persist the full payload to AsyncStorage. */
function persistPayload(payload: PreferencesPayload) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...defaultPreferences,
  loaded: false,

  loadPreferences: async () => {
    if (get().loaded) return;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PreferencesPayload>;
        set({
          displayName: parsed.displayName ?? defaultPreferences.displayName,
          themeMode: parsed.themeMode === 'light' ? 'light' : 'dark',
          audioQuality: (['auto', 'high', 'low'] as const).includes(parsed.audioQuality as AudioQuality)
            ? (parsed.audioQuality as AudioQuality)
            : defaultPreferences.audioQuality,
          notificationsEnabled: parsed.notificationsEnabled ?? defaultPreferences.notificationsEnabled,
          loaded: true,
        });
        return;
      }

      set({ loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  setDisplayName: (displayName) => {
    const normalized = displayName.trim();
    set({ displayName: normalized });
    persistPayload({ ...get(), displayName: normalized });
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    persistPayload({ ...get(), themeMode });
  },

  toggleTheme: () => {
    const nextTheme: ThemeMode = get().themeMode === 'dark' ? 'light' : 'dark';
    get().setThemeMode(nextTheme);
  },

  setAudioQuality: (audioQuality) => {
    set({ audioQuality });
    persistPayload({ ...get(), audioQuality });
  },

  cycleAudioQuality: () => {
    const current = get().audioQuality;
    const next: AudioQuality = current === 'auto' ? 'high' : current === 'high' ? 'low' : 'auto';
    get().setAudioQuality(next);
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    persistPayload({ ...get(), notificationsEnabled });
  },

  toggleNotifications: () => {
    get().setNotificationsEnabled(!get().notificationsEnabled);
  },

  /** Full reset: clears prefs AND resets loaded flag so next user can reload fresh. */
  resetStore: () => {
    set({ ...defaultPreferences, loaded: false });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
