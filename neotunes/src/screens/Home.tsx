import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  Image, ActivityIndicator, Alert, TextInput
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';

import { Play, Globe, MapPin, Sparkles } from 'lucide-react-native';
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
import SafeImage from '../components/SafeImage';
import EqualizerBars from '../components/EqualizerBars';

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  color: string;
  source?: 'youtube' | 'jamendo' | string;
  url?: string;
  searchQuery?: string;
  playbackId?: string;
}

const CURATED_PODCASTS: Track[] = [
  {
    id: 'pod-raj',
    title: 'Figuring Out with Raj Shammani (Hindi)',
    artist: 'Raj Shammani',
    artwork: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=300&auto=format&fit=crop',
    color: '#FF9933',
    searchQuery: 'Figuring Out Raj Shammani podcast hindi latest episode',
    playbackId: 'sGpc8-f2e8U',
  },
  {
    id: 'pod-ranveer',
    title: 'The Ranveer Show - BeerBiceps (Hindi/Eng)',
    artist: 'Ranveer Allahbadia',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=300&auto=format&fit=crop',
    color: '#7B61FF',
    searchQuery: 'The Ranveer Show BeerBiceps podcast hindi english latest',
    playbackId: 'jAcQ1-LqN1s',
  },
  {
    id: 'pod-suspense',
    title: 'Sunday Suspense Audio Drama (Bengali)',
    artist: 'Radio Mirchi Bengali',
    artwork: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=300&auto=format&fit=crop',
    color: '#FF6B6B',
    searchQuery: 'Sunday Suspense Bengali audio story horror mystery',
    playbackId: 'FAFcKc64Asg',
  },
  {
    id: 'pod-rogan',
    title: 'The Joe Rogan Experience (English)',
    artist: 'Joe Rogan',
    artwork: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=300&auto=format&fit=crop',
    color: '#00FF85',
    searchQuery: 'Joe Rogan Experience podcast latest full',
    playbackId: 'GZCmYrgOZU0',
  },
  {
    id: 'pod-somak',
    title: 'Golpo Solpo Audio Stories (Bengali)',
    artist: 'Somak Bengali Stories',
    artwork: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop',
    color: '#FF4ECD',
    searchQuery: 'Golpo Solpo Somak Bengali stories audio drama',
    playbackId: '1J8-O9HOR1o',
  },
  {
    id: 'pod-mahabharat',
    title: 'The Mahabharata Stories (Hindi)',
    artist: 'Suno India',
    artwork: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop',
    color: '#FFD700',
    searchQuery: 'Mahabharat podcast hindi audio stories myth',
    playbackId: 'vsax8o_X660',
  },
  {
    id: 'pod-fridman',
    title: 'Lex Fridman Podcast: AI & Tech (English)',
    artist: 'Lex Fridman',
    artwork: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?q=80&w=300&auto=format&fit=crop',
    color: '#00D4FF',
    searchQuery: 'Lex Fridman Sam Altman artificial intelligence tech podcast',
    playbackId: 'EV7WhVT270Q',
  },
  {
    id: 'pod-adda',
    title: 'The Bengali Culture Podcast (Bengali)',
    artist: 'Bengali Adda Zone',
    artwork: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=300&auto=format&fit=crop',
    color: '#FFFFFF',
    searchQuery: 'Bengali podcast show discussion adda lifestyle',
    playbackId: 'QY3IM62qpqw',
  }
];

const CURATED_AUDIOBOOKS: Track[] = [
  {
    id: 'ab-gita',
    title: 'Bhagavad Gita As It Is (Hindi)',
    artist: 'AC Bhaktivedanta Swami',
    artwork: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop',
    color: '#FF9933',
    searchQuery: 'Bhagavad Gita Hindi audio book full version chapters',
    playbackId: '28sptQICKCk',
  },
  {
    id: 'ab-pather',
    title: 'Pather Panchali Classic Novel (Bengali)',
    artist: 'Bibhutibhushan Bandyopadhyay',
    artwork: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=300&auto=format&fit=crop',
    color: '#FFD700',
    searchQuery: 'Pather Panchali Bengali audio book classic novel stories',
    playbackId: 'ROKqa4xd1V4',
  },
  {
    id: 'ab-habits',
    title: 'Atomic Habits (English Bestseller)',
    artist: 'James Clear',
    artwork: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300&auto=format&fit=crop',
    color: '#00FF85',
    searchQuery: 'Atomic Habits James Clear audiobook full version',
    playbackId: 'D8Q1D8Y7_lA',
  },
  {
    id: 'ab-chanakya',
    title: 'Chanakya Neeti Life Rules (Hindi)',
    artist: 'Acharya Chanakya',
    artwork: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop',
    color: '#7B61FF',
    searchQuery: 'Chanakya Neeti Hindi audiobook full stories',
    playbackId: '_lq-HF05C0g',
  },
  {
    id: 'ab-sherlock',
    title: 'Sherlock Holmes Audio Drama (Bengali)',
    artist: 'Sir Arthur Conan Doyle',
    artwork: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=300&auto=format&fit=crop',
    color: '#FF6B6B',
    searchQuery: 'Sherlock Holmes Bengali audio book story suspense',
    playbackId: 'qk3mrQX8WEM',
  },
  {
    id: 'ab-tagore',
    title: 'Tagore Short Stories Collection (Bengali)',
    artist: 'Rabindranath Tagore',
    artwork: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=300&auto=format&fit=crop',
    color: '#FF4ECD',
    searchQuery: 'Rabindranath Tagore audio stories Kabuliwala bengali book',
    playbackId: 'Uba2msanoBY',
  },
  {
    id: 'ab-1984',
    title: '1984 Dystopian Classic (English)',
    artist: 'George Orwell',
    artwork: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=300&auto=format&fit=crop',
    color: '#FF6B6B',
    searchQuery: '1984 George Orwell audiobook chapters full novel',
    playbackId: '2PArP8h1qSw',
  },
  {
    id: 'ab-alchemist',
    title: 'The Alchemist Stories (English/Hindi)',
    artist: 'Paulo Coelho',
    artwork: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop',
    color: '#00D4FF',
    searchQuery: 'The Alchemist audiobook full novel english or hindi',
    playbackId: 'fKXr0wyw1gA',
  }
];

const TOP_CHARTS_TRACKS: Track[] = [
  {
    id: 'top-1',
    title: 'Starboy',
    artist: 'The Weeknd',
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop',
    color: '#FF1A1A',
    searchQuery: 'The Weeknd Starboy official audio',
    playbackId: 'Rif-RTvmmss',
  },
  {
    id: 'top-2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    color: '#FFB300',
    searchQuery: 'The Weeknd Blinding Lights official audio',
    playbackId: 'fHI8X4OXluQ',
  },
  {
    id: 'top-3',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
    color: '#00D4FF',
    searchQuery: 'Ed Sheeran Shape of You official audio',
    playbackId: '_dK2tDK9grQ',
  },
  {
    id: 'top-4',
    title: 'Bad Habits',
    artist: 'Ed Sheeran',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    color: '#7B61FF',
    searchQuery: 'Ed Sheeran Bad Habits official audio',
    playbackId: 'HeOpRzcqKrE',
  },
  {
    id: 'top-5',
    title: 'Levitating',
    artist: 'Dua Lipa',
    artwork: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=300&auto=format&fit=crop',
    color: '#FF4ECD',
    searchQuery: 'Dua Lipa Levitating official audio',
    playbackId: 'WHuBW3qKm9g',
  },
];

const NEW_RELEASES_TRACKS = [
  {
    id: 'new-1',
    title: 'As It Was',
    artist: 'Harry Styles',
    artwork: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=300&auto=format&fit=crop',
    color: '#00FF85',
    date: 'NEW • JUN 2',
    searchQuery: 'Harry Styles As It Was official audio',
    playbackId: 'V1Z586zoeeE',
  },
  {
    id: 'new-2',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    artwork: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300&auto=format&fit=crop',
    color: '#FFD700',
    date: 'NEW • MAY 28',
    searchQuery: 'Miley Cyrus Flowers official audio',
    playbackId: 'SWpAYbgHmTo',
  },
  {
    id: 'new-3',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    artwork: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=300&auto=format&fit=crop',
    color: '#FF6B6B',
    date: 'NEW • MAY 24',
    searchQuery: 'Taylor Swift Cruel Summer official audio',
    playbackId: 'ic8j13piAhQ',
  },
  {
    id: 'new-4',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    artwork: 'https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=300&auto=format&fit=crop',
    color: '#7B61FF',
    date: 'NEW • MAY 18',
    searchQuery: 'The Kid LAROI Justin Bieber Stay official audio',
    playbackId: 'rkYlZnIbe2E',
  },
];

const MADE_FOR_YOU_MIXES = [
  {
    id: 'mix-chill',
    title: 'Chill Mix',
    subtitle: 'Relaxing ambient and acoustic tracks',
    gradient: ['#00D4FF', '#7B61FF'],
    tracks: [
      {
        id: 'chill-1',
        title: 'Ocean Breeze',
        artist: 'Chillout Lounge',
        artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop',
        color: '#00D4FF',
        searchQuery: 'chillout lounge ambient acoustic ocean breeze',
        playbackId: '7uo3Pi-A1hk',
      },
      {
        id: 'chill-2',
        title: 'Sunset Boulevard',
        artist: 'Lo-Fi beats',
        artwork: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392f?q=80&w=300&auto=format&fit=crop',
        color: '#7B61FF',
        searchQuery: 'lofi sunset boulevard chill beats',
        playbackId: 'P6eLilGU4kU',
      },
    ]
  },
  {
    id: 'mix-energy',
    title: 'Energy Mix',
    subtitle: 'Upbeat electronic and pop anthems',
    gradient: ['#FF6B6B', '#FFD700'],
    tracks: [
      {
        id: 'energy-1',
        title: 'Electric Highway',
        artist: 'Synthwave Drive',
        artwork: 'https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=300&auto=format&fit=crop',
        color: '#FF6B6B',
        searchQuery: 'synthwave drive electric highway retro electro',
        playbackId: 'YCnLBX_35-Q',
      },
      {
        id: 'energy-2',
        title: 'Techno Fever',
        artist: 'EDM Pulse',
        artwork: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=300&auto=format&fit=crop',
        color: '#FFD700',
        searchQuery: 'edm pulse techno fever club dance',
        playbackId: 'FSV04FIKTnc',
      },
    ]
  },
  {
    id: 'mix-focus',
    title: 'Focus Mix',
    subtitle: 'Instrumental tracks for deep work',
    gradient: ['#00FF85', '#00D4FF'],
    tracks: [
      {
        id: 'focus-1',
        title: 'Quiet Study',
        artist: 'Piano Dreams',
        artwork: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=300&auto=format&fit=crop',
        color: '#00FF85',
        searchQuery: 'piano dreams instrumental focus study ambient',
        playbackId: 'sAcj8me7wGI',
      },
      {
        id: 'focus-2',
        title: 'Deep Meditation',
        artist: 'Zen Garden',
        artwork: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=300&auto=format&fit=crop',
        color: '#00D4FF',
        searchQuery: 'zen garden meditation soundscape nature yoga',
        playbackId: 'l_YSyUpf8Ec',
      },
    ]
  }
];

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
  'True Crime': 'true crime podcast episode case',
  'Tech & AI': 'artificial intelligence technology podcast episode',
  'Science & Mind': 'neuroscience health podcast huberman lab',
  'Comedy': 'funny standup comedy podcast episode',
  'Classic Books': 'narrated classic audio book full',
  'Self-Growth': 'atomic habits deep work self improvement audiobook',
  'Sci-Fi': 'dune science fiction fantasy audiobook',
  'Philosophy': 'stoicism philosophy audiobook narrated',
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

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { user } = useAuthStore();
  const { recentTracks, loadFromStorage } = useRecentStore();
  const [activeFeed, setActiveFeed] = useState<'music' | 'podcasts' | 'audiobooks'>('music');
  const [resolvedPodcasts, setResolvedPodcasts] = useState<Track[]>([]);
  const [resolvedAudiobooks, setResolvedAudiobooks] = useState<Track[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
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

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSynthesizing, setAiSynthesizing] = useState(false);

  const handleAiSynthesize = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiSynthesizing(true);
    try {
      const tracks = await fetchSearch(promptText, 'youtube');
      if (tracks && tracks.length > 0) {
        setQueue(tracks);
        await setCurrentTrack(tracks[0]);
        setAiPrompt('');
      } else {
        Alert.alert('AI Agent Core', 'Synthesizer search returned no logs. Try modifying prompt waves.');
      }
    } catch (e) {
      Alert.alert('AI Agent Error', 'Synthesizer prompt core sync failure.');
    } finally {
      setAiSynthesizing(false);
    }
  };

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

  const resolveCuratedFeeds = async () => {
    const cacheKey = 'resolved:curated:feeds:v3';
    try {
      const cached = await getCached<{ podcasts: Track[]; audiobooks: Track[] }>(cacheKey);
      if (cached && cached.podcasts?.length > 0 && cached.audiobooks?.length > 0) {
        setResolvedPodcasts(cached.podcasts);
        setResolvedAudiobooks(cached.audiobooks);
        return;
      }
    } catch {}

    setLoadingFeeds(true);
    try {
      const podcastPromises = CURATED_PODCASTS.map(async (item) => {
        try {
          const results = await fetchSearch(item.searchQuery || item.title, 'youtube');
          if (results && results.length > 0) {
            const topResult = results[0];
            return {
              ...item,
              title: topResult.title,
              artist: topResult.artist,
              artwork: topResult.artwork,
              playbackId: topResult.playbackId || topResult.id,
              url: topResult.url,
            };
          }
        } catch {}
        return item;
      });

      const audiobookPromises = CURATED_AUDIOBOOKS.map(async (item) => {
        try {
          const results = await fetchSearch(item.searchQuery || item.title, 'youtube');
          if (results && results.length > 0) {
            const topResult = results[0];
            return {
              ...item,
              title: topResult.title,
              artist: topResult.artist,
              artwork: topResult.artwork,
              playbackId: topResult.playbackId || topResult.id,
              url: topResult.url,
            };
          }
        } catch {}
        return item;
      });

      const [pods, abs] = await Promise.all([
        Promise.all(podcastPromises),
        Promise.all(audiobookPromises),
      ]);

      setResolvedPodcasts(pods);
      setResolvedAudiobooks(abs);
      await setCached(cacheKey, { podcasts: pods, audiobooks: abs });
    } catch (e) {
      console.error('Failed to resolve feeds:', e);
      setResolvedPodcasts(CURATED_PODCASTS);
      setResolvedAudiobooks(CURATED_AUDIOBOOKS);
    } finally {
      setLoadingFeeds(false);
    }
  };

  useEffect(() => {
    resolveCuratedFeeds();
  }, []);

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

        {/* Premium Glassmorphic Header Card */}
        <View style={{
          backgroundColor: themeMode === 'dark' ? 'rgba(20,20,22,0.45)' : 'rgba(255,255,255,0.45)',
          borderRadius: 24,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1.2,
          borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          // @ts-ignore
          backdropFilter: 'blur(24px)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 2,
        }}>
          {/* Top Row: Logo & Initials */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingVertical: 4 }}>
              <BrandLogo style={{ width: 180, height: 52, alignSelf: 'flex-start' }} />
            </View>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: themeMode === 'dark' ? 'rgba(0, 255, 133, 0.12)' : 'rgba(10, 132, 255, 0.1)',
              borderWidth: 1.5,
              borderColor: themeMode === 'dark' ? 'rgba(0, 255, 133, 0.45)' : 'rgba(10, 132, 255, 0.45)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 2,
            }}>
              <Text style={{
                color: themeMode === 'dark' ? '#00FF85' : '#0A84FF',
                fontWeight: '900',
                fontSize: 13,
                letterSpacing: 0.5
              }}>{initials}</Text>
            </View>
          </View>

          {/* Sub Row: Greeting */}
          <Text style={{
            color: palette.textSubtle,
            fontWeight: '600',
            fontSize: 12.5,
            letterSpacing: 0.4,
            marginTop: 10,
            marginBottom: 4,
          }} numberOfLines={1}>
            {greeting}
          </Text>

          {/* Dynamic Switcher inside the Header Card */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: 3,
            marginTop: 14,
            borderWidth: 1,
            borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          }}>
            {['Music', 'Podcasts', 'Audiobooks'].map((feed) => {
              const feedKey = feed.toLowerCase() as 'music' | 'podcasts' | 'audiobooks';
              const isActive = activeFeed === feedKey;
              return (
                <TouchableOpacity
                  key={feed}
                  onPress={() => setActiveFeed(feedKey)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 11,
                    backgroundColor: isActive
                      ? (themeMode === 'dark' ? 'rgba(0, 255, 133, 0.12)' : 'rgba(10, 132, 255, 0.08)')
                      : 'transparent',
                    borderWidth: 1.2,
                    borderColor: isActive
                      ? (themeMode === 'dark' ? 'rgba(0, 255, 133, 0.45)' : 'rgba(10, 132, 255, 0.45)')
                      : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isActive ? (themeMode === 'dark' ? '#00FF85' : '#0A84FF') : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isActive ? 0.3 : 0,
                    shadowRadius: 6,
                    elevation: isActive ? 1 : 0,
                  }}
                >
                  <Text style={{
                    color: isActive
                      ? (themeMode === 'dark' ? '#00FF85' : '#0A84FF')
                      : (themeMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                    fontWeight: '800',
                    fontSize: 12,
                    letterSpacing: 0.5,
                  }}>{feed}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {activeFeed === 'music' && (
          <>
            {/* ── AI CO-PILOT STAGE ── */}
            <View style={[
              {
                backgroundColor: themeMode === 'dark' ? 'rgba(12, 12, 14, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                borderRadius: 20,
                padding: 20,
                marginBottom: 28,
                borderWidth: 1.2,
                borderColor: themeMode === 'dark' ? 'rgba(0, 255, 133, 0.15)' : 'rgba(10, 132, 255, 0.15)',
                // @ts-ignore
                backdropFilter: 'blur(24px)',
              },
              shadow(themeMode === 'dark' ? '0px 8px 30px rgba(0, 255, 133, 0.08)' : '0px 8px 30px rgba(10, 132, 255, 0.08)', {
                shadowColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              })
            ]}>
              {/* Telemetry Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF', shadowColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF', shadowOpacity: 0.8, shadowRadius: 4, elevation: 1 }} />
                  <Text style={{ color: themeMode === 'dark' ? '#00FF85' : '#0A84FF', fontWeight: '900', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                    Agent Synapse v4.0
                  </Text>
                </View>
                <Text style={{ color: palette.textSubtle, fontSize: 9, fontFamily: 'monospace', opacity: 0.6 }}>
                  LATENCY: 9.8MS
                </Text>
              </View>

              {/* Status Log Box */}
              <View style={{ backgroundColor: themeMode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.03)', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <Text style={{ color: '#00D4FF', fontSize: 9, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 2 }}>
                  SYSTEM MODE: ACTIVE CO-PILOT
                </Text>
                <Text style={{ color: palette.textSubtle, fontSize: 9, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                  {aiSynthesizing ? 'STATUS: SYNTHESIZING NEURAL AUDIO STREAM...' : 'STATUS: WAITING FOR AUDIO VIBE SELECTION'}
                </Text>
              </View>

              {/* Terminal-like Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeMode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)', borderRadius: 12, borderWidth: 1, borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingHorizontal: 12, height: 46, marginBottom: 16 }}>
                <Text style={{ color: themeMode === 'dark' ? '#00FF85' : '#0A84FF', fontWeight: '700', fontSize: 13, marginRight: 6, fontFamily: 'monospace' }}>
                  $
                </Text>
                <TextInput
                  placeholder="Ask Neural DJ to synthesize a vibe..."
                  placeholderTextColor={themeMode === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  onSubmitEditing={() => handleAiSynthesize(aiPrompt)}
                  style={{ flex: 1, color: palette.text, fontSize: 13, fontWeight: '600', height: '100%', padding: 0 }}
                />
                {aiSynthesizing ? (
                  <ActivityIndicator size="small" color={themeMode === 'dark' ? '#00FF85' : '#0A84FF'} />
                ) : (
                  <TouchableOpacity onPress={() => handleAiSynthesize(aiPrompt)} disabled={!aiPrompt.trim()} style={{ opacity: aiPrompt.trim() ? 1 : 0.4 }}>
                    <Sparkles stroke={themeMode === 'dark' ? '#00FF85' : '#0A84FF'} size={18} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Modulators Title */}
              <Text style={{ color: palette.textSubtle, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Synaptic Modulators
              </Text>

              {/* Grid of modulators */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { name: 'Focus', query: 'lofi study coding instrumental beats', color: '#00FF85', bg: 'rgba(0, 255, 133, 0.08)', desc: 'Study Instrumental' },
                  { name: 'Overdrive', query: 'cyberpunk synthwave electronic workout music', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.08)', desc: 'High-Tempo Synth' },
                  { name: 'Synthesize', query: 'futuristic pop electronic dance hits 2024', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.08)', desc: 'Cyber-Pop Stream' },
                  { name: 'Ethereal', query: 'ambient space cinematic dream pads relaxing', color: '#FF4ECD', bg: 'rgba(255, 78, 205, 0.08)', desc: 'Cinematic Pads' }
                ].map((mod) => (
                  <TouchableOpacity
                    key={mod.name}
                    onPress={() => handleAiSynthesize(mod.query)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      backgroundColor: mod.bg,
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: `${mod.color}35`,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: mod.color }} />
                    <View>
                      <Text style={{ color: mod.color, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {mod.name}
                      </Text>
                      <Text style={{ color: palette.textSubtle, fontSize: 8, fontWeight: '600', marginTop: 1 }}>
                        {mod.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── RECENTLY PLAYED ── */}
            {recentTracks.length > 0 && (
          <>
            <Text style={{ color: '#7B61FF', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 10, marginTop: 16 }}>
              Recently Played
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, paddingVertical: 4 }}>
              {recentTracks.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => playSong(item as any, recentTracks as any, 'neutral')}
                  style={{ marginRight: 16, alignItems: 'center', width: 84 }}
                >
                  <View style={[
                    { borderRadius: 16, borderWidth: 2.5, borderColor: item.color, overflow: 'hidden', marginBottom: 8 },
                    shadow('2px 2px 8px rgba(0,0,0,0.15)', { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 })
                  ]}>
                    <SafeImage
                      uri={item.artwork}
                      style={{ width: 72, height: 72 }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── EVERYDAY RECOMMENDATIONS ── */}
        <View style={{ marginTop: 6, marginBottom: 22 }}>
          <Text style={{ color: '#FF2F3F', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10 }}>
            Quick Picks
          </Text>

          {dailyError && (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: 'rgba(255,107,107,0.3)',
                backgroundColor: 'rgba(42,16,16,0.75)',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 14,
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
              {[1, 2].map((col) => (
                <View key={col} style={{ width: 310, marginRight: 18 }}>
                  {[1, 2, 3, 4].map((row) => (
                    <TrackRowSkeleton key={row} />
                  ))}
                </View>
              ))}
            </ScrollView>
          ) : dailyRecommendations.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
              {chunkArray(dailyRecommendations, 4).map((chunk, colIndex) => (
                <View key={colIndex} style={{ width: 310, marginRight: 18 }}>
                  {chunk.map((item) => {
                    const isCurrent = currentTrack?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => playSong(item, dailyRecommendations, 'neutral')}
                        activeOpacity={0.88}
                        style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 8,
                            borderRadius: 14,
                            marginBottom: 8,
                            backgroundColor: isCurrent 
                              ? 'rgba(255, 47, 63, 0.08)' 
                              : (themeMode === 'dark' ? 'rgba(28,28,30,0.3)' : 'rgba(255,255,255,0.5)'),
                            borderWidth: 1.5,
                            borderColor: isCurrent 
                              ? 'rgba(255, 47, 63, 0.35)' 
                              : (themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                          },
                          shadow(isCurrent ? '0px 4px 12px rgba(255,47,63,0.15)' : '0px 2px 8px rgba(0,0,0,0.05)', {
                            shadowColor: isCurrent ? '#FF2F3F' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                          })
                        ]}
                      >
                        <SafeImage
                          uri={item.artwork}
                          style={{ width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: palette.border }}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                          <Text
                            style={{ 
                              color: isCurrent ? '#FF2F3F' : palette.text, 
                              fontWeight: '800', 
                              fontSize: 13, 
                              textTransform: 'uppercase', 
                              letterSpacing: 0.3 
                            }}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text 
                            style={{ 
                              color: palette.textSubtle, 
                              fontWeight: '600', 
                              fontSize: 10.5, 
                              marginTop: 3, 
                              textTransform: 'uppercase', 
                              letterSpacing: 0.5 
                            }} 
                            numberOfLines={1}
                          >
                            {item.artist}
                          </Text>
                        </View>
                        <View style={{ marginRight: 4 }}>
                          {isCurrent && isPlaying ? (
                            <View style={{ height: 24, justifyContent: 'center' }}>
                              <EqualizerBars color="#FF2F3F" barCount={4} height={16} active={isPlaying} />
                            </View>
                          ) : (
                            <Play stroke={isCurrent ? '#FF2F3F' : palette.textSubtle} fill={isCurrent ? '#FF2F3F' : 'none'} size={16} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: palette.textMuted, fontWeight: '700', textTransform: 'uppercase', fontSize: 11 }}>
              We are curating your next daily mix.
            </Text>
          )}
        </View>

        {/* ── TOP CHARTS ── */}
        <View style={{ marginTop: 6, marginBottom: 26 }}>
          <Text style={{ color: '#00FF85', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
            Top Charts
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
            {TOP_CHARTS_TRACKS.map((item, index) => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', width: 280, marginRight: 16 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: item.color, width: 44, textAlign: 'center', opacity: 0.9 }}>
                  {index + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => playSong(item, TOP_CHARTS_TRACKS, 'neutral')}
                  activeOpacity={0.88}
                  style={[
                    {
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                      // @ts-ignore
                      backdropFilter: 'blur(20px)',
                    },
                    shadow('0px 4px 12px rgba(0,0,0,0.1)', {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                      elevation: 3,
                    })
                  ]}
                >
                  <SafeImage uri={item.artwork} style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, marginTop: 2, textTransform: 'uppercase' }} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── NEW RELEASES ── */}
        <View style={{ marginTop: 6, marginBottom: 26 }}>
          <Text style={{ color: '#FF9500', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
            New Releases This Week
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
            {NEW_RELEASES_TRACKS.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => playSong(item, NEW_RELEASES_TRACKS, 'neutral')}
                activeOpacity={0.88}
                style={[
                  {
                    width: 150,
                    marginRight: 16,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                    padding: 12,
                    // @ts-ignore
                    backdropFilter: 'blur(20px)',
                  },
                  shadow(`0px 6px 16px ${item.color}25`, {
                    shadowColor: item.color,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  })
                ]}
              >
                <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                  <SafeImage uri={item.artwork} style={{ width: '100%', height: 110 }} resizeMode="cover" />
                  <View style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 6,
                    backgroundColor: 'rgba(0,0,0,0.72)',
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <Text style={{ color: '#00FF85', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>{item.date}</Text>
                  </View>
                </View>
                <Text style={{ color: palette.text, fontWeight: '900', fontSize: 12, marginTop: 8, textTransform: 'uppercase' }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 10, marginTop: 2, textTransform: 'uppercase' }} numberOfLines={1}>
                  {item.artist}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── MADE FOR YOU ── */}
        <View style={{ marginTop: 6, marginBottom: 26 }}>
          <Text style={{ color: '#FF2D55', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
            Made For You
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
            {MADE_FOR_YOU_MIXES.map((mix) => (
              <TouchableOpacity
                key={mix.id}
                onPress={() => playSong(mix.tracks[0], mix.tracks, 'neutral')}
                activeOpacity={0.88}
                style={[
                  {
                    width: 200,
                    height: 140,
                    marginRight: 16,
                    borderRadius: 20,
                    overflow: 'hidden',
                    position: 'relative',
                    justifyContent: 'flex-end',
                    backgroundColor: mix.gradient[0],
                    // @ts-ignore
                    backgroundImage: `linear-gradient(135deg, ${mix.gradient[0]}, ${mix.gradient[1]})`,
                  },
                  shadow(`0px 8px 20px ${mix.gradient[0]}40`, {
                    shadowColor: mix.gradient[0],
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 4,
                  })
                ]}
              >
                {/* Glass card info overlay at bottom */}
                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: 12,
                  // @ts-ignore
                  backdropFilter: 'blur(10px)',
                }}>
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {mix.title}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.72)', fontWeight: '600', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                    {mix.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── TRENDING NOW ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 40 }}>
            {trending.map((item, index) => {
              const tags = getEditorialTags(item, trendingRegion);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(index * 100).springify()}
                  layout={Layout.springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => playSong(item, trending, trendingRegion)}
                    style={[
                      {
                        marginRight: 20,
                        borderWidth: 2.5,
                        borderColor: palette.border,
                        borderRadius: 20,
                        backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                        padding: 14,
                        width: 220,
                        height: 290,
                        justifyContent: 'space-between',
                        // @ts-ignore - Glassmorphism support
                        backdropFilter: 'blur(20px)',
                      },
                      shadow(`4px 4px 0px ${item.color}`, {
                        shadowColor: item.color,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 0.8,
                        shadowRadius: 0,
                        elevation: 6,
                      })
                    ]}
                  >
                    <SafeImage
                      uri={item.artwork}
                      style={{ width: '100%', height: 140, borderRadius: 14, borderWidth: 2, borderColor: palette.border }}
                      resizeMode="cover"
                    />
                    <View style={{ marginTop: 10, flex: 1, justifyContent: 'flex-end' }}>
                      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={tags} />
                    </View>
                    <View style={{ position: 'absolute', bottom: 14, right: 14, width: 36, height: 36, backgroundColor: palette.text, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 }}>
                      <Play stroke={palette.background} fill={palette.background} size={14} />
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
              borderRadius: 20,
              borderWidth: 1.2,
              borderColor: themeMode === 'dark' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(10, 132, 255, 0.2)',
              backgroundColor: themeMode === 'dark' ? 'rgba(12, 12, 16, 0.55)' : 'rgba(255, 255, 255, 0.65)',
              padding: 18,
              marginBottom: 24,
              // @ts-ignore
              backdropFilter: 'blur(20px)',
            },
            shadow('0px 8px 24px rgba(0, 212, 255, 0.1)', {
              shadowColor: '#00D4FF',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
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
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(0, 212, 255, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#00D4FF', fontWeight: '900', fontSize: 18 }}>{uniqueArtists}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>Unique Artists</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(255, 153, 51, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#FF9933', fontWeight: '900', fontSize: 18 }}>{indiaSignalCount}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>India Signals</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(0, 255, 133, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#00FF85', fontWeight: '900', fontSize: 18 }}>{trending.length}</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>Blend Size</Text>
            </View>
          </View>

          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
            Country-Target Analytics (Local Telemetry)
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(255, 153, 51, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#FF9933', fontWeight: '900', fontSize: 16 }}>{indiaCtrProxy.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>India CTR Proxy</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(0, 212, 255, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#00D4FF', fontWeight: '900', fontSize: 16 }}>{globalRetentionProxy.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>Global Retention</Text>
            </View>
            <View style={{ width: '31%', borderWidth: 1.5, borderColor: 'rgba(123, 97, 255, 0.25)', padding: 10, borderRadius: 14, backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <Text style={{ color: '#7B61FF', fontWeight: '900', fontSize: 16 }}>{diasporaPlayShare.toFixed(1)}%</Text>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 10, textTransform: 'uppercase', marginTop: 2 }}>Diaspora Share</Text>
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
                  style={[
                    {
                      width: 210,
                      marginRight: 12,
                      borderWidth: 1.5,
                      borderColor: isActive ? focus.color : 'rgba(255,255,255,0.06)',
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isActive ? 'rgba(28,28,30,0.8)' : (themeMode === 'dark' ? 'rgba(28,28,30,0.4)' : 'rgba(255,255,255,0.6)'),
                      // @ts-ignore
                      backdropFilter: 'blur(20px)',
                    },
                    shadow(isActive ? `0px 6px 16px ${focus.color}35` : '0px 2px 8px rgba(0,0,0,0.05)', {
                      shadowColor: isActive ? focus.color : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isActive ? 0.25 : 0.05,
                      shadowRadius: 8,
                      elevation: 3,
                    })
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? focus.color : palette.textSubtle,
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
                      color: palette.text,
                      opacity: isActive ? 0.95 : 0.7,
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
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderRadius: 16,
                        marginBottom: 10,
                        padding: 10,
                        backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                        // @ts-ignore
                        backdropFilter: 'blur(20px)',
                      },
                      shadow(`0px 6px 16px ${item.color}25`, {
                        shadowColor: item.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 3,
                      })
                    ]}
                  >
                    <SafeImage
                      uri={item.artwork}
                      style={{ width: 56, height: 56, borderRadius: 10, marginRight: 10 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={tags} />
                    </View>
                    <View style={{ width: 34, height: 34, backgroundColor: item.color, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
          {['Focus', 'Chill', 'Gym', 'Party'].map((mood, i) => {
            const moodColors = ['#7B61FF', '#1C1C1E', '#00FF85', '#00D4FF'];
            const textColors = ['#FFF', '#FFF', '#0A0A0A', '#0A0A0A'];
            const borderColors = ['#FFF', '#00D4FF', '#0A0A0A', '#0A0A0A'];
            const isActive = activeMood === mood;
            return (
              <TouchableOpacity
                key={mood}
                activeOpacity={0.8}
                onPress={() => handleMood(mood)}
                style={[
                  {
                    width: '47%',
                    padding: 20,
                    marginVertical: 8,
                    borderWidth: 1.5,
                    borderRadius: 16,
                    backgroundColor: moodColors[i],
                    borderColor: isActive ? '#00FF85' : 'rgba(255,255,255,0.08)',
                  },
                  shadow(
                    isActive ? '0px 8px 24px rgba(0,255,133,0.3)' : '0px 4px 12px rgba(0,0,0,0.15)',
                    {
                      shadowColor: isActive ? '#00FF85' : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isActive ? 0.35 : 0.15,
                      shadowRadius: 8,
                      elevation: 4,
                    }
                  ),
                ]}
              >
                <Text
                  style={{
                    color: textColors[i],
                    fontWeight: '900',
                    fontSize: 18,
                    textTransform: 'uppercase',
                  }}
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
          </>
        )}

        {/* ── PODCAST FEED ── */}
        {activeFeed === 'podcasts' && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
              Curated Shows & Episodes
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, paddingVertical: 4 }}>
              {(resolvedPodcasts.length > 0 ? resolvedPodcasts : CURATED_PODCASTS).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => playSong(item, (resolvedPodcasts.length > 0 ? resolvedPodcasts : CURATED_PODCASTS), 'neutral')}
                  activeOpacity={0.88}
                  style={[
                    {
                      marginRight: 16,
                      width: 170,
                      borderRadius: 16,
                      borderWidth: 2.5,
                      borderColor: palette.border,
                      backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                      padding: 12,
                      // @ts-ignore
                      backdropFilter: 'blur(20px)',
                    },
                    shadow(`4px 4px 0px ${item.color}`, {
                      shadowColor: item.color,
                      shadowOffset: { width: 4, height: 4 },
                      shadowOpacity: 0.8,
                      shadowRadius: 0,
                      elevation: 6,
                    })
                  ]}
                >
                  <SafeImage
                    uri={item.artwork}
                    style={{ width: '100%', height: 120, borderRadius: 12, borderWidth: 2, borderColor: palette.border }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{ color: palette.text, fontWeight: '900', fontSize: 13, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: palette.accentStrong, fontWeight: '700', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              Browse Podcast Genres
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
              {[
                { name: 'True Crime', query: 'True Crime', color: '#FF6B6B' },
                { name: 'Tech & AI', query: 'Tech & AI', color: '#00D4FF' },
                { name: 'Science & Mind', query: 'Science & Mind', color: '#00FF85' },
                { name: 'Comedy', query: 'Comedy', color: '#FFD700' },
              ].map((moodItem) => {
                const isActive = activeMood === moodItem.name;
                return (
                  <TouchableOpacity
                    key={moodItem.name}
                    activeOpacity={0.8}
                    onPress={() => handleMood(moodItem.name)}
                    style={[
                      {
                        width: '47%',
                        padding: 20,
                        marginVertical: 8,
                        borderWidth: 1.5,
                        borderRadius: 16,
                        backgroundColor: moodItem.color,
                        borderColor: isActive ? '#00FF85' : 'rgba(255,255,255,0.08)',
                      },
                      shadow(
                        isActive ? '0px 8px 24px rgba(0,255,133,0.3)' : '0px 4px 12px rgba(0,0,0,0.15)',
                        {
                          shadowColor: isActive ? '#00FF85' : '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isActive ? 0.35 : 0.15,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      ),
                    ]}
                  >
                    <Text style={{ fontWeight: '900', fontSize: 18, textTransform: 'uppercase', color: '#0A0A0A' }}>
                      {moodItem.name}
                    </Text>
                    {isActive && (
                      <Text style={{ color: '#0A0A0A', opacity: 0.7, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                        PLAYING ›
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── AUDIOBOOKS FEED ── */}
        {activeFeed === 'audiobooks' && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#FF4ECD', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
              Best Selling Audiobooks
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, paddingVertical: 4 }}>
              {(resolvedAudiobooks.length > 0 ? resolvedAudiobooks : CURATED_AUDIOBOOKS).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => playSong(item, (resolvedAudiobooks.length > 0 ? resolvedAudiobooks : CURATED_AUDIOBOOKS), 'neutral')}
                  activeOpacity={0.88}
                  style={[
                    {
                      marginRight: 16,
                      width: 170,
                      borderRadius: 16,
                      borderWidth: 2.5,
                      borderColor: palette.border,
                      backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                      padding: 12,
                      // @ts-ignore
                      backdropFilter: 'blur(20px)',
                    },
                    shadow(`4px 4px 0px ${item.color}`, {
                      shadowColor: item.color,
                      shadowOffset: { width: 4, height: 4 },
                      shadowOpacity: 0.8,
                      shadowRadius: 0,
                      elevation: 6,
                    })
                  ]}
                >
                  <SafeImage
                    uri={item.artwork}
                    style={{ width: '100%', height: 120, borderRadius: 12, borderWidth: 2, borderColor: palette.border }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{ color: palette.text, fontWeight: '900', fontSize: 13, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: palette.accentStrong, fontWeight: '700', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              Audiobook Shelves
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
              {[
                { name: 'Classic Books', query: 'Classic Books', color: '#7B61FF' },
                { name: 'Self-Growth', query: 'Self-Growth', color: '#00FF85' },
                { name: 'Sci-Fi', query: 'Sci-Fi', color: '#FFD700' },
                { name: 'Philosophy', query: 'Philosophy', color: '#FF4ECD' },
              ].map((moodItem) => {
                const isActive = activeMood === moodItem.name;
                return (
                  <TouchableOpacity
                    key={moodItem.name}
                    activeOpacity={0.8}
                    onPress={() => handleMood(moodItem.name)}
                    style={[
                      {
                        width: '47%',
                        padding: 20,
                        marginVertical: 8,
                        borderWidth: 1.5,
                        borderRadius: 16,
                        backgroundColor: moodItem.color,
                        borderColor: isActive ? '#00FF85' : palette.border,
                      },
                      shadow(
                        isActive ? '0px 8px 24px rgba(0,255,133,0.3)' : '0px 4px 12px rgba(0,0,0,0.15)',
                        {
                          shadowColor: isActive ? '#00FF85' : '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isActive ? 0.35 : 0.15,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      ),
                    ]}
                  >
                    <Text style={{ fontWeight: '900', fontSize: 18, textTransform: 'uppercase', color: '#0A0A0A' }}>
                      {moodItem.name}
                    </Text>
                    {isActive && (
                      <Text style={{ color: '#0A0A0A', opacity: 0.7, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                        PLAYING ›
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── MOOD RESULTS ── */}
        {activeMood !== '' && (
          <>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
              {activeMood} Picks
            </Text>
            {loadingMood ? (
              <ActivityIndicator size="large" color="#7B61FF" style={{ marginBottom: 40 }} />
            ) : (
              <View style={{ marginBottom: 40 }}>
                {moodTracks.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => playSong(item, moodTracks, 'neutral')}
                    activeOpacity={0.9}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 14,
                        backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)',
                        // @ts-ignore
                        backdropFilter: 'blur(20px)',
                      },
                      shadow(`0px 6px 16px ${item.color}25`, {
                        shadowColor: item.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                      })
                    ]}
                  >
                    <SafeImage
                      uri={item.artwork}
                      style={{ width: 64, height: 64, borderRadius: 12, marginRight: 16 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16, textTransform: 'uppercase' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      <EditorialTagStrip tags={getEditorialTags(item, 'neutral')} />
                    </View>
                    <View style={{ width: 40, height: 40, backgroundColor: item.color, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                      <Play stroke="#FFF" fill="#FFF" size={16} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Bottom padding: floating tab bar (72+12) + MiniPlayer + buffer */}
        <View style={{ height: 200 }} />

      </ScrollView>
    </SafeAreaView>
  );
}
