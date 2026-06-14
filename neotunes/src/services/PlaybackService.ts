/**
 * PlaybackService.ts
 * Production-grade background playback service for NeoTunes.
 *
 * Registered once via TrackPlayer.registerPlaybackService() in index.ts.
 * This function runs in the Android foreground-service / iOS background audio
 * context and handles ALL remote control events:
 *   - Notification controls (play, pause, next, previous, seek, stop)
 *   - Lock screen / car / Bluetooth / Wear OS media buttons
 *   - Audio focus interruptions (phone calls, navigation, other apps)
 *   - Jump forward / backward (±15 s for scrubbing from notification)
 */
import TrackPlayer, { Event } from 'react-native-track-player';

/** Volume level before ducking so we can restore it. */
let preDuckVolume = 1.0;
/** Whether we paused due to a transient audio focus loss (e.g. phone call). */
let pausedByDuck = false;

export async function PlaybackService() {
  // ── Core playback controls ──────────────────────────────────────────

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset();
  });

  // ── Track navigation ────────────────────────────────────────────────

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext().catch(() => {
      // If there's no next track, silently ignore
    });
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious().catch(() => {
      // If there's no previous track, silently ignore
    });
  });

  // ── Seek & scrub ────────────────────────────────────────────────────

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const position = await TrackPlayer.getPosition();
    const duration = await TrackPlayer.getDuration();
    const jumpTo = Math.min(position + (event.interval || 15), duration);
    TrackPlayer.seekTo(jumpTo);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const position = await TrackPlayer.getPosition();
    const jumpTo = Math.max(position - (event.interval || 15), 0);
    TrackPlayer.seekTo(jumpTo);
  });

  // ── Audio focus / ducking (phone calls, navigation, other apps) ─────
  //
  // Android dispatches RemoteDuck with:
  //   permanent = true   → another app took focus permanently (stop)
  //   paused   = true    → transient focus loss (phone call) → pause
  //   ducking  = true    → brief interruption (notification sound) → lower volume
  //   paused   = false   → focus returned → resume
  //
  // This gives us Spotify-style behavior: pause during calls, duck for
  // short interruptions, and resume automatically when done.

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event: any) => {
    if (event.permanent) {
      // Another app permanently took audio focus — stop playback
      TrackPlayer.pause();
      return;
    }

    if (event.paused) {
      // Transient focus loss (phone call, Google Maps nav, etc.)
      // Remember current volume and pause
      try {
        preDuckVolume = await TrackPlayer.getVolume();
      } catch {
        preDuckVolume = 1.0;
      }
      pausedByDuck = true;
      TrackPlayer.pause();
    } else if (pausedByDuck) {
      // Focus returned after a transient loss — resume
      pausedByDuck = false;
      await TrackPlayer.setVolume(preDuckVolume);
      TrackPlayer.play();
    } else if (event.ducking) {
      // Brief duck (notification ding) — lower volume temporarily
      try {
        preDuckVolume = await TrackPlayer.getVolume();
      } catch {
        preDuckVolume = 1.0;
      }
      TrackPlayer.setVolume(0.2);
    } else {
      // Duck ended — restore volume
      TrackPlayer.setVolume(preDuckVolume);
    }
  });
}
