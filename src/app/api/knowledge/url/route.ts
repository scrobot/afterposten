import { NextRequest, NextResponse } from "next/server";
import * as kb from "@/server/rag/vectra-knowledge";

/**
 * POST /api/knowledge/url — Fetch a URL, extract text, chunk, and store.
 * Body: { url: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== "string" || url.trim().length === 0) {
            return NextResponse.json(
                { error: "url is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        const doc = await kb.addUrlDocument(url.trim());
        return NextResponse.json(doc, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to ingest URL";
        console.error("POST /api/knowledge/url error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
