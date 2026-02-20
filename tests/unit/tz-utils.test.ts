import { describe, expect, it } from "vitest";
import { localToUtc, utcToLocal, nowInTimezone } from "@/server/scheduler/tz-utils";

describe("localToUtc", () => {
    it("converts Belgrade time to UTC (CET = UTC+1)", () => {
        // Belgrade is UTC+1 in winter (CET)
        const utc = localToUtc("2024-01-15T14:30", "Europe/Belgrade");
        expect(utc.getUTCHours()).toBe(13); // 14:30 CET = 13:30 UTC
        expect(utc.getUTCMinutes()).toBe(30);
        expect(utc.getUTCDate()).toBe(15);
    });

    it("converts Belgrade time to UTC (CEST = UTC+2)", () => {
        // Belgrade is UTC+2 in summer (CEST)
        const utc = localToUtc("2024-07-15T14:30", "Europe/Belgrade");
        expect(utc.getUTCHours()).toBe(12); // 14:30 CEST = 12:30 UTC
        expect(utc.getUTCMinutes()).toBe(30);
    });

    it("handles midnight correctly", () => {
        const utc = localToUtc("2024-01-15T00:00", "Europe/Belgrade");
        // Midnight CET = 23:00 UTC previous day
        expect(utc.getUTCHours()).toBe(23);
        expect(utc.getUTCDate()).toBe(14);
    });

    it("handles UTC timezone (no offset)", () => {
        const utc = localToUtc("2024-01-15T14:30", "UTC");
        expect(utc.getUTCHours()).toBe(14);
        expect(utc.getUTCMinutes()).toBe(30);
    });

    it("handles US Eastern timezone", () => {
        const utc = localToUtc("2024-01-15T14:30", "America/New_York");
        expect(utc.getUTCHours()).toBe(19); // EST = UTC-5
        expect(utc.getUTCMinutes()).toBe(30);
    });
});

describe("utcToLocal", () => {
    it("converts UTC to Belgrade time", () => {
        const utcDate = new Date("2024-01-15T13:30:00Z");
        const local = utcToLocal(utcDate, "Europe/Belgrade");
        expect(local).toBe("2024-01-15 14:30");
    });

    it("supports custom format", () => {
        const utcDate = new Date("2024-01-15T13:30:00Z");
        const local = utcToLocal(utcDate, "Europe/Belgrade", "HH:mm");
        expect(local).toBe("14:30");
    });

    it("handles date boundary crossing", () => {
        const utcDate = new Date("2024-01-15T23:30:00Z");
        const local = utcToLocal(utcDate, "Europe/Belgrade");
        // 23:30 UTC = 00:30 CET next day
        expect(local).toBe("2024-01-16 00:30");
    });
});

describe("nowInTimezone", () => {
    it("returns a string for valid timezone", () => {
        const result = nowInTimezone("Europe/Belgrade");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    it("returns a string for UTC", () => {
        const result = nowInTimezone("UTC");
        expect(typeof result).toBe("string");
    });
});
