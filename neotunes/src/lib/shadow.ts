/**
 * Cross-platform shadow helper.
 * React Native Web deprecates `shadowColor/Offset/Opacity/Radius` in favour of `boxShadow`.
 * Use this helper so shadows work on both native and web without warnings.
 *
 * Usage:
 *   style={[{ backgroundColor: '#000' }, shadow('0 4px 12px rgba(0,255,133,0.4)')]}
 */
import { Platform } from 'react-native';

type ShadowStyle = Record<string, string | number | { width: number; height: number }>;

/**
 * @param cssBoxShadow  e.g. '0px 4px 12px rgba(0,255,133,0.4)'
 * @param native        optional native shadow style (defaults to a simple dark shadow)
 */
export function shadow(
  cssBoxShadow: string,
  native?: ShadowStyle
): ShadowStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: cssBoxShadow } as ShadowStyle;
  }
  return (
    native ?? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    }
  );
}
