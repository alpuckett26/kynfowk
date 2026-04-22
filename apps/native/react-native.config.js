module.exports = {
  dependencies: {
    // Exclude LiveKit WebRTC from native autolinking to prevent startup crash.
    // The WebRTC native library initialises at app launch regardless of JS imports
    // and is crashing before the JS runtime starts on test devices.
    '@livekit/react-native-webrtc': {
      platforms: { android: null },
    },
    '@livekit/react-native': {
      platforms: { android: null },
    },
  },
};
