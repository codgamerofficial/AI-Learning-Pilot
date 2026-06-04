import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Play, Trash2, Users } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from '../store/playerStore';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './Search';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { useJamStore } from '../store/jamStore';
import { fetchSearch } from '../lib/apiClient';
import { shadow } from '../lib/shadow';
import SafeImage from '../components/SafeImage';

type LibraryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  color: string;
  track_id?: string;
}

interface Playlist {
  id: string;
  title: string;
  user_id?: string;
  created_at?: string;
}

const LOCAL_PLAYLISTS_KEY = 'neotunes_local_playlists_v1';
const PLAYLISTS_BACKEND_DISABLED_KEY = 'neotunes_playlists_backend_disabled_v1';

const AVAILABLE_ARTISTS = [
  { name: 'Arijit Singh', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop', color: '#FF9933' },
  { name: 'Taylor Swift', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop', color: '#7B61FF' },
  { name: 'Billie Eilish', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop', color: '#00FF85' },
  { name: 'The Weeknd', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop', color: '#FF6B6B' },
  { name: 'Diljit Dosanjh', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop', color: '#FFD700' },
  { name: 'Drake', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=300&auto=format&fit=crop', color: '#00D4FF' },
  { name: 'Shreya Ghoshal', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop', color: '#FF4ECD' },
  { name: 'Bruno Mars', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=300&auto=format&fit=crop', color: '#00FF85' }
];

function isPlaylistsTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  return /public\.playlists/i.test(error.message ?? '');
}

async function getLocalPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalPlaylists(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch {
    // Ignore local cache write errors to avoid breaking playback/library UX.
  }
}

async function getPlaylistsBackendDisabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PLAYLISTS_BACKEND_DISABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

async function setPlaylistsBackendDisabled(disabled: boolean): Promise<void> {
  try {
    if (disabled) {
      await AsyncStorage.setItem(PLAYLISTS_BACKEND_DISABLED_KEY, '1');
    } else {
      await AsyncStorage.removeItem(PLAYLISTS_BACKEND_DISABLED_KEY);
    }
  } catch {
    // Ignore local flag persistence errors.
  }
}

function createLocalPlaylist(title: string, userId: string): Playlist {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
}

export default function LibraryScreen({ navigation }: LibraryScreenProps) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const jamConnected = useJamStore((state) => state.isConnected);
  const jamRole = useJamStore((state) => state.role);

  const [savedTracks, setSavedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSource, setPlaylistSource] = useState<'remote' | 'local'>('remote');
  const [retryingPlaylists, setRetryingPlaylists] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'playlists' | 'tracks' | 'artists'>('tracks');
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [loadingCombo, setLoadingCombo] = useState(false);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { user } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      const fetchLibrary = async () => {
        if (!user) return;
        setLoading(true);

        const tracksRes = await supabase.from('saved_tracks').select('*').order('created_at', { ascending: false });

        if (tracksRes.error) console.error(tracksRes.error);
        else setSavedTracks(tracksRes.data || []);

        const backendDisabled = await getPlaylistsBackendDisabled();
        if (backendDisabled) {
          setPlaylistSource('local');
          setPlaylists(await getLocalPlaylists());
          setLoading(false);
          return;
        }

        const playlistsRes = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
        if (playlistsRes.error) {
          if (isPlaylistsTableMissing(playlistsRes.error)) {
            await setPlaylistsBackendDisabled(true);
            setPlaylistSource('local');
            setPlaylists(await getLocalPlaylists());
          } else {
            console.error(playlistsRes.error);
            setPlaylists([]);
          }
        } else {
          setPlaylistSource('remote');
          setPlaylists((playlistsRes.data as Playlist[]) || []);
          await setPlaylistsBackendDisabled(false);
        }

        setLoading(false);
      };

      fetchLibrary();
    }, [user])
  );

  const playSong = (track: Track) => {
    if (jamConnected && jamRole === 'guest') {
      Alert.alert('Jam Mode Active', 'Only the host can change queue and tracks during a Jam session.');
      return;
    }

    // Map db schema back to generic track expected by player
    const mappedTrack = {
      id: track.track_id, 
      title: track.title, 
      artist: track.artist, 
      artwork: track.artwork, 
      color: track.color
    };
    
    // Convert all saved tracks to format for queue queue
    const mappedQueue = savedTracks.map(t => ({
      id: t.track_id ?? '', title: t.title, artist: t.artist, artwork: t.artwork, color: t.color
    }));

    setQueue(mappedQueue);
    setCurrentTrack({ ...mappedTrack, id: mappedTrack.id ?? '' });
    navigation.navigate('Player');
  };

  const removeTrack = async (id: string) => {
    const { error } = await supabase.from('saved_tracks').delete().eq('id', id);
    if (!error) {
      setSavedTracks(prev => prev.filter(t => t.id !== id));
    } else {
      Alert.alert("Error removing track", error.message);
    }
  };

  const createPlaylist = async () => {
    const title = newPlaylistTitle.trim();
    if (!title || !user) return;

    if (playlistSource === 'local') {
      const localPlaylist = createLocalPlaylist(title, user.id);
      const nextPlaylists = [localPlaylist, ...playlists];
      setPlaylists(nextPlaylists);
      await saveLocalPlaylists(nextPlaylists);
      setNewPlaylistTitle('');
      return;
    }

    const { data, error } = await supabase.from('playlists').insert([
      { title, user_id: user.id }
    ]).select().single();

    if (error) {
      if (isPlaylistsTableMissing(error)) {
        await setPlaylistsBackendDisabled(true);
        setPlaylistSource('local');

        const existingLocal = await getLocalPlaylists();
        const localPlaylist = createLocalPlaylist(title, user.id);
        const nextPlaylists = [localPlaylist, ...existingLocal];
        setPlaylists(nextPlaylists);
        await saveLocalPlaylists(nextPlaylists);
        setNewPlaylistTitle('');

        Alert.alert(
          'Playlists in Local Mode',
          'Supabase table public.playlists is missing. New playlists are being saved locally until backend schema is applied.',
        );
        return;
      }

      Alert.alert("Error", error.message);
    } else if (data) {
      setPlaylists(prev => [data, ...prev]);
      setNewPlaylistTitle('');
    }
  };

  const retryPlaylistBackend = async () => {
    if (!user || retryingPlaylists) return;
    setRetryingPlaylists(true);

    const playlistsRes = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
    if (playlistsRes.error) {
      if (isPlaylistsTableMissing(playlistsRes.error)) {
        await setPlaylistsBackendDisabled(true);
        setPlaylistSource('local');
        setPlaylists(await getLocalPlaylists());
        Alert.alert('Backend Not Ready', 'public.playlists is still missing. Apply the SQL patch and retry.');
      } else {
        Alert.alert('Backend Error', playlistsRes.error.message);
      }
    } else {
      await setPlaylistsBackendDisabled(false);
      setPlaylistSource('remote');
      setPlaylists((playlistsRes.data as Playlist[]) || []);
      Alert.alert('Backend Connected', 'Playlists are now using Supabase.');
    }

    setRetryingPlaylists(false);
  };

  const toggleArtist = (name: string) => {
    setSelectedArtists(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const launchArtistComboStation = async () => {
    if (selectedArtists.length === 0) {
      Alert.alert('Selection Required', 'Select at least one artist to launch your custom combo station!');
      return;
    }

    if (jamConnected && jamRole === 'guest') {
      Alert.alert('Jam Mode Active', 'Only the host can change queue and tracks during a Jam session.');
      return;
    }

    setLoadingCombo(true);
    try {
      const promises = selectedArtists.map(artist =>
        fetchSearch(`${artist} greatest hits popular songs`, 'youtube').catch(() => [])
      );
      const resultsArray = await Promise.all(promises);

      const blended: any[] = [];
      const maxLength = Math.max(...resultsArray.map(r => r.length));

      for (let i = 0; i < maxLength; i += 1) {
        for (let j = 0; j < resultsArray.length; j += 1) {
          const track = resultsArray[j]?.[i];
          if (track) {
            blended.push({
              ...track,
              color: AVAILABLE_ARTISTS.find(a => a.name === selectedArtists[j])?.color ?? '#7B61FF'
            });
          }
        }
      }

      if (blended.length === 0) {
        Alert.alert('No Tracks Found', 'Unable to find any songs for the selected artists. Try again.');
        return;
      }

      setQueue(blended);
      setCurrentTrack(blended[0]);
      navigation.navigate('Player');
    } catch (e) {
      console.error(e);
      Alert.alert('Station Launch Failed', 'We encountered an error setting up your combo station.');
    } finally {
      setLoadingCombo(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1, padding: 24 }}>
        
        {/* Header */}
        <Text style={{ color: palette.text, fontSize: 36, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 20 }}>
          My Library.
        </Text>

        {/* Dynamic iOS-like Segment Switcher */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: themeMode === 'dark' ? 'rgba(12, 12, 14, 0.45)' : 'rgba(0,0,0,0.04)',
          borderRadius: 24,
          padding: 4,
          marginBottom: 24,
          borderWidth: 1.2,
          borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          // @ts-ignore
          backdropFilter: 'blur(20px)',
        }}>
          {[
            { key: 'playlists', label: 'Playlists' },
            { key: 'tracks', label: 'Saved Tracks' },
            { key: 'artists', label: 'Artists Combo' }
          ].map((seg) => {
            const isActive = activeSegment === seg.key;
            return (
              <TouchableOpacity
                key={seg.key}
                onPress={() => setActiveSegment(seg.key as any)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 20,
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
                  shadowOpacity: isActive ? 0.35 : 0,
                  shadowRadius: 6,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <Text style={{
                  color: isActive
                    ? (themeMode === 'dark' ? '#00FF85' : '#0A84FF')
                    : (themeMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                  fontWeight: '800',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>{seg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── PLAYLISTS SEGMENT ── */}
          {activeSegment === 'playlists' && (
            <View>
              <Text style={{ color: '#7B61FF', fontWeight: 'bold', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Playlists</Text>

              {playlistSource === 'local' && (
                <View style={{
                  backgroundColor: themeMode === 'dark' ? 'rgba(255, 153, 51, 0.08)' : 'rgba(255, 153, 51, 0.06)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 153, 51, 0.35)',
                  padding: 16,
                  marginBottom: 16,
                  borderRadius: 14,
                }}>
                  <Text style={{ color: themeMode === 'dark' ? '#FFB366' : '#D46B08', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 16 }}>
                    Backend playlists table missing. Saving playlists locally until schema fix is applied.
                  </Text>
                  <TouchableOpacity
                    onPress={retryPlaylistBackend}
                    disabled={retryingPlaylists}
                    activeOpacity={0.8}
                    style={[
                      {
                        marginTop: 12,
                        alignSelf: 'flex-start',
                        backgroundColor: '#FF9933',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                      },
                      shadow('0px 4px 10px rgba(255,153,51,0.3)', {
                        shadowColor: '#FF9933',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3,
                      })
                    ]}
                  >
                    <Text style={{ color: '#0A0A0A', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {retryingPlaylists ? 'Checking...' : 'Retry Backend'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={[
                {
                  flexDirection: 'row',
                  marginBottom: 24,
                  borderWidth: 1.5,
                  borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.65)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  // @ts-ignore
                  backdropFilter: 'blur(20px)',
                },
                shadow('0px 4px 12px rgba(0,0,0,0.08)', {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                })
              ]}>
                <TextInput 
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontWeight: '600',
                    color: palette.text,
                    fontSize: 15,
                    letterSpacing: 0.3,
                  }}
                  placeholder="NEW PLAYLIST NAME..."
                  placeholderTextColor={palette.textMuted}
                  value={newPlaylistTitle}
                  onChangeText={setNewPlaylistTitle}
                  onSubmitEditing={createPlaylist}
                />
                <TouchableOpacity 
                  onPress={createPlaylist}
                  style={{
                    backgroundColor: palette.accentStrong,
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ color: themeMode === 'dark' ? '#0A0A0A' : '#FFF', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>CREATE</Text>
                </TouchableOpacity>
              </View>

              {playlists.map((pl) => (
                <View key={pl.id} style={[
                  { 
                    backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.65)', 
                    borderWidth: 1.5, 
                    borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', 
                    borderRadius: 16,
                    padding: 14, 
                    marginBottom: 10, 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    // @ts-ignore
                    backdropFilter: 'blur(20px)',
                  },
                  shadow('0px 4px 12px rgba(0,0,0,0.06)', { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 })
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF', shadowColor: themeMode === 'dark' ? '#00FF85' : '#0A84FF', shadowOpacity: 0.8, shadowRadius: 3, elevation: 1 }} />
                    <Text style={{ color: palette.text, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{pl.title}</Text>
                  </View>
                </View>
              ))}
              {playlists.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: palette.textMuted, fontWeight: '800', textTransform: 'uppercase', fontSize: 11 }}>No playlists created yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* ── SAVED TRACKS SEGMENT ── */}
          {activeSegment === 'tracks' && (
            <View>
              <Text style={{ color: '#7B61FF', fontWeight: 'bold', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Saved Tracks</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={palette.accentStrong} style={{ marginTop: 24 }} />
              ) : savedTracks.length > 0 ? (
                <View>
                  {savedTracks.map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      onPress={() => playSong(item)}
                      activeOpacity={0.9} 
                      style={[
                        { 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          borderWidth: 1.5, 
                          borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 
                          borderRadius: 16, 
                          padding: 12, 
                          marginBottom: 12, 
                          backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.7)', 
                          // @ts-ignore
                          backdropFilter: 'blur(20px)',
                        },
                        shadow(`0px 6px 16px ${item.color}25`, { shadowColor: item.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 })
                      ]}
                    >
                      <SafeImage uri={item.artwork} style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.text, fontWeight: '900', fontSize: 15, textTransform: 'uppercase' }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, marginTop: 2 }}>{item.artist}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeTrack(item.id)} style={{ marginRight: 16, padding: 4 }}>
                        <Trash2 stroke="#FF6B6B" size={20} />
                      </TouchableOpacity>
                      <View style={{ width: 36, height: 36, backgroundColor: item.color, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                        <Play stroke="#FFF" fill="#FFF" size={14} style={{ marginLeft: 2 }} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                  <View style={[
                    {
                      width: 80,
                      height: 80,
                      backgroundColor: 'rgba(0, 212, 255, 0.1)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(0, 212, 255, 0.35)',
                      borderRadius: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'center',
                      marginBottom: 20,
                    },
                    shadow('0px 8px 24px rgba(0, 212, 255, 0.25)', {
                      shadowColor: '#00D4FF',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 10,
                      elevation: 4,
                    })
                  ]}>
                    <Play stroke="#00D4FF" fill="#00D4FF" size={28} style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={{ color: palette.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, textAlign: 'center' }}>It's quiet here.</Text>
                  <Text style={{ color: palette.textMuted, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
                    Go to Search to find and save some tracks to your library.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── PREFERRED ARTISTS SEGMENT ── */}
          {activeSegment === 'artists' && (
            <View>
              <Text style={{ color: '#7B61FF', fontWeight: 'bold', fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                Favorite Artists Combo
              </Text>
              <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 20 }}>
                Choose creators to compile a personalized round-robin blended combo station!
              </Text>

              {/* Combo Station Action Banner */}
              <TouchableOpacity
                onPress={launchArtistComboStation}
                disabled={loadingCombo || selectedArtists.length === 0}
                activeOpacity={0.88}
                style={[
                  {
                    backgroundColor: selectedArtists.length === 0 ? palette.surface : palette.accentStrong,
                    borderWidth: 1.5,
                    borderColor: selectedArtists.length === 0 ? (themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : palette.accentStrong,
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    // @ts-ignore
                    backdropFilter: 'blur(20px)',
                  },
                  shadow(selectedArtists.length === 0 ? '0px 4px 12px rgba(0,0,0,0.1)' : `0px 8px 24px ${palette.accentStrong}40`, {
                    shadowColor: selectedArtists.length === 0 ? '#000' : palette.accentStrong,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: selectedArtists.length === 0 ? 0.1 : 0.3,
                    shadowRadius: 10,
                    elevation: selectedArtists.length === 0 ? 2 : 5,
                  })
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: selectedArtists.length === 0 ? palette.text : (themeMode === 'dark' ? '#0A0A0A' : '#FFF'), fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {loadingCombo ? 'COMPILING COMBOS...' : 'LAUNCH COMBO STATION 🎚️'}
                  </Text>
                  <Text style={{ color: selectedArtists.length === 0 ? palette.textSubtle : (themeMode === 'dark' ? 'rgba(10,10,10,0.72)' : 'rgba(255,255,255,0.75)'), fontWeight: '700', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {selectedArtists.length === 0 
                      ? 'SELECT AT LEAST ONE CREATOR BELOW' 
                      : `BLENDING HITS FROM ${selectedArtists.length} FAVORITE CREATORS`
                    }
                  </Text>
                </View>
                <View style={{ width: 44, height: 44, backgroundColor: selectedArtists.length === 0 ? (themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : (themeMode === 'dark' ? '#0A0A0A' : '#FFF'), borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                  {loadingCombo ? (
                    <ActivityIndicator size="small" color={selectedArtists.length === 0 ? palette.text : palette.accentStrong} />
                  ) : (
                    <Users stroke={selectedArtists.length === 0 ? palette.textSubtle : (themeMode === 'dark' ? palette.accentStrong : '#000')} size={18} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
                {AVAILABLE_ARTISTS.map((artist) => {
                  const isSelected = selectedArtists.includes(artist.name);
                  return (
                    <TouchableOpacity
                      key={artist.name}
                      onPress={() => toggleArtist(artist.name)}
                      activeOpacity={0.9}
                      style={[
                        {
                          width: '47%',
                          borderRadius: 24,
                          borderWidth: 1.5,
                          borderColor: isSelected ? palette.accentStrong : (themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                          backgroundColor: themeMode === 'dark' ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.75)',
                          padding: 16,
                          alignItems: 'center',
                          marginBottom: 16,
                          // @ts-ignore
                          backdropFilter: 'blur(20px)',
                        },
                        shadow(isSelected ? `0px 8px 24px ${palette.accentStrong}25` : '0px 4px 12px rgba(0,0,0,0.08)', {
                          shadowColor: isSelected ? palette.accentStrong : '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.25 : 0.08,
                          shadowRadius: 8,
                          elevation: 3,
                        })
                      ]}
                    >
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        borderWidth: 1.5,
                        borderColor: isSelected ? palette.accentStrong : (themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                        overflow: 'hidden',
                        marginBottom: 12,
                      }}>
                        <SafeImage uri={artist.avatar} style={{ width: '100%', height: '100%' }} />
                      </View>
                      
                      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }} numberOfLines={1}>
                        {artist.name}
                      </Text>

                      <View style={{
                        marginTop: 8,
                        backgroundColor: isSelected ? palette.accentStrong : 'transparent',
                        borderColor: isSelected ? palette.accentStrong : (themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      }}>
                        <Text style={{
                          color: isSelected ? '#0A0A0A' : palette.textSubtle,
                          fontWeight: '800',
                          fontSize: 9,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>{isSelected ? 'SELECTED' : 'SELECT'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          
          <View style={{ height: 200 }} />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
