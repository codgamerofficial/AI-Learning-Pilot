import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  Image, ActivityIndicator, Alert
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';

import { Play, Globe, MapPin } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { useRecentStore } from '../store/recentStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './Search';
import { TrackCardSkeleton, TrackRowSkeleton } from '../components/Skeleton';
import { getCached, setCached } from '../lib/cache';
import { fetchSearch, fetchTrending as fetchApiTrending, extractApiError, type ApiProviderError } from '../lib/apiClient';
import { type EditorialHint, type EditorialTag, EDITORIAL_TAG_THEME, getEditorialTags } from '../lib/editorial';
import {
  type MarketTelemetryMetrics,
  getMarketTelemetryMetrics,
  recordTrackImpressions,
  recordTrackPlay,
} from '../lib/marketTelemetry';
import { shadow } from '../lib/shadow';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { useJamStore } from '../store/jamStore';
import BrandLogo from '../components/BrandLogo';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  color: string;
  source?: 'youtube' | 'jamendo';
  url?: string;
}

type TrendingRegion = 'global' | 'india' | 'fusion';

interface MarketFocus {
  key: string;
  title: string;
  subtitle: string;
  query: string;
  color: string;
}

const BLOCK_COLORS = ['#7B61FF', '#00D4FF', '#00FF85', '#FF6B6B', '#FFD700', '#FF4ECD'];

const MOOD_QUERIES: Record<string, string> = {
  Focus: 'lofi study music',
  Chill: 'chill vibes playlist',
  Gym: 'workout gym music 2024',
  Party: 'party hits 2024',
};

const MARKET_FOCUS: MarketFocus[] = [
  {
    key: 'india-export',
    title: 'India -> Global',
    subtitle: 'Bollywood, indie, and crossover songs with export potential.',
    query: 'india global crossover hits',
    color: '#FF9933',
  },
  {
    key: 'global-club',
    title: 'Global Club Feed',
    subtitle: 'Worldwide charting energy to benchmark international sound.',
    query: 'global dance pop chart toppers',
    color: '#00D4FF',
  },
  {
    key: 'diaspora-wave',
    title: 'Diaspora Wave',
    subtitle: 'South Asian diaspora creators blending India with global styles.',
    query: 'south asian diaspora music english hindi',
    color: '#7B61FF',
  },
  {
    key: 'regional-rise',
    title: 'Regional Rise',
    subtitle: 'Punjabi, Tamil, Telugu and regional India tracks gaining momentum.',
    query: 'punjabi tamil telugu trending songs',
    color: '#00FF85',
  },
];

function blendGlobalIndiaTracks(globalTracks: Track[], indiaTracks: Track[], limit = 16): Track[] {
  const output: Track[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(globalTracks.length, indiaTracks.length);

  for (let i = 0; i < maxLength && output.length < limit; i += 1) {
    const globalTrack = globalTracks[i];
    if (globalTrack && !seen.has(globalTrack.id)) {
      seen.add(globalTrack.id);
      output.push({
        ...globalTrack,
        color: i % 2 === 0 ? '#00D4FF' : globalTrack.color,
      });
    }

    const indiaTrack = indiaTracks[i];
    if (indiaTrack && !seen.has(indiaTrack.id) && output.length < limit) {
      seen.add(indiaTrack.id);
      output.push({
        ...indiaTrack,
        color: i % 2 === 0 ? '#FF9933' : '#00FF85',
      });
    }
  }

  return output;
}

function EditorialTagStrip({ tags }: { tags: EditorialTag[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {tags.slice(0, 3).map((tag) => {
        const theme = EDITORIAL_TAG_THEME[tag];
        return (
          <View
            key={tag}
            style={{
              backgroundColor: theme.background,
              borderColor: theme.border,
              borderWidth: 2,
              paddingHorizontal: 6,
              paddingVertical: 3,
              marginRight: 6,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: '900',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {tag}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getMarketHint(focusKey: string): EditorialHint {
  if (focusKey === 'global-club') return 'global';
  if (focusKey === 'india-export' || focusKey === 'regional-rise') return 'india';
  return 'fusion';
}

async function getMoodTracks(query: string): Promise<Track[]> {
  const cacheKey = `mood:${query}`;
  const cached = await getCached<Track[]>(cacheKey);
  if (cached) return cached;
  
  const tracks = await fetchSearch(query, 'youtube');
  await setCached(cacheKey, tracks);
  return tracks;
}

function getGreeting(email: string): string {
  const hour = new Date().getHours();
  const name = email.split('@')[0] ?? 'Listener';
  const capitalised = name.charAt(0).toUpperCase() + name.slice(1);
  if (hour < 12) return `Good morning, ${capitalised} ☀️`;
  if (hour < 17) return `Good afternoon, ${capitalised} 🎵`;
  return `Good evening, ${capitalised} 🌙`;
}


export default function HomeScreen({ navigation }: HomeScreenProps) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const jamConnected = useJamStore((state) => state.isConnected);
  const jamRole = useJamStore((state) => state.role);

  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { user } = useAuthStore();
  const { recentTracks, loadFromStorage } = useRecentStore();
  const [trending, setTrending] = useState<Track[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [trendingRegion, setTrendingRegion] = useState<TrendingRegion>('fusion');
  const [moodTracks, setMoodTracks] = useState<Track[]>([]);
  const [loadingMood, setLoadingMood] = useState(false);
  const [activeMood, setActiveMood] = useState('');
  const [marketTracks, setMarketTracks] = useState<Track[]>([]);
  const [loadingMarketTracks, setLoadingMarketTracks] = useState(false);
  const [activeMarketFocus, setActiveMarketFocus] = useState(MARKET_FOCUS[0]?.key ?? '');
  const [telemetry, setTelemetry] = useState<MarketTelemetryMetrics | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingProviderErrors, setTrendingProviderErrors] = useState<ApiProviderError[]>([]);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketProviderErrors, setMarketProviderErrors] = useState<ApiProviderError[]>([]);
  const [dailyRecommendations, setDailyRecommendations] = useState<Track[]>([]);
  const [loadingDailyRecommendations, setLoadingDailyRecommendations] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailyProviderErrors, setDailyProviderErrors] = useState<ApiProviderError[]>([]);

  const greeting = getGreeting(user?.email ?? '');
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'NT';

  const refreshTelemetry = () => {
    getMarketTelemetryMetrics().then(setTelemetry).catch(() => {});
  };

  const fetchTrending = async (region: TrendingRegion) => {
    setLoadingTrending(true);
    setTrendingError(null);
    setTrendingProviderErrors([]);
    try {
      const cacheKey = `trending:${region}`;
      const cached = await getCached<Track[]>(cacheKey);
      if (cached && cached.length > 0) {
        setTrending(cached);
        await recordTrackImpressions(cached, region);
        refreshTelemetry();
        return;
      }

      if (region === 'fusion') {
        const [globalTracks, indiaTracks] = await Promise.all([
          fetchApiTrending('global'),
          fetchApiTrending('india'),
        ]);
        const blended = blendGlobalIndiaTracks(globalTracks, indiaTracks);
        setTrending(blended);
        await setCached(cacheKey, blended);
        await recordTrackImpressions(blended, 'fusion');
        refreshTelemetry();
        return;
      }

      const tracks = await fetchApiTrending(region);
      setTrending(tracks);
      await setCached(cacheKey, tracks);
      await recordTrackImpressions(tracks, region);
      refreshTelemetry();
    } catch (error) {
      const apiError = extractApiError(error, 'Unable to load market trending right now.');
      setTrendingError(apiError.message);
      setTrendingProviderErrors(apiError.providerErrors);
      setTrending([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  useEffect(() => {
    loadFromStorage();
    fetchTrending(trendingRegion);
  }, [trendingRegion]);

  const loadDailyRecommendations = async () => {
    const email = user?.email ?? 'listener@neotunes.app';
    const dateKey = new Date().toISOString().slice(0, 10);
    const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const cacheKey = `daily:recs:${email}:${dateKey}`;

    setLoadingDailyRecommendations(true);
    setDailyError(null);
    setDailyProviderErrors([]);

    try {
      const cached = await getCached<Track[]>(cacheKey);
      if (cached && cached.length > 0) {
        setDailyRecommendations(cached);
        return;
      }

      const query = `${weekday} everyday recommendations playlist hits`;
      const tracks = await fetchSearch(query, 'youtube');
      const picks = tracks.slice(0, 8).map((track: Track, index: number) => ({
        ...track,
        color: BLOCK_COLORS[index % BLOCK_COLORS.length],
      }));

      if (picks.length > 0) {
        setDailyRecommendations(picks);
        await setCached(cacheKey, picks);
        return;
      }

      setDailyRecommendations([]);
      setDailyError('No daily recommendations available yet.');
    } catch (error) {
      const apiError = extractApiError(error, 'Unable to load daily recommendations right now.');
      setDailyError(apiError.message);
      setDailyProviderErrors(apiError.providerErrors);
      setDailyRecommendations([]);
    } finally {
      setLoadingDailyRecommendations(false);
    }
  };

  useEffect(() => {
    loadDailyRecommendations();
  }, [user?.email]);

  useEffect(() => {
    refreshTelemetry();
  }, []);

  const handleMood = async (mood: string) => {
    setActiveMood(mood);
    setLoadingMood(true);
    const tracks = await getMoodTracks(MOOD_QUERIES[mood]).catch(() => []);
    setMoodTracks(tracks);
    setLoadingMood(false);
  };

  const handleMarketFocus = async (focus: MarketFocus) => {
    setActiveMarketFocus(focus.key);
    setLoadingMarketTracks(true);
    setMarketError(null);
    setMarketProviderErrors([]);
    try {
      const focusHint = getMarketHint(focus.key);
      const cacheKey = `market:${focus.key}`;
      const cached = await getCached<Track[]>(cacheKey);
      if (cached && cached.length > 0) {
        setMarketTracks(cached);
        await recordTrackImpressions(cached, focusHint);
        refreshTelemetry();
        return;
      }

      const tracks = await fetchSearch(focus.query, 'youtube');
      const topTracks = tracks.slice(0, 8);
      setMarketTracks(topTracks);
      await setCached(cacheKey, topTracks);
      await recordTrackImpressions(topTracks, focusHint);
      refreshTelemetry();
    } catch (error) {
      const apiError = extractApiError(error, 'Unable to load market focus tracks right now.');
      setMarketError(apiError.message);
      setMarketProviderErrors(apiError.providerErrors);
      setMarketTracks([]);
    } finally {
      setLoadingMarketTracks(false);
    }
  };

  useEffect(() => {
    const defaultFocus = MARKET_FOCUS[0];
    if (defaultFocus) {
      handleMarketFocus(defaultFocus);
    }
  }, []);

  const playSong = (track: Track, queue: Track[], hint: EditorialHint = 'neutral') => {
    if (jamConnected && jamRole === 'guest') {
      Alert.alert('Jam Mode Active', 'Only the host can change queue and tracks during a Jam session.');
      return;
    }

    recordTrackPlay(track, hint).then(refreshTelemetry).catch(() => {});
    setQueue(queue);
    setCurrentTrack(track);
    navigation.navigate('Player');
  };

  const uniqueArtists = new Set(trending.map((track) => track.artist)).size;
  const indiaSignalCount = trending.filter((track) =>
    /(india|hindi|bollywood|punjabi|tamil|telugu|desi|zee music|t-series)/i.test(`${track.title} ${track.artist}`),
  ).length;
  const indiaCtrProxy = telemetry?.indiaCtrProxy ?? 0;
  const globalRetentionProxy = telemetry?.globalRetentionProxy ?? 0;
  const diasporaPlayShare = telemetry?.diasporaPlayShare ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="flex-row justify-between items-center mt-4 mb-2">
          <View style={{ flex: 1, marginRight: 12 }}>
            <BrandLogo style={{ width: 210, height: 74, marginLeft: -4 }} />
            <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }} numberOfLines={1}>
              {greeting}
            </Text>
          </View>
          <View className="w-12 h-12 bg-acidGreen border-4 rounded-full items-center justify-center shadow-[2px_2px_0px_rgba(255,255,255,1)]" style={{ borderColor: palette.border }}>
            <Text className="text-deepBlack font-black text-lg">{initials}</Text>
          </View>
        </View>

        {/* ── RECENTLY PLAYED ── */}
        {recentTracks.length > 0 && (
          <>
            <Text style={{ color: '#7B61FF', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 10, marginTop: 16 }}>
              Recently Played
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {recentTracks.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => playSong(item as any, recentTracks as any, 'neutral')}
                  style={{ marginRight: 12, alignItems: 'center', width: 80 }}
                >
                  <Image
                    source={{ uri: item.artwork }}
                    style={{ width: 72, height: 72, borderWidth: 3, borderColor: item.color, marginBottom: 6 }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 10, textTransform: 'uppercase', textAlign: 'center' }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── EVERYDAY RECOMMENDATIONS ── */}
        <View style={{ marginTop: 6, marginBottom: 22 }}>
          <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10 }}>
            Everyday Recommendations
          </Text>

          {dailyError && (
            <View
              style={{
                borderWidth: 3,
                borderColor: '#FF6B6B',
                backgroundColor: '#2A1010',
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: '#FF9D9D',
                  fontWeight: '900',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {dailyError}
              </Text>
              {dailyProviderErrors.map((providerError, index) => (
                <Text
                  key={`${providerError.provider}-${index}`}
                  style={{
                    color: '#FFFFFF',
                    opacity: 0.85,
                    fontWeight: '700',
                    fontSize: 10,
                    marginTop: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {providerError.provider}: {providerError.error}
                </Text>
              ))}
            </View>
          )}

          {loadingDailyRecommendations ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((item) => (
                <TrackCardSkeleton key={item} />
              ))}
            </ScrollView>
          ) : dailyRecommendations.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dailyRecommendations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => playSong(item, dailyRecommendations, 'neutral')}
                  activeOpacity={0.9}
                  style={{
                    marginRight: 12,
                    width: 170,
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    backgroundColor: item.color,
                    padding: 10,
                  }}
                >
                  <Image
                    source={{ uri: item.artwork }}
                    style={{ width: '100%', height: 96, borderWidth: 2, borderColor: '#0A0A0A' }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{ color: '#0A0A0A', fontWeight: '900', fontSize: 12, marginTop: 8, textTransform: 'uppercase' }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: '#0A0A0A', opacity: 0.8, fontWeight: '700', fontSize: 10, marginTop: 3 }} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: palette.textMuted, fontWeight: '700', textTransform: 'uppercase', fontSize: 11 }}>
              We are curating your next daily mix.
            </Text>
          )}
        </View>

        {/* ── TRENDING NOW ── */}
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2 }}>
            Market Trending
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 20, padding: 4 }}>
            <TouchableOpacity
              onPress={() => setTrendingRegion('global')}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: trendingRegion === 'global' ? '#00D4FF' : 'transparent'
              }}
            >
              <Text style={{
                color: trendingRegion === 'global' ? '#0A0A0A' : palette.text,
                fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1
              }}>Global</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTrendingRegion('india')}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: trendingRegion === 'india' ? '#00D4FF' : 'transparent'
              }}
            >
              <Text style={{
                color: trendingRegion === 'india' ? '#0A0A0A' : palette.text,
                fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1
              }}>India</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTrendingRegion('fusion')}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: trendingRegion === 'fusion' ? '#00D4FF' : 'transparent'
              }}
            >
              <Text style={{
                color: trendingRegion === 'fusion' ? '#0A0A0A' : palette.text,
                fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1
              }}>Fusion</Text>
            </TouchableOpacity>
          </View>
        </View>
        {trendingError && (
          <View
            style={{
              borderWidth: 3,
              borderColor: '#FF6B6B',
              backgroundColor: '#2A1010',
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: '#FF9D9D',
                fontWeight: '900',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {trendingError}
            </Text>
            {trendingProviderErrors.map((providerError, index) => (
              <Text
                key={`${providerError.provider}-${index}`}
                style={{
                  color: '#FFFFFF',
                  opacity: 0.85,
                  fontWeight: '700',
                  fontSize: 10,
                  marginTop: 6,
                  textTransform: 'uppercase',
                }}
              >
                {providerError.provider}: {providerError.error}
              </Text>
            ))}
          </View>
        )}
        {loadingTrending ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {[1,2,3].map(i => <TrackCardSkeleton key={i} />)}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-10">
            {trending.map((item, index) => {
              const tags = getEditorialTags(item, trendingRegion);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(index * 100).springify()}
                  layout={Layout.springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => playSong(item, trending, trendingRegion)}
                    className="mr-5 border-4 border-white p-3 w-56 h-68 justify-between shadow-[4px_4px_0px_rgba(255,255,255,1)]"
                    style={{ backgroundColor: item.color, height: 260 }}
                  >
                    <Image
                      source={{ uri: item.artwork }}
                      className="w-full border-4 border-deepBlack"
                      style={{ height: 140 }}
                      resizeMode="cover"
                    />
                    <View className="mt-3 flex-1 justify-end">
                      <Text className="text-deepBlack text-lg font-black uppercase tracking-tight" numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text className="text-deepBlack font-bold text-xs mt-1" numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={tags} />
                    </View>
                    <View className="absolute bottom-3 right-3 w-12 h-12 bg-deepBlack rounded-full items-center justify-center">
                      <Play stroke="#FFF" fill="#FFF" size={18} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        {/* ── GLOBAL x INDIA PULSE ── */}
        <View
          style={[
            {
              borderWidth: 4,
              borderColor: palette.border,
              backgroundColor: palette.surfaceAlt,
              padding: 16,
              marginBottom: 24,
            },
            shadow('4px 4px 0px rgba(0,212,255,1)', {
              shadowColor: '#00D4FF',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
            }),
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: palette.text, fontWeight: '900', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2 }}>
              Global x India Pulse
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe color="#00D4FF" size={18} />
              <MapPin color="#FF9933" size={18} />
            </View>
          </View>

          <Text style={{ color: palette.textMuted, marginTop: 8, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            Build a differentiated catalog for both worldwide listeners and India-first audiences.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 14 }}>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#00D4FF', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#00D4FF', fontWeight: '900', fontSize: 18 }}>{uniqueArtists}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>Unique Artists</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#FF9933', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#FF9933', fontWeight: '900', fontSize: 18 }}>{indiaSignalCount}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>India Signals</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#00FF85', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#00FF85', fontWeight: '900', fontSize: 18 }}>{trending.length}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>Blend Size</Text>
            </View>
          </View>

          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
            Country-Target Analytics (Local Telemetry)
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#FF9933', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#FF9933', fontWeight: '900', fontSize: 16 }}>{indiaCtrProxy.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>India CTR Proxy</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#00D4FF', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#00D4FF', fontWeight: '900', fontSize: 16 }}>{globalRetentionProxy.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>Global Retention</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 3, borderColor: '#7B61FF', padding: 8, backgroundColor: palette.background }}>
              <Text style={{ color: '#7B61FF', fontWeight: '900', fontSize: 16 }}>{diasporaPlayShare.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>Diaspora Share</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {MARKET_FOCUS.map((focus) => {
              const isActive = activeMarketFocus === focus.key;
              return (
                <TouchableOpacity
                  key={focus.key}
                  onPress={() => handleMarketFocus(focus)}
                  activeOpacity={0.85}
                  style={{
                    width: 210,
                    marginRight: 12,
                    borderWidth: 3,
                    borderColor: isActive ? '#FFFFFF' : focus.color,
                    padding: 12,
                    backgroundColor: isActive ? focus.color : palette.background,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#0A0A0A' : focus.color,
                      fontWeight: '900',
                      fontSize: 13,
                      textTransform: 'uppercase',
                    }}
                  >
                    {focus.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: 6,
                      color: isActive ? '#0A0A0A' : palette.text,
                      opacity: isActive ? 0.9 : 0.72,
                      fontWeight: '700',
                      fontSize: 10,
                      textTransform: 'uppercase',
                    }}
                    numberOfLines={3}
                  >
                    {focus.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {marketError && (
            <View
              style={{
                borderWidth: 3,
                borderColor: '#FF6B6B',
                backgroundColor: palette.dangerSurface,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: '#FF9D9D',
                  fontWeight: '900',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {marketError}
              </Text>
              {marketProviderErrors.map((providerError, index) => (
                <Text
                  key={`${providerError.provider}-${index}`}
                  style={{
                    color: '#FFFFFF',
                    opacity: 0.85,
                    fontWeight: '700',
                    fontSize: 10,
                    marginTop: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {providerError.provider}: {providerError.error}
                </Text>
              ))}
            </View>
          )}

          {loadingMarketTracks ? (
            <View>
              {[1, 2, 3].map((row) => (
                <TrackRowSkeleton key={row} />
              ))}
            </View>
          ) : (
            <View>
              {marketTracks.slice(0, 3).map((item) => {
                const hint = getMarketHint(activeMarketFocus);
                const tags = getEditorialTags(item, hint);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => playSong(item, marketTracks, hint)}
                    activeOpacity={0.9}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      marginBottom: 10,
                      padding: 10,
                      backgroundColor: item.color,
                    }}
                  >
                    <Image
                      source={{ uri: item.artwork }}
                      style={{ width: 56, height: 56, borderWidth: 2, borderColor: '#0A0A0A', marginRight: 10 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#0A0A0A', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: '#0A0A0A', fontWeight: '700', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={tags} />
                    </View>
                    <View style={{ width: 34, height: 34, backgroundColor: '#0A0A0A', borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
                      <Play stroke="#FFF" fill="#FFF" size={14} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── MOOD SELECTOR ── */}
        <Text style={{ color: palette.accentStrong, fontWeight: '700', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
          Your Mood
        </Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          {Object.keys(MOOD_QUERIES).map((mood, i) => {
            const moodColors = ['#7B61FF', '#1C1C1E', '#00FF85', '#00D4FF'];
            const textColors = ['#FFF', '#FFF', '#0A0A0A', '#0A0A0A'];
            const borderColors = ['#FFF', '#00D4FF', '#0A0A0A', '#0A0A0A'];
            const isActive = activeMood === mood;
            return (
              <TouchableOpacity
                key={mood}
                activeOpacity={0.8}
                onPress={() => handleMood(mood)}
                className="w-[47%] p-6 my-2 border-4"
                style={[
                  {
                    backgroundColor: moodColors[i],
                    borderColor: isActive ? '#00FF85' : borderColors[i],
                  },
                  shadow(
                    isActive ? '4px 4px 0px rgba(0,255,133,1)' : '4px 4px 0px rgba(255,255,255,1)',
                    {
                      shadowColor: isActive ? '#00FF85' : '#FFF',
                      shadowOffset: { width: 4, height: 4 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: 4,
                    }
                  ),
                ]}
              >
                <Text
                  className="font-black text-xl uppercase"
                  style={{ color: textColors[i] }}
                >
                  {mood}
                </Text>
                {isActive && (
                  <Text style={{ color: textColors[i], opacity: 0.7, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                    PLAYING ›
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── MOOD RESULTS ── */}
        {activeMood !== '' && (
          <>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              {activeMood} Picks
            </Text>
            {loadingMood ? (
              <ActivityIndicator size="large" color="#7B61FF" className="mb-10" />
            ) : (
              <View className="mb-10">
                {moodTracks.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => playSong(item, moodTracks, 'neutral')}
                    activeOpacity={0.9}
                    className="flex-row items-center border-4 border-white p-4 mb-4 shadow-[4px_4px_0px_rgba(255,255,255,1)]"
                    style={{ backgroundColor: item.color }}
                  >
                    <Image
                      source={{ uri: item.artwork }}
                      className="w-16 h-16 border-2 border-deepBlack mr-4"
                      resizeMode="cover"
                    />
                    <View className="flex-1">
                      <Text className="text-deepBlack font-black text-base uppercase" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text className="text-deepBlack font-bold text-xs mt-1" numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={getEditorialTags(item, 'neutral')} />
                    </View>
                    <View className="w-10 h-10 bg-deepBlack rounded-full items-center justify-center ml-2">
                      <Play stroke="#FFF" fill="#FFF" size={16} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Bottom padding: tab bar (80px) + MiniPlayer (72px) + buffer */}
        <View style={{ height: 170 }} />

      </ScrollView>
    </SafeAreaView>
  );
}
