# Afterposten (localhost) — Requirements (MVP)

## 1) Purpose

Build a **local-first web app running on localhost** for managing the full lifecycle of social posts (starting with LinkedIn):

* Capture an **idea** (English-only)
* Use AI to generate **drafts/variants/hashtags** and **generative images** (PNG/JPEG)
* Manually edit the final content
* Schedule posts in a **content calendar**
* At the scheduled time, publish via **n8n webhook** by sending **text + image binary**
* Support **auto-learning** via external RAG platform (memory source/sink)

## 2) MVP Scope

### In scope

* CRUD posts: idea → draft → review → scheduled → published/failed
* AI generation (OpenAI):

  * 1 draft
  * N variants (3–5)
  * hashtags
  * alt-text (for media)
  * (optional) first comment
* Generative **image creation** (PNG/JPEG)
* Content calendar with scheduling (no reminders)
* Publishing by calling an **n8n webhook** (multipart/form-data, image as binary)
* Multiple n8n environments/profiles (fully configurable)
* Timezone for scheduling and display from configuration
* Auto-learning hooks (RAG):

  * retrieve voice/style context
  * ingest published artifacts
* Tests: unit + integration + ≥1 E2E

### Explicitly out of scope (MVP)

* GIF generation (separate feature later)
* Direct LinkedIn API posting (handled via n8n workflow)
* Full brand guide / brand customization (use style presets)

## 3) Non-functional Requirements

* **Local-first**: data stored locally in SQLite
* **Configurable**: publisher URLs, auth, timezone, polling interval
* **No secrets in DB logs**: keep API keys in env/secure storage; redact sensitive logs
* **Idempotent scheduling**: no double-publish for same schedule
* **Reliable**: retries with backoff for transient failures

## 4) Recommended Tech Stack (MVP)

* **Next.js** (App Router) + **TypeScript**
* **SQLite** + **Prisma**
* **Vercel AI SDK** for text workflows + OpenAI provider
* **OpenAI Images API** for PNG/JPEG generation
* **Vitest** (unit/integration) + **Playwright** (E2E)
* In-process **scheduler poller** (no Redis)

## 5) Core Concepts & Data Flow

1. User enters **Idea** (English)
2. App fetches **Voice Context** (optional) from Memory Source (RAG platform)
3. AI generates Draft/Variants/Hashtags (structured JSON)
4. User selects/edits final text
5. User generates image using **Style Preset** and stores asset
6. User schedules post in calendar
7. Scheduler executes at due time → **Publisher Adapter** (n8n webhook)
8. On success: mark Published + send content to Memory Sink for auto-learning

## 6) Configuration

### 6.1 Application settings

* `timezone`: IANA TZ string (default: `Europe/Belgrade`)
* `scheduler_poll_interval_sec`: integer (default: 10)
* `default_publisher_profile_id`: optional
* `max_publish_attempts`: default 5

### 6.2 Publisher Profiles (n8n environments)

Support multiple profiles, each with:

* `name` (e.g., prod/stage/personal)
* `webhook_url`
* Auth:

  * `none`
  * `header` → (`auth_header_name`, `auth_header_value`)
  * `bearer` → (`bearer_token`)
* `binary_field_name` (default `mediaFile`)
* `extra_payload_json` (key/value always attached)

### 6.3 RAG platform hooks (optional)

* `MEMORY_SOURCE_URL` (optional)
* `MEMORY_SINK_URL` (optional)
* If not set, app runs without RAG.

## 7) Data Model (SQLite)

> Store scheduled time in UTC to avoid TZ bugs. Keep the TZ used for display/audit.

### 7.1 Tables

#### `posts`

* `id` (uuid)
* `idea` (text)
* `language` = `en`
* `status`: `idea | draft | review | scheduled | published | failed`
* `final_text` (text, nullable)
* `publisher_profile_id` (nullable; fallback to default profile)
* `created_at`, `updated_at`

#### `drafts`

* `id` (uuid)
* `post_id` (fk)
* `kind`: `draft | variant`
* `content_json` (text) — serialized DraftOutput
* `created_at`

#### `assets`

* `id` (uuid)
* `post_id` (fk)
* `type`: `image_png | image_jpeg`
* `path` (text)
* `alt_text` (text)
* `meta_json` (text): prompt, preset, aspect, model, etc.
* `created_at`

#### `schedules`

* `id` (uuid)
* `post_id` (fk)
* `publisher_profile_id` (nullable)
* `scheduled_at_utc` (datetime)
* `scheduled_tz` (string)
* `status`: `scheduled | running | done | failed`
* `locked_until` (datetime nullable)
* `attempts` (int)
* `last_error` (text nullable)

#### `publish_runs`

* `id` (uuid)
* `post_id` (fk)
* `schedule_id` (fk)
* `publisher_profile_id` (fk)
* `status`: `success | failed`
* `request_meta_json` (text) — no secrets
* `response_meta_json` (text)
* `created_at`

#### `publisher_profiles`

* `id` (uuid)
* `name`
* `webhook_url`
* `auth_type`: `none | header | bearer`
* `auth_header_name` (nullable)
* `auth_header_value_enc` (nullable) — encrypted
* `bearer_token_enc` (nullable) — encrypted
* `binary_field_name`
* `extra_payload_json`
* `created_at`, `updated_at`

#### `app_settings`

* `id` (singleton)
* `timezone`
* `scheduler_poll_interval_sec`
* `default_publisher_profile_id` (nullable)
* `max_publish_attempts`

## 8) AI Contracts (Structured JSON)

### 8.1 DraftOutput

```ts
export type DraftOutput = {
  hook: string;              // 1–2 lines
  body: string;              // main text with line breaks
  bullets?: string[];        // optional
  cta?: string;              // optional
  hashtags: string[];        // 5–15
  firstComment?: string;     // optional
};
```

### 8.2 ImageRequest

```ts
export type ImageRequest = {
  stylePreset: 'clean-tech' | 'product-ui' | 'diagram' | 'editorial' | 'bold-minimal';
  format: 'png' | 'jpeg';
  aspect: '1:1' | '4:5' | '16:9';
  prompt: string;            // final prompt used for generation
};
```

### 8.3 AltTextOutput

```ts
export type AltTextOutput = { altText: string };
```

## 9) Generative Image Requirements (MVP)

* Output: PNG/JPEG only
* UI: select **Style Preset** + **Aspect Ratio** + **Format**
* Prompt constraints (must):

  * LinkedIn-ready, clean composition, high contrast
  * avoid tiny unreadable text
  * reflect post topic (e.g., “Vercel AI SDK”, “agent workflow”)
* Store:

  * file on disk
  * `meta_json` includes prompt/preset/aspect/model
  * generated `alt_text`

## 10) Publisher Adapter: n8n Webhook

### 10.1 Payload format

Send **multipart/form-data**:

* Text parts:

  * `text`: final post text
  * `hashtags`: array JSON or comma string (choose one; default JSON string)
  * `postId`
  * `scheduledAt`: ISO string in configured TZ (for audit)
  * `environment`/`profileName`
  * plus `extra_payload_json` fields (flattened)
* Binary part:

  * field name = `binary_field_name` (configurable)
  * filename: `post-{postId}.{png|jpg}`
  * content-type accordingly

### 10.2 Auth

* `none`
* `header`: add `auth_header_name: auth_header_value`
* `bearer`: add `Authorization: Bearer <token>`

### 10.3 Logging

* Do not log secrets or binary content
* Save a `publish_run` with sanitized request/response meta

## 11) Scheduler (In-process Poller)

### 11.1 Execution loop

Every `scheduler_poll_interval_sec`:

* find schedules where:

  * `status='scheduled'`
  * `scheduled_at_utc <= now_utc`
  * `locked_until IS NULL OR locked_until < now_utc`
* atomically lock + mark running:

  * `status='running'`
  * `locked_until = now_utc + 60s`
  * `attempts += 1`
* execute publish
* on success:

  * schedule → `done`
  * post → `published`
  * write `publish_run`
  * send to Memory Sink (best-effort)
* on failure:

  * write `publish_run`
  * update `last_error`
  * if attempts < max: reschedule with backoff
  * else: schedule → `failed`, post → `failed`

### 11.2 Backoff strategy

* Update `scheduled_at_utc = now_utc + min(60s * attempts, 15m)`

### 11.3 Time handling

* UI collects local datetime + configured TZ
* Convert to UTC for storage
* Always display in configured TZ

## 12) UI Requirements

### 12.1 `/posts` list

* Search, filter by status
* Show scheduled time (configured TZ)
* Quick selector for publisher profile

### 12.2 `/posts/:id` editor

* Idea input
* AI actions:

  * Generate Draft
  * Generate Variants
  * Generate Hashtags
  * Generate Image
  * Generate Alt-text
* Final editor text area
* Assets panel (preview, regenerate)
* Scheduling panel (datetime picker, profile select)
* Publish history

### 12.3 `/settings`

* General: timezone, poll interval, default publisher profile, max attempts
* Publishers: CRUD profiles + “Send test ping” (no media)

## 13) Auto-learning (RAG) Interfaces

### 13.1 Memory Source (optional)

* `GET /voice-context` (example) → returns short style profile + examples
* Used at generation time to inject into prompt

### 13.2 Memory Sink (optional)

* `POST /ingest` (example) → send published post + metadata
* Best-effort: failures must not block publishing

## 14) Internal API (if using API routes)

* `POST /api/posts`
* `GET /api/posts?status=&q=`
* `GET /api/posts/:id`
* `POST /api/posts/:id/generate/draft`
* `POST /api/posts/:id/generate/variants`
* `POST /api/posts/:id/generate/hashtags`
* `POST /api/posts/:id/assets/generate`
* `POST /api/posts/:id/assets/alt-text`
* `POST /api/posts/:id/schedule`
* `POST /api/scheduler/tick` (optional for testing)
* `CRUD /api/settings`
* `CRUD /api/publishers`

## 15) Testing Requirements

### 15.1 Unit (Vitest)

* DraftOutput formatting to final text (line breaks, hashtags)
* JSON schema validation for AI outputs
* Multipart builder correctness (parts and headers)
* TZ conversion logic (local + TZ → UTC)

### 15.2 Integration

* Prisma repos CRUD
* Scheduler locking ensures no double-run (simulate concurrent ticks)
* Asset saving to disk and DB record

### 15.3 E2E (Playwright)

* Create post → mock AI draft → mock image generation → schedule for now
* Run scheduler tick → verify publish_run created, schedule done, post published

## 16) Definition of Done (Acceptance)

* App runs on localhost with one command; initializes SQLite
* Can create posts, generate draft/variants/hashtags, edit final text
* Can generate PNG/JPEG and attach to post, with alt-text
* Can schedule post in calendar using configured TZ
* Scheduler publishes to selected n8n profile via multipart webhook
* Auto-learning hooks exist; app functions without RAG URLs
* Tests green (unit + integration + ≥1 E2E)

## 17) Future Enhancements (not MVP)

* GIF/storyboard pipeline
* Template-based infographics (brandable)
* More adapters (Medium/blog), analytics ingest
* Advanced voice training UI + dataset management

