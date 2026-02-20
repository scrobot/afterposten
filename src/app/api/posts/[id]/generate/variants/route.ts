import { NextRequest } from "next/server";
import { streamVariants } from "@/server/ai/text-service";
import * as postsRepo from "@/server/db/repositories/posts";
import * as draftsRepo from "@/server/db/repositories/drafts";
import { fetchVoiceContext } from "@/server/rag/memory-source";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const post = await postsRepo.getPost(id);
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
            status: 404,
        });
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count ?? 3, 1), 5);

    const voiceContext = await fetchVoiceContext();
    const result = streamVariants(post.idea, count, voiceContext);

    // Save each variant to DB after streaming completes
    result.object.then(async (output) => {
        for (const variant of output.variants) {
            await draftsRepo.createDraft(id, "variant", JSON.stringify(variant));
        }
    });

    return result.toTextStreamResponse();
}
