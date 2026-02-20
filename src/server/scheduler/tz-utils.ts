import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";

/**
 * Convert a local datetime string in a given timezone to UTC.
 * @param localDatetime - ISO-like string without timezone (e.g. "2024-03-15T14:30")
 * @param timezone - IANA timezone string (e.g. "Europe/Belgrade")
 * @returns UTC Date object
 */
export function localToUtc(localDatetime: string, timezone: string): Date {
    return fromZonedTime(localDatetime, timezone);
}

/**
 * Convert a UTC Date to a formatted string in the given timezone.
 * @param utcDate - UTC Date object
 * @param timezone - IANA timezone string
 * @param fmt - date-fns format string (default: "yyyy-MM-dd HH:mm")
 * @returns Formatted local datetime string
 */
export function utcToLocal(
    utcDate: Date,
    timezone: string,
    fmt: string = "yyyy-MM-dd HH:mm"
): string {
    const zonedDate = toZonedTime(utcDate, timezone);
    return format(zonedDate, fmt);
}

/**
 * Get the current time as a formatted string in the given timezone.
 */
export function nowInTimezone(
    timezone: string,
    fmt: string = "yyyy-MM-dd HH:mm:ss"
): string {
    return utcToLocal(new Date(), timezone, fmt);
}
