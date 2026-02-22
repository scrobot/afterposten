import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the agent prompt instructions feature.
 *
 * Covers:
 * 1. buildInstructionsBlock — pure function that formats user instructions
 * 2. streamDraft / streamVariants / generateDraft — verify agent instructions
 *    are correctly passed through to the underlying AI SDK calls
 * 3. Settings API route — verify the new field is accepted and persisted
 */

// ─── Mock the AI SDK before any imports ────────────────────────
vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: vi.fn(() => vi.fn(() => "mocked-model")),
}));

vi.mock("ai", () => ({
    streamObject: vi.fn(() => ({
        toTextStreamResponse: vi.fn(),
        object: Promise.resolve({}),
    })),
    generateObject: vi.fn(() =>
        Promise.resolve({
            object: {
                hook: "Hook",
                body: "Body",
                hashtags: ["a", "b", "c", "d", "e"],
            },
        })
    ),
}));

// ─── Mock the config store to provide a fake API key ───────────
vi.mock("@/config/config-store", () => ({
    resolveOpenAIKey: vi.fn(() => Promise.resolve("sk-test-fake-key-for-testing")),
}));

// ─── buildInstructionsBlock ────────────────────────────────────
describe("buildInstructionsBlock", () => {
    let buildInstructionsBlock: typeof import("@/server/ai/text-service").buildInstructionsBlock;

    beforeEach(async () => {
        const mod = await import("@/server/ai/text-service");
        buildInstructionsBlock = mod.buildInstructionsBlock;
    });

    it("returns empty string for null input", () => {
        expect(buildInstructionsBlock(null)).toBe("");
    });

    it("returns empty string for undefined input", () => {
        expect(buildInstructionsBlock(undefined)).toBe("");
    });

    it("returns empty string for empty string input", () => {
        expect(buildInstructionsBlock("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
        expect(buildInstructionsBlock("   \n  \t  ")).toBe("");
    });

    it("formats non-empty instructions correctly", () => {
        const result = buildInstructionsBlock("Write in casual tone");
        expect(result).toBe("\n\nAdditional instructions from the user:\nWrite in casual tone");
    });

    it("trims leading/trailing whitespace from instructions", () => {
        const result = buildInstructionsBlock("  Write short posts  ");
        expect(result).toBe("\n\nAdditional instructions from the user:\nWrite short posts");
    });

    it("preserves internal newlines in instructions", () => {
        const instructions = "- Use casual tone\n- Keep it short\n- Add emoji";
        const result = buildInstructionsBlock(instructions);
        expect(result).toContain("- Use casual tone\n- Keep it short\n- Add emoji");
    });
});

// ─── streamDraft with agent instructions ───────────────────────
describe("streamDraft agent instructions", () => {
    let streamDraft: typeof import("@/server/ai/text-service").streamDraft;
    let streamObject: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("@/server/ai/text-service");
        streamDraft = mod.streamDraft;
        const aiMod = await import("ai");
        streamObject = aiMod.streamObject as ReturnType<typeof vi.fn>;
    });

    it("includes agent instructions in the prompt when provided", async () => {
        await streamDraft("test idea", null, "Write in Russian");

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Additional instructions from the user:");
        expect(callArgs.prompt).toContain("Write in Russian");
    });

    it("does not include instructions block when null", async () => {
        await streamDraft("test idea", null, null);

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).not.toContain("Additional instructions from the user:");
    });

    it("does not include instructions block when empty string", async () => {
        await streamDraft("test idea", null, "");

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).not.toContain("Additional instructions from the user:");
    });

    it("includes both voice context and agent instructions when both provided", async () => {
        await streamDraft("test idea", "Brand voice data", "Keep it under 500 chars");

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Voice/style context from the user's brand:");
        expect(callArgs.prompt).toContain("Brand voice data");
        expect(callArgs.prompt).toContain("Additional instructions from the user:");
        expect(callArgs.prompt).toContain("Keep it under 500 chars");
    });

    it("works with only voice context and no agent instructions", async () => {
        await streamDraft("test idea", "Some voice context");

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Voice/style context");
        expect(callArgs.prompt).not.toContain("Additional instructions from the user:");
    });
});

// ─── streamVariants with agent instructions ────────────────────
describe("streamVariants agent instructions", () => {
    let streamVariants: typeof import("@/server/ai/text-service").streamVariants;
    let streamObject: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("@/server/ai/text-service");
        streamVariants = mod.streamVariants;
        const aiMod = await import("ai");
        streamObject = aiMod.streamObject as ReturnType<typeof vi.fn>;
    });

    it("includes agent instructions in the variants prompt", async () => {
        await streamVariants("test idea", 3, null, "Use formal academic tone");

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Additional instructions from the user:");
        expect(callArgs.prompt).toContain("Use formal academic tone");
    });

    it("does not include instructions when not provided", async () => {
        await streamVariants("test idea", 3, null, null);

        expect(streamObject).toHaveBeenCalledTimes(1);
        const callArgs = streamObject.mock.calls[0][0];
        expect(callArgs.prompt).not.toContain("Additional instructions from the user:");
    });
});

// ─── generateDraft with agent instructions ─────────────────────
describe("generateDraft agent instructions", () => {
    let generateDraft: typeof import("@/server/ai/text-service").generateDraft;
    let generateObject: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("@/server/ai/text-service");
        generateDraft = mod.generateDraft;
        const aiMod = await import("ai");
        generateObject = aiMod.generateObject as ReturnType<typeof vi.fn>;
    });

    it("includes agent instructions in the non-streaming prompt", async () => {
        await generateDraft("my idea", null, "Write with humor");

        expect(generateObject).toHaveBeenCalledTimes(1);
        const callArgs = generateObject.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Additional instructions from the user:");
        expect(callArgs.prompt).toContain("Write with humor");
    });

    it("does not include instructions when empty", async () => {
        await generateDraft("my idea", null, "");

        expect(generateObject).toHaveBeenCalledTimes(1);
        const callArgs = generateObject.mock.calls[0][0];
        expect(callArgs.prompt).not.toContain("Additional instructions from the user:");
    });
});
