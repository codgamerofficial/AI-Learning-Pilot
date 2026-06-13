/**
 * YouTubeAudioPlayer.tsx
 * Native background playback engine.
 * Uses react-native-track-player on native mobile platforms for system notifications, 
 * lock screen controls, and background playback, while falling back to expo-av on Web.
 */
import React from 'react';
import { View, Platform } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { usePlayerStore, OFFLINE_FALLBACK_AUDIO } from '../store/playerStore';

// Conditional imports for react-native-track-player to maintain web compile compatibility
let TrackPlayer: any;
let Capability: any;
let State: any;
let Event: any;
let AppKilledPlaybackBehavior: any;

if (Platform.OS !== 'web') {
  try {
    const rntp = require('react-native-track-player');
    TrackPlayer = rntp.default;
    Capability = rntp.Capability;
    State = rntp.State;
    Event = rntp.Event;
    AppKilledPlaybackBehavior = rntp.AppKilledPlaybackBehavior;
  } catch (e) {
    console.error('Failed to import react-native-track-player:', e);
  }
}

interface Props {
  videoId: string;
  audioUrl?: string;
  play: boolean;
  onStateChange?: (state: string) => void;
}

let audioModeConfigured = false;
let isTrackPlayerInitialized = false;

async function ensureAudioMode() {
  if (audioModeConfigured) {
    return;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeConfigured = true;
}

async function initTrackPlayer() {
  if (isTrackPlayerInitialized || !TrackPlayer) return;
  try {
    await TrackPlayer.setupPlayer({
      // Allow playback to continue when app is backgrounded or screen is off
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      android: {
        // ContinuePlayback: music keeps playing even if user swipes app from recents
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      // Jump intervals for notification scrub buttons (±15 seconds)
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });
    isTrackPlayerInitialized = true;
    console.log('[TrackPlayer] Native background player setup complete.');
  } catch (e) {
    console.error('[TrackPlayer] setupPlayer error:', e);
  }
}

function NativeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const playerRef = React.useRef<any>(null);
  const isValidYTId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  // playRef tracks active play state without stale closures
  const playRef = React.useRef(play);
  React.useEffect(() => {
    playRef.current = play;
  }, [play]);

  // Preloading & Crossfading Refs for Web
  const preloadedSoundRef = React.useRef<Audio.Sound | null>(null);
  const preloadedUrlRef = React.useRef<string | null>(null);
  const fadeSoundRef = React.useRef<Audio.Sound | null>(null);
  const fadeOutIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeInIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const preloadNextAudio = React.useCallback(async () => {
    if (preloadedSoundRef.current || preloadedUrlRef.current) {
      return;
    }

    const { currentTrack, queue } = usePlayerStore.getState();
    if (!currentTrack || queue.length === 0) return;

    const index = queue.findIndex((t) => t.id === currentTrack.id);
    if (index < 0 || index >= queue.length - 1) return;

    const nextTrack = queue[index + 1];
    if (!nextTrack.url || nextTrack.url === OFFLINE_FALLBACK_AUDIO) return;

    preloadedUrlRef.current = nextTrack.url;
    console.log('[NativeAudioPlayer] Preloading audio for next track:', nextTrack.title);

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextTrack.url },
        {
          shouldPlay: false,
          progressUpdateIntervalMillis: 500,
        }
      );
      preloadedSoundRef.current = sound;
      console.log('[NativeAudioPlayer] Preloaded audio ready:', nextTrack.title);
    } catch (e) {
      console.warn('[NativeAudioPlayer] Audio preloading failed:', e);
      preloadedUrlRef.current = null;
      preloadedSoundRef.current = null;
    }
  }, []);

  const [hasStartedOrReady, setHasStartedOrReady] = React.useState(false);

  React.useEffect(() => {
    setHasStartedOrReady(false);
    if (!audioUrl) {
      usePlayerStore.getState().setCurrentTime(0);
      usePlayerStore.getState().setDuration(0);
    }
  }, [videoId]);

  const handleStateChange = React.useCallback((state: string) => {
    if (state === 'playing' || state === 'paused' || state === 'buffering') {
      setHasStartedOrReady(true);
    }
    onStateChange?.(state);
  }, [onStateChange]);

  // YouTube Timeout
  React.useEffect(() => {
    if (audioUrl || !play || hasStartedOrReady) return;

    const timer = setTimeout(() => {
      if (!hasStartedOrReady) {
        console.warn('[NativeAudioPlayer] YouTube load timeout. Triggering error state.');
        onStateChange?.('error');
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [audioUrl, play, hasStartedOrReady, onStateChange]);

  // YouTube seek register
  React.useEffect(() => {
    if (!audioUrl && isValidYTId) {
      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      });
    }
    return () => {
      if (!audioUrl) {
        usePlayerStore.getState().registerSeekFn(() => {});
      }
    };
  }, [audioUrl, isValidYTId]);

  // YouTube time progress sync
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (play && !audioUrl && isValidYTId) {
      interval = setInterval(async () => {
        if (playerRef.current) {
          try {
            const time = await playerRef.current.getCurrentTime();
            const dur = await playerRef.current.getDuration();
            usePlayerStore.getState().setCurrentTime(time);
            usePlayerStore.getState().setDuration(dur);
          } catch (e) {
            // ignore
          }
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [play, audioUrl, isValidYTId]);

  // ── TRACK PLAYER OR EXPO-AV STATE DRIVER ──
  React.useEffect(() => {
    let cancelled = false;

    if (!audioUrl) {
      return;
    }

    if (Platform.OS !== 'web') {
      // 📱 NATIVE DRIVER (react-native-track-player)
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      let stateListener: any = null;

      const setupNativePlayer = async () => {
        await initTrackPlayer();
        if (cancelled) return;

        try {
          await TrackPlayer.reset();
          const trackInfo = usePlayerStore.getState().currentTrack;
          await TrackPlayer.add({
            id: videoId,
            url: audioUrl,
            title: trackInfo?.title || 'Unknown Title',
            artist: trackInfo?.artist || 'Unknown Artist',
            artwork: trackInfo?.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80',
          });

          if (cancelled) {
            await TrackPlayer.reset();
            return;
          }

          usePlayerStore.getState().registerSeekFn((seconds: number) => {
            void TrackPlayer.seekTo(seconds);
          });

          if (playRef.current) {
            await TrackPlayer.play();
          }

          // Polling progress interval
          progressInterval = setInterval(async () => {
            try {
              const position = await TrackPlayer.getPosition();
              const duration = await TrackPlayer.getDuration();
              if (position >= 0 && duration > 0) {
                usePlayerStore.getState().setCurrentTime(position);
                usePlayerStore.getState().setDuration(duration);

                // Preload trigger when 15 seconds remain
                if (duration - position < 15) {
                  void preloadNextAudio();
                }

                // Check ended state manually
                if (duration - position < 0.5) {
                  onStateChange?.('ended');
                }
              }
            } catch {}
          }, 500);

          // State change listener
          stateListener = TrackPlayer.addEventListener(Event.PlaybackState, (event: any) => {
            const stateName = event.state;
            if (stateName === State.Playing || stateName === 'playing') {
              onStateChange?.('playing');
            } else if (stateName === State.Paused || stateName === 'paused') {
              onStateChange?.('paused');
            } else if (stateName === State.Buffering || stateName === 'buffering') {
              onStateChange?.('buffering');
            }
          });

        } catch (e) {
          console.warn('[TrackPlayer] Setup failed, loading fallback:', e);
          onStateChange?.('error');
        }
      };

      void setupNativePlayer();

      return () => {
        cancelled = true;
        usePlayerStore.getState().registerSeekFn(() => {});
        if (progressInterval) clearInterval(progressInterval);
        if (stateListener) stateListener.remove();
        void TrackPlayer.reset();
      };
    } else {
      // 🌐 WEB DRIVER (expo-av)
      const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;
      let fallbackTime = 0;

      if (isFallback) {
        usePlayerStore.getState().setCurrentTime(0);
        usePlayerStore.getState().setDuration(180);
        fallbackTime = 0;

        usePlayerStore.getState().registerSeekFn((seconds: number) => {
          fallbackTime = seconds;
          usePlayerStore.getState().setCurrentTime(seconds);
        });

        const startFallbackTimer = () => {
          if (fallbackInterval) clearInterval(fallbackInterval);
          fallbackInterval = setInterval(() => {
            fallbackTime += 1;
            if (fallbackTime >= 180) {
              fallbackTime = 0;
              if (fallbackInterval) clearInterval(fallbackInterval);
              onStateChange?.('ended');
            } else {
              usePlayerStore.getState().setCurrentTime(fallbackTime);
            }
          }, 1000);
        };

        onStateChange?.(play ? 'playing' : 'paused');
        if (play) {
          startFallbackTimer();
        }

        return () => {
          cancelled = true;
          if (fallbackInterval) clearInterval(fallbackInterval);
          usePlayerStore.getState().registerSeekFn(() => {});
        };
      }

      const setupSound = async () => {
        await ensureAudioMode();

        if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
        if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);

        const crossfadeSeconds = usePlayerStore.getState().crossfadeSeconds;
        const oldSound = soundRef.current;

        if (oldSound) {
          if (crossfadeSeconds > 0) {
            fadeSoundRef.current = oldSound;
            soundRef.current = null;

            let volume = 1.0;
            const intervalMs = (crossfadeSeconds * 1000) / 10;
            fadeOutIntervalRef.current = setInterval(async () => {
              volume -= 0.1;
              if (volume <= 0.05) {
                if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
                try {
                  await oldSound.unloadAsync();
                } catch {}
                if (fadeSoundRef.current === oldSound) {
                  fadeSoundRef.current = null;
                }
              } else {
                try {
                  await oldSound.setVolumeAsync(volume);
                } catch {}
              }
            }, intervalMs);
          } else {
            void oldSound.unloadAsync();
            soundRef.current = null;
          }
        }

        let sound: Audio.Sound;
        let isPreloaded = false;

        if (preloadedSoundRef.current && preloadedUrlRef.current === audioUrl) {
          console.log('[NativeAudioPlayer] Using preloaded sound:', audioUrl);
          sound = preloadedSoundRef.current;
          isPreloaded = true;
          preloadedSoundRef.current = null;
          preloadedUrlRef.current = null;
        } else {
          if (preloadedSoundRef.current) {
            void preloadedSoundRef.current.unloadAsync();
            preloadedSoundRef.current = null;
            preloadedUrlRef.current = null;
          }

          console.log('[NativeAudioPlayer] Loading sound fresh:', audioUrl);
          const loadResult = await Audio.Sound.createAsync(
            { uri: audioUrl },
            {
              shouldPlay: playRef.current,
              volume: crossfadeSeconds > 0 && playRef.current ? 0.0 : 1.0,
              progressUpdateIntervalMillis: 500,
            }
          );
          sound = loadResult.sound;
        }

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;

        usePlayerStore.getState().registerSeekFn((seconds: number) => {
          void soundRef.current?.setPositionAsync(seconds * 1000);
        });

        sound.setOnPlaybackStatusUpdate((playbackStatus) => {
          if (!playbackStatus.isLoaded) {
            if ('error' in playbackStatus && playbackStatus.error) {
              onStateChange?.('error');
            }
            return;
          }

          const pos = (playbackStatus.positionMillis ?? 0) / 1000;
          const dur = (playbackStatus.durationMillis ?? 0) / 1000;

          usePlayerStore.getState().setCurrentTime(pos);
          usePlayerStore.getState().setDuration(dur);

          if (playbackStatus.isPlaying && dur > 0 && dur - pos < 15) {
            void preloadNextAudio();
          }

          if (playbackStatus.didJustFinish) {
            onStateChange?.('ended');
            return;
          }

          onStateChange?.(playbackStatus.isPlaying ? 'playing' : 'paused');
        });

        if (playRef.current) {
          try {
            if (crossfadeSeconds > 0) {
              await sound.setVolumeAsync(0.0);
              await sound.playAsync();

              let inVolume = 0.0;
              const intervalMs = (crossfadeSeconds * 1000) / 10;
              fadeInIntervalRef.current = setInterval(async () => {
                inVolume += 0.1;
                if (inVolume >= 1.0) {
                  if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);
                  try {
                    await sound.setVolumeAsync(1.0);
                  } catch {}
                } else {
                  try {
                    if (playRef.current) {
                      await sound.setVolumeAsync(inVolume);
                    }
                  } catch {}
                }
              }, intervalMs);
            } else {
              await sound.setVolumeAsync(1.0);
              await sound.playAsync();
            }
          } catch (e) {
            console.warn('[NativeAudioPlayer] Play error:', e);
          }
        } else {
          try {
            await sound.setVolumeAsync(1.0);
          } catch {}
        }
      };

      void setupSound();

      return () => {
        cancelled = true;
        usePlayerStore.getState().registerSeekFn(() => {});
        if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
        if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);

        if (soundRef.current) {
          void soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        if (fadeSoundRef.current) {
          void fadeSoundRef.current.unloadAsync();
          fadeSoundRef.current = null;
        }
        if (preloadedSoundRef.current) {
          void preloadedSoundRef.current.unloadAsync();
          preloadedSoundRef.current = null;
          preloadedUrlRef.current = null;
        }
      };
    }
  }, [audioUrl]);

  // play/pause sync when prop changes
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      if (isTrackPlayerInitialized && TrackPlayer) {
        if (play) {
          void TrackPlayer.play();
        } else {
          void TrackPlayer.pause();
        }
      }
      return;
    }

    const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;
    if (isFallback) {
      if (play) {
        onStateChange?.('playing');
      } else {
        onStateChange?.('paused');
      }
      return;
    }

    const sound = soundRef.current;
    if (!sound) return;

    if (play) {
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
      }
      void sound.setVolumeAsync(1.0);
      void sound.playAsync();
    } else {
      if (fadeInIntervalRef.current) {
        clearInterval(fadeInIntervalRef.current);
        fadeInIntervalRef.current = null;
      }
      void sound.pauseAsync();
    }
  }, [play]);

  if (audioUrl) {
    return null;
  }

  if (!isValidYTId) {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, left: -500, top: -500, opacity: 0.01 }}>
      <YoutubePlayer
        ref={playerRef}
        height={1}
        width={1}
        play={play}
        videoId={videoId}
        onChangeState={handleStateChange}
        onError={(e: any) => {
          console.error('[NativeYoutubePlayer] Error:', e);
          onStateChange?.('error');
        }}
        initialPlayerParams={{
          controls: false,
          modestbranding: true,
          rel: false,
          iv_load_policy: 3,
          cc_load_policy: 0,
          showClosedCaptions: false,
        }}
        webViewProps={{
          androidLayerType: 'hardware',
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          scalesPageToFit: true,
          domStorageEnabled: true,
          javaScriptEnabled: true,
        }}
      />
    </View>
  );
}

export default function YouTubeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  const isValidYTId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  const finalAudioUrl = audioUrl || (!isValidYTId ? OFFLINE_FALLBACK_AUDIO : undefined);
  return <NativeAudioPlayer videoId={videoId} audioUrl={finalAudioUrl} play={play} onStateChange={onStateChange} />;
}
