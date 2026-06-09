import React, { useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Platform, TextInput
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, Easing, FadeInDown, FadeInRight,
} from 'react-native-reanimated';
import { LogOut, Music, Clock, Trash2, RotateCcw, Sun, Moon, Shield, Palette, Headphones, Zap } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useRecentStore } from '../store/recentStore';
import { clearCache } from '../lib/cache';
import { resetMarketTelemetry } from '../lib/marketTelemetry';
import { shadow } from '../lib/shadow';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { usePlayerStore } from '../store/playerStore';

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { recentTracks, clearRecent, loadFromStorage } = useRecentStore();
  const { displayName, themeMode, setDisplayName, toggleTheme, loadPreferences } = usePreferencesStore();
  const [draftDisplayName, setDraftDisplayName] = useState('');

  useEffect(() => {
    loadPreferences();
    loadFromStorage();
  }, [loadPreferences, loadFromStorage]);

  useEffect(() => {
    setDraftDisplayName(displayName);
  }, [displayName]);

  const email = user?.email ?? 'Unknown';
  const profileLabel = displayName !== '' ? displayName : email.split('@')[0] ?? 'Listener';
  const initials = profileLabel.slice(0, 2).toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const palette = getThemePalette(themeMode);
  const isDark = themeMode === 'dark';
  const accentColor = palette.accent;

  // Avatar ring animation
  const ringAnim = useSharedValue(0);
  useEffect(() => {
    ringAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedRingStyle = useAnimatedStyle(() => ({
    borderColor: isDark
      ? `rgba(255, 211, 0, ${0.3 + ringAnim.value * 0.5})`
      : `rgba(249, 208, 15, ${0.3 + ringAnim.value * 0.5})`,
    transform: [{ scale: 1 + ringAnim.value * 0.03 }],
  }));

  // Compute listening stats
  const totalTracks = recentTracks.length;
  const uniqueArtists = new Set(recentTracks.map((t) => t.artist)).size;

  // Top genres mock from play data
  const genreMap: Record<string, number> = {};
  recentTracks.forEach((t) => {
    const genre = /(bollywood|hindi|indian)/i.test(`${t.title} ${t.artist}`) ? 'Bollywood'
      : /(pop|party)/i.test(`${t.title}`) ? 'Pop'
      : /(rock|metal)/i.test(`${t.title}`) ? 'Rock'
      : /(lofi|chill|study)/i.test(`${t.title}`) ? 'Lo-Fi'
      : /(electronic|edm|dance)/i.test(`${t.title}`) ? 'Electronic'
      : 'Other';
    genreMap[genre] = (genreMap[genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);
  const maxGenreCount = topGenres.length > 0 ? topGenres[0][1] : 1;

  const genreColors: Record<string, string> = {
    Bollywood: '#FF9933',
    Pop: '#FF4ECD',
    Rock: '#FF6B6B',
    'Lo-Fi': palette.accentStrong,
    Electronic: '#00D4FF',
    Other: '#6B7280',
  };

  const handleSaveProfile = () => {
    setDisplayName(draftDisplayName);
    Alert.alert('Profile Updated', draftDisplayName.trim() === ''
      ? 'Display name cleared. Using email handle instead.'
      : `Display name saved as ${draftDisplayName.trim()}.`
    );
  };

  const rawLabel = displayName !== '' ? displayName : (email.split('@')[0] ?? 'Listener');
  const isMsd = rawLabel.toLowerCase().includes('msd') ||
                rawLabel.toLowerCase().includes('dhoni') ||
                rawLabel.toLowerCase().includes('thala') ||
                rawLabel.toLowerCase().includes('csk') ||
                rawLabel.toLowerCase().includes('mahi') ||
                rawLabel.toLowerCase().includes('7');

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            usePlayerStore.setState({ currentTrack: null, isPlaying: false, queue: [] });
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will remove your recently played tracks.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearRecent() },
      ]
    );
  };

  const handleClearCache = async () => {
    await clearCache();
    Alert.alert('Cache Cleared', 'API cache has been reset.');
  };

  const handleResetTelemetry = () => {
    const runReset = async () => {
      await resetMarketTelemetry();
      if (Platform.OS === 'web') {
        if (typeof globalThis.alert === 'function') {
          globalThis.alert('Telemetry Reset\n\nLocal market analytics counters are now zeroed.');
        }
        return;
      }

      Alert.alert('Telemetry Reset', 'Local market analytics counters are now zeroed.');
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Reset Market Telemetry\n\nThis resets local CTR and retention proxy counters used for testing.')
        : true;

      if (confirmed) {
        void runReset();
      }
      return;
    }

    Alert.alert(
      'Reset Market Telemetry',
      'This resets local CTR and retention proxy counters used for testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void runReset();
          },
        },
      ]
    );
  };

  // Glass card wrapper helper
  const GlassCard = ({ children, style, delay = 0 }: { children: React.ReactNode; style?: any; delay?: number }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[
        {
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.75)',
          padding: 20,
          marginBottom: 16,
          // @ts-ignore
          backdropFilter: 'blur(24px) saturate(160%)',
        },
        shadow('0 4px 20px rgba(0,0,0,0.1)', {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }),
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  const ActionButton = ({ icon, label, onPress, color, delay = 0 }: {
    icon: React.ReactNode; label: string; onPress: () => void; color: string; delay?: number;
  }) => (
    <Animated.View entering={FadeInRight.delay(delay).springify()}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            backgroundColor: isDark ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
            padding: 16,
            marginBottom: 10,
            // @ts-ignore
            backdropFilter: 'blur(20px)',
          },
          shadow('0 2px 12px rgba(0,0,0,0.06)', {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }),
        ]}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: `${color}18`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
        <Text style={{
          color: palette.text,
          fontWeight: '700',
          fontSize: 14,
          marginLeft: 14,
          flex: 1,
          letterSpacing: 0.3,
        }}>
          {label}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 16 }}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={{
            color: palette.text,
            fontSize: 32,
            fontWeight: '800',
            letterSpacing: -0.5,
            marginBottom: 24,
          }}>
            Profile
          </Text>
        </Animated.View>

        {/* Avatar + User Info Card */}
        <GlassCard delay={100}>
          <View style={{ alignItems: 'center' }}>
            <Animated.View style={[
              {
                width: 88, height: 88, borderRadius: 44,
                borderWidth: 3,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              },
              animatedRingStyle,
            ]}>
              <View style={{
                width: 76, height: 76, borderRadius: 38,
                backgroundColor: accentColor,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#050505', fontSize: 28, fontWeight: '900' }}>{initials}</Text>
              </View>
              {isMsd && (
                <View style={{
                  position: 'absolute',
                  bottom: -8,
                  backgroundColor: '#FFD300',
                  borderWidth: 1.5,
                  borderColor: '#005CA9',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  zIndex: 2,
                }}>
                  <Text style={{ color: '#005CA9', fontWeight: '900', fontSize: 9 }}>NO. 7 🦁</Text>
                </View>
              )}
            </Animated.View>

            <Text style={{
              color: palette.text,
              fontWeight: '800',
              fontSize: 20,
              letterSpacing: 0.3,
            }} numberOfLines={1}>
              {profileLabel}
            </Text>
            <Text style={{
              color: palette.textSubtle,
              fontWeight: '600',
              fontSize: 12,
              marginTop: 4,
              opacity: 0.7,
            }} numberOfLines={1}>
              {email}
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}>
              <Shield stroke={palette.textMuted} size={12} />
              <Text style={{
                color: palette.textMuted,
                fontWeight: '600',
                fontSize: 10,
                marginLeft: 6,
                letterSpacing: 0.5,
              }}>
                Member since {joinedDate}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Display Name Editor */}
        <GlassCard delay={150}>
          <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Display Name
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                borderRadius: 14,
                color: palette.text,
                fontWeight: '700',
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
              }}
              placeholder="Enter display name"
              placeholderTextColor={palette.textMuted}
              value={draftDisplayName}
              onChangeText={setDraftDisplayName}
              returnKeyType="done"
              onSubmitEditing={handleSaveProfile}
            />
            <TouchableOpacity
              onPress={handleSaveProfile}
              activeOpacity={0.8}
              style={{
                backgroundColor: accentColor,
                borderRadius: 14,
                justifyContent: 'center',
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: '#0A0A0A', fontWeight: '800', fontSize: 13 }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Listening Stats */}
        <GlassCard delay={200}>
          <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
            Listening Stats
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { icon: <Headphones stroke={accentColor} size={20} />, value: String(totalTracks), label: 'Tracks Played', bg: accentColor },
              { icon: <Music stroke="#FF4ECD" size={20} />, value: String(uniqueArtists), label: 'Artists', bg: '#FF4ECD' },
              { icon: <Zap stroke="#FFD700" size={20} />, value: totalTracks > 0 ? `${Math.round((totalTracks / 20) * 100)}%` : '0%', label: 'History Full', bg: '#FFD700' },
            ].map((stat, i) => (
              <View key={i} style={{
                flex: 1,
                alignItems: 'center',
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                paddingVertical: 16,
                paddingHorizontal: 8,
              }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: `${stat.bg}15`,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  {stat.icon}
                </View>
                <Text style={{ color: palette.text, fontWeight: '900', fontSize: 20 }}>{stat.value}</Text>
                <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Dhoni Quote Card Easter Egg */}
        {isMsd && (
          <GlassCard delay={220} style={{ borderColor: 'rgba(255, 211, 0, 0.45)', backgroundColor: isDark ? 'rgba(255, 211, 0, 0.04)' : 'rgba(255, 211, 0, 0.02)' }}>
            <Text style={{ color: isDark ? '#FFD300' : '#D46B08', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
              Thala Captain Mode 🦁
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 13, fontStyle: 'italic', lineHeight: 18, fontWeight: '600' }}>
              "It's not about the result, it's about the process." — MS Dhoni (Jersey No. 7)
            </Text>
          </GlassCard>
        )}

        {/* Music DNA */}
        {topGenres.length > 0 && (
          <GlassCard delay={250}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Palette stroke={accentColor} size={16} />
              <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 8 }}>
                Your Music DNA
              </Text>
            </View>
            {topGenres.map(([genre, count], i) => {
              const barWidth = `${Math.round((count / maxGenreCount) * 100)}%` as `${number}%`;
              const barColor = genreColors[genre] ?? '#6B7280';
              return (
                <View key={genre} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: palette.text, fontWeight: '700', fontSize: 12 }}>{genre}</Text>
                    <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 11 }}>{count} plays</Text>
                  </View>
                  <View style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      height: '100%',
                      width: barWidth,
                      borderRadius: 4,
                      backgroundColor: barColor,
                    }} />
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Account Actions */}
        <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 8 }}>
          Settings
        </Text>

        <ActionButton
          icon={isDark ? <Sun stroke="#FFD700" size={20} /> : <Moon stroke={palette.accentStrong} size={20} />}
          label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onPress={toggleTheme}
          color={isDark ? '#FFD700' : palette.accentStrong}
          delay={300}
        />

        <ActionButton
          icon={<Clock stroke={palette.textSubtle} size={20} />}
          label="Clear Play History"
          onPress={handleClearHistory}
          color={palette.textSubtle}
          delay={350}
        />

        <ActionButton
          icon={<Trash2 stroke="#00D4FF" size={20} />}
          label="Clear API Cache"
          onPress={handleClearCache}
          color="#00D4FF"
          delay={400}
        />

        <ActionButton
          icon={<RotateCcw stroke="#FF9933" size={20} />}
          label="Reset Market Telemetry"
          onPress={handleResetTelemetry}
          color="#FF9933"
          delay={450}
        />

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.8}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(255,107,107,0.15)' : 'rgba(255,107,107,0.1)',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(255,107,107,0.2)' : 'rgba(255,107,107,0.15)',
                padding: 18,
                marginTop: 8,
              },
              shadow('0 4px 16px rgba(255,107,107,0.15)', {
                shadowColor: '#FF6B6B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }),
            ]}
          >
            <LogOut stroke="#FF6B6B" size={20} />
            <Text style={{ color: '#FF6B6B', fontWeight: '800', fontSize: 15, letterSpacing: 0.5, marginLeft: 10 }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
