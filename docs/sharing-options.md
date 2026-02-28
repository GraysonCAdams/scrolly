# Sharing Options for Scrolly

## Primary Method: SMS (iOS + Android)

SMS is the primary way users share videos to Scrolly. It works identically on both platforms — no share sheet limitations, no app switching required.

- Users text a video link to the Scrolly phone number (provisioned via Twilio)
- Any non-URL text in the message becomes the video's **caption**
- On signup, users receive a **VCF (vCard)** via MMS so they can save the Scrolly number as a contact
- See [sms-integration.md](sms-integration.md) for full details

## Fallback: Clipboard Paste (Web App)

- Users copy a link, open Scrolly in the browser, and paste it into the input field
- Available on both iOS and Android
- Useful if SMS is down or the user prefers the web interface

## Android Bonus: Share Sheet (Phase 3)

- Android PWAs can register as share targets via the Web Share Target API
- Users can share links directly from TikTok/Instagram/Facebook to Scrolly via the OS share sheet
- This is a Phase 3 feature — SMS covers the core flow

## iOS Limitations

- iOS PWAs **cannot** be share targets (cannot receive inbound shares via the share sheet)
- iOS PWAs *can* use the Web Share API to share content **out** (e.g., share the original source link to Messages or other apps)
- SMS is the solution — it bypasses all PWA share sheet limitations on iOS

## Other Alternatives (Not Planned)

- Email endpoint: Users email links to a special address
- QR code: Users scan to open Scrolly and paste link

## Summary

- **SMS** is the primary and universal sharing method (both platforms)
- **Clipboard paste** is the in-app fallback
- **Android share sheet** is a Phase 3 enhancement
- iOS share sheet integration is not possible for PWAs
