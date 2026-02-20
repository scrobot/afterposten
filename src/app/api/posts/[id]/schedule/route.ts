import { NextRequest, NextResponse } from "next/server";
import * as postsRepo from "@/server/db/repositories/posts";
import * as schedulesRepo from "@/server/db/repositories/schedules";
import * as settingsRepo from "@/server/db/repositories/settings";
import { localToUtc } from "@/server/scheduler/tz-utils";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const post = await postsRepo.getPost(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const body = await request.json();
        const { scheduledAt, publisherProfileId } = body;

        if (!scheduledAt) {
            return NextResponse.json(
                { error: "scheduledAt is required (local datetime string)" },
                { status: 400 }
            );
        }

        const settings = await settingsRepo.getSettings();
        const timezone = settings.timezone;
        const scheduledAtUtc = localToUtc(scheduledAt, timezone);

        // Validate the scheduled time is in the future
        if (scheduledAtUtc <= new Date()) {
            return NextResponse.json(
                { error: "Scheduled time must be in the future" },
                { status: 400 }
            );
        }

        const profileId =
            publisherProfileId ??
            post.publisherProfileId ??
            settings.defaultPublisherProfileId;

        const schedule = await schedulesRepo.createSchedule({
            postId: id,
            publisherProfileId: profileId,
            scheduledAtUtc,
            scheduledTz: timezone,
        });

        // Update post status to "scheduled"
        await postsRepo.updatePost(id, { status: "scheduled" });

        return NextResponse.json(schedule, { status: 201 });
    } catch (error) {
        console.error("POST /api/posts/[id]/schedule error:", error);
        return NextResponse.json(
            { error: "Failed to schedule post" },
            { status: 500 }
        );
    }
}
