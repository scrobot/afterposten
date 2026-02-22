/**
 * Encryption key lifecycle — auto-generates and persists at ~/.afterposten/encryption.key.
 * Falls back to process.env.ENCRYPTION_KEY for backward compatibility.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".afterposten");
const KEY_FILE = path.join(CONFIG_DIR, "encryption.key");
const KEY_LENGTH_HEX = 64; // 32 bytes = 64 hex chars

let _cachedKey: string | null = null;

/**
 * Resolve the encryption key with fallback chain:
 * 1. process.env.ENCRYPTION_KEY (backward compat)
 * 2. ~/.afterposten/encryption.key (persisted file)
 * 3. Auto-generate a new key and persist it
 */
export function resolveEncryptionKey(): string {
    if (_cachedKey) return _cachedKey;

    // 1. Check env override
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey && envKey.length === KEY_LENGTH_HEX) {
        _cachedKey = envKey;
        return _cachedKey;
    }

    // 2. Check persisted file
    if (fs.existsSync(KEY_FILE)) {
        const fileKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
        if (fileKey.length === KEY_LENGTH_HEX) {
            _cachedKey = fileKey;
            return _cachedKey;
        }
    }

    // 3. Auto-generate and persist
    const newKey = crypto.randomBytes(32).toString("hex");
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(KEY_FILE, newKey, { mode: 0o600 });
    console.log(`[encryption-key] Generated new encryption key at ${KEY_FILE}`);

    _cachedKey = newKey;
    return _cachedKey;
}

/** Reset the cache — primarily for testing. */
export function _resetKeyCache(): void {
    _cachedKey = null;
}
