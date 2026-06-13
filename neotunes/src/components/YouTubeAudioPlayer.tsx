/**
 * YouTubeAudioPlayer.tsx
 * Native playback engine.
 * Uses expo-av when a direct audio URL is available, otherwise falls back to the hidden YouTube iframe.
 */
import React from 'react';
import { View } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { usePlayerStore, OFFLINE_FALLBACK_AUDIO } from '../store/playerStore';

interface Props {
  videoId: string;
  audioUrl?: string;
  play: boolean;
  onStateChange?: (state: string) => void;
}

let audioModeConfigured = false;

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

function NativeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const playerRef = React.useRef<any>(null);
  const isValidYTId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  // playRef tracks active play state without stale closures
  const playRef = React.useRef(play);
  React.useEffect(() => {
    playRef.current = play;
  }, [play]);

  // Preloading & Crossfading Refs
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

  // Increased timeout to 15 seconds to prevent aggressive failure on slower networks
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

  React.useEffect(() => {
    if (!audioUrl && !isValidYTId) {
      console.warn('[NativeAudioPlayer] Invalid videoId detected for playback:', videoId);
      onStateChange?.('error');
    }
  }, [audioUrl, isValidYTId, videoId, onStateChange]);

  const fallbackIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;

    if (!audioUrl) {
      return () => {
        cancelled = true;
      };
    }

    const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;

    if (isFallback) {
      usePlayerStore.getState().setCurrentTime(0);
      usePlayerStore.getState().setDuration(180);
      fallbackTimeRef.current = 0;

      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        fallbackTimeRef.current = seconds;
        usePlayerStore.getState().setCurrentTime(seconds);
      });

      const startFallbackTimer = () => {
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = setInterval(() => {
          fallbackTimeRef.current += 1;
          if (fallbackTimeRef.current >= 180) {
            fallbackTimeRef.current = 0;
            if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
            onStateChange?.('ended');
          } else {
            usePlayerStore.getState().setCurrentTime(fallbackTimeRef.current);
          }
        }, 1000);
      };

      const stopFallbackTimer = () => {
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };

      onStateChange?.(play ? 'playing' : 'paused');
      if (play) {
        startFallbackTimer();
      }

      return () => {
        cancelled = true;
        stopFallbackTimer();
        usePlayerStore.getState().registerSeekFn(() => {});
      };
    }

    const setupSound = async () => {
      await ensureAudioMode();

      // Clear active fade-out and fade-in intervals
      if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
      if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);

      const crossfadeSeconds = usePlayerStore.getState().crossfadeSeconds;
      const oldSound = soundRef.current;

      // Handle the previous sound (crossfade out)
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
          // No crossfade, unload immediately
          void oldSound.unloadAsync();
          soundRef.current = null;
        }
      }

      // Load/Retrieve new sound
      let sound: Audio.Sound;
      let isPreloaded = false;

      if (preloadedSoundRef.current && preloadedUrlRef.current === audioUrl) {
        console.log('[NativeAudioPlayer] Using preloaded sound for:', audioUrl);
        sound = preloadedSoundRef.current;
        isPreloaded = true;
        
        preloadedSoundRef.current = null;
        preloadedUrlRef.current = null;
      } else {
        // Discard old preloaded sound if it doesn't match
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

      // Register the seek function for the new sound
      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        void soundRef.current?.setPositionAsync(seconds * 1000);
      });

      // Update callback for active playback
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

        // Preload next audio when within 15 seconds of the end
        if (playbackStatus.isPlaying && dur > 0 && dur - pos < 15) {
          void preloadNextAudio();
        }

        if (playbackStatus.didJustFinish) {
          onStateChange?.('ended');
          return;
        }

        onStateChange?.(playbackStatus.isPlaying ? 'playing' : 'paused');
      });

      // Start playback and crossfade in
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
          console.warn('[NativeAudioPlayer] Error starting play:', e);
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
  }, [audioUrl]);

  React.useEffect(() => {
    const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;
    if (isFallback) {
      if (play) {
        onStateChange?.('playing');
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = setInterval(() => {
          fallbackTimeRef.current += 1;
          if (fallbackTimeRef.current >= 180) {
            fallbackTimeRef.current = 0;
            if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
            onStateChange?.('ended');
          } else {
            usePlayerStore.getState().setCurrentTime(fallbackTimeRef.current);
          }
        }, 1000);
      } else {
        onStateChange?.('paused');
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      }
      return;
    }

    const sound = soundRef.current;
    if (!sound) {
      return;
    }

    if (play) {
      // Clear any active fade-out intervals, as we are now playing
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
      }
      void sound.setVolumeAsync(1.0); // Reset volume to 1.0!
      void sound.playAsync();
      return;
    }

    // Clear any active fade-in intervals, as we are pausing
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }
    void sound.pauseAsync();
  }, [play]);

  if (audioUrl) {
    return null;
  }

  if (!isValidYTId) {
    return null;
  }

  // Setting width: 1, height: 1 and placing offscreen prevents OS from freezing/suspending webview.
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
