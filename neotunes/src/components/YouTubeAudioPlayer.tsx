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

  React.useEffect(() => {
    if (audioUrl || !play || hasStartedOrReady) return;

    const timer = setTimeout(() => {
      if (!hasStartedOrReady) {
        console.warn('[NativeAudioPlayer] YouTube load timeout. Triggering error state.');
        onStateChange?.('error');
      }
    }, 4500);

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

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: play,
          progressUpdateIntervalMillis: 500,
        },
        (playbackStatus) => {
          if (!playbackStatus.isLoaded) {
            if ('error' in playbackStatus && playbackStatus.error) {
              onStateChange?.('error');
            }
            return;
          }

          usePlayerStore.getState().setCurrentTime((playbackStatus.positionMillis ?? 0) / 1000);
          usePlayerStore.getState().setDuration((playbackStatus.durationMillis ?? 0) / 1000);

          if (playbackStatus.didJustFinish) {
            onStateChange?.('ended');
            return;
          }

          onStateChange?.(playbackStatus.isPlaying ? 'playing' : 'paused');
        }
      );

      if (cancelled) {
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        void soundRef.current?.setPositionAsync(seconds * 1000);
      });

      if (!status.isLoaded) {
        return;
      }

      if (play && !status.isPlaying) {
        await sound.playAsync();
      }
    };

    void setupSound();

    return () => {
      cancelled = true;
      usePlayerStore.getState().registerSeekFn(() => {});
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
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
      void sound.playAsync();
      return;
    }

    void sound.pauseAsync();
  }, [play]);

  if (audioUrl) {
    return null;
  }

  if (!isValidYTId) {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}>
      <YoutubePlayer
        ref={playerRef}
        height={0}
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
