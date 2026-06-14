import type { ThemeMode } from '../store/preferencesStore';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;       // Brand Magenta-Red (#FF4D6D)
  accentStrong: string; // Success Green (#00E5A0)
  accentPurple: string; // Aurora Purple (#7B61FF)
  accentSilver: string; // Premium Gold (#FFB830)
  dangerSurface: string;
  primary: string;
  green: string;
  gold: string;
}

const DARK_PALETTE: ThemePalette = {
  background: '#0A0A0F', // Deepest background - slightly purple-tinted black
  surface: '#141418',    // Card / panel background
  surfaceAlt: '#1E1E26', // Elevated / active panels
  text: '#FFFFFF',       // Primary text
  textMuted: '#A0A0B8',  // Secondary / metadata
  textSubtle: '#5C5C7A', // Caption / disabled
  border: 'rgba(255,255,255,0.08)',
  accent: '#FF4D6D',       // Brand Magenta-Red
  accentStrong: '#00E5A0', // Success Green
  accentPurple: '#7B61FF', // Aurora Purple
  accentSilver: '#FFB830', // Premium Gold
  dangerSurface: '#2A1010',
  primary: '#FF4D6D',
  green: '#00E5A0',
  gold: '#FFB830',
};

const LIGHT_PALETTE: ThemePalette = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F5',
  text: '#1A1D20',
  textMuted: '#495057',
  textSubtle: '#868E96',
  border: 'rgba(0,0,0,0.06)',
  accent: '#E63956',       // Brand color for light mode
  accentStrong: '#00B880', // Green for light mode
  accentPurple: '#6741D9', // Violet/Purple
  accentSilver: '#C59B27', // Gold for light mode
  dangerSurface: '#FFE3E3',
  primary: '#E63956',
  green: '#00B880',
  gold: '#C59B27',
};

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
