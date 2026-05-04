/**
 * YouTubeAudioPlayer.web.tsx
 * Web-only: uses YouTube's official IFrame Player API via the DOM.
 * Now also:
 *  - Polls currentTime every 500ms → writes to playerStore
 *  - Polls duration on ready → writes to playerStore
 *  - Registers seekTo in playerStore so the ProgressSlider can seek
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  videoId: string;
  audioUrl?: string;
  play: boolean;
  onStateChange?: (state: string) => void;
}

// Singleton API loader — prevents duplicate script injection
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

export default function YouTubeAudioPlayer({ videoId, play, onStateChange }: Props) {
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

  // Nothing rendered in the React tree — the div lives directly in document.body
  return null;
}
