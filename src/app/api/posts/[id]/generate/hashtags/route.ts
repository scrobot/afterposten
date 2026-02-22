import { NextRequest } from "next/server";
import { streamHashtags } from "@/server/ai/text-service";
import * as postsRepo from "@/server/db/repositories/posts";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await postsRepo.getPost(id);
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
            status: 404,
        });
    }

    const text = post.finalText ?? post.idea;
    const result = await streamHashtags(text);

    return result.toTextStreamResponse();
}
