import { NextRequest, NextResponse } from "next/server";
import * as settingsRepo from "@/server/db/repositories/settings";

export async function GET() {
    try {
        const settings = await settingsRepo.getSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error("GET /api/settings error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

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

        return NextResponse.json(settings);
    } catch (error) {
        console.error("PUT /api/settings error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
