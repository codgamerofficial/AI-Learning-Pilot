import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
} from 'react-native';
import { Heart, MessageCircle, Bookmark, Share2, Plus, ArrowLeft, Send, Check } from 'lucide-react-native';
import { usePlayerStore, Track } from '../store/playerStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import SafeImage from '../components/SafeImage';
import { shadow } from '../lib/shadow';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface PulseTrack extends Track {
  likes: string;
  commentsCount: number;
  caption: string;
  avatar: string;
}

const PULSE_TRACKS: PulseTrack[] = [
  {
    id: 'pulse-suzume',
    title: 'Suzume (Theme Song)',
    artist: 'Radwimps feat. Toaka',
    artwork: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80', // Anime silhouette style
    color: '#7C3AED',
    searchQuery: 'Radwimps Suzume movie theme song official audio',
    likes: '1.2M',
    commentsCount: 3450,
    caption: 'Tuning into the magical wind chimes of Suzume 🌀 An instant travel into Shinkai’s universe.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
  },
  {
    id: 'pulse-gurenge',
    title: 'Gurenge (Demon Slayer)',
    artist: 'LiSA',
    artwork: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80', // Cyberpunk / Japan theme
    color: '#FF6B6B',
    searchQuery: 'LiSA Gurenge official audio anime demon slayer',
    likes: '890K',
    commentsCount: 2190,
    caption: 'Unleashing the absolute Gym energy with Tanjiro’s anthem! ⚔️🔥',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  },
  {
    id: 'pulse-lofi',
    title: 'Late Night Code & Study',
    artist: 'Lofi Girl Focus',
    artwork: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=600&q=80', // Rainy window desk coding style
    color: '#FFC857',
    searchQuery: 'lofi hip hop radio beats to relax study coding',
    likes: '2.4M',
    commentsCount: 9812,
    caption: 'Rainy nights in Cyber Tokyo. The perfect aesthetic for writing spring code 🌧️💻',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  },
  {
    id: 'pulse-nightdrive',
    title: 'Neon Ride Synthwave',
    artist: 'Kavinsky Resonance',
    artwork: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80', // Cyberpunk neon city roads
    color: '#00D4FF',
    searchQuery: 'kavinsky nightcall synthwave drive resonance',
    likes: '620K',
    commentsCount: 1420,
    caption: 'Cruising through the electric pulse of midnight Tokyo. Feel every synth beat. 🏎️🌌',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
  }
];

interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
}

export default function PulseScreen({ navigation }: any) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const isDark = themeMode === 'dark';
  
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  const [likedStates, setLikedStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  // Generate initial mock comments
  useEffect(() => {
    const mockComments: Comment[] = [
      { id: '1', user: 'Aarav Sharma', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80', text: 'This track completely changes the mood of my late-night sessions! 🌟', time: '2h ago', likes: 24 },
      { id: '2', user: 'Riya Sen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80', text: 'The visual sync is gorgeous. The anime aesthetic is so clean here!', time: '4h ago', likes: 18 },
      { id: '3', user: 'Kabir Verma', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&q=80', text: 'Gen-Z visual style combined with Radwimps is chef’s kiss. 👌', time: '1d ago', likes: 42 }
    ];
    setActiveComments(mockComments);
  }, [activeIndex]);

  // Handle active track change on swipe
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setActiveIndex(index);
      const track = PULSE_TRACKS[index];
      // Automatically load and play the swiped-to preview track
      setCurrentTrack(track);
    }
  });

  const toggleLike = (trackId: string) => {
    setLikedStates(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleSave = (trackId: string) => {
    setSavedStates(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleFollow = (artist: string) => {
    setFollowingStates(prev => ({ ...prev, [artist]: !prev[artist] }));
  };

  const handleSendComment = () => {
    if (!newCommentText.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      user: 'Saswata Dey',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80',
      text: newCommentText.trim(),
      time: 'Just now',
      likes: 0
    };
    setActiveComments(prev => [comment, ...prev]);
    setNewCommentText('');
  };

  const renderPulseItem = ({ item, index }: { item: PulseTrack; index: number }) => {
    const isCurrent = index === activeIndex;
    const isLiked = likedStates[item.id] || false;
    const isSaved = savedStates[item.id] || false;
    const isFollowing = followingStates[item.artist] || false;

    return (
      <View style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - (Platform.OS === 'web' ? 0 : 72), // height minus tabbar
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Full Screen Ambient/Anime Video Backdrop */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.7 }}>
          <SafeImage uri={item.artwork} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          
          {/* Dynamic Ambient Color Glow Overlay */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            // Simple gradient to match cyber-blue/aurora-purple aesthetics
            // @ts-ignore
            backgroundImage: `linear-gradient(to bottom, rgba(9,9,11,0.2) 0%, rgba(9,9,11,0.5) 60%, ${item.color}35 80%, #09090B 100%)`
          }} />
        </View>

        {/* Center Pulsing CD / Sound Waves (Micro-interaction visualizer) */}
        {isCurrent && isPlaying && (
          <View style={{
            width: SCREEN_WIDTH * 0.7,
            height: SCREEN_WIDTH * 0.7,
            borderRadius: SCREEN_WIDTH * 0.35,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: item.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 30,
            elevation: 12,
            position: 'absolute'
          }}>
            {/* Spinning artwork ring */}
            <View style={{
              width: SCREEN_WIDTH * 0.55,
              height: SCREEN_WIDTH * 0.55,
              borderRadius: SCREEN_WIDTH * 0.275,
              overflow: 'hidden',
              borderWidth: 6,
              borderColor: '#09090B',
              backgroundColor: '#000'
            }}>
              <SafeImage uri={item.artwork} style={{ width: '100%', height: '100%', opacity: 0.9 }} resizeMode="cover" />
            </View>
          </View>
        )}

        {/* BOTTOM OVERLAYS: Track Info & Description */}
        <View style={{
          position: 'absolute',
          bottom: Platform.OS === 'web' ? 100 : 130, // Position above tab bar
          left: 16,
          right: 90, // Keep space for vertical action sidebar
          zIndex: 10
        }}>
          {/* Tagline */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(124,58,237,0.18)',
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.35)',
            marginBottom: 10,
            // @ts-ignore
            backdropFilter: 'blur(10px)'
          }}>
            <Text style={{ color: '#00D4FF', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
              ⚡ AI PULSE PREVIEW
            </Text>
          </View>

          {/* Artist & Verified Symbol */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>
              @{item.artist}
            </Text>
            <View style={{
              width: 15,
              height: 15,
              borderRadius: 8,
              backgroundColor: '#00D4FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 6
            }}>
              <Check stroke="#09090B" strokeWidth={3} size={10} />
            </View>
          </View>

          {/* Caption */}
          <Text style={{ color: '#E4E4E7', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 12 }}>
            {item.caption}
          </Text>

          {/* Scrolling track title */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFC857', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }} numberOfLines={1}>
              🎵 {item.title} — {item.artist}
            </Text>
          </View>
        </View>

        {/* RIGHT ACTION SIDEBAR */}
        <View style={{
          position: 'absolute',
          right: 16,
          bottom: Platform.OS === 'web' ? 110 : 140,
          width: 60,
          alignItems: 'center',
          gap: 20,
          zIndex: 10
        }}>
          {/* Creator Avatar & Follow Button */}
          <View style={{ width: 50, height: 60, alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: '#7C3AED',
              overflow: 'hidden',
              backgroundColor: '#1C1C1E'
            }}>
              <SafeImage uri={item.avatar} style={{ width: '100%', height: '100%' }} />
            </View>
            
            {/* Follow Plus Badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleFollow(item.artist)}
              style={{
                position: 'absolute',
                bottom: 4,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: isFollowing ? '#00D4FF' : '#7C3AED',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#09090B'
              }}
            >
              {isFollowing ? (
                <Check stroke="#09090B" strokeWidth={3} size={10} />
              ) : (
                <Plus stroke="#FFF" strokeWidth={3.5} size={11} />
              )}
            </TouchableOpacity>
          </View>

          {/* Like Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleLike(item.id)}
            style={{ alignItems: 'center' }}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)'
            }}>
              <Heart
                stroke={isLiked ? '#FF6B6B' : '#F8FAFC'}
                fill={isLiked ? '#FF6B6B' : 'transparent'}
                size={22}
              />
            </View>
            <Text style={{ color: '#F8FAFC', fontSize: 11, fontWeight: '700', marginTop: 4 }}>{item.likes}</Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCommentsVisible(true)}
            style={{ alignItems: 'center' }}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)'
            }}>
              <MessageCircle stroke="#F8FAFC" size={22} />
            </View>
            <Text style={{ color: '#F8FAFC', fontSize: 11, fontWeight: '700', marginTop: 4 }}>{item.commentsCount}</Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleSave(item.id)}
            style={{ alignItems: 'center' }}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)'
            }}>
              <Bookmark
                stroke={isSaved ? '#FFC857' : '#F8FAFC'}
                fill={isSaved ? '#FFC857' : 'transparent'}
                size={22}
              />
            </View>
            <Text style={{ color: '#F8FAFC', fontSize: 11, fontWeight: '700', marginTop: 4 }}>Save</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ alignItems: 'center' }}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)'
            }}>
              <Share2 stroke="#F8FAFC" size={20} />
            </View>
            <Text style={{ color: '#F8FAFC', fontSize: 11, fontWeight: '700', marginTop: 4 }}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090B' }}>
      {/* Top Header */}
      <View style={{
        position: 'absolute',
        top: Platform.OS === 'web' ? 16 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20
      }}>
        <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>
          PULSE
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{
            backgroundColor: 'rgba(9,9,11,0.6)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)'
          }}>
            <Text style={{ color: '#F8FAFC', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ⚡ Trending
            </Text>
          </View>
        </View>
      </View>

      {/* Vertical Swiper */}
      <FlatList
        data={PULSE_TRACKS}
        renderItem={renderPulseItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        snapToInterval={SCREEN_HEIGHT - (Platform.OS === 'web' ? 0 : 72)}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      {/* COMMENTS DRAWER / MODAL */}
      <Modal
        visible={commentsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          {/* Dismiss gesture overlay */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setCommentsVisible(false)}
          />

          <View style={{
            height: SCREEN_HEIGHT * 0.65,
            backgroundColor: '#0E0E12',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1.5,
            borderColor: 'rgba(124,58,237,0.2)',
            padding: 20
          }}>
            {/* Drawer Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                Comments ({activeComments.length})
              </Text>
              <TouchableOpacity
                onPress={() => setCommentsVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: '#A1A1AA', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginBottom: 16 }}>
              {activeComments.map((comment) => (
                <View key={comment.id} style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', marginRight: 10, backgroundColor: '#212121' }}>
                    <SafeImage uri={comment.avatar} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#F8FAFC', fontWeight: '800', fontSize: 12 }}>{comment.user}</Text>
                      <Text style={{ color: '#71717A', fontSize: 10 }}>{comment.time}</Text>
                    </View>
                    <Text style={{ color: '#D4D4D8', fontSize: 12.5, lineHeight: 17, marginTop: 4 }}>
                      {comment.text}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Comment Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 'rgba(9,9,11,0.5)'
            }}>
              <TextInput
                value={newCommentText}
                onChangeText={setNewCommentText}
                placeholder="Share your music thoughts..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{
                  flex: 1,
                  color: '#F8FAFC',
                  fontSize: 13,
                  outlineWidth: 0,
                  height: 38,
                  paddingHorizontal: 4
                }}
              />
              <TouchableOpacity
                onPress={handleSendComment}
                activeOpacity={0.8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#7C3AED',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send stroke="#FFF" size={14} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
