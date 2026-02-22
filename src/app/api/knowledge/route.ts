import { NextRequest, NextResponse } from "next/server";
import * as kb from "@/server/rag/vectra-knowledge";

/**
 * GET /api/knowledge — List all knowledge base documents.
 */
export async function GET() {
    try {
        const docs = await kb.listDocuments();
        return NextResponse.json({ documents: docs });
    } catch (error) {
        console.error("GET /api/knowledge error:", error);
        return NextResponse.json(
            { error: "Failed to list knowledge base documents" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/knowledge — Add a text document to the knowledge base.
 * Body: { title: string, content: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, content } = body;

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return NextResponse.json(
                { error: "title is required and must be a non-empty string" },
                { status: 400 }
            );
        }
        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return NextResponse.json(
                { error: "content is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        const doc = await kb.addTextDocument(title.trim(), content.trim());
        return NextResponse.json(doc, { status: 201 });
    } catch (error) {
        console.error("POST /api/knowledge error:", error);
        return NextResponse.json({ error: "Failed to add text document" }, { status: 500 });
    }
}
