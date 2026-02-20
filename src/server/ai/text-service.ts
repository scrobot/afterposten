import { openai } from "@ai-sdk/openai";
import { streamObject, generateObject } from "ai";
import {
    draftOutputSchema,
    hashtagsOutputSchema,
    variantsOutputSchema,
} from "@/shared/types";

/**
 * Stream a draft from an idea using Vercel AI SDK structured output.
 */
export function streamDraft(idea: string, voiceContext?: string | null) {
    const contextBlock = voiceContext
        ? `\n\nVoice/style context from the user's brand:\n${voiceContext}`
        : "";

    return streamObject({
        model: openai("gpt-4o"),
        schema: draftOutputSchema,
        prompt: `You are a LinkedIn content strategist. Write a compelling LinkedIn post based on this idea.

Idea: ${idea}${contextBlock}

Requirements:
- hook: 1–2 punchy opening lines that stop the scroll
- body: main text with line breaks, conversational and value-driven
- bullets: optional key points as bullet items
- cta: optional call-to-action
- hashtags: 5–15 relevant hashtags (without # prefix)
- firstComment: optional suggested first comment to boost engagement

Write in English. Keep it professional but engaging. Avoid corporate jargon.`,
    });
}

/**
 * Stream multiple draft variants.
 */
export function streamVariants(
    idea: string,
    count: number = 3,
    voiceContext?: string | null
) {
    const contextBlock = voiceContext
        ? `\n\nVoice/style context:\n${voiceContext}`
        : "";

    return streamObject({
        model: openai("gpt-4o"),
        schema: variantsOutputSchema,
        prompt: `You are a LinkedIn content strategist. Create ${count} distinct variants of a LinkedIn post based on this idea.

Idea: ${idea}${contextBlock}

Each variant should have a different angle, tone, or approach.
Requirements per variant:
- hook: 1–2 punchy opening lines
- body: main text with line breaks
- bullets: optional bullet points
- cta: optional call-to-action
- hashtags: 5–15 relevant hashtags (without # prefix)
- firstComment: optional first comment

Write in English. Make each variant distinctly different.`,
    });
}

/**
 * Stream hashtag suggestions for existing text.
 */
export function streamHashtags(text: string) {
    return streamObject({
        model: openai("gpt-4o-mini"),
        schema: hashtagsOutputSchema,
        prompt: `Generate 5–15 highly relevant LinkedIn hashtags for this post. Return them without the # prefix.

Post:
${text}

Focus on:
- Industry-specific hashtags
- Topic hashtags
- Trending relevant hashtags
- Mix of broad and niche hashtags`,
    });
}

/**
 * Non-streaming draft generation (for testing/internal use).
 */
export async function generateDraft(
    idea: string,
    voiceContext?: string | null
) {
    const contextBlock = voiceContext
        ? `\n\nVoice/style context:\n${voiceContext}`
        : "";

    const result = await generateObject({
        model: openai("gpt-4o"),
        schema: draftOutputSchema,
        prompt: `You are a LinkedIn content strategist. Write a compelling LinkedIn post.

Idea: ${idea}${contextBlock}

Requirements:
- hook: 1–2 punchy lines
- body: main text with line breaks
- bullets: optional bullet points
- cta: optional call-to-action
- hashtags: 5–15 relevant hashtags (without # prefix)
- firstComment: optional first comment`,
    });

    return result.object;
}
