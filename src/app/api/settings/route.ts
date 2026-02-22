import { NextRequest, NextResponse } from "next/server";
import * as settingsRepo from "@/server/db/repositories/settings";
import {
    getOpenAIKeyFromDB,
    setOpenAIKeyInDB,
    clearOpenAIKeyInDB,
    markSetupComplete,
} from "@/config/config-store";

export async function GET() {
    try {
        const settings = await settingsRepo.getSettings();

        // Check if an OpenAI key exists (env or DB)
        const envKey = process.env.OPENAI_API_KEY;
        const dbKey = await getOpenAIKeyFromDB();
        const activeKey = envKey || dbKey;

        return NextResponse.json({
            ...settings,
            hasOpenAIKey: !!activeKey,
            openaiKeyPreview: activeKey
                ? `${activeKey.slice(0, 5)}...${activeKey.slice(-4)}`
                : null,
            openaiKeySource: envKey ? "env" : dbKey ? "db" : null,
        });
    } catch (error) {
        console.error("GET /api/settings error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Handle OpenAI key update
        if (body.openaiApiKey !== undefined) {
            if (body.openaiApiKey === null || body.openaiApiKey === "") {
                await clearOpenAIKeyInDB();
            } else {
                await setOpenAIKeyInDB(body.openaiApiKey);
            }
        }

        // Handle setup completion
        if (body.setupCompleted) {
            await markSetupComplete();
        }

        const settings = await settingsRepo.updateSettings({
            timezone: body.timezone,
            schedulerPollIntervalSec: body.schedulerPollIntervalSec
                ? Number(body.schedulerPollIntervalSec)
                : undefined,
            defaultPublisherProfileId: body.defaultPublisherProfileId,
            maxPublishAttempts: body.maxPublishAttempts
                ? Number(body.maxPublishAttempts)
                : undefined,
            agentPromptInstructions: body.agentPromptInstructions,
        });

        // Re-fetch key info for response
        const envKey = process.env.OPENAI_API_KEY;
        const dbKey = await getOpenAIKeyFromDB();
        const activeKey = envKey || dbKey;

        return NextResponse.json({
            ...settings,
            hasOpenAIKey: !!activeKey,
            openaiKeyPreview: activeKey
                ? `${activeKey.slice(0, 5)}...${activeKey.slice(-4)}`
                : null,
            openaiKeySource: envKey ? "env" : dbKey ? "db" : null,
        });
    } catch (error) {
        console.error("PUT /api/settings error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
