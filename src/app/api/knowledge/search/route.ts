import { NextRequest, NextResponse } from "next/server";
import * as kb from "@/server/rag/vectra-knowledge";

/**
 * POST /api/knowledge/search — Semantic search across the knowledge base.
 * Body: { query: string, maxResults?: number }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, maxResults } = body;

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json(
                { error: "query is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        const results = await kb.queryKnowledge(query.trim(), maxResults ?? 10);

        return NextResponse.json({ results });
    } catch (error) {
        console.error("POST /api/knowledge/search error:", error);
        return NextResponse.json({ error: "Failed to search knowledge base" }, { status: 500 });
    }
}
