import { prisma } from "../prisma";

/**
 * Find due schedules and atomically lock them for processing.
 * Returns schedules that were successfully locked.
 */
export async function findAndLockDueSchedules(maxAttempts: number) {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + 60_000); // lock for 60s

    // Find due schedules
    const dueSchedules = await prisma.schedule.findMany({
        where: {
            status: "scheduled",
            scheduledAtUtc: { lte: now },
            OR: [
                { lockedUntil: null },
                { lockedUntil: { lt: now } },
            ],
            attempts: { lt: maxAttempts },
        },
        include: {
            post: true,
            publisherProfile: true,
        },
    });

    // Atomically lock each one (optimistic locking via status check)
    const locked = [];
    for (const schedule of dueSchedules) {
        const updated = await prisma.schedule.updateMany({
            where: {
                id: schedule.id,
                status: "scheduled",
            },
            data: {
                status: "running",
                lockedUntil: lockUntil,
                attempts: { increment: 1 },
            },
        });
        if (updated.count > 0) {
            locked.push({
                ...schedule,
                status: "running" as const,
                lockedUntil: lockUntil,
                attempts: schedule.attempts + 1,
            });
        }
    }

    return locked;
}

export async function createSchedule(data: {
    postId: string;
    publisherProfileId?: string | null;
    scheduledAtUtc: Date;
    scheduledTz: string;
}) {
    return prisma.schedule.create({
        data: {
            postId: data.postId,
            publisherProfileId: data.publisherProfileId ?? null,
            scheduledAtUtc: data.scheduledAtUtc,
            scheduledTz: data.scheduledTz,
        },
    });
}

export async function markScheduleDone(id: string) {
    return prisma.schedule.update({
        where: { id },
        data: { status: "done", lockedUntil: null },
    });
}

export async function markScheduleFailed(
    id: string,
    error: string,
    rescheduleAtUtc?: Date
) {
    if (rescheduleAtUtc) {
        // Reschedule with backoff
        return prisma.schedule.update({
            where: { id },
            data: {
                status: "scheduled",
                lockedUntil: null,
                lastError: error,
                scheduledAtUtc: rescheduleAtUtc,
            },
        });
    }
    // Max attempts exceeded
    return prisma.schedule.update({
        where: { id },
        data: {
            status: "failed",
            lockedUntil: null,
            lastError: error,
        },
    });
}

export async function getSchedulesByPost(postId: string) {
    return prisma.schedule.findMany({
        where: { postId },
        orderBy: { scheduledAtUtc: "desc" },
        include: { publisherProfile: true },
    });
}

export async function getSchedule(id: string) {
    return prisma.schedule.findUnique({
        where: { id },
        include: { post: true, publisherProfile: true },
    });
}
