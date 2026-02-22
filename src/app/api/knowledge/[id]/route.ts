import { NextRequest, NextResponse } from "next/server";
import * as kb from "@/server/rag/vectra-knowledge";

/**
 * DELETE /api/knowledge/[id] — Remove a document from the knowledge base.
 * The [id] param is the URI-encoded document URI.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const uri = decodeURIComponent(id);
        const success = await kb.deleteDocument(uri);

        if (!success) {
            return NextResponse.json(
                { error: "Document not found or could not be deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/knowledge/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
