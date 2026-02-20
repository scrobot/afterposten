import { NextRequest, NextResponse } from "next/server";
import { sendTestPing } from "@/server/publishers/n8n-adapter";
import { prisma } from "@/server/db/prisma";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const profile = await prisma.publisherProfile.findUnique({
            where: { id },
        });
        if (!profile) {
            return NextResponse.json(
                { error: "Publisher profile not found" },
                { status: 404 }
            );
        }

        const result = await sendTestPing(profile);
        return NextResponse.json(result);
    } catch (error) {
        console.error("POST /api/publishers/[id]/test-ping error:", error);
        return NextResponse.json(
            { error: "Test ping failed" },
            { status: 500 }
        );
    }
}
