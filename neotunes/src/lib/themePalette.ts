import type { ThemeMode } from '../store/preferencesStore';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;       // Premium Gold
  accentStrong: string; // Electric Blue
  accentPurple: string; // Aurora Purple
  accentSilver: string; // Titanium Silver
  dangerSurface: string;
}

const DARK_PALETTE: ThemePalette = {
  background: '#050506', // Neo Black (AMOLED)
  surface: '#0C0C0E',    // Spatial UI Surface
  surfaceAlt: '#141417', // Secondary surface
  text: '#E2E8F0',       // Titanium Silver text
  textMuted: 'rgba(226,232,240,0.75)',
  textSubtle: 'rgba(226,232,240,0.45)',
  border: 'rgba(226,232,240,0.06)',
  accent: '#D4AF37',       // Premium Gold
  accentStrong: '#00D4FF', // Electric Blue
  accentPurple: '#7B61FF', // Aurora Purple
  accentSilver: '#E2E8F0', // Titanium Silver
  dangerSurface: '#2A1010',
};

const LIGHT_PALETTE: ThemePalette = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F5',
  text: '#1A1D20',
  textMuted: '#495057',
  textSubtle: '#868E96',
  border: 'rgba(0,0,0,0.06)',
  accent: '#C59B27',       // Gold for light mode
  accentStrong: '#00A3C4', // Cyan/Blue
  accentPurple: '#6741D9', // Violet/Purple
  accentSilver: '#495057', // Silver/Grey
  dangerSurface: '#FFE3E3',
};

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
