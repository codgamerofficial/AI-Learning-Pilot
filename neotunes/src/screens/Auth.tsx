import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { Sparkles, Music, Users, Fingerprint, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import BrandLogo from '../components/BrandLogo';
import { shadow } from '../lib/shadow';

// Complete web-based OAuth sessions (essential for web compatibility)
WebBrowser.maybeCompleteAuthSession();

// Helper to parse deep link URL hash fragments or query parameters
function parseParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  
  let queryString = '';
  if (hashIndex !== -1) {
    queryString = url.substring(hashIndex + 1);
  } else if (queryIndex !== -1) {
    queryString = url.substring(queryIndex + 1);
  }
  
  if (queryString) {
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
  }
  return params;
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBiometricMockLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { Biometrics } = require('../lib/Biometrics');
      const supported = await Biometrics.isSupported();
      if (supported) {
        const success = await Biometrics.authenticate('Log in to NeoTunes Premium');
        if (success) {
          Alert.alert('Biometric Login', 'Successfully authenticated! Setting up developer session...');
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'developer@neotunes.app',
            password: 'developerPassword123'
          });
          if (signInError) {
            const { error: signUpError } = await supabase.auth.signUp({
              email: 'developer@neotunes.app',
              password: 'developerPassword123',
              options: {
                data: {
                  display_name: 'NeoTunes Developer'
                }
              }
            });
            if (signUpError) {
              setError(signUpError.message);
            }
          }
        }
      } else {
        Alert.alert('Biometrics Not Supported', 'Please use Google Sign-In on this device.');
      }
    } catch (e: any) {
      setError(e.message || 'Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      const redirectTo = Platform.OS === 'web'
        ? window.location.origin
        : makeRedirectUri(
            isExpoGo 
              ? { path: 'auth/callback' } 
              : { scheme: 'neotunes', path: 'auth/callback' }
          );

      if (__DEV__) console.log('[AuthScreen] Google Sign-In redirect URI:', redirectTo);

      // Supabase OAuth Sign In
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      // On Web, Supabase handles redirection automatically
      if (Platform.OS === 'web') {
        return;
      }

      // On Native, open the login page in the Expo WebBrowser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (result.type === 'success' && result.url) {
          const params = parseParamsFromUrl(result.url);

          if (params.access_token && params.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });

            if (sessionError) {
              setError(sessionError.message);
            }
          } else {
            setError('Failed to retrieve authentication tokens from redirect.');
          }
        } else if (result.type === 'cancel') {
          if (__DEV__) console.log('[AuthScreen] Google Sign-In was cancelled by the user.');
        } else {
          setError('Google Sign-In was not completed.');
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505', overflow: 'hidden' }}>
      {/* Large Premium Ambient Background Glows */}
      <View style={{
        position: 'absolute', top: -150, right: -150, width: 450, height: 450, borderRadius: 225,
        backgroundColor: '#005CA9', opacity: 0.12,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />
      <View style={{
        position: 'absolute', bottom: -150, left: -150, width: 450, height: 450, borderRadius: 225,
        backgroundColor: '#D4AF37', opacity: 0.12,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />
      <View style={{
        position: 'absolute', top: '25%', left: '10%', width: 350, height: 350, borderRadius: 175,
        backgroundColor: '#D4AF37', opacity: 0.04,
        // @ts-ignore
        filter: 'blur(120px)'
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        
        {/* Main Glassmorphic Form Card */}
        <View style={[
          {
            backgroundColor: 'rgba(12, 12, 12, 0.75)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 28,
            padding: 32,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
            // @ts-ignore - Web-only glassmorphism blur
            backdropFilter: 'blur(30px)',
          },
          shadow('0px 20px 40px rgba(0, 0, 0, 0.5)', {
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.1,
            shadowRadius: 32,
            elevation: 12,
          })
        ]}>
          
          {/* Logo Section */}
          <View style={{ marginBottom: 28 }}>
            <BrandLogo style={{ transform: [{ scale: 1.1 }] }} />
          </View>

          {/* Premium Tagline */}
          <Text style={{
            color: '#D4AF37',
            fontSize: 19,
            fontWeight: '900',
            marginBottom: 6,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 3,
            textShadowColor: 'rgba(255, 211, 0, 0.2)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 6,
          }}>
            Streaming, Recoded
          </Text>
          
          <Text style={{
            color: 'rgba(255, 255, 255, 0.35)',
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 10,
            letterSpacing: 1.5,
            marginBottom: 32,
            textAlign: 'center',
          }}>
            Enter the next generation of sound
          </Text>

          {/* Feature Highlight Deck */}
          <View style={{ width: '100%', gap: 16, marginBottom: 36, paddingHorizontal: 4 }}>
            {/* Feature 1 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255, 211, 0, 0.06)',
                borderWidth: 1, borderColor: 'rgba(255, 211, 0, 0.15)', alignItems: 'center', justifyContent: 'center'
              }}>
                <Music size={18} color="#D4AF37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Lossless Sound Engine</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 }}>Pure, high-fidelity audio stream</Text>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0, 92, 169, 0.06)',
                borderWidth: 1, borderColor: 'rgba(0, 92, 169, 0.15)', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={18} color="#005CA9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>AI Vibe Co-Pilot</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 }}>Generative mood-curated feeds</Text>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255, 211, 0, 0.06)',
                borderWidth: 1, borderColor: 'rgba(255, 211, 0, 0.15)', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={18} color="#D4AF37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Real-Time Jams</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 }}>Listen together with friends</Text>
              </View>
            </View>
          </View>

          {/* Error Message */}
          {error !== '' && (
            <View style={[
              {
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.25)',
                borderRadius: 14,
                padding: 14,
                width: '100%',
                marginBottom: 24
              },
              shadow('0px 4px 12px rgba(239,68,68,0.05)')
            ]}>
              <Text style={{ color: '#FF8A8A', fontWeight: '600', fontSize: 12, textAlign: 'center', lineHeight: 16 }}>{error}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          {loading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <ActivityIndicator size="large" color="#D4AF37" style={{ marginBottom: 16 }} />
              <Text style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.5,
                textAlign: 'center',
                textTransform: 'uppercase',
                fontFamily: Platform.select({
                  ios: 'Helvetica Neue',
                  android: 'sans-serif-medium',
                  default: 'system-ui',
                }),
              }}>
                Preparing your soundstage...
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%', gap: 14 }}>
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                activeOpacity={0.9}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    height: 56,
                    width: '100%'
                  },
                  shadow('0px 10px 25px rgba(255, 255, 255, 0.12)', {
                    shadowColor: '#FFF',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    elevation: 5
                  })
                ]}
              >
                {/* Google logo SVG */}
                <View style={{ marginRight: 12 }}>
                  <GoogleIcon />
                </View>
                <Text style={{
                  color: '#050505',
                  fontWeight: '900',
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontFamily: Platform.select({
                    ios: 'Helvetica Neue',
                    android: 'sans-serif-medium',
                    default: 'system-ui',
                  }),
                }}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleBiometricMockLogin}
                activeOpacity={0.88}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(212, 175, 55, 0.3)',
                    borderRadius: 16,
                    height: 56,
                    width: '100%'
                  },
                  shadow('0px 10px 25px rgba(212, 175, 55, 0.08)', {
                    shadowColor: '#D4AF37',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 3
                  })
                ]}
              >
                <Fingerprint size={20} color="#D4AF37" style={{ marginRight: 12 }} />
                <Text style={{
                  color: '#D4AF37',
                  fontWeight: '900',
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontFamily: Platform.select({
                    ios: 'Helvetica Neue',
                    android: 'sans-serif-medium',
                    default: 'system-ui',
                  }),
                }}>
                  Biometric Login
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Terms footnote */}
          <Text style={{
            color: 'rgba(255, 255, 255, 0.22)',
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 8.5,
            letterSpacing: 1.2,
            textAlign: 'center',
            marginTop: 36,
            lineHeight: 12,
          }}>
            By continuing, you agree to our terms of service
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
