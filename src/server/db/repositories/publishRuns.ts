import { prisma } from "../prisma";

export async function createPublishRun(data: {
    postId: string;
    scheduleId: string;
    publisherProfileId: string;
    status: "success" | "failed";
    requestMetaJson: string;
    responseMetaJson: string;
}) {
    return prisma.publishRun.create({ data });
}

export async function getPublishRunsByPost(postId: string) {
    return prisma.publishRun.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        include: { publisherProfile: true, schedule: true },
    });
}
