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
  background: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceAlt: '#121212',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSubtle: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.12)',
  accent: '#00D4FF',
  accentStrong: '#00FF85',
  dangerSurface: '#2A1010',
};

const LIGHT_PALETTE: ThemePalette = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#E5E7EB',
  text: '#0A0A0A',
  textMuted: '#374151',
  textSubtle: '#6B7280',
  border: 'rgba(0,0,0,0.12)',
  accent: '#0A84FF',
  accentStrong: '#059669',
  dangerSurface: '#FEE2E2',
};

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
