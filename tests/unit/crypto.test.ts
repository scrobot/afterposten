import { describe, expect, it, vi, beforeEach } from "vitest";

describe("Encryption", () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.stubEnv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    });

    it("encrypts and decrypts a string correctly", async () => {
        const { encrypt, decrypt } = await import("@/server/crypto");

        const plaintext = "my-secret-api-key-12345";
        const encrypted = encrypt(plaintext);

        expect(encrypted).not.toBe(plaintext);
        expect(encrypted).toContain(":");

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext each time (random IV)", async () => {
        const { encrypt } = await import("@/server/crypto");

        const plaintext = "same-value";
        const enc1 = encrypt(plaintext);
        const enc2 = encrypt(plaintext);

        expect(enc1).not.toBe(enc2);
    });

    it("throws on invalid ciphertext format", async () => {
        const { decrypt } = await import("@/server/crypto");

        expect(() => decrypt("invalid-no-colons")).toThrow();
    });
});
