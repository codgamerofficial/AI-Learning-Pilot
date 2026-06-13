import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export class Biometrics {
  static async isSupported(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true; // Web uses custom mockup modal
    }
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  static async authenticate(reason = 'Authenticate to unlock NeoTunes Premium'): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('[Biometrics] Web Mock Authentication Triggered.');
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 600);
      });
    }

    try {
      const results = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });
      return results.success;
    } catch (e) {
      console.warn('[Biometrics] Auth failed with error:', e);
      return false;
    }
  }
}
