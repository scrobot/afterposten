/**
 * Centralized constants — eliminates magic numbers from the codebase.
 * Grouped by domain for easy discovery.
 */

// ─── Scheduler ─────────────────────────────────────────────────
/** Duration (ms) a schedule stays locked while being processed. */
export const LOCK_DURATION_MS = 60_000;

/** Base delay (ms) for exponential backoff between retry attempts. */
export const BACKOFF_BASE_MS = 60_000;

/** Maximum backoff delay (ms) — caps at 15 minutes. */
export const BACKOFF_CEILING_MS = 15 * 60_000;

/** Default polling interval (ms) for the scheduler poller. */
export const DEFAULT_POLL_INTERVAL_MS = 10_000;

// ─── RAG / Vector Search ───────────────────────────────────────
/** Minimum cosine similarity score to consider a result "relevant". */
export const RAG_SIMILARITY_THRESHOLD = 0.7;

/** Chunk size (tokens) for document indexing in Vectra. */
export const CHUNK_SIZE = 512;

/** Overlap (tokens) between adjacent chunks. */
export const CHUNK_OVERLAP = 50;

/** Maximum character length for rendered sections from Vectra. */
export const MAX_SECTION_RENDER_LENGTH = 2000;

/** Maximum tokens sent per embedding request. */
export const MAX_EMBEDDING_TOKENS = 8000;

/** Default max documents returned by a knowledge query. */
export const QUERY_MAX_DOCUMENTS = 5;

/** Default max chunks returned by a knowledge query. */
export const QUERY_MAX_CHUNKS = 10;

/** Maximum past posts to retrieve for voice context. */
export const VOICE_CONTEXT_MAX_POSTS = 3;

/** Maximum knowledge base chunks to retrieve for voice context. */
export const VOICE_CONTEXT_MAX_CHUNKS = 5;

// ─── Network ───────────────────────────────────────────────────
/** Timeout (ms) for fetching external URLs during KB ingestion. */
export const URL_FETCH_TIMEOUT_MS = 15_000;

/** Minimum extracted text length (chars) to accept a URL document. */
export const MIN_EXTRACTED_TEXT_LENGTH = 50;

// ─── Logging / Sanitization ───────────────────────────────────
/** Max characters of post text to include in sanitized request metadata. */
export const LOG_TEXT_TRUNCATION_LENGTH = 100;

// ─── AI Models ─────────────────────────────────────────────────
/** Primary LLM model for text generation (drafts, variants, alt-text). */
export const MODEL_TEXT_PRIMARY = "gpt-4o";

/** Lightweight LLM model for simpler tasks (hashtags). */
export const MODEL_TEXT_LIGHT = "gpt-4o-mini";

/** Model for image generation. */
export const MODEL_IMAGE = "gpt-image-1";

/** Model for text embeddings. */
export const MODEL_EMBEDDING = "text-embedding-3-small";
