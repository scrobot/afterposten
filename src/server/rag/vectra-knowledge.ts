/**
 * Vectra LocalDocumentIndex for knowledge base — URL and text ingestion.
 * Auto-chunks documents and supports semantic + hybrid retrieval.
 */
import path from "node:path";
import { LocalDocumentIndex } from "vectra";
import { getEmbeddingsInstance } from "./embeddings";
import {
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    URL_FETCH_TIMEOUT_MS,
    MIN_EXTRACTED_TEXT_LENGTH,
    MAX_SECTION_RENDER_LENGTH,
    QUERY_MAX_DOCUMENTS,
    QUERY_MAX_CHUNKS,
    RAG_SIMILARITY_THRESHOLD,
    VOICE_CONTEXT_MAX_CHUNKS,
} from "@/config/constants";

const INDEX_PATH = path.join(process.cwd(), "data", "vectra-knowledge");

let _index: LocalDocumentIndex | null = null;

async function getIndex(): Promise<LocalDocumentIndex> {
    if (!_index) {
        _index = new LocalDocumentIndex({
            folderPath: INDEX_PATH,
            embeddings: getEmbeddingsInstance(),
            chunkingConfig: {
                chunkSize: CHUNK_SIZE,
                chunkOverlap: CHUNK_OVERLAP,
            },
        });
        if (!(await _index.isIndexCreated())) {
            await _index.createIndex({ version: 1 });
        }
    }
    return _index;
}

export interface KnowledgeDocument {
    uri: string;
    title: string;
    type: "text" | "url";
    addedAt: string;
}

/**
 * Add a raw text document to the knowledge base.
 */
export async function addTextDocument(title: string, content: string): Promise<KnowledgeDocument> {
    const index = await getIndex();
    const uri = `text://${encodeURIComponent(title)}-${Date.now()}`;

    await index.upsertDocument(uri, content, "md");

    console.log(`[Vectra KB] Indexed text document: ${title}`);
    return {
        uri,
        title,
        type: "text",
        addedAt: new Date().toISOString(),
    };
}

/**
 * Fetch a URL, extract text content, and add to the knowledge base.
 */
export async function addUrlDocument(url: string): Promise<KnowledgeDocument> {
    const index = await getIndex();

    // Fetch the URL and extract text
    const response = await fetch(url, {
        signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
        headers: {
            "User-Agent": "Afterposten/1.0 (Knowledge Base Ingestion)",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const textContent = extractTextFromHtml(html);

    if (!textContent || textContent.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
        throw new Error("Could not extract meaningful text content from the URL");
    }

    const title = extractTitle(html) || new URL(url).hostname;
    const uri = `url://${encodeURIComponent(url)}`;

    await index.upsertDocument(uri, textContent, "md");

    console.log(`[Vectra KB] Indexed URL document: ${url} (${textContent.length} chars)`);
    return {
        uri,
        title,
        type: "url",
        addedAt: new Date().toISOString(),
    };
}

/**
 * Search the knowledge base for relevant content.
 */
export async function queryKnowledge(
    query: string,
    maxChunks: number = QUERY_MAX_CHUNKS
): Promise<{ uri: string; score: number; text: string }[]> {
    try {
        const index = await getIndex();
        const results = await index.queryDocuments(query, {
            maxDocuments: QUERY_MAX_DOCUMENTS,
            maxChunks,
        });

        const output: { uri: string; score: number; text: string }[] = [];

        for (const doc of results) {
            const sections = await doc.renderSections(MAX_SECTION_RENDER_LENGTH, 1, true);
            for (const section of sections) {
                output.push({
                    uri: doc.uri,
                    score: doc.score,
                    text: section.text,
                });
            }
        }

        return output;
    } catch (error) {
        console.warn("[Vectra KB] Query failed:", error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Get voice/style context from the knowledge base for AI generation.
 */
export async function getKnowledgeContext(idea: string): Promise<string | null> {
    const results = await queryKnowledge(idea, VOICE_CONTEXT_MAX_CHUNKS);
    if (results.length === 0) return null;

    const relevant = results.filter((r) => r.score > RAG_SIMILARITY_THRESHOLD);
    if (relevant.length === 0) return null;

    const sections = relevant.map(
        (r, i) =>
            `### Knowledge Item ${i + 1} (relevance: ${(r.score * 100).toFixed(0)}%)\n${r.text}`
    );

    return `Relevant knowledge base context:\n\n${sections.join("\n\n")}`;
}

/**
 * List all documents in the knowledge base.
 */
export async function listDocuments(): Promise<KnowledgeDocument[]> {
    try {
        const index = await getIndex();
        const results = await index.listDocuments();
        const docs: KnowledgeDocument[] = [];

        for (const doc of results) {
            const uri = doc.uri;
            const isUrl = uri.startsWith("url://");
            let title: string;

            if (isUrl) {
                try {
                    title = decodeURIComponent(uri.replace("url://", ""));
                } catch {
                    title = uri.replace("url://", "");
                }
            } else {
                const raw = uri.replace("text://", "");
                try {
                    const decoded = decodeURIComponent(raw);
                    title = decoded.replace(/-\d+$/, "");
                } catch {
                    title = raw;
                }
            }

            docs.push({
                uri,
                title,
                type: isUrl ? "url" : "text",
                addedAt: "",
            });
        }

        return docs;
    } catch (error) {
        console.warn(
            "[Vectra KB] Failed to list documents:",
            error instanceof Error ? error.message : error
        );
        return [];
    }
}

/**
 * Delete a document from the knowledge base.
 */
export async function deleteDocument(uri: string): Promise<boolean> {
    try {
        const index = await getIndex();
        await index.deleteDocument(uri);
        console.log(`[Vectra KB] Deleted document: ${uri}`);
        return true;
    } catch (error) {
        console.warn(
            "[Vectra KB] Failed to delete document:",
            error instanceof Error ? error.message : error
        );
        return false;
    }
}

// ── HTML helpers ──

function extractTextFromHtml(html: string): string {
    // Remove scripts, styles, and HTML tags
    let text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // Collapse whitespace
    text = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

    return text;
}

function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (match) {
        return match[1]
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .trim();
    }
    return null;
}
