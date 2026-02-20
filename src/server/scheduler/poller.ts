import * as schedulesRepo from "../db/repositories/schedules";
import * as postsRepo from "../db/repositories/posts";
import * as publishRunsRepo from "../db/repositories/publishRuns";
import * as settingsRepo from "../db/repositories/settings";
import { prisma } from "../db/prisma";
import { publishToN8n } from "../publishers/n8n-adapter";
import { ingestPublishedPost } from "../rag/memory-sink";
import { utcToLocal } from "./tz-utils";
import type { PublishPayload } from "../publishers/n8n-adapter";

/**
 * Execute a single scheduler tick:
 * 1. Find due schedules
 * 2. Lock them
 * 3. Execute publishing
 * 4. Record results
 */
export async function schedulerTick(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
}> {
    const settings = await settingsRepo.getSettings();
    const maxAttempts = settings.maxPublishAttempts;
    const timezone = settings.timezone;

    const dueSchedules = await schedulesRepo.findAndLockDueSchedules(maxAttempts);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const schedule of dueSchedules) {
        try {
            // Get full post with assets
            const post = await postsRepo.getPost(schedule.postId);
            if (!post) {
                throw new Error(`Post ${schedule.postId} not found`);
            }

            // Determine publisher profile: schedule > post > default
            const profileId =
                schedule.publisherProfileId ??
                post.publisherProfileId ??
                settings.defaultPublisherProfileId;

            if (!profileId) {
                throw new Error("No publisher profile configured");
            }

            // We need the full profile (with encrypted fields) for publishing
            const profile = await prisma.publisherProfile.findUnique({
                where: { id: profileId },
            });

            if (!profile) {
                throw new Error(`Publisher profile ${profileId} not found`);
            }

            // Get the primary asset (most recent image)
            const primaryAsset = post.assets[0] ?? null;

            // Parse extra payload
            let extraFields: Record<string, string> = {};
            try {
                extraFields = JSON.parse(profile.extraPayloadJson || "{}");
            } catch {
                /* ignore parse errors */
            }

            // Parse hashtags from final text or drafts
            let hashtags: string[] = [];
            if (post.drafts.length > 0) {
                try {
                    const draftContent = JSON.parse(post.drafts[0].contentJson);
                    hashtags = draftContent.hashtags ?? [];
                } catch {
                    /* ignore */
                }
            }

            const payload: PublishPayload = {
                text: post.finalText ?? post.idea,
                hashtags,
                postId: post.id,
                scheduledAt: utcToLocal(
                    schedule.scheduledAtUtc,
                    timezone,
                    "yyyy-MM-dd'T'HH:mm:ssxxx"
                ),
                profileName: profile.name,
                extraFields,
                imagePath: primaryAsset?.path ?? null,
                imageFormat: primaryAsset?.type === "image_jpeg" ? "jpeg" : "png",
                binaryFieldName: profile.binaryFieldName,
            };

            // Execute publish
            const result = await publishToN8n(profile, payload);

            // Record publish run
            await publishRunsRepo.createPublishRun({
                postId: post.id,
                scheduleId: schedule.id,
                publisherProfileId: profile.id,
                status: result.success ? "success" : "failed",
                requestMetaJson: JSON.stringify(result.requestMeta),
                responseMetaJson: JSON.stringify(result.responseMeta),
            });

            if (result.success) {
                // Mark schedule done, post published
                await schedulesRepo.markScheduleDone(schedule.id);
                await postsRepo.updatePost(post.id, { status: "published" });
                succeeded++;

                // Best-effort: send to memory sink
                ingestPublishedPost({
                    postId: post.id,
                    text: post.finalText ?? post.idea,
                    hashtags,
                    imagePath: primaryAsset?.path,
                    altText: primaryAsset?.altText,
                    publishedAt: new Date().toISOString(),
                }).catch(() => {
                    /* best-effort, ignore failures */
                });
            } else {
                throw new Error(
                    `Publish failed: HTTP ${result.statusCode} — ${JSON.stringify(result.responseMeta)}`
                );
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : "Unknown error";
            errors.push(`Schedule ${schedule.id}: ${errorMsg}`);
            failed++;

            // Calculate backoff: min(60s * attempts, 15m)
            const backoffMs = Math.min(60_000 * schedule.attempts, 15 * 60_000);

            if (schedule.attempts < maxAttempts) {
                // Reschedule with backoff
                const rescheduleAt = new Date(Date.now() + backoffMs);
                await schedulesRepo.markScheduleFailed(
                    schedule.id,
                    errorMsg,
                    rescheduleAt
                );
            } else {
                // Max attempts exceeded — permanent failure
                await schedulesRepo.markScheduleFailed(schedule.id, errorMsg);
                await postsRepo.updatePost(schedule.postId, { status: "failed" });
            }
        }
    }

    return {
        processed: dueSchedules.length,
        succeeded,
        failed,
        errors,
    };
}

let pollerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the scheduler poller.
 */
export function startSchedulerPoller(intervalMs: number = 10_000) {
    if (pollerInterval) {
        console.log("Scheduler poller already running");
        return;
    }

    console.log(`Starting scheduler poller (interval: ${intervalMs}ms)`);
    pollerInterval = setInterval(async () => {
        try {
            const result = await schedulerTick();
            if (result.processed > 0) {
                console.log(
                    `Scheduler tick: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed`
                );
                if (result.errors.length > 0) {
                    console.warn("Scheduler errors:", result.errors);
                }
            }
        } catch (error) {
            console.error("Scheduler tick error:", error);
        }
    }, intervalMs);
}

/**
 * Stop the scheduler poller.
 */
export function stopSchedulerPoller() {
    if (pollerInterval) {
        clearInterval(pollerInterval);
        pollerInterval = null;
        console.log("Scheduler poller stopped");
    }
}
