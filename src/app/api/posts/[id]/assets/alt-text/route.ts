import { NextRequest, NextResponse } from "next/server";
import * as postsRepo from "@/server/db/repositories/posts";
import * as assetsRepo from "@/server/db/repositories/assets";
import { generateAltText } from "@/server/ai/image-service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const post = await postsRepo.getPost(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const body = await request.json();
        const assetId = body.assetId;

        if (!assetId) {
            return NextResponse.json(
                { error: "assetId is required" },
                { status: 400 }
            );
        }

        const asset = await assetsRepo.getAsset(assetId);
        if (!asset || asset.postId !== id) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        const context = post.finalText ?? post.idea;
        const result = await generateAltText(asset.path, context);

        await assetsRepo.updateAssetAltText(assetId, result.altText);

        return NextResponse.json(result);
    } catch (error) {
        console.error("POST /api/posts/[id]/assets/alt-text error:", error);
        return NextResponse.json(
            { error: "Failed to generate alt-text" },
            { status: 500 }
        );
    }
}
