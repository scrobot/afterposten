/**
 * Shared OpenAI embeddings helpers for Vectra indexes.
 * Uses text-embedding-3-small (1536 dims) — cheapest and fast enough for local use.
 */
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "vectra";
import { resolveOpenAIKey } from "@/config/config-store";
import { MODEL_EMBEDDING, MAX_EMBEDDING_TOKENS } from "@/config/constants";

let _openai: OpenAI | null = null;
async function getOpenAI(): Promise<OpenAI> {
    if (!_openai) {
        const apiKey = await resolveOpenAIKey();
        if (!apiKey) throw new Error("OpenAI API key not configured");
        _openai = new OpenAI({ apiKey });
    }
    return _openai;
}

/** Reset cached clients — called when API key is updated. */
export function resetEmbeddingsClients(): void {
    _openai = null;
    _embeddings = null;
}

/**
 * Get a single embedding vector for a text string.
 * Used by LocalIndex (posts).
 */
export async function getVector(text: string): Promise<number[]> {
    const resp = await (
        await getOpenAI()
    ).embeddings.create({
        model: MODEL_EMBEDDING,
        input: text,
    });
    return resp.data[0].embedding;
}

/**
 * Shared OpenAIEmbeddings instance for LocalDocumentIndex (knowledge base).
 * Vectra handles batching internally.
 */
let _embeddings: OpenAIEmbeddings | null = null;
export async function getEmbeddingsInstance(): Promise<OpenAIEmbeddings> {
    if (!_embeddings) {
        const apiKey = await resolveOpenAIKey();
        if (!apiKey) throw new Error("OpenAI API key not configured");
        _embeddings = new OpenAIEmbeddings({
            apiKey,
            model: MODEL_EMBEDDING,
            maxTokens: MAX_EMBEDDING_TOKENS,
        });
    }
    return _embeddings;
}
