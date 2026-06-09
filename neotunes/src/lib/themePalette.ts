import type { ThemeMode } from '../store/preferencesStore';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;
  accentStrong: string;
  dangerSurface: string;
}

const DARK_PALETTE: ThemePalette = {
  background: '#050505',
  surface: '#121212',
  surfaceAlt: '#1A1A1A',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.75)',
  textSubtle: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FFD300', // CSK Canary Gold/Yellow
  accentStrong: '#005CA9', // CSK Royal Blue
  dangerSurface: '#3A1010',
};

const LIGHT_PALETTE: ThemePalette = {
  background: '#F9F9FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F2',
  text: '#0A0A0A',
  textMuted: '#374151',
  textSubtle: '#6B7280',
  border: 'rgba(0,0,0,0.08)',
  accent: '#F9D00F', // CSK Canary Yellow
  accentStrong: '#004B87', // CSK Royal Blue
  dangerSurface: '#FEE2E2',
};

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
