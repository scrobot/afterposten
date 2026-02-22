/**
 * Shared OpenAI embeddings helpers for Vectra indexes.
 * Uses text-embedding-3-small (1536 dims) — cheapest and fast enough for local use.
 */
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "vectra";
import { env } from "@/config/env";
import { MODEL_EMBEDDING, MAX_EMBEDDING_TOKENS } from "@/config/constants";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return _openai;
}

/**
 * Get a single embedding vector for a text string.
 * Used by LocalIndex (posts).
 */
export async function getVector(text: string): Promise<number[]> {
    const resp = await getOpenAI().embeddings.create({
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
export function getEmbeddingsInstance(): OpenAIEmbeddings {
    if (!_embeddings) {
        _embeddings = new OpenAIEmbeddings({
            apiKey: env.OPENAI_API_KEY,
            model: MODEL_EMBEDDING,
            maxTokens: MAX_EMBEDDING_TOKENS,
        });
    }
    return _embeddings;
}
