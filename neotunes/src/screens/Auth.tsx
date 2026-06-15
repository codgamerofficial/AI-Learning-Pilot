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
  const [viewMode, setViewMode] = useState<'welcome' | 'interests' | 'moods' | 'auth' | 'ai_profile'>('welcome');
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

  // Onboarding Selection States
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiStep, setAiStep] = useState(0);

  const musicInterests = [
    { label: 'Bollywood', icon: '🎬' },
    { label: 'Punjabi Pop', icon: '🎤' },
    { label: 'Lo-Fi Chill', icon: '🌙' },
    { label: 'Hip Hop', icon: '🎧' },
    { label: 'Electronic', icon: '⚡' },
    { label: 'Indie Rock', icon: '🎸' },
    { label: 'J-Pop & Anime', icon: '🌸' },
    { label: 'Classical', icon: '🎻' },
    { label: 'Jazz & Blues', icon: '🎷' }
  ];

  const moodStations = [
    { label: 'Study Session', icon: '📚' },
    { label: 'Late Night Code', icon: '💻' },
    { label: 'Gym Energy', icon: '🔥' },
    { label: 'Rainy Day Chill', icon: '🌧️' },
    { label: 'Happy Hits', icon: '☀️' },
    { label: 'Deep Focus', icon: '🧘' }
  ];

  const welcomeSlides = [
    {
      title: 'Studio Acoustics',
      description: 'Experience professional 10-band equalization, spatial 3D surround sound, and sound curves custom-tuned for legendary headsets.',
      icon: Music,
      color: '#7C3AED',
      element: (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 60, marginTop: 10 }}>
          {[30, 50, 75, 45, 80, 60, 35, 55, 40, 20].map((h, i) => (
            <View
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 2,
                backgroundColor: i % 2 === 0 ? '#7C3AED' : 'rgba(255,255,255,0.25)',
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
      color: '#00D4FF',
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
            <Volume2 color="#09090B" size={18} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={{ width: 80, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />
            <View style={{ width: 50, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 6 }} />
          </View>
        </View>
      )
    },
    {
      title: 'Headset Intelligence',
      description: 'Automatically profiles your Bluetooth earphones, calibrating optimal active noise cancelling (ANC) and custom sound signatures.',
      icon: Headphones,
      color: '#7C3AED',
      element: (
        <View style={{
          backgroundColor: 'rgba(124, 58, 237, 0.08)',
          borderWidth: 1,
          borderColor: 'rgba(124, 58, 237, 0.25)',
          borderRadius: 18,
          paddingVertical: 8,
          paddingHorizontal: 16,
          alignItems: 'center',
          marginTop: 10,
          flexDirection: 'row',
          gap: 8,
        }}>
          <Headphones color="#7C3AED" size={18} />
          <Text style={{ color: '#E2E8F0', fontWeight: '800', fontSize: 10.5, letterSpacing: 0.5 }}>
            SONY WH-1000XM5: LDAC ACTIVE
          </Text>
        </View>
      )
    }
  ];

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

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  };

  const toggleMood = (label: string) => {
    setSelectedMoods(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  };

  const handleAuthWithProfiling = async () => {
    const email = emailInput.trim();
    const password = passwordInput;
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setViewMode('ai_profile');
    setAiStep(0);
    setAiLogs(['Initializing profiling engine...']);

    const steps = [
      'Analyzing musical interests: ' + (selectedInterests.length > 0 ? selectedInterests.join(', ') : 'Global Mix'),
      'Mapping mood stations: ' + (selectedMoods.length > 0 ? selectedMoods.join(', ') : 'Standard vibes'),
      'Tuning custom 10-band Equalizer coefficients...',
      'Securing credentials with Supabase Auth...',
      'Generating custom NeoMix AI Radio station...',
      'Acoustic profiling complete!'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setAiStep(i + 1);
      setAiLogs(prev => [...prev, steps[i]]);
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayNameInput.trim() || email.split('@')[0],
              interests: selectedInterests,
              moods: selectedMoods
            }
          }
        });
        if (signUpError) {
          setError(signUpError.message);
          setViewMode('auth');
        } else {
          Alert.alert('Welcome to NeoTunes! 🎵', 'Your account has been created.');
          setIsSignUp(false);
          setPasswordInput('');
          setViewMode('auth');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setViewMode('auth');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed.');
      setViewMode('auth');
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
        setLoading(false);
        setViewMode('auth');
        Alert.alert('🔐 Biometric Login', 'Available on Android/iOS app only.');
        return;
      }

      if (supported) {
        const success = await Biometrics.authenticate('Log in to NeoTunes Premium');
        if (!success) {
          setError('Biometric authentication failed.');
        } else {
          setViewMode('ai_profile');
          setAiStep(0);
          setAiLogs(['Bypassing email authentication via biometrics...', 'Loading user profile...', 'Acoustic profiling complete!']);
          await new Promise(res => setTimeout(res, 1500));
          setViewMode('auth');
        }
      } else {
        Alert.alert('Biometrics Unavailable', 'Use email & password.');
        setViewMode('auth');
      }
    } catch (e: any) {
      setError(e.message || 'Biometric authentication failed.');
      setViewMode('auth');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      const redirectTo = Platform.OS === 'web' ? window.location.origin : makeRedirectUri(isExpoGo ? { path: 'auth/callback' } : { scheme: 'neotunes', path: 'auth/callback' });
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' }
      });
      if (oauthError) {
        setError(oauthError.message);
        return;
      }
      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const params = parseParamsFromUrl(result.url);
          if (params.access_token) await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token! });
        }
      }
    } catch (e: any) {
      setError(e.message || 'Google Auth Failed');
    } finally {
      setLoading(false);
    }
  };

  const currentSlide = welcomeSlides[activeSlide];
  const SlideIcon = currentSlide.icon;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090B', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: -180, right: -120, width: 400, height: 400, borderRadius: 200, backgroundColor: viewMode === 'welcome' ? currentSlide.color : '#7C3AED', opacity: 0.08, filter: 'blur(100px)' }} />
      <View style={{ position: 'absolute', bottom: -180, left: -120, width: 400, height: 400, borderRadius: 200, backgroundColor: '#00D4FF', opacity: 0.08, filter: 'blur(100px)' }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        
        {viewMode === 'welcome' && (
          <View style={[ { backgroundColor: 'rgba(18, 18, 23, 0.72)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 32, padding: 28, width: '100%', maxWidth: 420, alignItems: 'center', backdropFilter: 'blur(30px)' }, shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', { shadowColor: currentSlide.color, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 16 }) ]}>
            <View style={{ marginBottom: 12, alignItems: 'center' }}><BrandLogo style={{ transform: [{ scale: 1.2 }] }} /></View>
            <Text style={{ color: '#7C3AED', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 6, textAlign: 'center', marginBottom: 4 }}>NEOTUNES</Text>
            <Text style={{ color: '#FFC857', fontWeight: '800', textTransform: 'uppercase', fontSize: 10, letterSpacing: 3, marginBottom: 28, textAlign: 'center' }}>Feel Every Beat</Text>

            <View style={{ width: '100%', height: 230, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginBottom: 20 }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: `${currentSlide.color}15`, borderWidth: 1.5, borderColor: `${currentSlide.color}35`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <SlideIcon color={currentSlide.color} size={28} />
              </View>
              <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 10 }}>{currentSlide.title}</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 12.5, fontWeight: '500', textAlign: 'center', lineHeight: 18.5, height: 56 }}>{currentSlide.description}</Text>
              <View style={{ height: 60, justifyContent: 'center', width: '100%', alignItems: 'center', marginTop: 12 }}>{currentSlide.element}</View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 36 }}>
              {welcomeSlides.map((_, index) => (
                <TouchableOpacity key={index} onPress={() => setActiveSlide(index)} style={{ width: index === activeSlide ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: index === activeSlide ? currentSlide.color : 'rgba(255, 255, 255, 0.15)' }} />
              ))}
            </View>

            <TouchableOpacity onPress={() => setViewMode('interests')} activeOpacity={0.88} style={[ { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', borderRadius: 18, height: 54, width: '100%', gap: 10, marginBottom: 12 }, shadow('0px 10px 24px rgba(124, 58, 237, 0.25)', { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }) ]}>
              <Text style={{ color: '#09090B', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5 }}>Get Started</Text>
              <ArrowRight size={16} color="#09090B" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsSignUp(false); setViewMode('auth'); }} style={{ height: 44, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontWeight: '800', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>I Already Have An Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'interests' && (
          <View style={[ { backgroundColor: 'rgba(18, 18, 23, 0.72)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 32, padding: 24, width: '100%', maxWidth: 420, alignItems: 'stretch', backdropFilter: 'blur(30px)' }, shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.1, shadowRadius: 36, elevation: 16 }) ]}>
            <Text style={{ color: '#7C3AED', fontWeight: '900', fontSize: 11, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Step 1 of 3</Text>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 6 }}>Choose Music Interests</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12.5, fontWeight: '600', marginBottom: 24 }}>Select genres to personalize your feed.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {musicInterests.map((interest) => (
                <TouchableOpacity key={interest.label} onPress={() => toggleInterest(interest.label)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selectedInterests.includes(interest.label) ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: selectedInterests.includes(interest.label) ? '#7C3AED' : 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{interest.icon}</Text>
                  <Text style={{ color: selectedInterests.includes(interest.label) ? '#FFF' : 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12 }}>{interest.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setViewMode('welcome')} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setViewMode('moods')} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#09090B', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {viewMode === 'moods' && (
          <View style={[ { backgroundColor: 'rgba(18, 18, 23, 0.72)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 32, padding: 24, width: '100%', maxWidth: 420, alignItems: 'stretch', backdropFilter: 'blur(30px)' }, shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.1, shadowRadius: 36, elevation: 16 }) ]}>
            <Text style={{ color: '#7C3AED', fontWeight: '900', fontSize: 11, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Step 2 of 3</Text>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 6 }}>Choose Your Moods</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12.5, fontWeight: '600', marginBottom: 24 }}>What vibes do you listen to most?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {moodStations.map((mood) => (
                <TouchableOpacity key={mood.label} onPress={() => toggleMood(mood.label)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selectedMoods.includes(mood.label) ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: selectedMoods.includes(mood.label) ? '#00D4FF' : 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{mood.icon}</Text>
                  <Text style={{ color: selectedMoods.includes(mood.label) ? '#FFF' : 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12 }}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setViewMode('interests')} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsSignUp(true); setViewMode('auth'); }} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#09090B', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {viewMode === 'auth' && (
          <View style={[ { backgroundColor: 'rgba(18, 18, 23, 0.75)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 32, padding: 24, width: '100%', maxWidth: 420, backdropFilter: 'blur(30px)' }, shadow('0px 24px 48px rgba(0, 0, 0, 0.55)', { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.1, shadowRadius: 36, elevation: 16 }) ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setViewMode(isSignUp ? 'moods' : 'welcome')} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}><ArrowLeft size={16} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
              <BrandLogo style={{ transform: [{ scale: 0.85 }] }} />
              <View style={{ width: 32 }} />
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 4, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 24 }}>
              <TouchableOpacity onPress={() => { setIsSignUp(false); setError(''); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: !isSignUp ? 'rgba(124, 58, 237, 0.12)' : 'transparent', borderWidth: 1, borderColor: !isSignUp ? '#7C3AED' : 'transparent' }}><Text style={{ color: !isSignUp ? '#7C3AED' : 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sign In</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsSignUp(true); setError(''); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: isSignUp ? 'rgba(124, 58, 237, 0.12)' : 'transparent', borderWidth: 1, borderColor: isSignUp ? '#7C3AED' : 'transparent' }}><Text style={{ color: isSignUp ? '#7C3AED' : 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sign Up</Text></TouchableOpacity>
            </View>

            {error !== '' && <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1.2, borderColor: 'rgba(239, 68, 68, 0.25)', borderRadius: 14, padding: 12, marginBottom: 18 }}><Text style={{ color: '#FF8A8A', fontWeight: '700', fontSize: 11.5, textAlign: 'center' }}>{error}</Text></View>}

            <View style={{ gap: 14, marginBottom: 24 }}>
              {isSignUp && <View style={{ position: 'relative' }}><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingLeft: 42, paddingRight: 16, paddingVertical: 12, color: '#FFF' }} placeholder="DISPLAY NAME" placeholderTextColor="rgba(255,255,255,0.28)" value={displayNameInput} onChangeText={setDisplayNameInput} autoCapitalize="words" /><View style={{ position: 'absolute', left: 14, top: 13 }}><Users size={16} color="rgba(255,255,255,0.35)" /></View></View>}
              <View style={{ position: 'relative' }}><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingLeft: 42, paddingRight: 16, paddingVertical: 12, color: '#FFF' }} placeholder="EMAIL ADDRESS" placeholderTextColor="rgba(255,255,255,0.28)" value={emailInput} onChangeText={setEmailInput} keyboardType="email-address" autoCapitalize="none" /><View style={{ position: 'absolute', left: 14, top: 13 }}><Mail size={16} color="rgba(255,255,255,0.35)" /></View></View>
              <View style={{ position: 'relative' }}><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingLeft: 42, paddingRight: 46, paddingVertical: 12, color: '#FFF' }} placeholder="SECRET PASSWORD" placeholderTextColor="rgba(255,255,255,0.28)" value={passwordInput} onChangeText={setPasswordInput} secureTextEntry={!showPassword} autoCapitalize="none" /><View style={{ position: 'absolute', left: 14, top: 13 }}><Lock size={16} color="rgba(255,255,255,0.35)" /></View><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: 13 }}><Eye size={16} color="rgba(255,255,255,0.35)" /></TouchableOpacity></View>
            </View>

            {loading ? <ActivityIndicator size="large" color="#7C3AED" style={{ marginVertical: 12 }} /> : <TouchableOpacity onPress={handleAuthWithProfiling} activeOpacity={0.85} style={[ { backgroundColor: '#FFF', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, shadow('0px 4px 12px rgba(255,255,255,0.1)') ]}><Text style={{ color: '#09090B', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>{isSignUp ? 'REGISTER ACCOUNT' : 'SECURE SIGN IN'}</Text></TouchableOpacity>}

            <View style={{ gap: 10 }}>
              <TouchableOpacity onPress={handleGoogleSignIn} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, height: 48 }}><GoogleIcon /><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 10 }}>Google Sandbox</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleBiometricMockLogin} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderWidth: 1.2, borderColor: 'rgba(124, 58, 237, 0.25)', borderRadius: 14, height: 48 }}><Fingerprint size={16} color="#7C3AED" style={{ marginRight: 8 }} /><Text style={{ color: '#7C3AED', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Biometric Login</Text></TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setViewMode('welcome')} style={{ alignSelf: 'center', marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Back to Features</Text></TouchableOpacity>
          </View>
        )}

        {viewMode === 'ai_profile' && (
          <View style={[ { backgroundColor: 'rgba(18, 18, 23, 0.85)', borderWidth: 1.5, borderColor: 'rgba(124, 58, 237, 0.15)', borderRadius: 32, padding: 32, width: '100%', maxWidth: 420, alignItems: 'center', backdropFilter: 'blur(40px)' }, shadow('0px 24px 48px rgba(124, 58, 237, 0.2)', { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.15, shadowRadius: 36, elevation: 16 }) ]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#00D4FF', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}><ActivityIndicator size="large" color="#7C3AED" /></View>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', marginBottom: 8 }}>GENERATE AI MUSIC PROFILE</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center', marginBottom: 24 }}>Tuning recommendations based on interest vectors</Text>
            <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', height: 150 }}>
              <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }}>
                {aiLogs.map((log, i) => (
                  <Text key={i} style={{ color: i === aiLogs.length - 1 ? '#00D4FF' : 'rgba(255,255,255,0.5)', fontSize: 10.5, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }), marginBottom: 8, fontWeight: i === aiLogs.length - 1 ? '700' : '500' }}>
                    {i === aiLogs.length - 1 && i < 5 ? '⚡ ' : '✓ '} {log}
                  </Text>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
