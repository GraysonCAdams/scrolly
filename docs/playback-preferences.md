# Playback Preferences & Controls

## User Preferences
- Mute on load (default)
- Playback speed
- Gesture controls (tap, swipe, pinch)

## Platform Support
- Web apps: HTML5 video, JS libraries for gestures.
- Native apps: Full gesture and playback control.

## Lock Screen / Notification Controls
- The **Media Session API** (`navigator.mediaSession`) enables playback controls (play, pause, skip) on the lock screen and in notification trays on both Android and iOS Safari (15.4+).
- Supports setting metadata (title, artist, artwork) for lock screen display.
- Recommended for a video-sharing app to provide native-feeling controls when screen is locked.

## Volume Normalization
- Web: Possible with Web Audio API (gain nodes, compression).
- Native: Built-in APIs (AVFoundation, ExoPlayer).
- Best results: Preprocess audio server-side.

## Summary
- User playback preferences and gesture controls are feasible; volume normalization is possible client-side and server-side.