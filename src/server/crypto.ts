import crypto from "node:crypto";
import { resolveEncryptionKey } from "@/config/encryption-key";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
    const hex = resolveEncryptionKey();
    if (hex.length !== 64) {
        throw new Error(
            "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: openssl rand -hex 32"
        );
    }
    return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns `iv:ciphertext:tag` as hex.
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypt a string produced by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
    const key = getKey();
    const [ivHex, encHex, tagHex] = ciphertext.split(":");
    if (!ivHex || !encHex || !tagHex) {
        throw new Error("Invalid ciphertext format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
}
