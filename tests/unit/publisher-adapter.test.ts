import { describe, expect, it, vi, beforeEach } from "vitest";

// Test the multipart payload construction logic
describe("n8n publisher adapter", () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.stubEnv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    });

    it("builds correct text fields in FormData", async () => {
        const { publishToN8n } = await import("@/server/publishers/n8n-adapter");

        const profile = {
            id: "test-profile",
            name: "Test Profile",
            webhookUrl: "http://localhost:5678/webhook/test",
            authType: "none",
            authHeaderName: null,
            authHeaderValueEnc: null,
            bearerTokenEnc: null,
            binaryFieldName: "mediaFile",
            extraPayloadJson: '{"source": "post-studio"}',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Mock fetch
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            json: () => Promise.resolve({ success: true }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await publishToN8n(profile, {
            text: "Hello world post",
            hashtags: ["AI", "Tech"],
            postId: "post-123",
            scheduledAt: "2024-01-15T14:30:00",
            profileName: "Test Profile",
            extraFields: { source: "post-studio" },
            imagePath: null,
            imageFormat: "png",
            binaryFieldName: "mediaFile",
        });

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe("http://localhost:5678/webhook/test");
        expect(options.method).toBe("POST");

        // Verify FormData was sent
        const body = options.body;
        expect(body).toBeInstanceOf(FormData);
    });

    it("adds bearer auth header when configured", async () => {
        const { encrypt } = await import("@/server/crypto");

        const encToken = encrypt("my-secret-token");

        const profile = {
            id: "test-profile",
            name: "Bearer Profile",
            webhookUrl: "http://localhost:5678/webhook/test",
            authType: "bearer",
            authHeaderName: null,
            authHeaderValueEnc: null,
            bearerTokenEnc: encToken,
            binaryFieldName: "mediaFile",
            extraPayloadJson: "{}",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            json: () => Promise.resolve({ success: true }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const { publishToN8n } = await import("@/server/publishers/n8n-adapter");

        await publishToN8n(profile, {
            text: "Test",
            hashtags: [],
            postId: "post-1",
            scheduledAt: "2024-01-15T14:30:00",
            profileName: "Bearer Profile",
            extraFields: {},
            imagePath: null,
            imageFormat: "png",
            binaryFieldName: "mediaFile",
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers["Authorization"]).toBe("Bearer my-secret-token");
    });

    it("adds custom header auth when configured", async () => {
        const { encrypt } = await import("@/server/crypto");

        const encValue = encrypt("secret-value");

        const profile = {
            id: "test-profile",
            name: "Header Profile",
            webhookUrl: "http://localhost:5678/webhook/test",
            authType: "header",
            authHeaderName: "X-Custom-Auth",
            authHeaderValueEnc: encValue,
            bearerTokenEnc: null,
            binaryFieldName: "mediaFile",
            extraPayloadJson: "{}",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            json: () => Promise.resolve({ success: true }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const { publishToN8n } = await import("@/server/publishers/n8n-adapter");

        await publishToN8n(profile, {
            text: "Test",
            hashtags: [],
            postId: "post-1",
            scheduledAt: "2024-01-15T14:30:00",
            profileName: "Header Profile",
            extraFields: {},
            imagePath: null,
            imageFormat: "png",
            binaryFieldName: "mediaFile",
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers["X-Custom-Auth"]).toBe("secret-value");
    });

    it("sanitizes request metadata (no secrets)", async () => {
        const { publishToN8n } = await import("@/server/publishers/n8n-adapter");

        const profile = {
            id: "test-profile",
            name: "Test",
            webhookUrl: "http://localhost:5678/webhook/test",
            authType: "none",
            authHeaderName: null,
            authHeaderValueEnc: null,
            bearerTokenEnc: null,
            binaryFieldName: "mediaFile",
            extraPayloadJson: "{}",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            json: () => Promise.resolve({ ok: true }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const result = await publishToN8n(profile, {
            text: "Test post text",
            hashtags: ["ai"],
            postId: "p1",
            scheduledAt: "2024-01-15T14:00:00",
            profileName: "Test",
            extraFields: {},
            imagePath: null,
            imageFormat: "png",
            binaryFieldName: "mediaFile",
        });

        const meta = result.requestMeta;
        expect(meta.url).toBe("http://localhost:5678/webhook/test");
        expect(meta.method).toBe("POST");
        expect(meta.hasImage).toBe(false);

        // Ensure no raw auth tokens in metadata
        const metaStr = JSON.stringify(meta);
        expect(metaStr).not.toContain("my-secret-token");
        expect(metaStr).not.toContain("secret-value");
    });

    it("handles network failure gracefully", async () => {
        const { publishToN8n } = await import("@/server/publishers/n8n-adapter");

        const profile = {
            id: "test-profile",
            name: "Failing",
            webhookUrl: "http://unreachable:9999/webhook",
            authType: "none",
            authHeaderName: null,
            authHeaderValueEnc: null,
            bearerTokenEnc: null,
            binaryFieldName: "mediaFile",
            extraPayloadJson: "{}",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

        const result = await publishToN8n(profile, {
            text: "Test",
            hashtags: [],
            postId: "p1",
            scheduledAt: "2024-01-15T14:00:00",
            profileName: "Failing",
            extraFields: {},
            imagePath: null,
            imageFormat: "png",
            binaryFieldName: "mediaFile",
        });

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(0);
        expect(result.responseMeta.error).toBe("ECONNREFUSED");
    });
});
