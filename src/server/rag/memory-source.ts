/**
 * Memory Source — optional RAG integration for voice/style context.
 * Fetches context from an external RAG platform to improve AI generation quality.
 * Best-effort: returns null if not configured or if the request fails.
 */
export async function fetchVoiceContext(): Promise<string | null> {
    const url = process.env.MEMORY_SOURCE_URL;
    if (!url) return null;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            console.warn(`Memory Source returned ${response.status}`);
            return null;
        }

        const data = await response.json();
        // Expect { context: string } or { styleProfile: string, examples: string[] }
        if (typeof data === "string") return data;
        if (data?.context) return data.context;
        if (data?.styleProfile) {
            const examples = data.examples?.length
                ? `\n\nExamples:\n${data.examples.join("\n---\n")}`
                : "";
            return `${data.styleProfile}${examples}`;
        }
        return JSON.stringify(data);
    } catch (error) {
        console.warn(
            "Memory Source fetch failed (best-effort):",
            error instanceof Error ? error.message : error
        );
        return null;
    }
}
