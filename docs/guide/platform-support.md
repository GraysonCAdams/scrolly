# Platform Support

Scrolly is a PWA (Progressive Web App). Feature support varies by platform.

## Comparison

| Feature | Android | iOS (16.4+) | Desktop |
|---------|---------|-------------|---------|
| Install to home screen | Yes | Yes | Yes |
| Share target (share sheet) | Yes | No | No |
| Push notifications | Full (images, actions) | Text-only, PWA required | Full |
| Background sync | Yes | No | Yes |
| Offline fallback | Yes | Yes | Yes |

## iOS Limitations

- **No share target** — PWAs cannot register as share targets on iOS. Use the iOS Shortcut integration or paste links in-app.
- **Push notifications** — Only work when the PWA is installed to the Home Screen (not from Safari). Text-only, no images. Requires iOS 16.4+.
- **No silent push** — Push notifications require a visible, user-facing notification.
- **No background sync** — The app cannot sync data in the background.

## Android

Android provides the broadest PWA support:

- Share directly from any app's share sheet to Scrolly
- Full push notification support including images
- Reliable background sync
- Deeper hardware and gesture integration

## Desktop

Chrome, Edge, and Firefox on desktop support:

- PWA installation
- Full push notifications
- Offline fallback

## Recommendations

- **Android users** — Install the PWA and enable share target for the best experience.
- **iOS users** — Add to Home Screen from Safari to enable push notifications.
- **All users** — Enable notifications in Settings for real-time alerts.
