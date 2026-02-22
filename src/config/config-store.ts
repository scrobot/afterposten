/**
 * Config store — async DB access for runtime configuration values.
 * Handles encrypted storage of sensitive keys (OpenAI API key).
 */
import { prisma } from "@/server/db/prisma";
import { encrypt, decrypt } from "@/server/crypto";

/**
 * Get the decrypted OpenAI API key from the database.
 * Returns null if not configured.
 */
export async function getOpenAIKeyFromDB(): Promise<string | null> {
    const settings = await prisma.appSettings.findUnique({
        where: { id: "singleton" },
        select: { openaiApiKeyEnc: true },
    });
    if (!settings?.openaiApiKeyEnc) return null;

    try {
        return decrypt(settings.openaiApiKeyEnc);
    } catch (e) {
        console.warn("[config-store] Failed to decrypt OpenAI key:", e);
        return null;
    }
}

/**
 * Store an encrypted OpenAI API key in the database.
 */
export async function setOpenAIKeyInDB(apiKey: string): Promise<void> {
    const encrypted = encrypt(apiKey);
    await prisma.appSettings.upsert({
        where: { id: "singleton" },
        update: { openaiApiKeyEnc: encrypted },
        create: { id: "singleton", openaiApiKeyEnc: encrypted },
    });
}

/**
 * Clear the stored OpenAI API key.
 */
export async function clearOpenAIKeyInDB(): Promise<void> {
    await prisma.appSettings.update({
        where: { id: "singleton" },
        data: { openaiApiKeyEnc: null },
    });
}

/**
 * Check if initial setup has been completed.
 */
export async function isSetupComplete(): Promise<boolean> {
    const settings = await prisma.appSettings.findUnique({
        where: { id: "singleton" },
        select: { setupCompleted: true },
    });
    return settings?.setupCompleted ?? false;
}

/**
 * Mark setup as completed.
 */
export async function markSetupComplete(): Promise<void> {
    await prisma.appSettings.upsert({
        where: { id: "singleton" },
        update: { setupCompleted: true },
        create: { id: "singleton", setupCompleted: true },
    });
}

/**
 * Resolve the OpenAI API key from the best available source.
 * Priority: process.env > DB.
 */
export async function resolveOpenAIKey(): Promise<string | null> {
    // 1. Env override (backward compat + dev convenience)
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) return envKey;

    // 2. DB
    return getOpenAIKeyFromDB();
}
