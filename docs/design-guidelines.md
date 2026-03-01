# Scrolly Design Guidelines

Visual direction derived from UI inspiration in `docs/inspo/`. This is the single source of truth for all UI/UX decisions.

---

## Design Philosophy

Scrolly should feel like a **native mobile app** — immersive, media-forward, and tactile. Think TikTok's full-screen engagement meets a private social club. Every screen should feel bold, intentional, and fun. Avoid generic "web app" aesthetics. Prioritize **content density** and **visual impact** over whitespace-heavy minimalism.

---

## Color System

The app supports **light mode and dark mode**. The default follows the user's OS/system preference via `prefers-color-scheme`. Users can also override this with a manual toggle in their profile settings (stored as a user preference: `system` | `light` | `dark`).

All color tokens are defined as CSS custom properties on `:root` and toggled via a `[data-theme="light"]` / `[data-theme="dark"]` attribute on `<html>`. When set to `system`, no attribute is applied and `prefers-color-scheme` media queries take effect.

### Dark Theme (Default / Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#000000` | Page backgrounds, app shell |
| `--bg-elevated` | `#111111` | Cards, nav bars, raised surfaces |
| `--bg-surface` | `#1A1A1A` | Input fields, secondary surfaces |
| `--bg-subtle` | `#222222` | Borders, dividers, hover states |
| `--text-primary` | `#FFFFFF` | Headings, primary content |
| `--text-secondary` | `#999999` | Labels, metadata, timestamps |
| `--text-muted` | `#666666` | Placeholder text, disabled states |
| `--border` | `#333333` | Input borders, card outlines |

### Light Theme

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFFFFF` | Page backgrounds, app shell |
| `--bg-elevated` | `#F5F5F5` | Cards, nav bars, raised surfaces |
| `--bg-surface` | `#EEEEEE` | Input fields, secondary surfaces |
| `--bg-subtle` | `#E0E0E0` | Borders, dividers, hover states |
| `--text-primary` | `#000000` | Headings, primary content |
| `--text-secondary` | `#555555` | Labels, metadata, timestamps |
| `--text-muted` | `#999999` | Placeholder text, disabled states |
| `--border` | `#DDDDDD` | Input borders, card outlines |

### Accent Colors (Same in Both Themes)

| Token | Default Value | Usage |
|-------|---------------|-------|
| `--accent-primary` | `#FF6B35` (Coral) | Primary CTA buttons, active indicators — **set per-group by host** |
| `--accent-primary-dark` | `#D4551F` | Primary CTA in light mode (higher contrast) — **set per-group by host** |
| `--accent-magenta` | `#FF2D78` | Notification badges, highlights, favorites |
| `--accent-blue` | `#4A9EFF` | Links, informational elements |

**Group Accent Color:** The group host can choose from a preset palette of 8 colors (coral, violet, cyan, rose, gold, mint, sky, lime). The chosen color is stored on the `groups` table and applied to all group members. Colors are injected server-side via inline styles on `<html>` to avoid flash of wrong color. The palette is defined in `src/lib/colors.ts`.

**Note:** In light mode, use `--accent-primary-dark` for CTA button backgrounds with white text to maintain contrast. In dark mode, use `--accent-primary` with black text.

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#38A169` | Success states, confirmations |
| `--error` | `#E53E3E` | Error states, destructive actions |
| `--warning` | `#FBBF24` | Warnings, caution states |

### Special Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-sky` | `#7EC8E3` | Onboarding gradient start |
| `--bg-sky-light` | `#B8DFEE` | Onboarding gradient end |

### Theme Implementation

```css
/* Default: dark theme */
:root {
  --bg-primary: #000000;
  --bg-elevated: #111111;
  /* ...all dark tokens */
}

/* System preference: light */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg-primary: #FFFFFF;
    --bg-elevated: #F5F5F5;
    /* ...all light tokens */
  }
}

/* Manual override: light */
:root[data-theme="light"] {
  --bg-primary: #FFFFFF;
  --bg-elevated: #F5F5F5;
  /* ...all light tokens */
}

/* Manual override: dark (explicit) */
:root[data-theme="dark"] {
  --bg-primary: #000000;
  --bg-elevated: #111111;
  /* ...all dark tokens */
}
```

### Color Usage Rules

**The 60-30-10 rule for dark themes:** 60% dark surfaces (backgrounds), 30% secondary/elevated surfaces (cards, nav bars), 10% accent color. Use accent sparingly for maximum impact on CTAs, active states, and badges.

**Video-first pure black:** The feed uses `#000000` for maximum contrast and OLED battery savings. Non-video screens (settings, activity) also use `--bg-primary` but can use more `--bg-elevated` cards for structure.

**Text emphasis levels:**
| Level | Token | Usage |
|-------|-------|-------|
| High | `--text-primary` (#FFF) | Headings, usernames, primary labels |
| Medium | `--text-secondary` (#999) | Action text, metadata, timestamps |
| Low/Disabled | `--text-muted` (#666) | Placeholders, disabled controls, hints |

### Theme Preference Storage

- Stored in the user's profile in the database (`themePreference` column: `'system'` | `'light'` | `'dark'`)
- On page load, read from a cookie or inline script to avoid flash of wrong theme
- Settings page provides a 3-way toggle: System / Light / Dark

---

## Typography

### Font Stacks

**Display / Headings:**
```css
font-family: 'Sora', system-ui, sans-serif;
```
Used for page titles, display headings, the "Scrolly" brand, section headers, and onboarding titles. Loaded via Google Fonts (weights 400, 600, 700, 800). Referenced as `var(--font-display)`.

**Body:**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
System fonts for body text keep the app fast and native-feeling. Referenced as `var(--font-body)`.

### Scale

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | `2.5rem` (40px) | 800 | Hero headings, onboarding titles |
| Heading 1 | `1.75rem` (28px) | 700 | Page titles, section headers |
| Heading 2 | `1.25rem` (20px) | 700 | Card titles, player names |
| Body | `1rem` (16px) | 400 | Default body text |
| Body Small | `0.875rem` (14px) | 400 | Metadata, secondary info |
| Caption | `0.75rem` (12px) | 500 | Badges, labels, timestamps |

### Rules
- Headings: Tight line-height (`1.1`–`1.2`), uppercase optional for display
- Body: Standard line-height (`1.5`)
- Use `letter-spacing: -0.02em` on display and h1 for tighter, bolder feel
- Truncate long names with ellipsis (`text-overflow: ellipsis`)

---

## Spacing

Use a `0.25rem` (4px) base unit. Standard spacing tokens:

| Token | Value |
|-------|-------|
| `--space-xs` | `0.25rem` (4px) |
| `--space-sm` | `0.5rem` (8px) |
| `--space-md` | `0.75rem` (12px) |
| `--space-lg` | `1rem` (16px) |
| `--space-xl` | `1.5rem` (24px) |
| `--space-2xl` | `2rem` (32px) |
| `--space-3xl` | `3rem` (48px) |

Page padding: `1rem` horizontal. Max content width: `520px` centered.

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Buttons, inputs, small cards |
| `--radius-md` | `12px` | Cards, media containers |
| `--radius-lg` | `16px` | Large cards, modal panels |
| `--radius-xl` | `20px` | Featured cards, hero sections |
| `--radius-full` | `9999px` | Avatars, pill buttons, badges |

---

## Components

### Buttons

**Primary CTA:**
- Background: `--accent-primary`
- Text: `#000000`, weight 700
- Padding: `0.75rem 1.5rem`
- Border-radius: `--radius-full` (pill shape)
- Full-width on mobile
- No border

**Secondary:**
- Background: `--bg-surface` (`#1A1A1A`)
- Text: `--text-primary` (`#FFFFFF`)
- Border: `1px solid var(--border)`
- Border-radius: `--radius-sm`

**Ghost / Icon Button:**
- Background: transparent or `rgba(255, 255, 255, 0.1)`
- Border-radius: `--radius-full`
- Used for floating action buttons, icon-only interactions

**Disabled state:** `opacity: 0.5; cursor: not-allowed`

### Inputs

- Background: `--bg-surface` (`#1A1A1A`)
- Border: `1px solid var(--border)` (`#333`)
- Border-radius: `--radius-full` (pill shape)
- Padding: `0.75rem 1rem`
- Text color: `--text-primary`
- Placeholder color: `--text-muted`
- Focus: border transitions to `--accent-primary`
- Full-width, centered text for invite codes

### Cards

- Background: `--bg-elevated` (`#111`) or white (`#FFFFFF` for featured)
- Border-radius: `--radius-md` to `--radius-xl`
- No visible border (rely on background contrast)
- Optional subtle shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`
- Content padding: `1rem`

**Video Card (feed item):**
- Full-width, stacked vertically
- Thumbnail/video fills top portion (no padding)
- Text content (title, username, metadata) below with padding
- Action buttons (watched, favorite) as icon row

**Profile/Player Card:**
- Centered avatar, bold name, follower/subscriber count
- Can be grid (2-column) for smaller cards or full-width for featured

### Avatars

- Always circular: `border-radius: --radius-full`
- Sizes: `32px` (small/inline), `48px` (medium/list), `72px` (large/profile), `96px` (featured)
- Object-fit: `cover`
- Optional ring border for active/selected state

### Tabs / Segmented Controls

- Horizontal row, scrollable on overflow
- Inactive: `--bg-surface` background, `--text-secondary` text
- Active: `--text-primary` background, `--bg-primary` text (inverts foreground/background)
- Border-radius: `--radius-sm`
- Gap: `0.25rem`
- Compact padding: `0.5rem 0.75rem`

### Badges / Notification Indicators

- Background: `--accent-magenta` (`#FF2D78`)
- Text: white, `--caption` size, weight 700
- Border-radius: `--radius-full`
- Min-width: `20px`, centered text
- Positioned absolute, offset top-right of parent icon

### Bottom Tab Navigation

Modeled after TikTok, Instagram Reels, and YouTube Shorts navigation patterns.

**Layout:**
- Fixed to bottom of viewport
- Background: `--bg-elevated` with `1px solid var(--border)` top border
- On feed page (overlay mode): `linear-gradient(transparent, rgba(0, 0, 0, 0.85))` with no border
- Height: auto with `--space-sm` vertical padding + safe area inset
- 4 tabs: Home, Activity, Add (+), Settings

**Tab Items:**
- Icon size: `24px` x `24px` (industry standard touch-friendly size)
- Label: `0.625rem` (10px), `--font-body`, below icon
- Gap between icon and label: `3px`
- Touch target padding: `--space-xs` vertical, `--space-lg` horizontal
- Minimum touch target: `44px` x `44px`

**Active/Inactive States (filled vs. outlined icons):**
- **Inactive:** Outlined/stroke icons, `--text-muted` color. On overlay mode: `rgba(255,255,255,0.5)`
- **Active:** Filled/solid icons, `--text-primary` color. On overlay mode: `#fff`
- This filled-vs-outlined pattern matches TikTok, Instagram, and YouTube — it provides instant visual feedback without competing with content

**Create/Add Button (center tab):**
- Rounded rectangle shape: `48px` wide x `32px` tall, `--radius-sm` corners
- Background: `--accent-primary`
- Icon: `22px` "+" in `--bg-primary` color, `stroke-width: 2.5`
- No text label — the "+" is universally understood
- Sits inline with other tabs, no vertical offset (avoids centering issues)
- On tap: `transform: scale(0.97)` feedback

### Profile Picture Upload & Cropping

Users can set a profile picture from their profile/settings page.

**Upload Flow:**
1. Tap avatar (or "Change Photo" button) to open file picker (`accept="image/*"`)
2. Selected image opens in a **circular crop overlay** modal
3. User can pinch/drag to pan and zoom within the circle
4. "Save" confirms the crop; "Cancel" dismisses

**Crop Interface:**
- Full-screen or large modal overlay with dark backdrop (`rgba(0, 0, 0, 0.85)`)
- Image fills the viewport, draggable/zoomable
- Circular mask in center (the visible crop area), everything outside is dimmed
- Circle size: `240px` diameter on mobile, `300px` on larger screens
- Bottom controls: "Cancel" (ghost button, left) and "Save" (primary CTA, right)
- Optional: zoom slider below the image

**Processing:**
- Client-side crop using `<canvas>` (no external library required, or use a lightweight lib like `cropperjs` if needed)
- Output: square image (e.g., `256x256` or `512x512`), JPEG at 85% quality
- Upload to server via `POST /api/profile/avatar` as `multipart/form-data`
- Server stores in `data/avatars/` and saves path in user's DB record

**Display:**
- Avatar always rendered circular (`border-radius: --radius-full`)
- Fallback: show user's initials on a colored background (derived from username hash)
- Sizes follow the avatar size tokens: `32px`, `48px`, `72px`, `96px`

### Floating Action Buttons (FABs)

- Position: fixed or absolute, bottom-right area
- Background: `--bg-elevated` or `rgba(255, 255, 255, 0.1)`
- Border-radius: `--radius-full`
- Size: `48px` x `48px`
- Icon: white, centered
- Stack vertically with `0.5rem` gap for multiple FABs

---

## Layout Patterns

### App Shell
- Full viewport height (`100dvh`)
- Sticky top navigation bar
- Fixed bottom tab navigation
- Scrollable content area between nav bars
- No horizontal scroll on body

### Feed / List View
- Single column, max-width `520px`, centered
- Cards stacked vertically with `0.75rem` gap
- Pull-to-refresh area at top (future)

### Grid View
- 2-column grid for profile/player cards
- Gap: `0.75rem`
- Equal-width columns

### Onboarding / Auth Screens
- Centered content, full-height
- Large display heading at top
- Form or CTA centered below
- Can use light theme (sky blue gradient) as exception to dark default

---

## Page-Specific Patterns

### Top Navigation Bar (Non-Feed Pages)

- Background: `--bg-primary` with `1px solid var(--border)` bottom border
- Position: sticky, `top: 0`, `z-index: 10`
- Content: centered page title (e.g., "Activity", "Settings")
- Title: `--font-display`, `1.0625rem` (17px), weight 700, `--text-primary`
- Padding: `--space-md` vertical, `--space-lg` horizontal
- Not shown on the feed page (feed is full-screen immersive)

### Activity / Notifications Page

Follows the flat-list notification pattern used by TikTok, Instagram, and YouTube. **Not** card-based.

**Time-Grouped Sections:**
- Notifications are grouped by recency: "Today", "Yesterday", "This Week", "Earlier"
- Section headers: `--font-display`, `0.8125rem` (13px), weight 700, `--text-secondary`
- Section header padding: `--space-sm` vertical

**Notification Row Anatomy:**
```
[Avatar 44px] [Text block               ] [Clip thumbnail 44x56px]
               Username action text         (optional)
               Comment preview (if any)
               Timestamp
```

- Row padding: `--space-md` vertical, `--space-sm` horizontal
- Avatar: `44px` circle, `--bg-surface` background with initials fallback
- Gap between avatar and text: `--space-md` (12px)
- Username: `--text-primary`, weight 600 (inline with action text)
- Action text: `--text-secondary`, `0.875rem`
- Comment preview: `--text-muted`, `0.8125rem`, single-line truncated
- Timestamp: `--text-muted`, `0.75rem`, relative format ("2h", "3d")
- Clip thumbnail: `44px` x `56px`, `--radius-sm`, right-aligned

**Read/Unread States:**
- Unread: tinted background using `color-mix(in srgb, var(--accent-primary) 6%, transparent)`
- Read: transparent background
- Keep distinction subtle — guide the eye, don't shout

**Empty State:**
- Centered vertically and horizontally
- Icon: bell icon, `48px`, `--text-muted` at `0.4` opacity
- Title: `--font-display`, `1.125rem`, weight 700, `--text-primary`
- Subtitle: `--text-muted`, `0.875rem`, max-width `240px`, centered
- Generous padding: `--space-3xl`

### Settings Page

Follows the iOS/native settings pattern with sections and grouped rows.

**Profile Header (centered):**
- Avatar: `80px` circle, centered, `--bg-surface` background
- Username: `--font-display`, `1.25rem`, weight 700, `--text-primary`
- Phone: `--text-muted`, `0.8125rem`
- Group pill: accent-tinted background (`15%` opacity), accent text, `--radius-full`
- Padding: `--space-sm` top, `--space-xl` bottom

**Section Organization:**
- Sections separated by `--space-lg` margin
- Section title: `--font-display`, `0.6875rem` (11px), weight 600, uppercase, `0.06em` letter-spacing, `--text-muted`
- Section title padding: `--space-sm` bottom, `--space-xs` horizontal
- Content wrapped in cards: `--bg-elevated`, `--radius-md`, `--space-lg` padding

**Setting Rows:**
- `display: flex; align-items: center; justify-content: space-between`
- Padding: `--space-sm` vertical
- Separated by `1px solid var(--bg-surface)` dividers (last row has no divider)
- Setting name: `0.875rem`, weight 500, `--text-primary`
- Setting description: `0.75rem`, `--text-muted`

**Toggle Switches:**
- Size: `44px` x `26px`, `13px` border-radius
- Off track: `var(--border)`
- On track: `var(--accent-primary)`
- Thumb: `22px` circle, white, with `box-shadow: 0 1px 3px rgba(0,0,0,0.2)`
- Transition: `transform 0.2s` for thumb slide

**Segmented Controls (theme picker, tab bar):**
- Container: `--bg-surface`, `--radius-full`, `3px` padding
- Options: `--radius-full`, `--space-sm` vertical / `--space-md` horizontal padding
- Active: `--text-primary` background, `--bg-primary` text (inverted)
- Inactive: transparent background, `--text-secondary` text
- Font: `0.8125rem`, weight 600

**Destructive Actions (log out, delete):**
- Place at very bottom of settings
- Log out: `--text-primary` or `--error` text
- Delete account: `--error` text
- Both require confirmation dialog before executing

---

## Motion & Interaction

- Use `transition: all 0.2s ease` as default for interactive elements
- Button press: `transform: scale(0.97)` on `:active`
- Tab switches: no animation, instant swap
- Page transitions: none (SvelteKit handles routing, keep it snappy)
- Avoid gratuitous animation — speed and responsiveness over flourish

---

## Iconography

- **Default state:** Outlined/stroke-style icons for inactive elements
- **Active/selected state:** Filled/solid icons to indicate selection (bottom nav, toggles)
- Consistent stroke width: `1.5px` – `2px` for outlined icons
- Size: `24px` for navigation, `20px` for in-content actions, `16px` for inline
- Color inherits from text color
- Source: Lucide, Phosphor, or similar clean icon sets (or inline SVG)
- On video overlays, add `filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5))` for visibility

---

## Imagery & Media

- Videos and thumbnails: fill container width, maintain aspect ratio
- Profile photos: always circular, `object-fit: cover`
- Use `aspect-ratio: 9/16` for vertical video thumbnails
- Loading state: dark placeholder with subtle shimmer/pulse
- Error state: dark placeholder with muted icon

### Video Overlay Patterns

**Bottom gradient** (for text readability over video):
```css
background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
```
Covers the bottom ~30-40% of the video frame.

**Text on video:** Always white `#FFFFFF` regardless of theme mode, with `text-shadow: 0 1px 3px rgba(0,0,0,0.5)` for readability.

**Frosted glass overlays** (nav bars over video, bottom sheets):
```css
backdrop-filter: blur(20px);
background: rgba(0, 0, 0, 0.7);
```

### Engagement Icons (right-side overlay on video)

- Icon size: `32px`–`36px`, filled style (more visible than outlined against video)
- Count text: `12px`–`13px`, white, weight 600
- Vertical gap between icon groups: `16px`–`20px`
- All icons: `filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5))`
- Profile avatar in overlay: `40px`–`48px` diameter

---

## Responsive Behavior

- **Mobile-first.** Design for `375px` width and scale up.
- Max content width: `520px` centered (prevents ultra-wide stretching)
- Touch targets: minimum `44px` x `44px`
- Safe area insets: respect `env(safe-area-inset-*)` for notch/home indicator
- Use `100dvh` (dynamic viewport height) not `100vh`

---

## Do's and Don'ts

**Do:**
- Keep the interface immersive in both light and dark modes
- Use CSS custom properties for ALL colors — never hardcode `#000` or `#fff`
- Make CTAs bold and impossible to miss (accent color)
- Use large, confident typography for headings
- Let media (video/photos) be the star of the layout
- Keep interactions fast and responsive
- Test every screen in both light and dark mode
- Provide a clear theme toggle in user settings (System / Light / Dark)

**Don't:**
- Hardcode color values — always use `var(--token)` so themes work
- Add decorative borders or outlines to cards (use background contrast)
- Use small, timid typography — go big
- Add excessive whitespace — this is a content-dense, feed-first app
- Use generic blue links — use the accent palette
- Forget contrast requirements — ensure text is readable in both themes
