import { NextRequest } from "next/server";
import { streamVariants } from "@/server/ai/text-service";
import * as postsRepo from "@/server/db/repositories/posts";
import * as draftsRepo from "@/server/db/repositories/drafts";
import { fetchVoiceContext } from "@/server/rag/memory-source";
import { getSettings } from "@/server/db/repositories/settings";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await postsRepo.getPost(id);
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
            status: 404,
        });
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count ?? 3, 1), 5);

    const [voiceContext, settings] = await Promise.all([
        fetchVoiceContext(post.idea),
        getSettings(),
    ]);
    const result = await streamVariants(
        post.idea,
        count,
        voiceContext,
        settings.agentPromptInstructions || null
    );

    // Save each variant to DB after streaming completes
    result.object
        .then(async (output) => {
            for (const variant of output.variants) {
                await draftsRepo.createDraft(id, "variant", JSON.stringify(variant));
            }
        })
        .catch((error) => {
            console.error(
                `Failed to save variants for post ${id}:`,
                error instanceof Error ? error.message : error
            );
        });

    return result.toTextStreamResponse();
}
