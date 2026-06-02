/**
 * YouTubeAudioPlayer.web.tsx
 * Web-only playback engine.
 * Branches between HTML5 Audio (for direct mp3 URLs) and YouTube IFrame Player API.
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  videoId: string;
  audioUrl?: string;
  play: boolean;
  onStateChange?: (state: string) => void;
}

// Singleton YT API loader — prevents duplicate script injection
let ytApiLoaded = false;
const pendingCallbacks: Array<() => void> = [];

function loadYouTubeAPI(onReady: () => void) {
  if (typeof window === 'undefined') return;

  if ((window as any).YT?.Player) {
    onReady();
    return;
  }

  pendingCallbacks.push(onReady);

  if (!ytApiLoaded) {
    ytApiLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
    (window as any).onYouTubeIframeAPIReady = () => {
      pendingCallbacks.forEach(cb => cb());
      pendingCallbacks.length = 0;
    };
  }
}

const STATE_MAP: Record<number, string> = {
  [-1]: 'unstarted',
  [0]: 'ended',
  [1]: 'playing',
  [2]: 'paused',
  [3]: 'buffering',
  [5]: 'cued',
};

/**
 * WebAudioPlayer: plays direct MP3 audio URLs using standard HTML5 Audio.
 */
function WebAudioPlayer({ audioUrl, play, onStateChange }: { audioUrl: string; play: boolean; onStateChange?: (state: string) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRef = useRef(play);
  const onStateChangeRef = useRef(onStateChange);

  // Keep refs in sync to avoid effect re-runs
  playRef.current = play;
  onStateChangeRef.current = onStateChange;

  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeIn = (audio: HTMLAudioElement) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    audio.volume = 0;
    let vol = 0;
    fadeIntervalRef.current = setInterval(() => {
      vol += 0.1;
      if (vol >= 1) {
        audio.volume = 1;
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      } else {
        audio.volume = vol;
      }
    }, 60); // 600ms total fade-in
  };

  const fadeOutAndPause = (audio: HTMLAudioElement) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    let vol = audio.volume;
    fadeIntervalRef.current = setInterval(() => {
      vol -= 0.15;
      if (vol <= 0) {
        audio.volume = 0;
        audio.pause();
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      } else {
        audio.volume = vol;
      }
    }, 40); // ~260ms fade-out
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // 2. Clear store time states
    usePlayerStore.getState().setCurrentTime(0);
    usePlayerStore.getState().setDuration(0);

    // 3. Register seek function with store
    usePlayerStore.getState().registerSeekFn((seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
      }
    });

    // 4. Set up event listeners
    const handlePlay = () => onStateChangeRef.current?.('playing');
    const handlePause = () => onStateChangeRef.current?.('paused');
    const handleEnded = () => onStateChangeRef.current?.('ended');
    const handleWaiting = () => onStateChangeRef.current?.('buffering');
    const handlePlaying = () => onStateChangeRef.current?.('playing');
    const handleError = () => onStateChangeRef.current?.('error');

    const handleTimeUpdate = () => {
      if (audio) {
        usePlayerStore.getState().setCurrentTime(audio.currentTime);
        const d = audio.duration;
        if (d > 0 && usePlayerStore.getState().duration !== d) {
          usePlayerStore.getState().setDuration(d);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (audio) {
        usePlayerStore.getState().setDuration(audio.duration);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // 5. Play immediately if requested
    if (playRef.current) {
      fadeIn(audio);
      audio.play().catch(err => {
        console.warn('[WebAudioPlayer] Autoplay blocked or failed:', err);
      });
    }

    return () => {
      // 6. Cleanup
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Sync play/pause changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (play) {
      fadeIn(audio);
      audio.play().catch(err => {
        console.warn('[WebAudioPlayer] play() execution blocked or failed:', err);
      });
    } else {
      fadeOutAndPause(audio);
    }
  }, [play]);

  return null;
}

/**
 * WebYoutubePlayer: plays YouTube tracks via the hidden IFrame Player API.
 */
function WebYoutubePlayer({ videoId, play, onStateChange }: { videoId: string; play: boolean; onStateChange?: (state: string) => void }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pendingPlay = useRef(play);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldResumeOnVisible = useRef(false);

  // Keep pendingPlay in sync for the onReady callback
  pendingPlay.current = play;

  // Initialize player once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create the mount div and add it to body
    const div = document.createElement('div');
    // Bottom-right corner, 1x1 visible container, overflow:hidden clips the 320x180 iframe.
    // opacity:0.001 (NOT 0, NOT visibility:hidden) — browsers allow audio on nearly-invisible elements.
    div.style.cssText = [
      'position:fixed',
      'bottom:0',
      'right:0',
      'width:1px',
      'height:1px',
      'overflow:hidden',
      'opacity:0.001',
      'pointer-events:none',
      'z-index:-9999',
    ].join(';');
    document.body.appendChild(div);
    mountRef.current = div;

    loadYouTubeAPI(() => {
      playerRef.current = new (window as any).YT.Player(div, {
        width: 320,
        height: 180,
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            // Register seekTo with the global store
            usePlayerStore.getState().registerSeekFn((seconds: number) => {
              playerRef.current?.seekTo?.(seconds, true);
            });

            // Write duration once known
            const dur = e.target.getDuration?.() ?? 0;
            if (dur > 0) usePlayerStore.getState().setDuration(dur);

            // Play immediately if the user already pressed play
            if (pendingPlay.current) {
              e.target.playVideo();
            }

            // Start polling currentTime every 500ms
            pollRef.current = setInterval(() => {
              const p = playerRef.current;
              if (!p) return;
              try {
                const t = p.getCurrentTime?.() ?? 0;
                const d = p.getDuration?.() ?? 0;
                usePlayerStore.getState().setCurrentTime(t);
                if (d > 0) usePlayerStore.getState().setDuration(d);
              } catch { /* player may be destroyed */ }
            }, 500);
          },
          onStateChange: (e: any) => {
            onStateChange?.(STATE_MAP[e.data] ?? 'unknown');
          },
        },
      });
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      div.remove();
    };
  }, []); // only mount once

  // Play / Pause
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (play) {
      p.playVideo?.();
    } else {
      p.pauseVideo?.();
    }
  }, [play]);

  // Keep music flowing across tab minimize/restore cycles.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        shouldResumeOnVisible.current = usePlayerStore.getState().isPlaying;
        return;
      }

      if (shouldResumeOnVisible.current) {
        playerRef.current?.playVideo?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Video change — reset time then load
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    usePlayerStore.getState().setCurrentTime(0);
    usePlayerStore.getState().setDuration(0);
    if (play) {
      p.loadVideoById?.(videoId);
    } else {
      p.cueVideoById?.(videoId);
    }
  }, [videoId]);

  return null;
}

export default function YouTubeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  if (audioUrl) {
    return <WebAudioPlayer audioUrl={audioUrl} play={play} onStateChange={onStateChange} />;
  }
  return <WebYoutubePlayer videoId={videoId} play={play} onStateChange={onStateChange} />;
}
