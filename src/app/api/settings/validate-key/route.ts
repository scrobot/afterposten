import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * POST /api/settings/validate-key
 * Tests an OpenAI API key with a lightweight models.list() call.
 */
export async function POST(request: NextRequest) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey || typeof apiKey !== "string") {
            return NextResponse.json(
                { valid: false, error: "API key is required" },
                { status: 400 }
            );
        }

        const client = new OpenAI({ apiKey });
        // Lightweight check — list models (no token cost)
        await client.models.list();

        return NextResponse.json({ valid: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid API key";
        return NextResponse.json({ valid: false, error: message }, { status: 200 });
    }
}
