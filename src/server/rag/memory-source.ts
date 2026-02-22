/**
 * Memory Source — voice/style context from embedded Vectra.
 * Queries both the posts index (similar past posts) and the knowledge base
 * to build a rich context for AI generation.
 * Best-effort: returns null if queries fail.
 */
import { queryRelatedPosts } from "./vectra-posts";
import { getKnowledgeContext } from "./vectra-knowledge";

/**
 * Fetch voice/style context for an idea by querying local Vectra indexes.
 * Returns a combined context string from similar posts and knowledge base.
 */
export async function fetchVoiceContext(idea: string): Promise<string | null> {
    try {
        const [postsContext, knowledgeContext] = await Promise.all([
            queryRelatedPosts(idea, 3),
            getKnowledgeContext(idea),
        ]);

        const parts: string[] = [];
        if (postsContext) parts.push(postsContext);
        if (knowledgeContext) parts.push(knowledgeContext);

        if (parts.length === 0) return null;

        return parts.join("\n\n---\n\n");
    } catch (error) {
        console.warn(
            "Memory Source fetch failed (best-effort):",
            error instanceof Error ? error.message : error
        );
        return null;
    }
}
