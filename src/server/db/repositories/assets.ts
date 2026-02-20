import { prisma } from "../prisma";

export async function createAsset(data: {
    postId: string;
    type: string;
    path: string;
    altText?: string;
    metaJson?: string;
}) {
    return prisma.asset.create({
        data: {
            postId: data.postId,
            type: data.type,
            path: data.path,
            altText: data.altText ?? "",
            metaJson: data.metaJson ?? "{}",
        },
    });
}

export async function getAssetsByPost(postId: string) {
    return prisma.asset.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
    });
}

export async function getAsset(id: string) {
    return prisma.asset.findUnique({ where: { id } });
}

export async function updateAssetAltText(id: string, altText: string) {
    return prisma.asset.update({
        where: { id },
        data: { altText },
    });
}

export async function deleteAsset(id: string) {
    return prisma.asset.delete({ where: { id } });
}
