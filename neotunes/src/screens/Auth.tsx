import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import BrandLogo from '../components/BrandLogo';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>

        <View className="items-center mb-10">
          <BrandLogo style={{ width: 280, height: 180 }} />
        </View>

        <Text className="text-electricBlue text-xl font-bold mb-3">
          Streaming, Recoded.
        </Text>
        <Text className="text-white/40 font-bold uppercase tracking-widest text-xs mb-14">
          Sign in to access your music universe
        </Text>

        {/* Error Message */}
        {error !== '' && (
          <View className="bg-red-600 border-4 border-white p-4 mb-6 shadow-[4px_4px_0px_rgba(255,255,255,1)]">
            <Text className="text-white font-bold text-sm">{error}</Text>
          </View>
        )}

        {/* Google Sign In Button */}
        {loading ? (
          <View className="h-20 items-center justify-center">
            <ActivityIndicator size="large" color="#00FF85" />
            <Text className="text-white/60 font-bold uppercase tracking-widest text-xs mt-3">
              Connecting to Google...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            className="flex-row items-center justify-center bg-white border-4 border-deepBlack h-20 shadow-[6px_6px_0px_rgba(0,255,133,1)]"
          >
            {/* Google "G" logo built with pure blocks */}
            <View className="w-10 h-10 mr-4 items-center justify-center">
              <View className="w-10 h-10 rounded-full border-4 border-deepBlack overflow-hidden bg-white items-center justify-center">
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#4285F4', fontFamily: 'serif' }}>G</Text>
              </View>
            </View>
            <Text className="text-deepBlack font-black text-xl uppercase tracking-widest">
              Continue with Google
            </Text>
          </TouchableOpacity>
        )}

        {/* Terms footnote */}
        <Text className="text-white/30 font-bold text-center text-xs uppercase tracking-wider mt-10">
          By continuing you agree to our terms of service
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
