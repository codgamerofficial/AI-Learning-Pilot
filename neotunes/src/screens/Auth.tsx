import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert, TextInput, Dimensions
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import {
  Sparkles, Music, Users, Fingerprint, ShieldCheck, Mail, Lock,
  Eye, EyeOff, ArrowRight, ArrowLeft, Headphones, Volume2
} from 'lucide-react-native';
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

  // Welcome page carousel states
  const [activeSlide, setActiveSlide] = useState(0);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const welcomeSlides = [
    {
      title: 'Studio Acoustics',
      description: 'Experience professional 10-band equalization, spatial 3D surround sound, and sound curves custom-tuned for legendary headsets.',
      icon: Music,
      color: '#D4AF37', // Gold
      element: (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 60, marginTop: 10 }}>
          {[30, 50, 75, 45, 80, 60, 35, 55, 40, 20].map((h, i) => (
            <View
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 2,
                backgroundColor: i % 2 === 0 ? '#D4AF37' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </View>
      )
    },
    {
      title: 'Seamless Playback',
      description: 'Spotify-grade background playback system that streams smoothly when minimized, locked, or during system interruptions.',
      icon: ShieldCheck,
      color: '#00D4FF', // Electric Blue
      element: (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: 'rgba(0, 212, 255, 0.25)',
          borderRadius: 16,
          paddingVertical: 10,
          paddingHorizontal: 16,
          gap: 12,
          marginTop: 10,
          width: '80%',
        }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#00D4FF', alignItems: 'center', justifyContent: 'center' }}>
            <Volume2 color="#050506" size={18} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={{ width: 80, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />
            <View style={{ width: 50, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 6 }} />
          </View>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D4FF' }} />
          </View>
        </View>
      )
    },
    {
      title: 'Headset Intelligence',
      description: 'Automatically profiles your Bluetooth earphones, calibrating optimal active noise cancelling (ANC) and custom sound signatures.',
      icon: Headphones,
      color: '#7B61FF', // Aurora Purple
      element: (
        <View style={{
          backgroundColor: 'rgba(123, 97, 255, 0.08)',
          borderWidth: 1,
          borderColor: 'rgba(123, 97, 255, 0.25)',
          borderRadius: 18,
          paddingVertical: 8,
          paddingHorizontal: 16,
          alignItems: 'center',
          marginTop: 10,
          flexDirection: 'row',
          gap: 8,
        }}>
          <Headphones color="#7B61FF" size={18} />
          <Text style={{ color: '#E2E8F0', fontWeight: '800', fontSize: 10.5, letterSpacing: 0.5 }}>
            SONY WH-1000XM5: LDAC ACTIVE
          </Text>
        </View>
      )
    }
  ];

  // Auto-scroll welcome slides
  useEffect(() => {
    if (viewMode === 'welcome') {
      slideTimerRef.current = setInterval(() => {
        setActiveSlide((prev) => (prev + 1) % welcomeSlides.length);
      }, 5000);
    }
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [viewMode]);

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
        const { error: signUpError } = await supabase.auth.signUp({
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

      if (Platform.OS === 'web') {
        // On web, biometric auth is a mock — guide user to sign in manually
        setLoading(false);
        setViewMode('auth');
        setError('');
        Alert.alert(
          '🔐 Biometric Login',
          'Biometric authentication is available on the NeoTunes Android/iOS app. Please use email & password to sign in on web.'
        );
        return;
      }

      if (supported) {
        const success = await Biometrics.authenticate('Log in to NeoTunes Premium');
        if (!success) {
          setError('Biometric authentication was not successful. Try again or use email sign-in.');
        }
        // On native, biometric unlock is for app lock — actual auth still needs email/password
        // So redirect to the auth form
        setViewMode('auth');
      } else {
        Alert.alert(
          'Biometrics Unavailable',
          'Your device does not support biometric authentication. Please use email & password to sign in.'
        );
        setViewMode('auth');
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

  const currentSlide = welcomeSlides[activeSlide];
  const SlideIcon = currentSlide.icon;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050506', overflow: 'hidden' }}>
      {/* Dynamic Glowing Background Orbs */}
      <View style={{
        position: 'absolute', top: -180, right: -120, width: 400, height: 400, borderRadius: 200,
        backgroundColor: viewMode === 'welcome' ? currentSlide.color : '#D4AF37', opacity: 0.08,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />
      <View style={{
        position: 'absolute', bottom: -180, left: -120, width: 400, height: 400, borderRadius: 200,
        backgroundColor: '#005CA9', opacity: 0.08,
        // @ts-ignore
        filter: 'blur(100px)'
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        
        {/* ── REDESIGNED WELCOME / ONBOARDING SCREEN ── */}
        {viewMode === 'welcome' && (
          <View style={[
            {
              backgroundColor: 'rgba(12, 12, 14, 0.72)',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 32,
              padding: 28,
              width: '100%',
              maxWidth: 420,
              alignItems: 'center',
              // @ts-ignore
              backdropFilter: 'blur(30px)',
            },
            shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', {
              shadowColor: currentSlide.color,
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.12,
              shadowRadius: 36,
              elevation: 16,
            })
          ]}>
            {/* Header branding */}
            <View style={{ marginBottom: 12, alignItems: 'center' }}>
              <BrandLogo style={{ transform: [{ scale: 1.2 }] }} />
            </View>

            <Text style={{
              color: '#D4AF37',
              fontSize: 24,
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: 6,
              textAlign: 'center',
              marginBottom: 4,
              textShadowColor: 'rgba(255, 211, 0, 0.25)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}>
              NEOTUNES
            </Text>
            
            <Text style={{
              color: 'rgba(255, 255, 255, 0.45)',
              fontWeight: '800',
              textTransform: 'uppercase',
              fontSize: 10,
              letterSpacing: 3,
              marginBottom: 28,
              textAlign: 'center',
            }}>
              Professional Music Ecosystem
            </Text>

            {/* Slider Content Wrapper */}
            <View style={{
              width: '100%',
              height: 230,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              marginBottom: 20,
            }}>
              {/* Dynamic Icon */}
              <View style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: `${currentSlide.color}15`,
                borderWidth: 1.5,
                borderColor: `${currentSlide.color}35`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <SlideIcon color={currentSlide.color} size={28} />
              </View>

              {/* Title & Description */}
              <Text style={{
                color: '#FFF',
                fontSize: 19,
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                textAlign: 'center',
                marginBottom: 10,
              }}>
                {currentSlide.title}
              </Text>

              <Text style={{
                color: 'rgba(255, 255, 255, 0.55)',
                fontSize: 12.5,
                fontWeight: '500',
                textAlign: 'center',
                lineHeight: 18.5,
                height: 56,
              }}>
                {currentSlide.description}
              </Text>

              {/* Custom Interactive Elements */}
              <View style={{ height: 60, justifyContent: 'center', width: '100%', alignItems: 'center', marginTop: 12 }}>
                {currentSlide.element}
              </View>
            </View>

            {/* Pagination Indicators */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 36 }}>
              {welcomeSlides.map((_, index) => {
                const isActive = index === activeSlide;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
                      setActiveSlide(index);
                    }}
                    style={{
                      width: isActive ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isActive ? currentSlide.color : 'rgba(255, 255, 255, 0.15)',
                    }}
                  />
                );
              })}
            </View>

            {/* Bottom Actions */}
            <TouchableOpacity
              onPress={() => setViewMode('auth')}
              activeOpacity={0.88}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#D4AF37',
                  borderRadius: 18,
                  height: 54,
                  width: '100%',
                  gap: 10,
                  marginBottom: 12,
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
                Get Started
              </Text>
              <ArrowRight size={16} color="#0A0A0B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBiometricMockLogin}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                width: '100%',
                gap: 8,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Fingerprint size={16} color="rgba(255, 255, 255, 0.45)" />
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontWeight: '800', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Biometric App Unlock
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── REDESIGNED AUTHENTICATION SCREEN ── */}
        {viewMode === 'auth' && (
          <View style={[
            {
              backgroundColor: 'rgba(12, 12, 14, 0.75)',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 32,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              // @ts-ignore
              backdropFilter: 'blur(30px)',
            },
            shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.1,
              shadowRadius: 36,
              elevation: 16,
            })
          ]}>
            {/* Navigation Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
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

            {/* Switch Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 16,
              padding: 4,
              borderWidth: 1.2,
              borderColor: 'rgba(255,255,255,0.05)',
              marginBottom: 24,
            }}>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(false);
                  setError('');
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 12,
                  backgroundColor: !isSignUp ? 'rgba(212,175,55,0.12)' : 'transparent',
                  borderWidth: 1,
                  borderColor: !isSignUp ? '#D4AF37' : 'transparent',
                }}
              >
                <Text style={{ color: !isSignUp ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(true);
                  setError('');
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 12,
                  backgroundColor: isSignUp ? 'rgba(212,175,55,0.12)' : 'transparent',
                  borderWidth: 1,
                  borderColor: isSignUp ? '#D4AF37' : 'transparent',
                }}
              >
                <Text style={{ color: isSignUp ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Box */}
            {error !== '' && (
              <View style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 1.2,
                borderColor: 'rgba(239, 68, 68, 0.25)',
                borderRadius: 14,
                padding: 12,
                marginBottom: 18,
              }}>
                <Text style={{ color: '#FF8A8A', fontWeight: '700', fontSize: 11.5, textAlign: 'center', lineHeight: 16 }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={{ gap: 14, marginBottom: 24 }}>
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
                  <View style={{ position: 'absolute', left: 14, top: 13 }}>
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
                <View style={{ position: 'absolute', left: 14, top: 13 }}>
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
                <View style={{ position: 'absolute', left: 14, top: 13 }}>
                  <Lock size={16} color="rgba(255,255,255,0.35)" />
                </View>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: 13 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="rgba(255,255,255,0.35)" />
                  ) : (
                    <Eye size={16} color="rgba(255,255,255,0.35)" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Actions */}
            {loading ? (
              <ActivityIndicator size="large" color="#D4AF37" style={{ marginVertical: 12 }} />
            ) : (
              <TouchableOpacity
                onPress={handleEmailAuth}
                activeOpacity={0.85}
                style={[
                  {
                    backgroundColor: '#FFF',
                    borderRadius: 16,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  },
                  shadow('0px 4px 12px rgba(255,255,255,0.1)')
                ]}
              >
                <Text style={{ color: '#050506', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isSignUp ? 'REGISTER ACCOUNT' : 'SECURE SIGN IN'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                OR CONNECT WITH
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>

            {/* Social / Biometric Login Tiers */}
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
                  borderColor: 'rgba(212, 175, 55, 0.25)',
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

            {/* Back to Slides Link */}
            <TouchableOpacity
              onPress={() => setViewMode('welcome')}
              style={{ alignSelf: 'center', marginTop: 24 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Back to Features
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
