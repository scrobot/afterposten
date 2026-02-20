import { z } from "zod/v4";

// ─── Post Status ───────────────────────────────────────────────
export const POST_STATUSES = [
  "idea",
  "draft",
  "review",
  "scheduled",
  "published",
  "failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const postStatusSchema = z.enum(POST_STATUSES);

// ─── Schedule Status ───────────────────────────────────────────
export const SCHEDULE_STATUSES = [
  "scheduled",
  "running",
  "done",
  "failed",
] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export const scheduleStatusSchema = z.enum(SCHEDULE_STATUSES);

// ─── Auth Type ─────────────────────────────────────────────────
export const AUTH_TYPES = ["none", "header", "bearer"] as const;
export type AuthType = (typeof AUTH_TYPES)[number];
export const authTypeSchema = z.enum(AUTH_TYPES);

// ─── Draft Kind ────────────────────────────────────────────────
export const DRAFT_KINDS = ["draft", "variant"] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

// ─── Style Presets ─────────────────────────────────────────────
export const STYLE_PRESETS = [
  "clean-tech",
  "product-ui",
  "diagram",
  "editorial",
  "bold-minimal",
] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number];

// ─── Image Formats ─────────────────────────────────────────────
export const IMAGE_FORMATS = ["png", "jpeg"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

// ─── Aspect Ratios ─────────────────────────────────────────────
export const ASPECT_RATIOS = ["1:1", "4:5", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

// ─── Asset Types ───────────────────────────────────────────────
export const ASSET_TYPES = ["image_png", "image_jpeg"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

// ─── DraftOutput (AI structured output) ────────────────────────
export const draftOutputSchema = z.object({
  hook: z.string().describe("1–2 line opening hook"),
  body: z.string().describe("Main text with line breaks"),
  bullets: z.array(z.string()).optional().describe("Optional bullet points"),
  cta: z.string().optional().describe("Optional call-to-action"),
  hashtags: z
    .array(z.string())
    .min(5)
    .max(15)
    .describe("5–15 relevant hashtags"),
  firstComment: z
    .string()
    .optional()
    .describe("Optional suggested first comment"),
});
export type DraftOutput = z.infer<typeof draftOutputSchema>;

// ─── ImageRequest ──────────────────────────────────────────────
export const imageRequestSchema = z.object({
  stylePreset: z.enum(STYLE_PRESETS),
  format: z.enum(IMAGE_FORMATS),
  aspect: z.enum(ASPECT_RATIOS),
  prompt: z.string().min(1).describe("Final prompt used for generation"),
});
export type ImageRequest = z.infer<typeof imageRequestSchema>;

// ─── AltTextOutput ─────────────────────────────────────────────
export const altTextOutputSchema = z.object({
  altText: z.string().min(1).describe("Descriptive alt text for the image"),
});
export type AltTextOutput = z.infer<typeof altTextOutputSchema>;

// ─── Hashtags Output ───────────────────────────────────────────
export const hashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .min(5)
    .max(15)
    .describe("5–15 relevant hashtags"),
});
export type HashtagsOutput = z.infer<typeof hashtagsOutputSchema>;

// ─── Variants Output ──────────────────────────────────────────
export const variantsOutputSchema = z.object({
  variants: z
    .array(draftOutputSchema)
    .min(1)
    .max(5)
    .describe("3–5 draft variants"),
});
export type VariantsOutput = z.infer<typeof variantsOutputSchema>;

// ─── Draft formatting helper ──────────────────────────────────
export function formatDraftToText(draft: DraftOutput): string {
  const parts: string[] = [];
  parts.push(draft.hook);
  parts.push("");
  parts.push(draft.body);

  if (draft.bullets && draft.bullets.length > 0) {
    parts.push("");
    for (const bullet of draft.bullets) {
      parts.push(`• ${bullet}`);
    }
  }

  if (draft.cta) {
    parts.push("");
    parts.push(draft.cta);
  }

  parts.push("");
  parts.push(draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));

  return parts.join("\n");
}
