import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "@/config/env";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const adapter = new PrismaBetterSqlite3({
        url: env.DATABASE_URL,
    });
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

/**
 * Ensure the singleton AppSettings row exists.
 * Called once on app startup.
 */
export async function ensureAppSettings() {
    const existing = await prisma.appSettings.findUnique({
        where: { id: "singleton" },
    });
    if (!existing) {
        await prisma.appSettings.create({ data: { id: "singleton" } });
    }
}
