import { NextRequest } from "next/server";
import { streamDraft } from "@/server/ai/text-service";
import * as postsRepo from "@/server/db/repositories/posts";
import * as draftsRepo from "@/server/db/repositories/drafts";
import { fetchVoiceContext } from "@/server/rag/memory-source";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const post = await postsRepo.getPost(id);
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
            status: 404,
        });
    }

    // Fetch optional voice context from RAG
    const voiceContext = await fetchVoiceContext();

    // Stream the draft using Vercel AI SDK
    const result = streamDraft(post.idea, voiceContext);

    // Save the completed draft to DB after streaming finishes
    result.object.then(async (draft) => {
        await draftsRepo.createDraft(id, "draft", JSON.stringify(draft));
        // Auto-update post status to "draft" if it was "idea"
        if (post.status === "idea") {
            await postsRepo.updatePost(id, { status: "draft" });
        }
    });

    return result.toTextStreamResponse();
}
