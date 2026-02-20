import { prisma } from "../prisma";
import type { PostStatus } from "@/shared/types";

export async function createPost(idea: string) {
    return prisma.post.create({
        data: { idea },
    });
}

export async function getPost(id: string) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            drafts: { orderBy: { createdAt: "desc" } },
            assets: { orderBy: { createdAt: "desc" } },
            schedules: { orderBy: { scheduledAtUtc: "desc" } },
            publishRuns: { orderBy: { createdAt: "desc" } },
            publisherProfile: true,
        },
    });
}

export async function listPosts(params?: {
    status?: PostStatus;
    search?: string;
}) {
    return prisma.post.findMany({
        where: {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.search
                ? {
                    OR: [
                        { idea: { contains: params.search } },
                        { finalText: { contains: params.search } },
                    ],
                }
                : {}),
        },
        include: {
            schedules: {
                where: { status: { in: ["scheduled", "running"] } },
                orderBy: { scheduledAtUtc: "asc" },
                take: 1,
            },
            publisherProfile: true,
        },
        orderBy: { updatedAt: "desc" },
    });
}

export async function updatePost(
    id: string,
    data: {
        idea?: string;
        finalText?: string | null;
        status?: PostStatus;
        publisherProfileId?: string | null;
    }
) {
    return prisma.post.update({
        where: { id },
        data,
    });
}

export async function deletePost(id: string) {
    return prisma.post.delete({ where: { id } });
}
