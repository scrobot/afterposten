/**
 * Centralized environment configuration — one import to rule them all.
 *
 * For runtime secrets (OpenAI key), use `resolveOpenAIKey()` from config-store.ts.
 * This module handles non-async env lookups and the encryption key lifecycle.
 */
import { resolveEncryptionKey } from "./encryption-key";

function optional(name: string, fallback: string = ""): string {
    return process.env[name] ?? fallback;
}

export const env = {
    /**
     * OpenAI API key — sync getter for backward compatibility.
     * Returns the env var if set, or empty string.
     * For async resolution (env → DB fallback), use `resolveOpenAIKey()` from config-store.ts.
     */
    get OPENAI_API_KEY(): string {
        return optional("OPENAI_API_KEY");
    },

    /** SQLite database URL */
    get DATABASE_URL(): string {
        return optional("DATABASE_URL", "file:./dev.db");
    },

    /**
     * Encryption key for sensitive publisher profile fields (32-byte hex string).
     * Auto-generated on first launch if not in env.
     */
    get ENCRYPTION_KEY(): string {
        return resolveEncryptionKey();
    },

    /** Node environment */
    get NODE_ENV(): string {
        return optional("NODE_ENV", "development");
    },
} as const;
