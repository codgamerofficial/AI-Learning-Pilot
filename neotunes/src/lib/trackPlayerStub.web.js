/**
 * trackPlayerStub.web.js
 *
 * Empty stub module that Metro resolves to when bundling for web.
 * This prevents the real react-native-track-player from pulling in
 * shaka-player (which crashes Metro's web bundler).
 *
 * All TrackPlayer methods are no-ops on web; the app uses expo-av +
 * MediaSession API for web playback instead (see GlobalAudioEngine in App.tsx).
 */

const noop = () => {};
const asyncNoop = () => Promise.resolve();

const TrackPlayer = {
  setupPlayer: asyncNoop,
  updateOptions: asyncNoop,
  add: asyncNoop,
  remove: asyncNoop,
  reset: asyncNoop,
  play: asyncNoop,
  pause: asyncNoop,
  stop: asyncNoop,
  seekTo: asyncNoop,
  setVolume: asyncNoop,
  getVolume: () => Promise.resolve(1),
  getPosition: () => Promise.resolve(0),
  getDuration: () => Promise.resolve(0),
  getState: () => Promise.resolve('none'),
  skipToNext: asyncNoop,
  skipToPrevious: asyncNoop,
  addEventListener: () => ({ remove: noop }),
  registerPlaybackService: noop,
};

// Named exports that the app uses
module.exports = TrackPlayer;
module.exports.default = TrackPlayer;
module.exports.Capability = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  SeekTo: 'seekTo',
  SkipToNext: 'skipToNext',
  SkipToPrevious: 'skipToPrevious',
  JumpForward: 'jumpForward',
  JumpBackward: 'jumpBackward',
};
module.exports.State = {
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  None: 'none',
};
module.exports.Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
  RemoteJumpForward: 'remote-jump-forward',
  RemoteJumpBackward: 'remote-jump-backward',
  RemoteDuck: 'remote-duck',
};
module.exports.AppKilledPlaybackBehavior = {
  ContinuePlayback: 'continue-playback',
  PausePlayback: 'pause-playback',
  StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
};
