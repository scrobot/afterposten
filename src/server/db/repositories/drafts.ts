import { prisma } from "../prisma";
import type { DraftKind } from "@/shared/types";

export async function createDraft(
    postId: string,
    kind: DraftKind,
    contentJson: string
) {
    return prisma.draft.create({
        data: { postId, kind, contentJson },
    });
}

export async function getDraftsByPost(postId: string) {
    return prisma.draft.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
    });
}

export async function getDraft(id: string) {
    return prisma.draft.findUnique({ where: { id } });
}

export async function deleteDraft(id: string) {
    return prisma.draft.delete({ where: { id } });
}
