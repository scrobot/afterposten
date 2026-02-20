import { NextRequest, NextResponse } from "next/server";
import * as postsRepo from "@/server/db/repositories/posts";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const post = await postsRepo.getPost(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        console.error("GET /api/posts/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch post" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await postsRepo.getPost(id);
        if (!existing) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const updated = await postsRepo.updatePost(id, {
            idea: body.idea,
            finalText: body.finalText,
            status: body.status,
            publisherProfileId: body.publisherProfileId,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PUT /api/posts/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update post" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await postsRepo.deletePost(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/posts/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete post" },
            { status: 500 }
        );
    }
}
