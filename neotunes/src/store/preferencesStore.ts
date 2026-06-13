import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'neotunes:preferences';

export type ThemeMode = 'dark' | 'light';
export type AudioQuality = 'auto' | 'low' | 'standard' | 'high' | 'veryHigh' | 'lossless' | 'studio';
export type SoundProfile = 'none' | 'jbl' | 'bose' | 'sony' | 'harman' | 'studio';
export type AncMode = 'off' | 'on' | 'transparency';

type PreferencesPayload = {
  displayName: string;
  themeMode: ThemeMode;
  audioQuality: AudioQuality;
  notificationsEnabled: boolean;
  eqPreset: string;
  eqBands: number[];
  soundProfile: SoundProfile;
  spatialAudio: boolean;
  headTracking: boolean;
  isBiometricLocked: boolean;
  ancMode: AncMode;
  ancDevice: string;
  gaplessPlayback: boolean;
  crossfadeEnabled: boolean;
  audioNormalization: boolean;
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
  setEqPreset: (preset: string) => void;
  setEqBands: (bands: number[]) => void;
  setEqBandValue: (index: number, value: number) => void;
  setSoundProfile: (profile: SoundProfile) => void;
  setSpatialAudio: (enabled: boolean) => void;
  toggleSpatialAudio: () => void;
  setHeadTracking: (enabled: boolean) => void;
  toggleHeadTracking: () => void;
  setBiometricLocked: (enabled: boolean) => void;
  toggleBiometricLock: () => void;
  setAncMode: (mode: AncMode) => void;
  setAncDevice: (device: string) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  toggleGaplessPlayback: () => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
  toggleCrossfade: () => void;
  setAudioNormalization: (enabled: boolean) => void;
  toggleNormalization: () => void;
  resetStore: () => void;
}

const defaultPreferences: PreferencesPayload = {
  displayName: '',
  themeMode: 'dark',
  audioQuality: 'auto',
  notificationsEnabled: true,
  eqPreset: 'flat',
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  soundProfile: 'none',
  spatialAudio: false,
  headTracking: false,
  isBiometricLocked: false,
  ancMode: 'off',
  ancDevice: 'None Connected',
  gaplessPlayback: true,
  crossfadeEnabled: false,
  audioNormalization: true,
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
          audioQuality: (['auto', 'low', 'standard', 'high', 'veryHigh', 'lossless', 'studio'] as const).includes(parsed.audioQuality as AudioQuality)
            ? (parsed.audioQuality as AudioQuality)
            : defaultPreferences.audioQuality,
          notificationsEnabled: parsed.notificationsEnabled ?? defaultPreferences.notificationsEnabled,
          eqPreset: parsed.eqPreset ?? defaultPreferences.eqPreset,
          eqBands: parsed.eqBands ?? defaultPreferences.eqBands,
          soundProfile: parsed.soundProfile ?? defaultPreferences.soundProfile,
          spatialAudio: parsed.spatialAudio ?? defaultPreferences.spatialAudio,
          headTracking: parsed.headTracking ?? defaultPreferences.headTracking,
          isBiometricLocked: parsed.isBiometricLocked ?? defaultPreferences.isBiometricLocked,
          ancMode: parsed.ancMode ?? defaultPreferences.ancMode,
          ancDevice: parsed.ancDevice ?? defaultPreferences.ancDevice,
          gaplessPlayback: parsed.gaplessPlayback ?? defaultPreferences.gaplessPlayback,
          crossfadeEnabled: parsed.crossfadeEnabled ?? defaultPreferences.crossfadeEnabled,
          audioNormalization: parsed.audioNormalization ?? defaultPreferences.audioNormalization,
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
    const qualities: AudioQuality[] = ['auto', 'low', 'standard', 'high', 'veryHigh', 'lossless', 'studio'];
    const idx = qualities.indexOf(current);
    const next = qualities[(idx + 1) % qualities.length];
    get().setAudioQuality(next);
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    persistPayload({ ...get(), notificationsEnabled });
  },

  toggleNotifications: () => {
    get().setNotificationsEnabled(!get().notificationsEnabled);
  },

  setEqPreset: (eqPreset) => {
    set({ eqPreset });
    persistPayload({ ...get(), eqPreset });
  },

  setEqBands: (eqBands) => {
    set({ eqBands });
    persistPayload({ ...get(), eqBands });

    // Update Web Audio API Filter chain if initialized
    if (Platform.OS === 'web') {
      const { EqualizerEngine } = require('../lib/EqualizerEngine');
      EqualizerEngine.setGains(eqBands);
    }
  },

  setEqBandValue: (index, value) => {
    const bands = [...get().eqBands];
    bands[index] = value;
    set({ eqBands: bands, eqPreset: 'custom' });
    persistPayload({ ...get(), eqBands: bands, eqPreset: 'custom' });

    if (Platform.OS === 'web') {
      const { EqualizerEngine } = require('../lib/EqualizerEngine');
      EqualizerEngine.setGains(bands);
    }
  },

  setSoundProfile: (soundProfile) => {
    set({ soundProfile });
    persistPayload({ ...get(), soundProfile });

    // When setting a signature profile, we map its EQ bands
    const { SIGNATURE_PROFILES } = require('../lib/EqualizerEngine');
    const profileBands = SIGNATURE_PROFILES[soundProfile];
    if (profileBands) {
      set({ eqBands: profileBands });
      persistPayload({ ...get(), soundProfile, eqBands: profileBands });
      
      if (Platform.OS === 'web') {
        const { EqualizerEngine } = require('../lib/EqualizerEngine');
        EqualizerEngine.setGains(profileBands);
      }
    }
  },

  setSpatialAudio: (spatialAudio) => {
    set({ spatialAudio });
    persistPayload({ ...get(), spatialAudio });
  },

  toggleSpatialAudio: () => {
    get().setSpatialAudio(!get().spatialAudio);
  },

  setHeadTracking: (headTracking) => {
    set({ headTracking });
    persistPayload({ ...get(), headTracking });
  },

  toggleHeadTracking: () => {
    get().setHeadTracking(!get().headTracking);
  },

  setBiometricLocked: (isBiometricLocked) => {
    set({ isBiometricLocked });
    persistPayload({ ...get(), isBiometricLocked });
  },

  toggleBiometricLock: () => {
    get().setBiometricLocked(!get().isBiometricLocked);
  },

  setAncMode: (ancMode) => {
    set({ ancMode });
    persistPayload({ ...get(), ancMode });
  },

  setAncDevice: (ancDevice) => {
    set({ ancDevice });
    persistPayload({ ...get(), ancDevice });
  },

  setGaplessPlayback: (gaplessPlayback) => {
    set({ gaplessPlayback });
    persistPayload({ ...get(), gaplessPlayback });
  },

  toggleGaplessPlayback: () => {
    get().setGaplessPlayback(!get().gaplessPlayback);
  },

  setCrossfadeEnabled: (crossfadeEnabled) => {
    set({ crossfadeEnabled });
    persistPayload({ ...get(), crossfadeEnabled });
  },

  toggleCrossfade: () => {
    get().setCrossfadeEnabled(!get().crossfadeEnabled);
  },

  setAudioNormalization: (audioNormalization) => {
    set({ audioNormalization });
    persistPayload({ ...get(), audioNormalization });
  },

  toggleNormalization: () => {
    get().setAudioNormalization(!get().audioNormalization);
  },

  /** Full reset: clears prefs AND resets loaded flag so next user can reload fresh. */
  resetStore: () => {
    set({ ...defaultPreferences, loaded: false });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
