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
  background: '#030303',
  surface: '#151515',
  surfaceAlt: '#0E0E0E',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.75)',
  textSubtle: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.1)',
  accent: '#FF2F3F',
  accentStrong: '#FF6B7B',
  dangerSurface: '#3A1010',
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
