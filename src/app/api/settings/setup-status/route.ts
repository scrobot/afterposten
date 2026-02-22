import { NextResponse } from "next/server";
import { isSetupComplete } from "@/config/config-store";

export async function GET() {
    try {
        // Check DB flag first
        const complete = await isSetupComplete();
        if (complete) {
            return NextResponse.json({ isComplete: true });
        }

        // Backward compat: if OPENAI_API_KEY is in .env, treat as complete
        // (existing devs shouldn't be forced through the wizard)
        const envKey = process.env.OPENAI_API_KEY;
        if (envKey && envKey.length > 0) {
            return NextResponse.json({ isComplete: true });
        }

        return NextResponse.json({ isComplete: false });
    } catch (error) {
        console.error("GET /api/settings/setup-status error:", error);
        // On error, assume complete to not block existing users
        return NextResponse.json({ isComplete: true });
    }
}
