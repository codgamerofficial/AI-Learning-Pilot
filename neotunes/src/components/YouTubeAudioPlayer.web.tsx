/**
 * YouTubeAudioPlayer.web.tsx
 * Web-only playback engine.
 * Branches between HTML5 Audio (for direct mp3 URLs) and YouTube IFrame Player API.
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore, OFFLINE_FALLBACK_AUDIO } from '../store/playerStore';

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
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeRef = useRef(0);

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

    const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    if (isFallback) {
      audio.loop = true;
    }

    // Clear store time states
    usePlayerStore.getState().setCurrentTime(0);
    usePlayerStore.getState().setDuration(isFallback ? 180 : 0);
    fallbackTimeRef.current = 0;

    // Register seek function with store
    if (isFallback) {
      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        fallbackTimeRef.current = seconds;
        usePlayerStore.getState().setCurrentTime(seconds);
      });
    } else {
      usePlayerStore.getState().registerSeekFn((seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      });
    }

    const startFallbackTimer = () => {
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = setInterval(() => {
        fallbackTimeRef.current += 1;
        if (fallbackTimeRef.current >= 180) {
          fallbackTimeRef.current = 0;
          if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
          onStateChangeRef.current?.('ended');
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

    // Set up event listeners
    const handlePlay = () => {
      onStateChangeRef.current?.('playing');
      if (isFallback) {
        startFallbackTimer();
      }
    };

    const handlePause = () => {
      onStateChangeRef.current?.('paused');
      if (isFallback) {
        stopFallbackTimer();
      }
    };

    const handleEnded = () => {
      onStateChangeRef.current?.('ended');
      if (isFallback) {
        stopFallbackTimer();
      }
    };

    const handleWaiting = () => onStateChangeRef.current?.('buffering');
    const handlePlaying = () => {
      onStateChangeRef.current?.('playing');
      if (isFallback) {
        startFallbackTimer();
      }
    };
    const handleError = () => onStateChangeRef.current?.('error');

    const handleTimeUpdate = () => {
      if (isFallback) return;
      if (audio) {
        usePlayerStore.getState().setCurrentTime(audio.currentTime);
        const d = audio.duration;
        if (d > 0 && usePlayerStore.getState().duration !== d) {
          usePlayerStore.getState().setDuration(d);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (isFallback) return;
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

    // Play immediately if requested
    if (playRef.current) {
      fadeIn(audio);
      audio.play().catch(err => {
        console.warn('[WebAudioPlayer] Autoplay blocked or failed:', err);
      });
      if (isFallback) {
        startFallbackTimer();
      }
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      stopFallbackTimer();
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

    const isFallback = audioUrl === OFFLINE_FALLBACK_AUDIO;

    if (play) {
      fadeIn(audio);
      audio.play().catch(err => {
        console.warn('[WebAudioPlayer] play() execution blocked or failed:', err);
      });
      if (isFallback) {
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = setInterval(() => {
          fallbackTimeRef.current += 1;
          if (fallbackTimeRef.current >= 180) {
            fallbackTimeRef.current = 0;
            if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
            onStateChangeRef.current?.('ended');
          } else {
            usePlayerStore.getState().setCurrentTime(fallbackTimeRef.current);
          }
        }, 1000);
      }
    } else {
      fadeOutAndPause(audio);
      if (isFallback && fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
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
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadingOutRef = useRef(false);

  // Keep pendingPlay in sync for the onReady callback
  pendingPlay.current = play;

  const fadeVolume = (targetVolume: number, durationMs: number, onComplete?: () => void) => {
    const p = playerRef.current;
    if (!p || typeof p.getVolume !== 'function') {
      onComplete?.();
      return;
    }

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const startVolume = p.getVolume();
    const steps = 10;
    const stepTime = durationMs / steps;
    const volumeDelta = (targetVolume - startVolume) / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const nextVolume = Math.max(0, Math.min(100, startVolume + volumeDelta * currentStep));
      p.setVolume?.(nextVolume);

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        onComplete?.();
      }
    }, stepTime);
  };

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
              e.target.setVolume?.(0);
              e.target.playVideo();
              fadeVolume(100, 400);
            }

            // Start polling currentTime every 500ms
            pollRef.current = setInterval(() => {
              const p = playerRef.current;
              if (!p) return;
              try {
                const t = p.getCurrentTime?.() ?? 0;
                const d = p.getDuration?.() ?? 0;
                const store = usePlayerStore.getState();
                store.setCurrentTime(t);
                if (d > 0) store.setDuration(d);

                // Auto crossfade fade-out detection
                const crossfadeSec = store.crossfadeSeconds;
                if (d > 0 && d - t <= crossfadeSec && store.isPlaying && !fadingOutRef.current) {
                  fadingOutRef.current = true;
                  fadeVolume(0, crossfadeSec * 1000);
                }
              } catch { /* player may be destroyed */ }
            }, 500);
          },
          onStateChange: (e: any) => {
            onStateChange?.(STATE_MAP[e.data] ?? 'unknown');
          },
          onError: (e: any) => {
            console.error('[WebYoutubePlayer] Error code:', e.data);
            onStateChange?.('error');
          },
        },
      });
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      div.remove();
    };
  }, []); // only mount once

  // Play / Pause
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.playVideo !== 'function') return;
    if (play) {
      p.setVolume?.(0);
      p.playVideo();
      fadeVolume(100, 400);
    } else {
      fadeVolume(0, 250, () => {
        p.pauseVideo();
      });
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
        playerRef.current?.setVolume?.(0);
        playerRef.current?.playVideo?.();
        fadeVolume(100, 400);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Video change — reset time then load
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.loadVideoById !== 'function') return;
    usePlayerStore.getState().setCurrentTime(0);
    usePlayerStore.getState().setDuration(0);
    fadingOutRef.current = false;

    if (play) {
      fadeVolume(0, 300, () => {
        p.loadVideoById?.(videoId);
        p.setVolume?.(0);
        fadeVolume(100, 500);
      });
    } else {
      p.cueVideoById?.(videoId);
    }
  }, [videoId]);

  return null;
}

export default function YouTubeAudioPlayer({ videoId, audioUrl, play, onStateChange }: Props) {
  const isValidYTId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);

  useEffect(() => {
    if (!audioUrl && !isValidYTId) {
      console.warn('[YouTubeAudioPlayer] Invalid videoId detected for playback:', videoId);
    }
  }, [audioUrl, isValidYTId, videoId]);

  const finalAudioUrl = audioUrl || (!isValidYTId ? OFFLINE_FALLBACK_AUDIO : undefined);

  if (finalAudioUrl) {
    return <WebAudioPlayer audioUrl={finalAudioUrl} play={play} onStateChange={onStateChange} />;
  }

  return <WebYoutubePlayer videoId={videoId} play={play} onStateChange={onStateChange} />;
}
