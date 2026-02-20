import { NextRequest, NextResponse } from "next/server";
import * as postsRepo from "@/server/db/repositories/posts";
import * as assetsRepo from "@/server/db/repositories/assets";
import { generateImage } from "@/server/ai/image-service";
import { imageRequestSchema } from "@/shared/types";

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
        const parsed = imageRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid image request", details: parsed.error.issues },
                { status: 400 }
            );
        }

        const imageReq = parsed.data;
        const result = await generateImage(imageReq, id);

        const assetType = imageReq.format === "jpeg" ? "image_jpeg" : "image_png";
        const asset = await assetsRepo.createAsset({
            postId: id,
            type: assetType,
            path: result.publicPath,
            metaJson: result.metaJson,
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error("POST /api/posts/[id]/assets/generate error:", error);
        return NextResponse.json(
            { error: "Failed to generate image" },
            { status: 500 }
        );
    }
}
