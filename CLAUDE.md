# CLAUDE.md

## Project: Afterposten (localhost) — MVP

You are a coding agent working inside this repository. Your job is to implement the MVP described in `spec.md` end-to-end, with strong test coverage and a reliable dev workflow.

### Single source of truth
- `spec.md` is the source of truth for requirements.
- If you notice inconsistencies or missing details in `spec.md`, propose the smallest reasonable assumption **in the PR description** and implement in a way that is easy to extend later.

---

## Core principles
1. **Ship the MVP**: implement exactly what’s in `spec.md` with minimal overengineering.
2. **No TODOs**: do not leave placeholders, unfinished implementations, or “TODO” comments in delivered code.
3. **Tests are mandatory**:
   - Write unit + integration tests, plus at least 1 Playwright E2E as required by `spec.md`.
   - Prefer deterministic tests: mock OpenAI/n8n network calls.
4. **Local-first**:
   - Use SQLite + Prisma.
   - No cloud dependencies required to run the app locally.
5. **Security & privacy**:
   - Never commit secrets.
   - Do not log secrets or binary payloads.
   - Redact sensitive fields in logs and stored request metadata.
6. **Reliability**:
   - Scheduler must be idempotent and prevent double-publish (locking).
   - Publishing must implement retries with backoff as described.
7. **Configurable**:
   - Timezone and scheduler polling interval are configurable.
   - n8n webhook environments are configurable via UI + DB.

---

## Tech stack (MVP)
- Next.js (App Router) + TypeScript
- SQLite + Prisma
- Vercel AI SDK + OpenAI provider for text generation
- OpenAI Images API for PNG/JPEG generation
- Vitest for unit/integration
- Playwright for E2E
- In-process scheduler poller (no Redis)

---

## Repository conventions

### Code quality
- TypeScript strict mode on.
- Prefer small modules and explicit types.
- Avoid “magic” implicit behavior; keep domain logic testable.
- Centralize environment config in a single module (`src/config/...`).

### Folder structure (recommended)
- `src/app` — Next.js routes/pages
- `src/server` — server-only logic (db, services, publishers, scheduler)
- `src/server/db` — Prisma client + repositories
- `src/server/ai` — AI generation services (text/image/alt-text)
- `src/server/publishers` — publisher adapters (n8n)
- `src/server/scheduler` — poller + locking + retry/backoff
- `src/shared` — shared types/contracts (DraftOutput, ImageRequest, etc.)
- `tests` — unit/integration tests (Vitest)
- `e2e` — Playwright tests

### Database & migrations
- Use Prisma migrations.
- Keep schema aligned with `spec.md` tables.
- Provide a simple local init path (`prisma migrate dev` in scripts).

### API contracts
- All internal API routes must have:
  - request validation (zod recommended)
  - clear error responses (no raw stack traces to client)
- AI outputs must be validated against strict schemas before persisting.

---

## Networking & external integrations

### OpenAI
- All calls must go through a thin service wrapper:
  - Text generation (Vercel AI SDK)
  - Image generation (OpenAI Images API)
- Provide test doubles/mocks; never hit real OpenAI in tests.

### n8n publisher
- Must use `multipart/form-data`:
  - text fields + binary image field name from publisher profile
- Support auth modes: none / header / bearer.
- Store sanitized request/response metadata in `publish_runs` without secrets.

### RAG hooks (optional)
- Memory Source and Memory Sink are optional and best-effort:
  - If not configured, app works fully.
  - If configured but failing, publishing must still succeed.

---

## Scheduler requirements
- Poll interval configurable.
- Locking must prevent double processing.
- Implement attempts + backoff and max attempts.
- Persist schedule status transitions exactly as required.

---

## UI requirements
Implement the pages in `spec.md`:
- `/posts` list with search/filter and quick profile selection
- `/posts/:id` editor with AI actions, assets panel, schedule panel, publish history
- `/settings` general settings (timezone, poll interval, defaults)
- `/settings` publishers CRUD + test ping

---

## Development workflow

### Commands (keep these scripts working)
- `pnpm dev` — run app locally
- `pnpm test` — vitest
- `pnpm test:e2e` — playwright
- `pnpm lint` — lint
- `pnpm typecheck` — tsc

### Git & commits
- Make small commits that keep the repository in a working state.
- Prefer Conventional Commits:
  - `feat: ...`, `fix: ...`, `test: ...`, `refactor: ...`, `chore: ...`, `docs: ...`
- Update `spec.md` only if explicitly requested; otherwise treat it as fixed.

---

## Definition of done (must satisfy)
- App runs on localhost; initializes SQLite schema.
- Can create posts; generate drafts/variants/hashtags; edit final text.
- Can generate PNG/JPEG, store asset, generate alt-text.
- Can schedule post using configured timezone and poller.
- Poller publishes to selected n8n profile and records publish runs.
- Auto-learning hooks exist and are non-blocking.
- Tests green: unit + integration + ≥1 E2E.

---

## Response format when reporting progress
When you report progress in chat, include:
- What changed (high-level)
- How to run it (commands)
- What tests were added/updated
- Any assumptions made (only if needed)
- No long logs; keep it concise
