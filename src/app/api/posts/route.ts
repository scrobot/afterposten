import { NextRequest, NextResponse } from "next/server";
import * as postsRepo from "@/server/db/repositories/posts";
import { postStatusSchema } from "@/shared/types";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? undefined;
        const search = url.searchParams.get("q") ?? undefined;

        const validatedStatus = status
            ? postStatusSchema.parse(status)
            : undefined;

        const posts = await postsRepo.listPosts({
            status: validatedStatus,
            search,
        });

        return NextResponse.json(posts);
    } catch (error) {
        console.error("GET /api/posts error:", error);
        return NextResponse.json(
            { error: "Failed to fetch posts" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { idea } = body;

        if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
            return NextResponse.json(
                { error: "idea is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        const post = await postsRepo.createPost(idea.trim());
        return NextResponse.json(post, { status: 201 });
    } catch (error) {
        console.error("POST /api/posts error:", error);
        return NextResponse.json(
            { error: "Failed to create post" },
            { status: 500 }
        );
    }
}
