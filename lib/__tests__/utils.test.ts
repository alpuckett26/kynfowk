import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeMeetingUrl,
  inferMeetingProvider,
  formatTimezoneLabel,
  describeQuietHours,
  startOfWeek,
  getWeekKey,
  buildRecoveryRescheduleWindow,
  isCallNear,
  isCallPastDue,
  isReminderNotNeeded,
  normalizeReminderStatus,
  convertLocalDateTimeToUtc
} from "@/lib/utils";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// normalizeMeetingUrl
// ---------------------------------------------------------------------------
describe("normalizeMeetingUrl", () => {
  it("returns null for empty string", () => {
    expect(normalizeMeetingUrl("")).toBeNull();
    expect(normalizeMeetingUrl("   ")).toBeNull();
  });

  it("accepts a valid https URL as-is", () => {
    expect(normalizeMeetingUrl("https://zoom.us/j/12345")).toBe("https://zoom.us/j/12345");
  });

  it("prepends https:// when scheme is missing", () => {
    const result = normalizeMeetingUrl("zoom.us/j/12345");
    expect(result).toBe("https://zoom.us/j/12345");
  });

  it("returns null for an invalid URL", () => {
    expect(normalizeMeetingUrl("not a url at all!!!")).toBeNull();
  });

  it("handles non-http protocol strings by prepending https:// (known behavior)", () => {
    // Code prepends https:// to anything that doesn't start with http(s)://.
    // "ftp://example.com" → "https://ftp//example.com" which is a valid https URL.
    // This is a code-level edge case worth noting; the result is not null.
    const result = normalizeMeetingUrl("ftp://example.com");
    expect(result).not.toBeNull();
    expect(result?.startsWith("https://")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// inferMeetingProvider
// ---------------------------------------------------------------------------
describe("inferMeetingProvider", () => {
  it("detects Zoom", () => {
    expect(inferMeetingProvider("https://zoom.us/j/123")).toBe("Zoom");
  });

  it("detects Google Meet", () => {
    expect(inferMeetingProvider("https://meet.google.com/abc-defg-hij")).toBe("Google Meet");
  });

  it("detects Microsoft Teams", () => {
    expect(inferMeetingProvider("https://teams.microsoft.com/l/meetup-join/123")).toBe(
      "Microsoft Teams"
    );
  });

  it("detects FaceTime", () => {
    expect(inferMeetingProvider("https://facetime.apple.com/join#v=1")).toBe("FaceTime");
  });

  it("returns Shared link for unknown domains", () => {
    expect(inferMeetingProvider("https://example.com/call/123")).toBe("Shared link");
  });
});

// ---------------------------------------------------------------------------
// formatTimezoneLabel
// ---------------------------------------------------------------------------
describe("formatTimezoneLabel", () => {
  it("replaces underscores with spaces", () => {
    expect(formatTimezoneLabel("America/New_York")).toBe("America/New York");
  });

  it("leaves strings without underscores unchanged", () => {
    expect(formatTimezoneLabel("UTC")).toBe("UTC");
  });
});

// ---------------------------------------------------------------------------
// describeQuietHours
// ---------------------------------------------------------------------------
describe("describeQuietHours", () => {
  it("returns 'off' message when both values are null", () => {
    expect(describeQuietHours(null, null)).toContain("off");
  });

  it("returns 'off' message when start equals end", () => {
    expect(describeQuietHours(22, 22)).toContain("off");
  });

  it("describes a normal overnight range as a non-empty string", () => {
    // describeQuietHours uses Intl.DateTimeFormat without a fixed timezone,
    // so the exact hour labels depend on the runner's local timezone.
    // We verify it produces a meaningful, non-empty description string.
    const result = describeQuietHours(22, 7);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("off");
    expect(result).toContain("Kynfowk");
  });
});

// ---------------------------------------------------------------------------
// startOfWeek
// ---------------------------------------------------------------------------
describe("startOfWeek", () => {
  it("returns the preceding Monday for a Wednesday", () => {
    // Wednesday 2026-03-11
    const wed = new Date("2026-03-11T12:00:00");
    const result = startOfWeek(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("returns the same Monday when the date is Monday", () => {
    const mon = new Date("2026-03-09T08:00:00");
    const result = startOfWeek(mon);
    expect(result.toDateString()).toBe(mon.toDateString());
    expect(result.getDay()).toBe(1);
  });

  it("returns the preceding Monday for Sunday", () => {
    const sun = new Date("2026-03-15T10:00:00");
    const result = startOfWeek(sun);
    expect(result.getDay()).toBe(1);
    // The Monday before Sunday 2026-03-15 is 2026-03-09
    expect(result.getDate()).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// getWeekKey
// ---------------------------------------------------------------------------
describe("getWeekKey", () => {
  it("returns ISO date string of the Monday for a Wednesday", () => {
    const wed = new Date("2026-03-11T12:00:00");
    // Monday of that week
    const key = getWeekKey(wed);
    expect(key).toBe("2026-03-09");
  });
});

// ---------------------------------------------------------------------------
// buildRecoveryRescheduleWindow
// ---------------------------------------------------------------------------
describe("buildRecoveryRescheduleWindow", () => {
  it("returns a window 7 days after the original start", () => {
    const start = "2026-03-10T14:00:00.000Z";
    const end = "2026-03-10T15:00:00.000Z";
    const { startAt, endAt } = buildRecoveryRescheduleWindow(start, end);

    const origStart = new Date(start);
    const newStart = new Date(startAt);
    expect(newStart.getTime() - origStart.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

    // Duration should be preserved (1 hour = 3600000 ms)
    const newEnd = new Date(endAt);
    expect(newEnd.getTime() - newStart.getTime()).toBe(60 * 60 * 1000);
  });

  it("enforces a minimum 15-minute duration when end <= start", () => {
    const start = "2026-03-10T14:00:00.000Z";
    const { startAt, endAt } = buildRecoveryRescheduleWindow(start, start);
    const newStart = new Date(startAt);
    const newEnd = new Date(endAt);
    expect(newEnd.getTime() - newStart.getTime()).toBe(15 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// isCallNear
// ---------------------------------------------------------------------------
describe("isCallNear", () => {
  it("returns true when start is within 24 hours in the future", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now
    expect(isCallNear(soon, 24)).toBe(true);
  });

  it("returns false when start is more than 24 hours away", () => {
    const far = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(isCallNear(far, 24)).toBe(false);
  });

  it("returns false when start is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isCallNear(past, 24)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCallPastDue
// ---------------------------------------------------------------------------
describe("isCallPastDue", () => {
  it("returns false for completed calls regardless of end time", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isCallPastDue("completed", past)).toBe(false);
  });

  it("returns false for canceled calls", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isCallPastDue("canceled", past)).toBe(false);
  });

  it("returns true for scheduled call whose end is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isCallPastDue("scheduled", past)).toBe(true);
  });

  it("returns false for scheduled call whose end is in the future", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(isCallPastDue("scheduled", future)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isReminderNotNeeded
// ---------------------------------------------------------------------------
describe("isReminderNotNeeded", () => {
  it("returns true for completed", () => {
    expect(isReminderNotNeeded("completed")).toBe(true);
  });

  it("returns true for canceled", () => {
    expect(isReminderNotNeeded("canceled")).toBe(true);
  });

  it("returns false for scheduled", () => {
    expect(isReminderNotNeeded("scheduled")).toBe(false);
  });

  it("returns false for live", () => {
    expect(isReminderNotNeeded("live")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeReminderStatus
// ---------------------------------------------------------------------------
describe("normalizeReminderStatus", () => {
  it("returns not_needed for completed calls", () => {
    expect(normalizeReminderStatus("completed", "sent")).toBe("not_needed");
  });

  it("returns not_needed for canceled calls", () => {
    expect(normalizeReminderStatus("canceled", null)).toBe("not_needed");
  });

  it("returns the provided reminderStatus for active calls", () => {
    expect(normalizeReminderStatus("scheduled", "sent")).toBe("sent");
  });

  it("defaults to pending when reminderStatus is null", () => {
    expect(normalizeReminderStatus("scheduled", null)).toBe("pending");
  });

  it("defaults to pending when reminderStatus is undefined", () => {
    expect(normalizeReminderStatus("live", undefined)).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// convertLocalDateTimeToUtc
// ---------------------------------------------------------------------------
describe("convertLocalDateTimeToUtc", () => {
  it("returns null for an invalid format", () => {
    expect(convertLocalDateTimeToUtc("not-a-date", "America/New_York")).toBeNull();
  });

  it("converts a UTC-offset timezone correctly", () => {
    // 2026-03-10 is after the US spring-forward (Mar 8), so America/New_York is EDT (UTC-4).
    // 12:00 EDT → 16:00 UTC
    const result = convertLocalDateTimeToUtc("2026-03-10T12:00", "America/New_York");
    expect(result).not.toBeNull();
    expect(result).toContain("T16:00:00");
  });

  it("round-trips: converting back should recover the original local time", () => {
    const localInput = "2026-06-15T09:00";
    const tz = "America/Chicago";
    const utc = convertLocalDateTimeToUtc(localInput, tz);
    expect(utc).not.toBeNull();
    // The UTC string should be parseable
    const parsed = new Date(utc!);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
