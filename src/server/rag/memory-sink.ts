/**
 * Memory Sink — auto-learning from published posts via embedded Vectra.
 * Indexes published post content locally for future voice/style retrieval.
 * Best-effort: failures are logged but never block publishing.
 */
import { indexPost } from "./vectra-posts";

export async function ingestPublishedPost(data: {
    postId: string;
    text: string;
    hashtags: string[];
    imagePath?: string | null;
    altText?: string | null;
    publishedAt: string;
}): Promise<boolean> {
    try {
        await indexPost({
            postId: data.postId,
            idea: "", // idea not available here; text is the primary content
            finalText: data.text,
            hashtags: data.hashtags,
            status: "published",
        });
        return true;
    } catch (error) {
        console.warn(
            "Memory Sink ingestion failed (best-effort):",
            error instanceof Error ? error.message : error
        );
        return false;
    }
}
