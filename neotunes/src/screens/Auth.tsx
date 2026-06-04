import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import BrandLogo from '../components/BrandLogo';
import { shadow } from '../lib/shadow';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // Build a redirect URI that works for both web and native
      const redirectTo = Platform.OS === 'web'
        ? window.location.origin
        : makeRedirectUri({ scheme: 'neotunes', path: 'auth/callback' });

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
      // On web: Supabase redirects to Google → back to app → onAuthStateChange fires
      // On native: handled by deep link + supabase session
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A', overflow: 'hidden' }}>
      {/* Dynamic Visual Spheres in Background */}
      <View style={{
        position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150,
        backgroundColor: '#7B61FF', opacity: 0.15,
        // @ts-ignore
        filter: 'blur(80px)'
      }} />
      <View style={{
        position: 'absolute', bottom: -50, left: -100, width: 250, height: 250, borderRadius: 125,
        backgroundColor: '#00FF85', opacity: 0.12,
        // @ts-ignore
        filter: 'blur(70px)'
      }} />
      <View style={{
        position: 'absolute', top: '40%', left: '30%', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#00D4FF', opacity: 0.08,
        // @ts-ignore
        filter: 'blur(60px)'
      }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>

        <View style={[
          {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            padding: 28,
            // @ts-ignore - Web-only glassmorphism blur
            backdropFilter: 'blur(20px)',
          },
          shadow('0px 12px 24px rgba(0, 0, 0, 0.3)', {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 10,
          })
        ]}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <BrandLogo style={{ width: 260, height: 80 }} />
          </View>

          <Text style={{
            color: '#00D4FF',
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 8,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            Streaming, Recoded.
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.4)',
            fontWeight: '700',
            textTransform: 'uppercase',
            fontSize: 11,
            letterSpacing: 1.2,
            marginBottom: 40,
            textAlign: 'center',
          }}>
            Sign in to access your music universe
          </Text>

          {/* Error Message */}
          {error !== '' && (
            <View style={[
              {
                backgroundColor: 'rgba(239,68,68,0.15)',
                borderWidth: 1.5,
                borderColor: '#EF4444',
                borderRadius: 16,
                padding: 14,
                marginBottom: 20
              },
              shadow('0px 4px 12px rgba(239,68,68,0.1)')
            ]}>
              <Text style={{ color: '#FF9D9D', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{error}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          {loading ? (
            <View style={{ paddingVertical: 10, alignItems: 'stretch' }}>
              <ActivityIndicator size="large" color="#00FF85" style={{ marginBottom: 16 }} />
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1.2,
                borderColor: 'rgba(0,255,133,0.3)',
                alignSelf: 'stretch',
              }}>
                <Text style={{ color: '#00FF85', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 4 }}>
                  $ neotunes --init --agent-mode
                </Text>
                <Text style={{ color: '#00D4FF', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 4 }}>
                  &gt; CONNECTING SECURE NEURAL HANDSHAKE... OK
                </Text>
                <Text style={{ color: '#7B61FF', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 4 }}>
                  &gt; SYNCHRONIZING SUPABASE PLAYLIST DATABASES... OK
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                  &gt; REDIRECTING USER INTEGRATION PORTAL...
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  height: 60,
                  width: '100%'
                },
                shadow('0px 8px 24px rgba(255,255,255,0.15)', {
                  shadowColor: '#FFF',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4
                })
              ]}
            >
              {/* Google logo */}
              <View style={{ width: 30, height: 30, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{
                  width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB',
                  overflow: 'hidden', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#4285F4', fontFamily: 'serif' }}>G</Text>
                </View>
              </View>
              <Text style={{ color: '#0A0A0A', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Continue with Google
              </Text>
            </TouchableOpacity>
          )}

          {/* Terms footnote */}
          <Text style={{
            color: 'rgba(255,255,255,0.3)',
            fontWeight: '700',
            textTransform: 'uppercase',
            fontSize: 9,
            letterSpacing: 1,
            textAlign: 'center',
            marginTop: 40
          }}>
            By continuing you agree to our terms of service
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
