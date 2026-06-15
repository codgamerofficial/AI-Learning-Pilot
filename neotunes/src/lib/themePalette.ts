import type { ThemeMode } from '../store/preferencesStore';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;       // Brand Magenta-Red (#7C3AED)
  accentStrong: string; // Success Green (#00D4FF)
  accentPurple: string; // Aurora Purple (#7C3AED)
  accentSilver: string; // Premium Gold (#FFC857)
  dangerSurface: string;
  primary: string;
  green: string;
  gold: string;
}

const DARK_PALETTE: ThemePalette = {
  background: '#09090B', // Deepest background - slightly purple-tinted black
  surface: '#121217',    // Card / panel background
  surfaceAlt: '#1D1D24', // Elevated / active panels
  text: '#FFFFFF',       // Primary text
  textMuted: '#A1A1AA',  // Secondary / metadata
  textSubtle: '#52525B', // Caption / disabled
  border: 'rgba(255,255,255,0.08)',
  accent: '#7C3AED',       // Brand Magenta-Red
  accentStrong: '#00D4FF', // Success Green
  accentPurple: '#7C3AED', // Aurora Purple
  accentSilver: '#FFC857', // Premium Gold
  dangerSurface: '#2A1010',
  primary: '#7C3AED',
  green: '#00D4FF',
  gold: '#FFC857',
};

const LIGHT_PALETTE: ThemePalette = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F5',
  text: '#1A1D20',
  textMuted: '#495057',
  textSubtle: '#868E96',
  border: 'rgba(0,0,0,0.06)',
  accent: '#7C3AED',       // Aurora Purple (#7C3AED)
  accentStrong: '#00B4D8', // Cyber Blue for light mode
  accentPurple: '#7C3AED', // Aurora Purple
  accentSilver: '#FFB703', // Neon Gold for light mode
  dangerSurface: '#FFE3E3',
  primary: '#7C3AED',
  green: '#00B4D8',
  gold: '#FFB703',
};

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
