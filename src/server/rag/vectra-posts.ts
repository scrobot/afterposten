/**
 * Vectra LocalIndex for published posts — voice/style retrieval.
 * Stores post embeddings with metadata for finding similar content.
 */
import path from "node:path";
import { LocalIndex } from "vectra";
import { getVector } from "./embeddings";
import { RAG_SIMILARITY_THRESHOLD, VOICE_CONTEXT_MAX_POSTS } from "@/config/constants";

const INDEX_PATH = path.join(process.cwd(), "data", "vectra-posts");

let _index: LocalIndex | null = null;

async function getIndex(): Promise<LocalIndex> {
    if (!_index) {
        _index = new LocalIndex(INDEX_PATH);
        if (!(await _index.isIndexCreated())) {
            await _index.createIndex({
                version: 1,
                metadata_config: {
                    indexed: ["postId", "status"],
                },
            });
        }
    }
    return _index;
}

/**
 * Index a post into Vectra. Called after publishing or when final text is set.
 */
export async function indexPost(data: {
    postId: string;
    idea: string;
    finalText: string;
    hashtags?: string[];
    status?: string;
}): Promise<void> {
    const index = await getIndex();
    const textToEmbed = `${data.finalText}\n\nOriginal idea: ${data.idea}`;

    try {
        const vector = await getVector(textToEmbed);

        // Upsert: delete existing entry for this post, then insert
        const existing = await index.queryItems(vector, "", 1, {
            postId: { $eq: data.postId },
        });
        if (existing.length > 0) {
            await index.deleteItem(existing[0].item.id);
        }

        await index.insertItem({
            vector,
            metadata: {
                postId: data.postId,
                status: data.status || "published",
                text: data.finalText,
                idea: data.idea,
                hashtags: (data.hashtags || []).join(", "),
                indexedAt: new Date().toISOString(),
            },
        });

        console.log(`[Vectra Posts] Indexed post ${data.postId}`);
    } catch (error) {
        console.warn(
            "[Vectra Posts] Failed to index post:",
            error instanceof Error ? error.message : error
        );
    }
}

/**
 * Query for posts similar to a given idea/text.
 * Returns formatted context string suitable for prompt injection.
 */
export async function queryRelatedPosts(
    queryText: string,
    topK: number = VOICE_CONTEXT_MAX_POSTS
): Promise<string | null> {
    try {
        const index = await getIndex();
        const vector = await getVector(queryText);

        const results = await index.queryItems(vector, "", topK, {
            status: { $eq: "published" },
        });

        if (results.length === 0) return null;

        // Filter to only reasonably similar results (cosine > 0.7)
        const relevant = results.filter((r) => r.score > RAG_SIMILARITY_THRESHOLD);
        if (relevant.length === 0) return null;

        const sections = relevant.map((r, i) => {
            const meta = r.item.metadata;
            return `### Past Post ${i + 1} (similarity: ${(r.score * 100).toFixed(0)}%)\n${meta.text}`;
        });

        return `Here are some of your previously published posts that are related to this topic:\n\n${sections.join("\n\n")}`;
    } catch (error) {
        console.warn(
            "[Vectra Posts] Query failed:",
            error instanceof Error ? error.message : error
        );
        return null;
    }
}
