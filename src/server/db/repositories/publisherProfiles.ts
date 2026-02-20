import { prisma } from "../prisma";
import { encrypt, decrypt } from "../../crypto";

export async function createPublisherProfile(data: {
    name: string;
    webhookUrl: string;
    authType: string;
    authHeaderName?: string | null;
    authHeaderValue?: string | null;
    bearerToken?: string | null;
    binaryFieldName?: string;
    extraPayloadJson?: string;
}) {
    return prisma.publisherProfile.create({
        data: {
            name: data.name,
            webhookUrl: data.webhookUrl,
            authType: data.authType,
            authHeaderName: data.authHeaderName ?? null,
            authHeaderValueEnc: data.authHeaderValue
                ? encrypt(data.authHeaderValue)
                : null,
            bearerTokenEnc: data.bearerToken ? encrypt(data.bearerToken) : null,
            binaryFieldName: data.binaryFieldName ?? "mediaFile",
            extraPayloadJson: data.extraPayloadJson ?? "{}",
        },
    });
}

export async function updatePublisherProfile(
    id: string,
    data: {
        name?: string;
        webhookUrl?: string;
        authType?: string;
        authHeaderName?: string | null;
        authHeaderValue?: string | null;
        bearerToken?: string | null;
        binaryFieldName?: string;
        extraPayloadJson?: string;
    }
) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.authType !== undefined) updateData.authType = data.authType;
    if (data.authHeaderName !== undefined)
        updateData.authHeaderName = data.authHeaderName;
    if (data.authHeaderValue !== undefined)
        updateData.authHeaderValueEnc = data.authHeaderValue
            ? encrypt(data.authHeaderValue)
            : null;
    if (data.bearerToken !== undefined)
        updateData.bearerTokenEnc = data.bearerToken
            ? encrypt(data.bearerToken)
            : null;
    if (data.binaryFieldName !== undefined)
        updateData.binaryFieldName = data.binaryFieldName;
    if (data.extraPayloadJson !== undefined)
        updateData.extraPayloadJson = data.extraPayloadJson;

    return prisma.publisherProfile.update({
        where: { id },
        data: updateData,
    });
}

export async function getPublisherProfile(id: string) {
    return prisma.publisherProfile.findUnique({ where: { id } });
}

/**
 * Get profile with decrypted auth values (for use in publisher adapter only).
 */
export async function getPublisherProfileDecrypted(id: string) {
    const profile = await prisma.publisherProfile.findUnique({ where: { id } });
    if (!profile) return null;
    return {
        ...profile,
        authHeaderValue: profile.authHeaderValueEnc
            ? decrypt(profile.authHeaderValueEnc)
            : null,
        bearerToken: profile.bearerTokenEnc
            ? decrypt(profile.bearerTokenEnc)
            : null,
    };
}

export async function listPublisherProfiles() {
    return prisma.publisherProfile.findMany({ orderBy: { name: "asc" } });
}

export async function deletePublisherProfile(id: string) {
    return prisma.publisherProfile.delete({ where: { id } });
}
