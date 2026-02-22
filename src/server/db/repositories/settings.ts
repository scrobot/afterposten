import { prisma } from "../prisma";

export async function getSettings() {
    let settings = await prisma.appSettings.findUnique({
        where: { id: "singleton" },
        include: { defaultPublisherProfile: true },
    });
    if (!settings) {
        settings = await prisma.appSettings.create({
            data: { id: "singleton" },
            include: { defaultPublisherProfile: true },
        });
    }
    return settings;
}

export async function updateSettings(data: {
    timezone?: string;
    schedulerPollIntervalSec?: number;
    defaultPublisherProfileId?: string | null;
    maxPublishAttempts?: number;
    agentPromptInstructions?: string;
}) {
    return prisma.appSettings.upsert({
        where: { id: "singleton" },
        update: data,
        create: { id: "singleton", ...data },
        include: { defaultPublisherProfile: true },
    });
}
