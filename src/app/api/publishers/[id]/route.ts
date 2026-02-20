import { NextRequest, NextResponse } from "next/server";
import * as profilesRepo from "@/server/db/repositories/publisherProfiles";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const profile = await profilesRepo.getPublisherProfile(id);
        if (!profile) {
            return NextResponse.json(
                { error: "Publisher profile not found" },
                { status: 404 }
            );
        }
        return NextResponse.json({
            ...profile,
            authHeaderValueEnc: undefined,
            bearerTokenEnc: undefined,
            hasAuthValue: !!profile.authHeaderValueEnc,
            hasBearerToken: !!profile.bearerTokenEnc,
        });
    } catch (error) {
        console.error("GET /api/publishers/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch publisher" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const profile = await profilesRepo.updatePublisherProfile(id, {
            name: body.name,
            webhookUrl: body.webhookUrl,
            authType: body.authType,
            authHeaderName: body.authHeaderName,
            authHeaderValue: body.authHeaderValue,
            bearerToken: body.bearerToken,
            binaryFieldName: body.binaryFieldName,
            extraPayloadJson: body.extraPayloadJson
                ? JSON.stringify(body.extraPayloadJson)
                : undefined,
        });

        return NextResponse.json({
            ...profile,
            authHeaderValueEnc: undefined,
            bearerTokenEnc: undefined,
        });
    } catch (error) {
        console.error("PUT /api/publishers/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update publisher" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await profilesRepo.deletePublisherProfile(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/publishers/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete publisher" },
            { status: 500 }
        );
    }
}
