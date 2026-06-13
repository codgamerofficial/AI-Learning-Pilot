import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert, Modal
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Search as SearchIcon, Play, X, TrendingUp, Sparkles, Mic, Volume2 } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchSearch, fetchTrending, extractApiError, type ApiProviderError } from '../lib/apiClient';
import { type EditorialHint, type EditorialTag, EDITORIAL_TAG_THEME, getEditorialTags } from '../lib/editorial';
import { recordPlaylistGenerated, recordTrackImpressions, recordTrackPlay } from '../lib/marketTelemetry';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { useJamStore } from '../store/jamStore';
import { shadow } from '../lib/shadow';
import SafeImage from '../components/SafeImage';

export type RootStackParamList = {
  Main: undefined;
  Player: undefined;
  Auth: undefined;
};

type SearchScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

interface YouTubeItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high: { url: string } };
  };
}

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  color: string;
  source?: 'youtube' | 'jamendo';
  url?: string;
}

const BLOCK_COLORS = ['#005CA9', '#00FF85', '#00D4FF', '#FF6B6B', '#FFD700', '#FF4ECD', '#005CA9', '#00FF85'];

const GENRES = [
  { label: 'Hip Hop', query: 'hip hop hits 2024', gradient: ['#005CA9', '#3B82F6'], icon: '🎤' },
  { label: 'Electronic', query: 'electronic dance music 2024', gradient: ['#00D4FF', '#4DDDFF'], icon: '⚡' },
  { label: 'Rock', query: 'rock music hits 2024', gradient: ['#FF6B6B', '#FF9B9B'], icon: '🎸' },
  { label: 'Jazz', query: 'jazz music playlist', gradient: ['#FFD700', '#FFE44D'], icon: '🎷' },
  { label: 'Bollywood', query: 'bollywood hits 2024', gradient: ['#FF9933', '#FFB366'], icon: '🎬' },
  { label: 'Pop', query: 'pop music 2024', gradient: ['#FF4ECD', '#FF7DDD'], icon: '🎵' },
  { label: 'Classical', query: 'classical music relaxing', gradient: ['#00FF85', '#4DFFA8'], icon: '🎻' },
  { label: 'Lo-Fi', query: 'lofi hip hop chill beats', gradient: ['#005CA9', '#FFD300'], icon: '🌙' },
];

const TRENDING_SEARCHES = [
  'Arijit Singh latest',
  'Taylor Swift Eras Tour',
  'Lo-fi study beats',
  'Bollywood party mix',
  'Billie Eilish new album',
  'Punjabi hits 2024',
];

function blendGlobalIndiaTracks(globalTracks: Track[], indiaTracks: Track[], limit = 24): Track[] {
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

function getResultHint(activeGenre: string): EditorialHint {
  if (activeGenre === 'Global x India') return 'fusion';
  if (activeGenre === 'Bollywood') return 'india';
  return 'neutral';
}

function EditorialTagStrip({ tags }: { tags: EditorialTag[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {tags.slice(0, 3).map((tag) => {
        const theme = EDITORIAL_TAG_THEME[tag];
        return (
          <View
            key={tag}
            style={{
              backgroundColor: `${theme.background}CC`,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 6,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: '800',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
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

function VoiceWaveform() {
  const h1 = useSharedValue(20);
  const h2 = useSharedValue(40);
  const h3 = useSharedValue(60);
  const h4 = useSharedValue(30);
  const h5 = useSharedValue(50);

  React.useEffect(() => {
    h1.value = withRepeat(withSequence(withTiming(60, { duration: 300 }), withTiming(20, { duration: 300 })), -1, true);
    h2.value = withRepeat(withSequence(withTiming(20, { duration: 350 }), withTiming(70, { duration: 350 })), -1, true);
    h3.value = withRepeat(withSequence(withTiming(80, { duration: 400 }), withTiming(30, { duration: 400 })), -1, true);
    h4.value = withRepeat(withSequence(withTiming(40, { duration: 320 }), withTiming(90, { duration: 320 })), -1, true);
    h5.value = withRepeat(withSequence(withTiming(70, { duration: 280 }), withTiming(20, { duration: 280 })), -1, true);
  }, []);

  const style1 = useAnimatedStyle(() => ({ height: h1.value }));
  const style2 = useAnimatedStyle(() => ({ height: h2.value }));
  const style3 = useAnimatedStyle(() => ({ height: h3.value }));
  const style4 = useAnimatedStyle(() => ({ height: h4.value }));
  const style5 = useAnimatedStyle(() => ({ height: h5.value }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 100, marginVertical: 20 }}>
      {[style1, style2, style3, style4, style5].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: 6,
              borderRadius: 3,
              backgroundColor: '#D4AF37',
            },
            style
          ]}
        />
      ))}
    </View>
  );
}

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const jamConnected = useJamStore((state) => state.isConnected);
  const jamRole = useJamStore((state) => state.role);
  const isDark = themeMode === 'dark';
  const accentColor = palette.accent;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingFusion, setGeneratingFusion] = useState(false);
  const [activeGenre, setActiveGenre] = useState('');
  const [lastFusionGenerated, setLastFusionGenerated] = useState<{ trackCount: number; generatedAt: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchProviderErrors, setSearchProviderErrors] = useState<ApiProviderError[]>([]);
  const [searchFilter, setSearchFilter] = useState<'all' | 'songs' | 'artists' | 'podcasts' | 'albums'>('all');
  const [isListening, setIsListening] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('Listening...');
  const [typoSuggestion, setTypoSuggestion] = useState<string | null>(null);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const lastSearchQueryRef = React.useRef('');

  const getFriendlyProviderError = React.useCallback((provider: string, rawError: string): string => {
    const err = rawError.toLowerCase();
    if (err.includes('quota') || err.includes('limit') || err.includes('exhausted') || err.includes('unavailable')) {
      return 'Search provider temporarily unavailable. Trying backup source.';
    }
    if (err.includes('403') || err.includes('forbidden') || err.includes('premium') || err.includes('credential') || err.includes('authorization')) {
      return 'Music service authorization issue. Reconnecting.';
    }
    return rawError;
  }, []);

  const checkTypo = (term: string) => {
    const normalized = term.toLowerCase().trim();
    if (normalized === 'arijith' || normalized === 'arijt' || normalized === 'arjit') return 'Arijit Singh';
    if (normalized === 'talyor' || normalized === 'tylor' || normalized === 'taylr') return 'Taylor Swift';
    if (normalized === 'coldpley' || normalized === 'coldplayy') return 'Coldplay';
    if (normalized === 'belli' || normalized === 'billie' || normalized === 'billi') return 'Billie Eilish';
    if (normalized === 'ar rahman' || normalized === 'arrahman' || normalized === 'a r rahman') return 'A.R. Rahman';
    return null;
  };

  const getFilteredQuery = (rawQuery: string, filter: typeof searchFilter) => {
    if (!rawQuery.trim()) return '';
    if (filter === 'podcasts') return `${rawQuery} podcast episode`;
    if (filter === 'albums') return `${rawQuery} full album audio`;
    if (filter === 'artists') return `${rawQuery} official songs jukebox`;
    if (filter === 'songs') return `${rawQuery} song official audio`;
    return rawQuery;
  };

  // Debounce search input
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTypoSuggestion(null);
      return;
    }
    if (query === lastSearchQueryRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveGenre('');
      setLastFusionGenerated(null);
      lastSearchQueryRef.current = query;
      performSearch(query, 'neutral', searchFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when filter changes
  React.useEffect(() => {
    if (query.trim()) {
      performSearch(query, 'neutral', searchFilter);
    }
  }, [searchFilter]);

  const startVoiceSearch = () => {
    setIsListening(true);
    setListeningStatus('Listening for your voice...');
    
    setTimeout(() => {
      setListeningStatus('Analyzing sound wave...');
    }, 800);
    
    setTimeout(() => {
      setListeningStatus("Found match: 'Taylor Swift'!");
    }, 1600);
    
    setTimeout(() => {
      setIsListening(false);
      setQuery('Taylor Swift');
      performSearch('Taylor Swift', 'neutral', searchFilter);
    }, 2400);
  };

  const fusionGeneratedLabel = React.useMemo(() => {
    if (!lastFusionGenerated) return '';
    const generatedDate = new Date(lastFusionGenerated.generatedAt);
    return generatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastFusionGenerated]);

  const performSearch = async (searchQuery: string, hint: EditorialHint = 'neutral', customFilter = searchFilter) => {
    if (!searchQuery.trim()) return;
    setSearchError(null);
    setSearchProviderErrors([]);
    setLoading(true);

    const typo = checkTypo(searchQuery);
    setTypoSuggestion(typo);

    const finalQuery = getFilteredQuery(searchQuery, customFilter);
    try {
      const formatted = await fetchSearch(finalQuery, 'all');
      setResults(formatted);
      await recordTrackImpressions(formatted, hint);
    } catch (e) {
      const apiError = extractApiError(e, 'Unable to fetch tracks right now.');
      setSearchError(apiError.message);
      setSearchProviderErrors(apiError.providerErrors);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setActiveGenre('');
    setLastFusionGenerated(null);
    lastSearchQueryRef.current = query;
    performSearch(query, 'neutral');
  };

  const handleGenre = (genre: typeof GENRES[0]) => {
    setActiveGenre(genre.label);
    setLastFusionGenerated(null);
    setQuery('');
    lastSearchQueryRef.current = '';
    setResults([]);
    const hint: EditorialHint = genre.label === 'Bollywood' ? 'india' : 'neutral';
    performSearch(genre.query, hint);
  };

  const handleGenerateFusionPlaylist = async () => {
    setActiveGenre('Global x India');
    setQuery('');
    setLastFusionGenerated(null);
    lastSearchQueryRef.current = '';
    setSearchError(null);
    setSearchProviderErrors([]);
    setLoading(true);
    setGeneratingFusion(true);
    try {
      const [globalTracks, indiaTracks] = await Promise.all([
        fetchTrending('global'),
        fetchTrending('india'),
      ]);
      const blended = blendGlobalIndiaTracks(globalTracks, indiaTracks);
      setResults(blended);
      await recordTrackImpressions(blended, 'fusion');
      await recordPlaylistGenerated(blended.length);
      setLastFusionGenerated({ trackCount: blended.length, generatedAt: Date.now() });
    } catch (e) {
      const apiError = extractApiError(e, 'Unable to generate fusion playlist right now.');
      setSearchError(apiError.message);
      setSearchProviderErrors(apiError.providerErrors);
      setResults([]);
    } finally {
      setLoading(false);
      setGeneratingFusion(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setActiveGenre('');
    setLastFusionGenerated(null);
    setSearchError(null);
    setSearchProviderErrors([]);
    setQuery('');
  };

  const playSong = (track: Track) => {
    if (jamConnected && jamRole === 'guest') {
      Alert.alert('Jam Mode Active', 'Only the host can change queue and tracks during a Jam session.');
      return;
    }

    recordTrackPlay(track, getResultHint(activeGenre)).catch(() => {});
    setQueue(results);
    setCurrentTrack(track);
    navigation.navigate('Player');
  };

  const showGenres = results.length === 0 && !loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ padding: 24, flex: 1 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
            Search
          </Text>
          {(results.length > 0 || activeGenre !== '') && (
            <TouchableOpacity onPress={clearResults} style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X stroke={palette.text} size={18} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Search Input */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[
            {
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: isDark ? 'rgba(12, 12, 14, 0.7)' : 'rgba(255, 255, 255, 0.75)',
              borderWidth: 1.2,
              borderColor: isDark ? 'rgba(255, 211, 0, 0.35)' : 'rgba(249, 208, 15, 0.35)',
              borderRadius: 16,
              paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16,
              // @ts-ignore
              backdropFilter: 'blur(24px)',
            },
            shadow(`0px 4px 18px ${palette.accent}15`, {
              shadowColor: palette.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            })
          ]}>
            <SearchIcon stroke={palette.textSubtle} size={20} />
            <TextInput
              style={{ flex: 1, color: palette.text, fontWeight: '600', fontSize: 15, marginLeft: 12, marginRight: 8, letterSpacing: 0.3 }}
              placeholder="Songs, artists, podcasts..."
              placeholderTextColor={palette.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={{ marginRight: 8 }}>
                <X stroke={palette.textMuted} size={16} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={startVoiceSearch} style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Mic stroke={palette.accent} size={16} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Smart Filter Pills */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={{ flexDirection: 'row', marginBottom: 18 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'songs', label: 'Songs' },
              { key: 'artists', label: 'Artists' },
              { key: 'podcasts', label: 'Podcasts' },
              { key: 'albums', label: 'Albums' }
            ].map((filter) => {
              const isSelected = searchFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setSearchFilter(filter.key as any)}
                  activeOpacity={0.85}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? palette.accent : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    borderWidth: 1,
                    borderColor: isSelected ? palette.accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                  }}
                >
                  <Text style={{
                    color: isSelected ? (isDark ? '#050506' : '#FFFFFF') : palette.textSubtle,
                    fontWeight: '800',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Typo Suggestion Banner */}
        {typoSuggestion && (
          <Animated.View entering={FadeInDown.springify()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 }}>
            <Text style={{ color: palette.textSubtle, fontSize: 12, fontWeight: '600' }}>
              Did you mean:{' '}
            </Text>
            <TouchableOpacity onPress={() => { setQuery(typoSuggestion); performSearch(typoSuggestion, 'neutral', searchFilter); }}>
              <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>
                {typoSuggestion}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Fusion Playlist Generator */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <TouchableOpacity
            onPress={handleGenerateFusionPlaylist}
            activeOpacity={0.85}
            style={[
              {
                borderWidth: 1.5,
                borderColor: isDark ? `${accentColor}30` : `${accentColor}20`,
                backgroundColor: isDark ? `${accentColor}08` : `${accentColor}06`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              shadow(`0 4px 16px ${accentColor}15`, {
                shadowColor: accentColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
                elevation: 4,
              })
            ]}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Sparkles stroke={accentColor} size={14} />
                <Text style={{ color: accentColor, fontWeight: '800', fontSize: 13, marginLeft: 6, letterSpacing: 0.3 }}>
                  Global × India Playlist
                </Text>
              </View>
              <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 11, lineHeight: 15 }}>
                Generate a blended cross-market playlist
              </Text>
            </View>
            <View style={{
              paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: accentColor,
            }}>
              {generatingFusion ? (
                <ActivityIndicator size="small" color={isDark ? '#0A0A0A' : '#FFF'} />
              ) : (
                <Text style={{ color: isDark ? '#0A0A0A' : '#FFF', fontWeight: '800', fontSize: 11 }}>
                  {lastFusionGenerated ? 'Refresh' : 'Generate'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {lastFusionGenerated && (
          <View style={{
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(0,255,133,0.06)' : 'rgba(10,132,255,0.06)',
            paddingHorizontal: 14, paddingVertical: 10,
            marginBottom: 14,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ color: accentColor, fontWeight: '700', fontSize: 11 }}>
              Generated Playlist
            </Text>
            <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 10 }}>
              {lastFusionGenerated.trackCount} tracks at {fusionGeneratedLabel}
            </Text>
          </View>
        )}

        {/* Provider Status Indicators */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: searchProviderErrors.some(e => e.provider === 'youtube' && e.error.toLowerCase().includes('quota')) ? '#FFD700' : '#00FF85', marginRight: 5 }} />
            <Text style={{ color: palette.textSubtle, fontSize: 9, fontWeight: '700' }}>YT Music {searchProviderErrors.some(e => e.provider === 'youtube' && e.error.toLowerCase().includes('quota')) ? '(Scraper Fallback)' : ''}</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: searchProviderErrors.some(e => e.provider === 'spotify') 
              ? (isDark ? 'rgba(255,107,107,0.1)' : 'rgba(239,68,68,0.08)') 
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
            borderWidth: 1, 
            borderColor: searchProviderErrors.some(e => e.provider === 'spotify') 
              ? (isDark ? 'rgba(255,107,107,0.2)' : 'rgba(239,68,68,0.15)') 
              : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: searchProviderErrors.some(e => e.provider === 'spotify') ? '#FF6B6B' : '#00FF85', marginRight: 5 }} />
            <Text style={{ color: searchProviderErrors.some(e => e.provider === 'spotify') ? (isDark ? '#FF6B6B' : '#EF4444') : palette.textSubtle, fontSize: 9, fontWeight: '700' }}>Spotify {searchProviderErrors.some(e => e.provider === 'spotify') ? '(Auth Issue)' : ''}</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF85', marginRight: 5 }} />
            <Text style={{ color: palette.textSubtle, fontSize: 9, fontWeight: '700' }}>Jamendo</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF85', marginRight: 5 }} />
            <Text style={{ color: palette.textSubtle, fontSize: 9, fontWeight: '700' }}>Archive.org</Text>
          </View>
        </View>

        {searchError && (
          <View style={{
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: 'rgba(255,107,107,0.2)',
            backgroundColor: isDark ? 'rgba(255,107,107,0.08)' : 'rgba(255,107,107,0.06)',
            paddingHorizontal: 14, paddingVertical: 12,
            marginBottom: 14,
          }}>
            <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 11 }}>
              Search Status Notice
            </Text>
            {searchProviderErrors.map((providerError, index) => (
              <Text
                key={`${providerError.provider}-${index}`}
                style={{ color: palette.textMuted, fontWeight: '600', fontSize: 10, marginTop: 4 }}
              >
                • {providerError.provider.toUpperCase()}: {getFriendlyProviderError(providerError.provider, providerError.error)}
              </Text>
            ))}
            <TouchableOpacity 
              onPress={() => performSearch(query || 'Imagine Dragons', 'neutral')}
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                backgroundColor: '#FF6B6B',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>RETRY SEARCH</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

          {/* Active Genre Tag */}
          {activeGenre !== '' && !loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: accentColor, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
                {activeGenre} Picks
              </Text>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 40 }} />
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <View>
              {results.map((item, index) => {
                const tags = getEditorialTags(item, getResultHint(activeGenre));
                return (
                  <Animated.View key={item.id} entering={FadeInRight.delay(index * 60).springify()}>
                    <TouchableOpacity
                      onPress={() => playSong(item)}
                      activeOpacity={0.85}
                      style={[
                        {
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: isDark ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.8)',
                          borderWidth: 1.5,
                          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          borderRadius: 16,
                          padding: 12, marginBottom: 10,
                          // @ts-ignore
                          backdropFilter: 'blur(20px)',
                        },
                        shadow('0 2px 8px rgba(0,0,0,0.06)', {
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
                          elevation: 3,
                        })
                      ]}
                    >
                      <View style={[
                        { borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: `${item.color}40` },
                        shadow(`0 2px 8px ${item.color}20`, {
                          shadowColor: item.color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
                          elevation: 3,
                        })
                      ]}>
                        <SafeImage
                          uri={item.artwork}
                          style={{ width: 52, height: 52 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: palette.textSubtle, fontWeight: '600', fontSize: 11, marginTop: 2, opacity: 0.8 }} numberOfLines={1}>
                          {item.artist}
                        </Text>
                        <EditorialTagStrip tags={tags} />
                      </View>
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: item.color,
                        alignItems: 'center', justifyContent: 'center', marginLeft: 8,
                      }}>
                        <Play stroke="#FFF" fill="#FFF" size={12} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              <View style={{ height: 120 }} />
            </View>
          )}

          {/* Browse Genres & Trending - shown when no results */}
          {showGenres && (
            <View>
              {/* Trending Searches */}
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TrendingUp stroke={accentColor} size={16} />
                  <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 8 }}>
                    Trending Searches
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                  {TRENDING_SEARCHES.map((term, i) => (
                    <TouchableOpacity
                      key={term}
                      onPress={() => {
                        setQuery(term);
                        setActiveGenre('');
                        lastSearchQueryRef.current = term;
                        performSearch(term, 'neutral');
                      }}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ color: palette.text, fontWeight: '600', fontSize: 12 }}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              {/* Genre Grid */}
              <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Browse Genres
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {GENRES.map((genre, index) => (
                  <Animated.View key={genre.label} entering={FadeInDown.delay(250 + index * 60).springify()} style={{ width: '48%', marginBottom: 14 }}>
                    <TouchableOpacity
                      onPress={() => handleGenre(genre)}
                      activeOpacity={0.85}
                      style={[
                        {
                          backgroundColor: isDark ? 'rgba(12, 12, 14, 0.7)' : 'rgba(255, 255, 255, 0.75)',
                          borderWidth: 1.2,
                          borderColor: isDark ? `${genre.gradient[0]}50` : `${genre.gradient[0]}35`,
                          borderRadius: 20,
                          padding: 18,
                          height: 110,
                          justifyContent: 'space-between',
                          overflow: 'hidden',
                          // @ts-ignore
                          backdropFilter: 'blur(20px)',
                        },
                        shadow(`0 4px 16px ${genre.gradient[0]}25`, {
                          shadowColor: genre.gradient[0],
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.18,
                          shadowRadius: 10,
                          elevation: 3,
                        })
                      ]}
                    >
                      {/* Decorative gradient circle */}
                      <View style={{
                        position: 'absolute', top: -20, right: -20,
                        width: 80, height: 80, borderRadius: 40,
                        backgroundColor: genre.gradient[0],
                        opacity: 0.12,
                      }} />
                      <Text style={{ fontSize: 28, marginBottom: 4 }}>{genre.icon}</Text>
                      <View>
                        <Text style={{ color: genre.gradient[0], fontWeight: '900', fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {genre.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
              <View style={{ height: 200 }} />
            </View>
          )}

        </ScrollView>
      </View>

      {/* Voice Search Simulation Overlay */}
      <Modal
        visible={isListening}
        transparent
        animationType="fade"
        onRequestClose={() => setIsListening(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(5, 5, 6, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <View style={[
            {
              backgroundColor: isDark ? 'rgba(20, 20, 24, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: 28,
              padding: 36,
              alignItems: 'center',
              width: '100%',
              maxWidth: 320,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            shadow('0px 12px 36px rgba(0, 0, 0, 0.5)', {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 10,
            })
          ]}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderWidth: 1.5,
              borderColor: '#D4AF37',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Mic size={28} color="#D4AF37" />
            </View>
            
            <Text style={{
              color: palette.text,
              fontSize: 18,
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: 1,
              textAlign: 'center',
            }}>
              Voice Search
            </Text>
            
            <VoiceWaveform />
            
            <Text style={{
              color: palette.textSubtle,
              fontSize: 13,
              fontWeight: '700',
              textAlign: 'center',
              marginTop: 8,
            }}>
              {listeningStatus}
            </Text>
            
            <TouchableOpacity
              onPress={() => setIsListening(false)}
              style={{
                marginTop: 28,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
