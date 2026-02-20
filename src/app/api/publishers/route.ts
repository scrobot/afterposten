import { NextRequest, NextResponse } from "next/server";
import * as profilesRepo from "@/server/db/repositories/publisherProfiles";

export async function GET() {
    try {
        const profiles = await profilesRepo.listPublisherProfiles();
        // Strip encrypted fields from response
        const safe = profiles.map((p) => ({
            ...p,
            authHeaderValueEnc: undefined,
            bearerTokenEnc: undefined,
            hasAuthValue: !!p.authHeaderValueEnc,
            hasBearerToken: !!p.bearerTokenEnc,
        }));
        return NextResponse.json(safe);
    } catch (error) {
        console.error("GET /api/publishers error:", error);
        return NextResponse.json(
            { error: "Failed to fetch publishers" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name || !body.webhookUrl) {
            return NextResponse.json(
                { error: "name and webhookUrl are required" },
                { status: 400 }
            );
        }

        const profile = await profilesRepo.createPublisherProfile({
            name: body.name,
            webhookUrl: body.webhookUrl,
            authType: body.authType ?? "none",
            authHeaderName: body.authHeaderName,
            authHeaderValue: body.authHeaderValue,
            bearerToken: body.bearerToken,
            binaryFieldName: body.binaryFieldName,
            extraPayloadJson: body.extraPayloadJson
                ? JSON.stringify(body.extraPayloadJson)
                : undefined,
        });

        return NextResponse.json(
            { ...profile, authHeaderValueEnc: undefined, bearerTokenEnc: undefined },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/publishers error:", error);
        return NextResponse.json(
            { error: "Failed to create publisher" },
            { status: 500 }
        );
    }
}
