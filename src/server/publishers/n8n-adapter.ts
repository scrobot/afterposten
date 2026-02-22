import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PublisherProfile } from "@/generated/prisma/client";
import { decrypt } from "../crypto";
import { LOG_TEXT_TRUNCATION_LENGTH } from "@/config/constants";

export interface PublishPayload {
    text: string;
    hashtags: string[];
    postId: string;
    scheduledAt: string;
    profileName: string;
    extraFields: Record<string, string>;
    imagePath: string | null;
    imageFormat: string;
    binaryFieldName: string;
}

export interface PublishResult {
    success: boolean;
    statusCode: number;
    requestMeta: Record<string, unknown>;
    responseMeta: Record<string, unknown>;
}

/**
 * Build auth headers based on publisher profile config.
 */
function buildAuthHeaders(profile: PublisherProfile): Record<string, string> {
    switch (profile.authType) {
        case "header": {
            const name = profile.authHeaderName;
            const valueEnc = profile.authHeaderValueEnc;
            if (name && valueEnc) {
                return { [name]: decrypt(valueEnc) };
            }
            return {};
        }
        case "bearer": {
            const tokenEnc = profile.bearerTokenEnc;
            if (tokenEnc) {
                return { Authorization: `Bearer ${decrypt(tokenEnc)}` };
            }
            return {};
        }
        default:
            return {};
    }
}

/**
 * Sanitize request metadata for logging — no secrets, no binary content.
 */
function sanitizeRequestMeta(
    url: string,
    headers: Record<string, string>,
    fields: Record<string, string>,
    hasImage: boolean
): Record<string, unknown> {
    const safeHeaders = { ...headers };
    // Redact auth values
    for (const key of Object.keys(safeHeaders)) {
        if (
            key.toLowerCase().includes("auth") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("bearer")
        ) {
            safeHeaders[key] = "[REDACTED]";
        }
    }
    if (safeHeaders["Authorization"]) {
        safeHeaders["Authorization"] = "[REDACTED]";
    }
    return {
        url,
        method: "POST",
        headers: safeHeaders,
        textFields: fields,
        hasImage,
    };
}

/**
 * Publish a post to an n8n webhook via multipart/form-data.
 */
export async function publishToN8n(
    profile: PublisherProfile,
    payload: PublishPayload
): Promise<PublishResult> {
    const authHeaders = buildAuthHeaders(profile);

    // Build form data
    const formData = new FormData();
    formData.append("text", payload.text);
    formData.append("hashtags", JSON.stringify(payload.hashtags));
    formData.append("postId", payload.postId);
    formData.append("scheduledAt", payload.scheduledAt);
    formData.append("environment", payload.profileName);
    formData.append("profileName", payload.profileName);

    // Flatten extra payload fields
    for (const [key, value] of Object.entries(payload.extraFields)) {
        formData.append(key, value);
    }

    // Add binary image if available
    let hasImage = false;
    if (payload.imagePath) {
        const absolutePath = path.join(process.cwd(), "public", payload.imagePath);
        if (existsSync(absolutePath)) {
            const imageBuffer = await fs.readFile(absolutePath);
            const ext = payload.imageFormat === "jpeg" ? "jpg" : "png";
            const contentType = payload.imageFormat === "jpeg" ? "image/jpeg" : "image/png";
            const filename = `post-${payload.postId}.${ext}`;

            const blob = new Blob([imageBuffer], { type: contentType });
            formData.append(payload.binaryFieldName, blob, filename);
            hasImage = true;
        }
    }

    // Build request metadata for logging (no secrets, no binary)
    const allTextFields: Record<string, string> = {
        text:
            payload.text.substring(0, LOG_TEXT_TRUNCATION_LENGTH) +
            (payload.text.length > LOG_TEXT_TRUNCATION_LENGTH ? "..." : ""),
        hashtags: JSON.stringify(payload.hashtags),
        postId: payload.postId,
        scheduledAt: payload.scheduledAt,
        profileName: payload.profileName,
        ...payload.extraFields,
    };

    const requestMeta = sanitizeRequestMeta(
        profile.webhookUrl,
        { ...authHeaders, "Content-Type": "multipart/form-data" },
        allTextFields,
        hasImage
    );

    try {
        const response = await fetch(profile.webhookUrl, {
            method: "POST",
            headers: authHeaders,
            body: formData,
        });

        let responseBody: unknown = null;
        try {
            responseBody = await response.json();
        } catch {
            try {
                responseBody = await response.text();
            } catch {
                responseBody = null;
            }
        }

        const responseMeta: Record<string, unknown> = {
            statusCode: response.status,
            statusText: response.statusText,
            body: responseBody,
        };

        return {
            success: response.ok,
            statusCode: response.status,
            requestMeta,
            responseMeta,
        };
    } catch (error) {
        return {
            success: false,
            statusCode: 0,
            requestMeta,
            responseMeta: {
                error: error instanceof Error ? error.message : "Unknown error",
            },
        };
    }
}

/**
 * Send a test ping to the webhook (no media, just a small test payload).
 */
export async function sendTestPing(
    profile: PublisherProfile
): Promise<{ success: boolean; statusCode: number; message: string }> {
    const authHeaders = buildAuthHeaders(profile);

    try {
        const response = await fetch(profile.webhookUrl, {
            method: "POST",
            headers: {
                ...authHeaders,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                test: true,
                profileName: profile.name,
                timestamp: new Date().toISOString(),
            }),
        });

        return {
            success: response.ok,
            statusCode: response.status,
            message: response.ok ? "Ping successful" : `HTTP ${response.status}`,
        };
    } catch (error) {
        return {
            success: false,
            statusCode: 0,
            message: error instanceof Error ? error.message : "Connection failed",
        };
    }
}
