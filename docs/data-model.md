# Data Model

SQLite database via Drizzle ORM. All IDs are UUIDs stored as text. Timestamps are Unix epoch integers.

## Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| username | text | Unique within group |
| phone | text | Required, E.164 format (+1234567890). Used to match inbound SMS to user. |
| group_id | text | FK → groups.id |
| created_at | integer | Unix timestamp |

### groups

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| name | text | Group display name |
| invite_code | text | Unique. Used to join the group. |
| retention_days | integer | Nullable. Days before auto-delete. |
| max_storage_mb | integer | Nullable. Storage cap for the group. |
| created_by | text | FK → users.id (host/admin) |
| created_at | integer | Unix timestamp |

### clips

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| group_id | text | FK → groups.id |
| added_by | text | FK → users.id |
| original_url | text | Source TikTok/IG/FB URL. Preserved even after video deletion. |
| video_path | text | Local filesystem path to downloaded video |
| thumbnail_path | text | Nullable. Path to thumbnail image. |
| title | text | Caption from SMS message text, source metadata, or AI-generated |
| duration_seconds | integer | Nullable |
| platform | text | 'tiktok' / 'instagram' / 'facebook' |
| status | text | 'downloading' / 'ready' / 'failed' / 'deleted' |
| created_at | integer | Unix timestamp |

### comments

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| clip_id | text | FK → clips.id |
| user_id | text | FK → users.id |
| text | text | Comment body |
| created_at | integer | Unix timestamp |

### reactions

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| clip_id | text | FK → clips.id |
| user_id | text | FK → users.id |
| emoji | text | e.g., '😂', '🔥', '❤️' |
| created_at | integer | Unix timestamp |

Unique constraint on `(clip_id, user_id, emoji)` — one of each emoji per user per clip.

### watched

| Column | Type | Notes |
|--------|------|-------|
| clip_id | text | Composite PK, FK → clips.id |
| user_id | text | Composite PK, FK → users.id |
| watched_at | integer | Unix timestamp |

### favorites

| Column | Type | Notes |
|--------|------|-------|
| clip_id | text | Composite PK, FK → clips.id |
| user_id | text | Composite PK, FK → users.id |
| created_at | integer | Unix timestamp |

### push_subscriptions

| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, UUID |
| user_id | text | FK → users.id |
| endpoint | text | Web Push endpoint URL |
| keys_p256dh | text | Public key for encryption |
| keys_auth | text | Auth secret |
| created_at | integer | Unix timestamp |

### notification_preferences

| Column | Type | Notes |
|--------|------|-------|
| user_id | text | PK, FK → users.id |
| new_adds | integer | Boolean (0/1). Default 1. |
| reactions | integer | Boolean (0/1). Default 1. |
| comments | integer | Boolean (0/1). Default 1. |
| daily_reminder | integer | Boolean (0/1). Default 0. |

## Relationships

```
groups 1──∞ users
groups 1──∞ clips
users  1──∞ clips (added_by)
users  1──∞ comments
users  1──∞ reactions
clips  1──∞ comments
clips  1──∞ reactions
clips  ∞──∞ users (watched)
clips  ∞──∞ users (favorites)
users  1──∞ push_subscriptions
users  1──1 notification_preferences
```

## Notes

- **Soft delete for clips:** When retention policy removes a video, the clip record stays with `status = 'deleted'` and `original_url` preserved so users can still visit the source.
- **Phone uniqueness:** Phone numbers should be unique across the system (a user can only belong to one group with one phone number). If multi-group support is added later, this constraint would change.
- **SQLite booleans:** Stored as integers (0/1) since SQLite has no native boolean type.
