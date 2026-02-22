import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { ImageRequest, AltTextOutput } from "@/shared/types";
import { altTextOutputSchema } from "@/shared/types";
import { resolveOpenAIKey } from "@/config/config-store";
import { MODEL_IMAGE, MODEL_TEXT_PRIMARY } from "@/config/constants";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

let _client: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
    if (!_client) {
        const apiKey = await resolveOpenAIKey();
        if (!apiKey) throw new Error("OpenAI API key not configured");
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

/** Reset cached client — called when API key is updated. */
export function resetOpenAIClient(): void {
    _client = null;
}

async function ensureAssetsDir() {
    await fs.mkdir(ASSETS_DIR, { recursive: true });
}

/**
 * Map style presets to prompt modifiers.
 */
function getStylePromptModifier(preset: string): string {
    const presets: Record<string, string> = {
        "clean-tech":
            "Clean, modern tech aesthetic with minimal elements, soft gradients, and professional color palette. LinkedIn-ready, high contrast.",
        "product-ui":
            "Product/UI screenshot style with clean interface elements, modern design system aesthetics. Professional and polished.",
        diagram:
            "Clean diagram or infographic style with clear visual hierarchy, labeled sections, and professional layout. No tiny unreadable text.",
        editorial:
            "Editorial photography style, high-quality composition with dramatic lighting and professional feel.",
        "bold-minimal":
            "Bold minimalist design with striking typography, limited color palette, and strong visual impact. Clean composition.",
    };
    return presets[preset] ?? presets["clean-tech"];
}

/**
 * Map aspect ratios to OpenAI image generation size params.
 */
function getImageSize(aspect: string): "1024x1024" | "1024x1536" | "1536x1024" {
    switch (aspect) {
        case "4:5":
            return "1024x1536";
        case "16:9":
            return "1536x1024";
        default:
            return "1024x1024";
    }
}

/**
 * Generate an image using OpenAI's image generation API.
 * Returns the saved file path (relative to /public/) and metadata.
 */
export async function generateImage(
    request: ImageRequest,
    postId: string
): Promise<{ filePath: string; publicPath: string; metaJson: string }> {
    await ensureAssetsDir();

    const client = await getOpenAIClient();
    const styleModifier = getStylePromptModifier(request.stylePreset);
    const fullPrompt = `${styleModifier}\n\nSubject: ${request.prompt}`;
    const size = getImageSize(request.aspect);

    const response = await client.images.generate({
        model: MODEL_IMAGE,
        prompt: fullPrompt,
        n: 1,
        size,
        quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
        throw new Error("No image data returned from OpenAI");
    }

    const ext = request.format === "jpeg" ? "jpg" : "png";
    const filename = `post-${postId}-${uuidv4().slice(0, 8)}.${ext}`;
    const filePath = path.join(ASSETS_DIR, filename);

    const buffer = Buffer.from(imageData.b64_json, "base64");
    await fs.writeFile(filePath, buffer);

    const publicPath = `/assets/${filename}`;
    const metaJson = JSON.stringify({
        prompt: request.prompt,
        stylePreset: request.stylePreset,
        aspect: request.aspect,
        format: request.format,
        model: MODEL_IMAGE,
        size,
    });

    return { filePath, publicPath, metaJson };
}

/**
 * Generate alt-text for an image using AI.
 */
export async function generateAltText(
    imagePath: string,
    postContext: string
): Promise<AltTextOutput> {
    const apiKey = await resolveOpenAIKey();
    if (!apiKey) throw new Error("OpenAI API key not configured");
    const provider = createOpenAI({ apiKey });

    const result = await generateObject({
        model: provider(MODEL_TEXT_PRIMARY),
        schema: altTextOutputSchema,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Generate a concise, descriptive alt-text for this image. The image is for a LinkedIn post about: ${postContext}. The alt-text should be accessible and descriptive.`,
                    },
                    {
                        type: "image",
                        image: await fs.readFile(path.join(process.cwd(), "public", imagePath)),
                    },
                ],
            },
        ],
    });

    return result.object;
}
