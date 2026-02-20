import { describe, expect, it } from "vitest";
import {
    draftOutputSchema,
    imageRequestSchema,
    altTextOutputSchema,
    hashtagsOutputSchema,
    variantsOutputSchema,
    formatDraftToText,
} from "@/shared/types";

describe("DraftOutput schema", () => {
    it("accepts valid draft output", () => {
        const valid = {
            hook: "This changes everything about AI.",
            body: "Here is why you should care...\n\nThe AI revolution is here.",
            bullets: ["Point 1", "Point 2"],
            cta: "What do you think? Drop a comment 👇",
            hashtags: ["AI", "MachineLearning", "Tech", "Future", "Innovation"],
            firstComment: "Great discussion here!",
        };

        const result = draftOutputSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("accepts draft without optional fields", () => {
        const minimal = {
            hook: "Hook line",
            body: "Body text here",
            hashtags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        };

        const result = draftOutputSchema.safeParse(minimal);
        expect(result.success).toBe(true);
    });

    it("rejects draft with too few hashtags", () => {
        const invalid = {
            hook: "Hook",
            body: "Body",
            hashtags: ["one", "two"],
        };

        const result = draftOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("rejects draft with too many hashtags", () => {
        const invalid = {
            hook: "Hook",
            body: "Body",
            hashtags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
        };

        const result = draftOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("rejects draft missing required fields", () => {
        const invalid = { hook: "Hook" };
        const result = draftOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe("ImageRequest schema", () => {
    it("accepts valid image request", () => {
        const valid = {
            stylePreset: "clean-tech",
            format: "png",
            aspect: "1:1",
            prompt: "A modern AI dashboard",
        };

        const result = imageRequestSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects unknown style preset", () => {
        const invalid = {
            stylePreset: "unknown-style",
            format: "png",
            aspect: "1:1",
            prompt: "test",
        };

        const result = imageRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("rejects empty prompt", () => {
        const invalid = {
            stylePreset: "clean-tech",
            format: "png",
            aspect: "1:1",
            prompt: "",
        };

        const result = imageRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("accepts all valid formats", () => {
        for (const format of ["png", "jpeg"]) {
            const result = imageRequestSchema.safeParse({
                stylePreset: "bold-minimal",
                format,
                aspect: "16:9",
                prompt: "test",
            });
            expect(result.success).toBe(true);
        }
    });

    it("accepts all valid aspect ratios", () => {
        for (const aspect of ["1:1", "4:5", "16:9"]) {
            const result = imageRequestSchema.safeParse({
                stylePreset: "editorial",
                format: "png",
                aspect,
                prompt: "test",
            });
            expect(result.success).toBe(true);
        }
    });
});

describe("AltTextOutput schema", () => {
    it("accepts valid alt text", () => {
        const valid = { altText: "An infographic showing AI pipeline architecture" };
        const result = altTextOutputSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects empty alt text", () => {
        const invalid = { altText: "" };
        const result = altTextOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe("HashtagsOutput schema", () => {
    it("accepts valid hashtags", () => {
        const valid = { hashtags: ["AI", "ML", "Tech", "Innovation", "Future"] };
        const result = hashtagsOutputSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects too few hashtags", () => {
        const invalid = { hashtags: ["one"] };
        const result = hashtagsOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe("VariantsOutput schema", () => {
    it("accepts valid variants array", () => {
        const variant = {
            hook: "Hook",
            body: "Body text",
            hashtags: ["a", "b", "c", "d", "e"],
        };
        const valid = { variants: [variant, variant, variant] };
        const result = variantsOutputSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects more than 5 variants", () => {
        const variant = {
            hook: "Hook",
            body: "Body",
            hashtags: ["a", "b", "c", "d", "e"],
        };
        const invalid = { variants: Array(6).fill(variant) };
        const result = variantsOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe("formatDraftToText", () => {
    it("formats a full draft correctly", () => {
        const draft = {
            hook: "This is the hook.",
            body: "Main body text here.",
            bullets: ["Bullet one", "Bullet two"],
            cta: "What do you think?",
            hashtags: ["AI", "Technology"],
        };

        const result = formatDraftToText(draft);
        expect(result).toContain("This is the hook.");
        expect(result).toContain("Main body text here.");
        expect(result).toContain("• Bullet one");
        expect(result).toContain("• Bullet two");
        expect(result).toContain("What do you think?");
        expect(result).toContain("#AI #Technology");
    });

    it("formats a minimal draft (no bullets, no cta)", () => {
        const draft = {
            hook: "Hook only",
            body: "Body only",
            hashtags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        };

        const result = formatDraftToText(draft);
        expect(result).toContain("Hook only");
        expect(result).toContain("Body only");
        expect(result).not.toContain("•");
        expect(result).toContain("#tag1");
    });

    it("does not double-prefix hashtags that already have #", () => {
        const draft = {
            hook: "Hook",
            body: "Body",
            hashtags: ["#AI", "ML", "#Tech", "Future", "Innovation"],
        };

        const result = formatDraftToText(draft);
        expect(result).toContain("#AI");
        expect(result).toContain("#ML");
        expect(result).not.toContain("##AI");
    });
});
