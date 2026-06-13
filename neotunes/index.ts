import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register the background playback service only on native platforms.
// On web, TrackPlayer is not available and MediaSession is used instead (see App.tsx).
if (Platform.OS !== 'web') {
  const TrackPlayer = require('react-native-track-player').default;
  const { PlaybackService } = require('./src/services/PlaybackService');
  TrackPlayer.registerPlaybackService(() => PlaybackService);
}
