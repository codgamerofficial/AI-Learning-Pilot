import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert, TextInput
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { Sparkles, Music, Users, Fingerprint, ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react-native';
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
  const [viewMode, setViewMode] = useState<'welcome' | 'auth'>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email authentication states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async () => {
    const email = emailInput.trim();
    const password = passwordInput;
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayNameInput.trim() || email.split('@')[0],
            }
          }
        });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          Alert.alert(
            'Welcome aboard! 🎵',
            'Your account has been created. Please log in with your credentials.'
          );
          setIsSignUp(false);
          setPasswordInput('');
        }
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

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
          const { error: signInError } = await supabase.auth.signInWithPassword({
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
        Alert.alert('Biometrics Not Supported', 'Fallback credentials: developer@neotunes.app / developerPassword123');
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

      if (Platform.OS === 'web') {
        return;
      }

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
          if (__DEV__) console.log('[AuthScreen] Google Sign-In was cancelled.');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050506', overflow: 'hidden' }}>
      {/* Large Ambient Gradients */}
      <View style={{
        position: 'absolute', top: -150, right: -150, width: 450, height: 450, borderRadius: 225,
        backgroundColor: '#005CA9', opacity: 0.1,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />
      <View style={{
        position: 'absolute', bottom: -150, left: -150, width: 450, height: 450, borderRadius: 225,
        backgroundColor: '#D4AF37', opacity: 0.1,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        
        {/* ── WELCOME MODE ── */}
        {viewMode === 'welcome' && (
          <View style={[
            {
              backgroundColor: 'rgba(12, 12, 14, 0.75)',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 28,
              padding: 32,
              width: '100%',
              maxWidth: 400,
              alignItems: 'center',
              // @ts-ignore
              backdropFilter: 'blur(30px)',
            },
            shadow('0px 20px 40px rgba(0, 0, 0, 0.45)', {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.08,
              shadowRadius: 32,
              elevation: 12,
            })
          ]}>
            {/* Logo */}
            <View style={{ marginBottom: 20 }}>
              <BrandLogo style={{ transform: [{ scale: 1.25 }] }} />
            </View>

            <Text style={{
              color: '#D4AF37',
              fontSize: 22,
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: 4,
              textAlign: 'center',
              marginBottom: 4,
              textShadowColor: 'rgba(255, 211, 0, 0.2)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            }}>
              NEOTUNES
            </Text>
            
            <Text style={{
              color: 'rgba(255, 255, 255, 0.35)',
              fontWeight: '800',
              textTransform: 'uppercase',
              fontSize: 9.5,
              letterSpacing: 2,
              marginBottom: 32,
              textAlign: 'center',
            }}>
              The Future of Sound System
            </Text>

            {/* Pulsing Visual Waveform */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 60, marginBottom: 40 }}>
              {[12, 28, 48, 32, 54, 38, 20, 44, 24, 10].map((h, i) => (
                <View
                  key={i}
                  style={{
                    width: 3.5,
                    height: h,
                    borderRadius: 2,
                    backgroundColor: i % 2 === 0 ? '#D4AF37' : '#005CA9',
                  }}
                />
              ))}
            </View>

            {/* Tagline */}
            <Text style={{
              color: '#FFF',
              fontSize: 18,
              fontWeight: '900',
              textAlign: 'center',
              lineHeight: 24,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 12,
            }}>
              Recode Your Listening
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              textAlign: 'center',
              lineHeight: 18,
              paddingHorizontal: 8,
              marginBottom: 40,
            }}>
              Immerse yourself in dynamic Dolby spatial sound profiles, 10-band peak equalizers, and collaborative friend Jams.
            </Text>

            {/* Action Get Started Button */}
            <TouchableOpacity
              onPress={() => setViewMode('auth')}
              activeOpacity={0.88}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#D4AF37',
                  borderRadius: 16,
                  height: 56,
                  width: '100%',
                  gap: 10,
                },
                shadow('0px 10px 24px rgba(212, 175, 55, 0.25)', {
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 5,
                })
              ]}
            >
              <Text style={{ color: '#0A0A0B', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                GET STARTED
              </Text>
              <ArrowRight size={16} color="#0A0A0B" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── AUTHENTICATION MODE ── */}
        {viewMode === 'auth' && (
          <View style={[
            {
              backgroundColor: 'rgba(12, 12, 14, 0.75)',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 28,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              // @ts-ignore
              backdropFilter: 'blur(30px)',
            },
            shadow('0px 20px 40px rgba(0, 0, 0, 0.45)', {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.08,
              shadowRadius: 32,
              elevation: 12,
            })
          ]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setViewMode('welcome')}
                style={{
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)'
                }}
              >
                <ArrowLeft size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <BrandLogo style={{ transform: [{ scale: 0.85 }] }} />
              <View style={{ width: 32 }} />
            </View>

            <Text style={{
              color: '#FFF',
              fontSize: 20,
              fontWeight: '900',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11.5,
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: 24,
            }}>
              {isSignUp ? 'Sign up to recode your listening environment' : 'Log in to access your sound preferences'}
            </Text>

            {/* Error Message */}
            {error !== '' && (
              <View style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.2)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}>
                <Text style={{ color: '#FF8A8A', fontWeight: '700', fontSize: 11, textAlign: 'center', lineHeight: 15 }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Credentials Fields */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              {isSignUp && (
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      borderWidth: 1.2,
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      paddingLeft: 42,
                      paddingRight: 16,
                      paddingVertical: 12,
                      color: '#FFF',
                      fontWeight: '600',
                      fontSize: 13.5,
                    }}
                    placeholder="DISPLAY NAME"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    value={displayNameInput}
                    onChangeText={setDisplayNameInput}
                    autoCapitalize="words"
                  />
                  <View style={{ position: 'absolute', left: 14, top: 12 }}>
                    <Users size={16} color="rgba(255,255,255,0.35)" />
                  </View>
                </View>
              )}

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderWidth: 1.2,
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    paddingLeft: 42,
                    paddingRight: 16,
                    paddingVertical: 12,
                    color: '#FFF',
                    fontWeight: '600',
                    fontSize: 13.5,
                  }}
                  placeholder="EMAIL ADDRESS"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={{ position: 'absolute', left: 14, top: 12 }}>
                  <Mail size={16} color="rgba(255,255,255,0.35)" />
                </View>
              </View>

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderWidth: 1.2,
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    paddingLeft: 42,
                    paddingRight: 46,
                    paddingVertical: 12,
                    color: '#FFF',
                    fontWeight: '600',
                    fontSize: 13.5,
                  }}
                  placeholder="SECRET PASSWORD"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <View style={{ position: 'absolute', left: 14, top: 12 }}>
                  <Lock size={16} color="rgba(255,255,255,0.35)" />
                </View>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: 12 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="rgba(255,255,255,0.35)" />
                  ) : (
                    <Eye size={16} color="rgba(255,255,255,0.35)" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Submit Button */}
            {loading ? (
              <ActivityIndicator size="large" color="#D4AF37" style={{ marginVertical: 12 }} />
            ) : (
              <TouchableOpacity
                onPress={handleEmailAuth}
                activeOpacity={0.85}
                style={[
                  {
                    backgroundColor: '#FFF',
                    borderRadius: 14,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  },
                  shadow('0px 4px 12px rgba(255,255,255,0.1)')
                ]}
              >
                <Text style={{ color: '#050506', fontWeight: '900', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isSignUp ? 'SIGN UP NOW' : 'SECURE SIGN IN'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Mode Switcher */}
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={{ alignSelf: 'center', marginBottom: 24 }}
            >
              <Text style={{ color: '#D4AF37', fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                OR CONNECT WITH
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>

            {/* Social / Native Authentication Tiers */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                activeOpacity={0.88}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1.2,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  height: 48,
                }}
              >
                <GoogleIcon />
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 10 }}>
                  Google Sandbox
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleBiometricMockLogin}
                activeOpacity={0.88}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(212, 175, 55, 0.04)',
                  borderWidth: 1.2,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                  borderRadius: 14,
                  height: 48,
                }}
              >
                <Fingerprint size={16} color="#D4AF37" style={{ marginRight: 8 }} />
                <Text style={{ color: '#D4AF37', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Biometric Login
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{
              color: 'rgba(255, 255, 255, 0.2)',
              fontSize: 8,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              textAlign: 'center',
              marginTop: 24,
            }}>
              By continuing you agree to the terms of service
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
