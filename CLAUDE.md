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
- Avoid "magic" implicit behavior; keep domain logic testable.
- Centralize environment config in a single module (`src/config/env.ts`).
- Centralize all numeric constants in `src/config/constants.ts`.

### Folder structure (recommended)

- `src/app` — Next.js routes/pages
- `src/config` — environment config (`env.ts`) and named constants (`constants.ts`)
- `src/server` — server-only logic (db, services, publishers, scheduler)
- `src/server/db` — Prisma client + repositories
- `src/server/ai` — AI generation services (text/image/alt-text)
- `src/server/publishers` — publisher adapters (n8n)
- `src/server/scheduler` — poller + locking + retry/backoff
- `src/server/rag` — Vectra vector indexes (knowledge base + published posts)
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

## Established patterns (from code review)

### Environment variables — always use `env.ts`

- **Never** access `process.env.*` directly in application code.
- Import from `@/config/env` which validates and types all env vars.
- Applies to: `DATABASE_URL`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`, etc.

### Magic numbers — always use `constants.ts`

- **Never** use bare numeric literals for thresholds, timeouts, sizes, or limits.
- Import named constants from `@/config/constants.ts`.
- Examples: `LOCK_DURATION_MS`, `RAG_SIMILARITY_THRESHOLD`, `CHUNK_SIZE`, `BACKOFF_BASE_MS`.
- AI model names are also in `constants.ts`: `MODEL_TEXT_PRIMARY`, `MODEL_TEXT_LIGHT`, `MODEL_IMAGE`, `MODEL_EMBEDDING`.

### Async file I/O — never block the event loop

- Use `import fs from "node:fs/promises"` for all file operations.
- The only exception: `existsSync()` may be used for quick file-exists checks (import separately from `"node:fs"`).
- Never use `readFileSync`, `writeFileSync`, `mkdirSync` etc. in server code.

### Error handling

- **No empty `catch` blocks**: always log a warning with `console.warn(...)` at minimum.
- **No fire-and-forget promises**: any `.then()` on a promise that isn't awaited must have a `.catch()` that logs the error.
- API route handlers should differentiate between 400 (validation), 404 (not found), and 500 (server error).

### Component size limits

- Page components should be **under 200 lines**. If a page grows beyond this, extract sub-components into `_components/` directory within the page folder.
- Individual functions should be **under 50 lines**. Extract helpers for complex logic.

### Type definitions

- Shared API response types belong in `src/shared/types.ts` or `src/shared/api-types.ts`.
- **Never** re-declare the same interface inline in multiple page components.

### Formatting & linting

- Prettier is configured (`.prettierrc`) — `printWidth: 100`, double quotes, 4-space indent.
- Husky pre-commit hook runs lint-staged: ESLint + Prettier on all staged files.
- Run `pnpm lint` and `pnpm typecheck` before committing.

---

## Anti-patterns to avoid

| ❌ Don't                               | ✅ Do instead                                            |
| -------------------------------------- | -------------------------------------------------------- |
| `process.env.OPENAI_API_KEY!`          | `import { env } from "@/config/env"`                     |
| `fs.readFileSync(...)`                 | `await fs.readFile(...)`                                 |
| `} catch { /* ignore */ }`             | `} catch (e) { console.warn("context:", e) }`            |
| `result.object.then(...)` (no catch)   | `result.object.then(...).catch(...)`                     |
| `model: openai("gpt-4o")`              | `model: openai(MODEL_TEXT_PRIMARY)`                      |
| `score > 0.7`                          | `score > RAG_SIMILARITY_THRESHOLD`                       |
| 1000+ line page component              | Split into `_components/` sub-components                 |
| Inline `interface Foo {}` in each page | Shared types in `src/shared/`                            |
| Regex-based HTML parsing               | Use a proper library (`cheerio`, `@mozilla/readability`) |
| `window.confirm()`                     | Custom confirm dialog component                          |

---

## Networking & external integrations

### OpenAI

- All calls must go through a thin service wrapper:
    - Text generation (Vercel AI SDK) — `src/server/ai/text-service.ts`
    - Image generation (OpenAI Images API) — `src/server/ai/image-service.ts`
- Model names come from `@/config/constants` — never hardcode strings.
- Provide test doubles/mocks; never hit real OpenAI in tests.

### n8n publisher

- Must use `multipart/form-data`:
    - text fields + binary image field name from publisher profile
- Support auth modes: none / header / bearer.
- Store sanitized request/response metadata in `publish_runs` without secrets.
- Text truncation for logs uses `LOG_TEXT_TRUNCATION_LENGTH` constant.

### RAG hooks (best-effort)

- Memory Source and Memory Sink are optional and best-effort:
    - If not configured, app works fully.
    - If configured but failing, publishing must still succeed.
- Vectra indexes live in `data/` (gitignored).
- Similarity thresholds, chunk sizes, and query limits all come from `constants.ts`.

---

## Scheduler requirements

- Poll interval configurable via `DEFAULT_POLL_INTERVAL_MS` constant and DB settings.
- Locking must prevent double processing; lock duration is `LOCK_DURATION_MS`.
- Implement attempts + backoff (`BACKOFF_BASE_MS`, `BACKOFF_CEILING_MS`) and max attempts.
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
- `pnpm test` — vitest (37 tests across 4 files)
- `pnpm test:e2e` — playwright
- `pnpm lint` — eslint
- `pnpm typecheck` — tsc --noEmit

### Pre-commit hooks

- Husky v9 runs lint-staged on every commit.
- lint-staged runs: ESLint `--fix` on `*.{ts,tsx}`, Prettier `--write` on `*.{ts,tsx,json,css,md}`.
- If pre-commit fails, fix the issues before committing.

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
- `pnpm typecheck` and `pnpm lint` pass clean.
- No magic numbers, no raw `process.env`, no sync FS, no empty catches.

---

## Response format when reporting progress

When you report progress in chat, include:

- What changed (high-level)
- How to run it (commands)
- What tests were added/updated
- Any assumptions made (only if needed)
- No long logs; keep it concise
