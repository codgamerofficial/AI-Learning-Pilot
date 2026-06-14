import { Platform } from 'react-native';

export type SoundProfile = 'none' | 'jbl' | 'bose' | 'sony' | 'harman' | 'studio';

export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bassBoost: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  vocalBoost: [-2, -1, 0, 2, 4, 5, 4, 2, 0, -1],
  trebleBoost: [0, 0, 0, 0, 1, 2, 4, 5, 6, 6],
  cinema: [5, 4, 2, 0, -1, -1, 2, 4, 5, 4],
  gaming: [3, 4, 1, -2, -1, 2, 4, 5, 3, 2],
  podcast: [-5, -3, 0, 3, 5, 5, 4, 2, 0, -2],
  classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 4],
  jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  rock: [4, 3, -1, -2, 0, 2, 3, 4, 3, 4],
};

export const SIGNATURE_PROFILES: Record<SoundProfile, number[]> = {
  none: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  jbl: [5, 4, 1, 0, 1, 2, 3, 4, 3, 2],       // Dynamic V-shape
  bose: [4, 3, 2, 1, 0, 1, 2, 1, 0, 0],      // Smooth warm bass & vocal
  sony: [7, 6, 4, 1, -1, 0, 1, 2, 2, 1],     // Deep extra bass (XB)
  harman: [3, 2, 1, 0, 0, 1, 1, 2, 1, 0],    // Harman Reference curve
  studio: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // Flat reference
};

export class EqualizerEngine {
  private static audioCtx: AudioContext | null = null;
  private static filters: BiquadFilterNode[] = [];

  static initWebAudio(audioElement: HTMLAudioElement) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        // Reuse global context if created in playerStore
        this.audioCtx = (window as any).__activeAudioContext || new AudioContextClass();
        (window as any).__activeAudioContext = this.audioCtx;
      }

      if (!this.audioCtx) return;

      // Disconnect previous filters
      this.filters.forEach(f => {
        try { f.disconnect(); } catch {}
      });
      this.filters = [];

      const source = this.audioCtx.createMediaElementSource(audioElement);
      let lastNode: AudioNode = source;

      // Create 10 band peaking filters
      EQ_FREQUENCIES.forEach((freq) => {
        if (!this.audioCtx) return;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.0; // Filter width
        filter.gain.value = 0; // Default flat

        lastNode.connect(filter);
        lastNode = filter;
        this.filters.push(filter);
      });

      lastNode.connect(this.audioCtx.destination);
      console.log('[EqualizerEngine] Web Audio 10-band EQ chain initialized.');
    } catch (e) {
      console.warn('[EqualizerEngine] Web Audio EQ setup bypassed:', e);
    }
  }

  static setGains(gains: number[]) {
    if (Platform.OS !== 'web' || this.filters.length === 0 || !this.audioCtx) return;
    
    try {
      gains.forEach((gain, index) => {
        const filter = this.filters[index];
        if (filter) {
          // Smooth transition to prevent clicks/pops
          filter.gain.setTargetAtTime(gain, this.audioCtx!.currentTime, 0.05);
        }
      });
    } catch (e) {
      // Ignore filter change errors
    }
  }
}
