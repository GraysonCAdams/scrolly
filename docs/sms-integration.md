# SMS Integration

SMS is the **primary method** for adding videos to Scrolly. It works on both iOS and Android — no share sheet limitations, no app switching. Users simply text a link to the Scrolly phone number.

## How It Works

### Onboarding Flow
1. User signs up via the web app (invite code → username → phone number)
2. Server sends an MMS to the user's phone with a **VCF (vCard) attachment**
3. User saves the contact ("Scrolly" or the group name)
4. From now on, they can text links to that contact to share videos

### Inbound SMS Flow
```
User texts: "check this out https://tiktok.com/@user/video/123"
  → Twilio receives the SMS
  → Twilio POSTs to https://scrolly.example.com/api/sms/inbound
  → Server parses:
      - From: +1234567890 → looks up user
      - Body: "check this out https://tiktok.com/@user/video/123"
        - URL extracted: https://tiktok.com/@user/video/123
        - Caption: "check this out"
  → Creates clip record (status: 'downloading', title: "check this out")
  → Spawns yt-dlp to download the video
  → Replies via TwiML: "Got it! Your video is being added to the feed."
  → On download success: notifies group via push notification
```

### Caption Extraction
Any text in the SMS that isn't a URL becomes the video's caption/title. Examples:

| SMS Body | Extracted URL | Caption |
|----------|--------------|---------|
| `https://tiktok.com/...` | `https://tiktok.com/...` | *(none — falls back to source metadata or AI title)* |
| `this is so funny https://tiktok.com/...` | `https://tiktok.com/...` | `this is so funny` |
| `https://tiktok.com/... lol` | `https://tiktok.com/...` | `lol` |
| `check this https://tiktok.com/... and this https://instagram.com/...` | both URLs | `check this and this` |

## Twilio Setup

### Prerequisites
- Twilio account (free trial works for development)
- A phone number with SMS + MMS capability

### Configuration
1. **Buy a phone number** in the Twilio console with SMS/MMS enabled
2. **Set the webhook URL** for incoming messages:
   - URL: `https://scrolly.example.com/api/sms/inbound`
   - Method: POST
3. **Store credentials** in environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```

### Request Validation
Always validate that inbound requests are genuinely from Twilio:
- Use `twilio.validateRequest()` with the `X-Twilio-Signature` header
- Reject requests that don't pass validation

### TwiML Response
The `/api/sms/inbound` endpoint responds with TwiML (Twilio Markup Language):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Got it! Your video is being added to the feed.</Message>
</Response>
```

## VCF (vCard) Generation

On signup, the server generates and sends a vCard so the user can save the Scrolly number as a contact.

### vCard Format
```
BEGIN:VCARD
VERSION:3.0
FN:Scrolly
TEL;TYPE=CELL:+1xxxxxxxxxx
NOTE:Text video links to this number to share with your group
END:VCARD
```

### Delivery
- Sent as an **MMS** via Twilio with the VCF as a media attachment
- Twilio supports sending MMS with `MediaUrl` pointing to a hosted VCF file
- The VCF can be hosted at a static URL on the Scrolly server (e.g., `/api/vcard/[group_id].vcf`)
- Alternatively, host on a public URL (S3, Cloudflare R2) since Twilio needs to fetch it

### SMS Message
```
Welcome to Scrolly! Save this contact and text it any video links to share with your group.
```

## Supported Platforms

URL parsing accepts links from:
- **TikTok:** `tiktok.com`, `vm.tiktok.com` (short links)
- **Instagram:** `instagram.com/reel/`, `instagram.com/p/`
- **Facebook:** `facebook.com`, `fb.watch`
- **YouTube Shorts:** `youtube.com/shorts/` (Shorts only — regular YouTube links are not supported)

Unrecognized URLs get a reply: "Sorry, that link isn't from a supported platform (TikTok, Instagram, Facebook, YouTube Shorts, Spotify, Apple Music)."

## Error Handling

| Scenario | SMS Reply |
|----------|-----------|
| Phone not registered | "This number isn't registered with Scrolly. Join at scrolly.example.com" |
| No URL in message | "I didn't find a link in your message. Send a TikTok, Instagram, Facebook, YouTube Shorts, Spotify, or Apple Music link." |
| Unsupported platform | "Sorry, that link isn't from a supported platform (TikTok, Instagram, Facebook, YouTube Shorts, Spotify, Apple Music)." |
| Download fails | "Couldn't download that video. The link might be private or expired. Here's the original: [URL]" |
| Success | "Got it! Your video is being added to the feed." |
