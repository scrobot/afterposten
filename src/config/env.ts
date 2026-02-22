/** Centralized environment configuration — one import to rule them all. */

function required(name: string): string {
    const val = process.env[name];
    if (!val) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return val;
}

function optional(name: string, fallback: string = ""): string {
    return process.env[name] ?? fallback;
}

export const env = {
    /** OpenAI API key for text + image generation */
    get OPENAI_API_KEY(): string {
        return required("OPENAI_API_KEY");
    },

    /** SQLite database URL */
    get DATABASE_URL(): string {
        return optional("DATABASE_URL", "file:./dev.db");
    },

    /** Encryption key for sensitive publisher profile fields (32-byte hex string) */
    get ENCRYPTION_KEY(): string {
        return required("ENCRYPTION_KEY");
    },

    /** Node environment */
    get NODE_ENV(): string {
        return optional("NODE_ENV", "development");
    },
} as const;
