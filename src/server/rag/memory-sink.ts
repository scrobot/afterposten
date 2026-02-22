/**
 * Memory Sink — optional RAG integration for auto-learning from published posts.
 * Sends published content to an external RAG platform for learning/indexing.
 * Best-effort: failures are logged but never block publishing.
 */
export async function ingestPublishedPost(data: {
    postId: string;
    text: string;
    hashtags: string[];
    imagePath?: string | null;
    altText?: string | null;
    publishedAt: string;
}): Promise<boolean> {
    const url = process.env.MEMORY_SINK_URL;
    if (!url) return false;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "linkedin_post",
                postId: data.postId,
                content: data.text,
                hashtags: data.hashtags,
                imagePath: data.imagePath,
                altText: data.altText,
                publishedAt: data.publishedAt,
                metadata: {
                    source: "afterposten",
                    language: "en",
                },
            }),
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            console.warn(`Memory Sink ingestion returned ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.warn(
            "Memory Sink ingestion failed (best-effort):",
            error instanceof Error ? error.message : error
        );
        return false;
    }
}
