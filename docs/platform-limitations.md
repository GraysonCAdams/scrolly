# Platform Limitations: iOS vs Android

## iOS
- PWAs cannot be share targets; users must copy/paste links.
- Web push notifications only if PWA is installed on Home Screen; text-only, no images.
- No silent push or background wake; push notifications require a visible user-facing notification.
- No reliable background sync/tasks.
- File uploads limited to input elements; large uploads may fail.
- No Bluetooth/NFC or deep linking. Basic camera via `getUserMedia` is supported; advanced native-only camera features (ProRes, advanced zoom) are not.

## Android
- PWAs can be share targets; seamless share sheet integration.
- Web push notifications fully supported, including images.
- Reliable background sync/tasks.
- File uploads more robust.
- Deeper hardware and gesture integration.

## Summary
- Android offers broader PWA features; iOS is more restrictive, especially for inbound sharing and notifications.