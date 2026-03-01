# Adding a Download Provider

This guide walks through adding a new download provider to Scrolly. Providers are pluggable adapters that handle downloading video and/or audio from external URLs.

---

## Architecture Overview

The provider system has four layers:

```
┌───────────────────────────────────────────┐
│  API Endpoints                            │
│  Install, uninstall, activate providers   │
│  src/routes/api/group/provider/           │
├───────────────────────────────────────────┤
│  Registry                                 │
│  Known providers, singleton instances,    │
│  active provider resolution               │
│  src/lib/server/providers/registry.ts     │
├───────────────────────────────────────────┤
│  Provider Implementation                  │
│  Implements DownloadProvider interface     │
│  src/lib/server/providers/{id}/index.ts   │
├───────────────────────────────────────────┤
│  Binary Utilities                         │
│  Download, install, remove binaries       │
│  src/lib/server/providers/binary.ts       │
└───────────────────────────────────────────┘
```

Downloads are triggered asynchronously from the clip submission endpoint (`POST /api/clips`). The orchestration layer (`src/lib/server/video/download.ts` and `src/lib/server/music/download.ts`) calls the active provider and handles DB updates, file size enforcement, error handling, and deduplication.

### Key files

| File | Role |
|------|------|
| `src/lib/server/providers/types.ts` | `DownloadProvider` interface + result types |
| `src/lib/server/providers/registry.ts` | Provider catalog, singleton instances, `getActiveProvider()` |
| `src/lib/server/providers/binary.ts` | Binary download/install/remove helpers |
| `src/lib/server/providers/ytdlp/index.ts` | Reference implementation (yt-dlp) |
| `src/lib/server/video/download.ts` | Video download orchestration |
| `src/lib/server/music/download.ts` | Music download orchestration |
| `src/lib/server/download-lock.ts` | Deduplication of concurrent downloads |
| `src/lib/server/download-utils.ts` | File cleanup, size calculations |
| `src/routes/api/group/provider/+server.ts` | GET (list) + PATCH (activate) endpoints |
| `src/routes/api/group/provider/install/+server.ts` | POST (install) + DELETE (uninstall) endpoints |

---

## Step 1: Understand the Interface

Every provider must implement `DownloadProvider` from `src/lib/server/providers/types.ts`:

```typescript
interface DownloadProvider {
  readonly id: string;          // Unique ID, used in DB and registry (e.g. 'ytdlp')
  readonly name: string;        // Display name (e.g. 'yt-dlp')
  readonly description: string; // Short description for the UI
  readonly homepage: string;    // Project URL
  readonly capabilities: ('video' | 'music')[];

  // Lifecycle — manage the binary/tool on disk
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
  uninstall(): Promise<void>;
  getVersion(): Promise<string | null>;

  // Download — the core work
  downloadVideo(url: string, options: DownloadOptions): Promise<VideoDownloadResult>;
  downloadAudio(searchQuery: string, options: DownloadOptions): Promise<AudioDownloadResult>;
}
```

### Result types

```typescript
interface VideoDownloadResult {
  videoPath: string;            // Absolute path to the downloaded video file
  thumbnailPath: string | null; // Absolute path to thumbnail image (jpg), or null
  title: string | null;         // Extracted title/caption from source metadata
  duration: number | null;      // Duration in seconds
}

interface AudioDownloadResult {
  audioPath: string;            // Absolute path to downloaded audio file (mp3)
  duration: number | null;      // Duration in seconds
}

interface DownloadOptions {
  outputDir: string;            // Directory to write files into (data/videos/)
  clipId: string;               // UUID — use as the filename prefix
  maxFileSizeBytes: number | null; // Group's file size limit, or null for unlimited
}
```

### Important contracts

- **File naming:** Output files MUST be prefixed with `options.clipId`. The cleanup system uses this prefix to find and delete files. Use a template like `{outputDir}/{clipId}.{ext}`.
- **File size:** If `maxFileSizeBytes` is set, your provider should reject files that exceed it. The orchestration layer does a post-download size check as a safety net, but pre-filtering avoids wasting bandwidth.
- **Errors:** Throw on failure. The orchestration layer catches errors and marks the clip as `failed` in the DB. If your error message contains `match_filter` or `File is larger than max-filesize`, it's treated as a size rejection with a user-friendly message.
- **No DB access:** Providers should NOT import or interact with the database. That's the orchestration layer's job. Providers only download files and return paths/metadata.

---

## Step 2: Create the Provider Directory

Create a directory under `src/lib/server/providers/` using your provider's ID:

```
src/lib/server/providers/
├── types.ts
├── registry.ts
├── binary.ts
├── ytdlp/
│   └── index.ts          ← existing reference implementation
└── {your-provider-id}/
    └── index.ts          ← your new provider
```

---

## Step 3: Implement the Provider

Here's a minimal skeleton. See `src/lib/server/providers/ytdlp/index.ts` for the full reference implementation.

```typescript
// src/lib/server/providers/example/index.ts

import { spawn } from 'child_process';
import { readdir, readFile } from 'fs/promises';
import type {
  DownloadProvider,
  VideoDownloadResult,
  AudioDownloadResult,
  DownloadOptions
} from '../types';
import { getBinaryPath, isBinaryInstalled, downloadBinary, removeBinary } from '../binary';
import { getKnownProvider } from '../registry';

const PROVIDER_ID = 'example';
const BINARY_NAME = 'example-dl';

export class ExampleProvider implements DownloadProvider {
  readonly id = PROVIDER_ID;
  readonly name = 'example-dl';
  readonly description = 'Example media downloader';
  readonly homepage = 'https://github.com/example/example-dl';
  readonly capabilities: ('video' | 'music')[] = ['video'];

  private getBinaryCommand(): string {
    return getBinaryPath(PROVIDER_ID, BINARY_NAME);
  }

  // --- Lifecycle ---

  async isInstalled(): Promise<boolean> {
    return isBinaryInstalled(PROVIDER_ID, BINARY_NAME);
  }

  async install(): Promise<void> {
    const known = getKnownProvider(PROVIDER_ID);
    if (!known) throw new Error('Unknown provider: ' + PROVIDER_ID);
    await downloadBinary(known, BINARY_NAME);
  }

  async uninstall(): Promise<void> {
    await removeBinary(PROVIDER_ID, BINARY_NAME);
  }

  async getVersion(): Promise<string | null> {
    if (!(await this.isInstalled())) return null;
    return new Promise((resolve) => {
      const proc = spawn(this.getBinaryCommand(), ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.on('close', () => resolve(stdout.trim() || null));
      proc.on('error', () => resolve(null));
    });
  }

  // --- Downloads ---

  async downloadVideo(url: string, options: DownloadOptions): Promise<VideoDownloadResult> {
    return new Promise((resolve, reject) => {
      const outputPath = `${options.outputDir}/${options.clipId}`;
      const binary = this.getBinaryCommand();

      // Build args for your tool
      const args = ['--output', outputPath, url];

      // Optional: enforce file size limit
      if (options.maxFileSizeBytes) {
        args.push('--max-size', String(options.maxFileSizeBytes));
      }

      const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';

      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`${BINARY_NAME} exited with code ${code}: ${stderr}`));
          return;
        }

        // Find output files and extract metadata
        try {
          const result = await this.findOutputFiles(options.outputDir, options.clipId);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ${BINARY_NAME}: ${err.message}`));
      });
    });
  }

  async downloadAudio(searchQuery: string, options: DownloadOptions): Promise<AudioDownloadResult> {
    // Implement if capabilities includes 'music'
    throw new Error('Audio download not supported by this provider');
  }

  // --- Helpers ---

  private async findOutputFiles(
    outputDir: string,
    clipId: string
  ): Promise<VideoDownloadResult> {
    const files = await readdir(outputDir);
    const clipFiles = files.filter((f) => f.startsWith(clipId));

    const videoFile = clipFiles.find(
      (f) => !f.endsWith('.jpg') && !f.endsWith('.json') && !f.endsWith('.part')
    );

    if (!videoFile) {
      throw new Error(`No video file found for clip ${clipId}`);
    }

    // Extract metadata from sidecar files if your tool writes them
    const thumbFile = clipFiles.find((f) => f.endsWith('.jpg'));

    return {
      videoPath: `${outputDir}/${videoFile}`,
      thumbnailPath: thumbFile ? `${outputDir}/${thumbFile}` : null,
      title: null,  // Extract from metadata if available
      duration: null // Extract from metadata if available
    };
  }
}
```

### Subprocess tips

- Use `child_process.spawn` (not `exec`) for long-running downloads — it streams output without buffering limits.
- Set `stdio: ['ignore', 'pipe', 'pipe']` — no stdin needed, capture stdout and stderr.
- If your tool spawns its own Node subprocesses, strip interfering env vars (see the yt-dlp implementation for `NODE_OPTIONS`, `VITE_` prefix stripping).
- Consider implementing retry logic for flaky downloads (see `runAudioDownloadWithRetries` in the yt-dlp provider).

---

## Step 4: Register the Provider

Open `src/lib/server/providers/registry.ts` and add your provider in two places:

### 4a. Add to `KNOWN_PROVIDERS`

This metadata array drives the Settings UI and installation flow:

```typescript
import { ExampleProvider } from './example';

export const KNOWN_PROVIDERS: KnownProvider[] = [
  {
    id: 'ytdlp',
    name: 'yt-dlp',
    description: 'Community-maintained media downloader supporting 1000+ sites',
    homepage: 'https://github.com/yt-dlp/yt-dlp',
    license: 'Unlicense',
    capabilities: ['video', 'music'],
    binaryUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    dependencies: ['ffmpeg', 'python3']
  },
  // ← Add your provider here
  {
    id: 'example',
    name: 'example-dl',
    description: 'Example media downloader',
    homepage: 'https://github.com/example/example-dl',
    license: 'MIT',
    capabilities: ['video'],
    binaryUrl: 'https://github.com/example/example-dl/releases/latest/download/example-dl',
    dependencies: ['ffmpeg']   // System deps required on the host
  }
];
```

**Field reference:**

| Field | Description |
|-------|-------------|
| `id` | Unique identifier. Stored in `groups.downloadProvider` column. Must match your class's `id`. |
| `name` | Human-readable name shown in the Settings UI. |
| `description` | Short description shown below the provider name. |
| `homepage` | Link to the project (shown in UI as a "Learn more" link). |
| `license` | Software license (shown in UI). |
| `capabilities` | `['video']`, `['music']`, or `['video', 'music']`. |
| `binaryUrl` | Direct download URL for the binary. Used by `downloadBinary()`. |
| `dependencies` | System packages the host must have installed (informational, shown in UI). |

### 4b. Add to `providerInstances`

Create a singleton instance. Providers are stateless, so one instance per type is fine:

```typescript
const providerInstances: Record<string, DownloadProvider> = {
  ytdlp: new YtDlpProvider(),
  example: new ExampleProvider()  // ← Add here
};
```

That's it for registration. The existing API endpoints, Settings UI, and download orchestration will automatically discover your provider through the registry.

---

## Step 5: Verify

### Type check

```bash
npm run check
```

Ensures your provider class satisfies the `DownloadProvider` interface.

### Manual testing

1. Start the dev server: `npm run dev`
2. Log in as the group host
3. Open Settings — your provider should appear in the "Download Provider" section
4. Click **Install** — the binary should download to `data/providers/{id}/`
5. Click **Activate** — the provider is now used for new clip downloads
6. Submit a URL and verify the clip downloads successfully

### Verify file placement

After a download, check `data/videos/` for files prefixed with the clip's UUID:

```
data/videos/
├── abc123-uuid.mp4       ← video file
├── abc123-uuid.jpg       ← thumbnail (optional)
└── abc123-uuid.info.json ← metadata (optional, cleaned up is fine)
```

---

## How Downloads Flow End-to-End

Understanding the full flow helps you know what your provider is responsible for and what the framework handles:

```
User submits URL → POST /api/clips
  │
  ├─ Creates clip record (status: 'downloading')
  ├─ Sends push notification to group
  └─ Fires async: downloadVideo(clipId, url) or downloadMusic(clipId, url)
       │
       ├─ deduplicatedDownload() checks:
       │    1. DB for existing clip with same URL → reuses result
       │    2. In-flight download map → waits for leader
       │    3. Otherwise → proceeds as download leader
       │
       ├─ getMaxFileSize(clipId) → reads group's limit
       ├─ getActiveProvider(groupId) → returns your provider instance
       │
       ├─ provider.downloadVideo(url, options) ← YOUR CODE RUNS HERE
       │    Returns: { videoPath, thumbnailPath, title, duration }
       │
       ├─ Post-download file size check (safety net)
       ├─ Updates clip in DB (status: 'ready', paths, metadata)
       └─ On error: cleanupClipFiles(clipId), marks clip as 'failed'
```

Your provider is only responsible for the `downloadVideo` / `downloadAudio` step. Everything else — deduplication, DB updates, file size enforcement, error handling, cleanup — is handled by the orchestration layer.

---

## Binary Management

Provider binaries live in `data/providers/{providerId}/`:

```
data/
├── videos/          ← downloaded media files
└── providers/
    ├── ytdlp/
    │   └── yt-dlp   ← yt-dlp binary
    └── example/
        └── example-dl
```

The `binary.ts` module provides helpers:

| Function | Description |
|----------|-------------|
| `getProviderDir(id)` | Returns `data/providers/{id}` |
| `getBinaryPath(id, name)` | Returns `data/providers/{id}/{name}` |
| `isBinaryInstalled(id, name)` | Checks if the binary file exists |
| `downloadBinary(provider, name)` | Fetches from `provider.binaryUrl`, writes to disk, `chmod 755` |
| `removeBinary(id, name)` | Deletes the binary file (best-effort) |

If your provider needs multiple binaries or a more complex installation (e.g., pip packages, npm installs), override `install()` and `uninstall()` with custom logic instead of using `downloadBinary()`.

---

## File Size Enforcement

The system enforces file size limits at two levels. Your provider should participate in the first:

1. **Pre-download filtering (provider responsibility):** If `options.maxFileSizeBytes` is set, reject content that will clearly exceed the limit before downloading the full file. The yt-dlp provider does this with `--max-filesize` and `--match-filter duration <= N` flags.

2. **Post-download verification (orchestration layer):** After your provider returns, the orchestration layer checks the actual file size. If it exceeds the limit, the files are cleaned up and the clip is marked as failed. This is a safety net — it's better to reject early in your provider.

If your error message for a size rejection includes the string `match_filter` or `File is larger than max-filesize`, the orchestration layer will show a user-friendly message like "Exceeds 500 MB limit" instead of a raw error.

---

## Common Patterns from the Reference Implementation

The yt-dlp provider (`src/lib/server/providers/ytdlp/index.ts`) demonstrates several patterns worth following:

### Metadata extraction via sidecar files

yt-dlp writes a `.info.json` file alongside the video. The provider parses this for title and duration. If your tool has a similar feature, use it — metadata makes clips more useful in the UI.

### Retry logic for audio downloads

Audio downloads use exponential backoff (3 attempts, 2s/4s/6s delays) since YouTube's anti-bot measures can cause intermittent failures. Consider similar retry logic if your provider's source is rate-limited or flaky.

### Environment sanitization

When spawning subprocesses that might invoke Node internally, strip `NODE_OPTIONS`, `VITE_` prefixes, and other dev-environment variables that can interfere:

```typescript
const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) {
  if (key.startsWith('NODE_OPTIONS') || key.startsWith('VITE_')) {
    delete cleanEnv[key];
  }
}
const proc = spawn(binary, args, { env: cleanEnv });
```

### Thumbnail generation

If your tool doesn't generate thumbnails natively, you can use FFmpeg (a required system dependency) to extract a frame:

```bash
ffmpeg -i input.mp4 -vframes 1 -q:v 5 output.jpg
```

---

## Checklist

Before submitting your provider:

- [ ] Implements all methods of `DownloadProvider`
- [ ] Added to `KNOWN_PROVIDERS` in `registry.ts`
- [ ] Added singleton to `providerInstances` in `registry.ts`
- [ ] Output files are prefixed with `options.clipId`
- [ ] Respects `maxFileSizeBytes` when set
- [ ] Throws descriptive errors on failure (not swallowed silently)
- [ ] Does not import from `$lib/server/db` (no direct DB access)
- [ ] `npm run check` passes with no type errors
- [ ] Manual test: install, activate, download a clip
- [ ] Manual test: uninstall cleans up binary
- [ ] Manual test: file size rejection works when limit is set
