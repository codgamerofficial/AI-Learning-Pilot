/**
 * YouTubeAudioPlayer.tsx
 * Native playback engine.
 * Uses expo-av when a direct audio URL is available, otherwise falls back to the hidden YouTube iframe.
 */
import React from 'react';
import { View } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { usePlayerStore } from '../store/playerStore';

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
  const isValidYTId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  React.useEffect(() => {
    if (!audioUrl && !isValidYTId) {
      console.warn('[NativeAudioPlayer] Invalid videoId detected for playback:', videoId);
      onStateChange?.('error');
    }
  }, [audioUrl, isValidYTId, videoId, onStateChange]);

  React.useEffect(() => {
    let cancelled = false;

    if (!audioUrl) {
      return () => {
        cancelled = true;
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
        height={0}
        play={play}
        videoId={videoId}
        onChangeState={onStateChange}
        onError={(e: any) => {
          console.error('[NativeYoutubePlayer] Error:', e);
          onStateChange?.('error');
        }}
        initialPlayerParams={{ controls: false, modestbranding: true, rel: false }}
      />
    </View>
  );
}

export default function YouTubeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  return <NativeAudioPlayer videoId={videoId} audioUrl={audioUrl} play={play} onStateChange={onStateChange} />;
}
