import { describe, it, expect } from "vitest";
import {
  getAvailabilitySlotKey,
  sortAvailabilityWindows,
  formatAvailabilityTimeRange,
  buildAvailabilitySummary
} from "@/lib/availability";

describe("getAvailabilitySlotKey", () => {
  it("produces a pipe-delimited composite key", () => {
    expect(getAvailabilitySlotKey({ weekday: 1, start_hour: 9, end_hour: 12 })).toBe("1|9|12");
  });

  it("includes zero values correctly", () => {
    expect(getAvailabilitySlotKey({ weekday: 0, start_hour: 0, end_hour: 1 })).toBe("0|0|1");
  });
});

describe("sortAvailabilityWindows", () => {
  it("sorts by weekday first", () => {
    const windows = [
      { weekday: 3, start_hour: 9, end_hour: 10 },
      { weekday: 1, start_hour: 9, end_hour: 10 },
      { weekday: 2, start_hour: 9, end_hour: 10 }
    ];
    const sorted = sortAvailabilityWindows(windows);
    expect(sorted.map((w) => w.weekday)).toEqual([1, 2, 3]);
  });

  it("sorts by start_hour within the same weekday", () => {
    const windows = [
      { weekday: 1, start_hour: 17, end_hour: 20 },
      { weekday: 1, start_hour: 7, end_hour: 10 },
      { weekday: 1, start_hour: 11, end_hour: 14 }
    ];
    const sorted = sortAvailabilityWindows(windows);
    expect(sorted.map((w) => w.start_hour)).toEqual([7, 11, 17]);
  });

  it("does not mutate the original array", () => {
    const windows = [
      { weekday: 2, start_hour: 9, end_hour: 10 },
      { weekday: 1, start_hour: 9, end_hour: 10 }
    ];
    const original = [...windows];
    sortAvailabilityWindows(windows);
    expect(windows).toEqual(original);
  });

  it("returns an empty array when given an empty array", () => {
    expect(sortAvailabilityWindows([])).toEqual([]);
  });
});

describe("formatAvailabilityTimeRange", () => {
  it("formats morning AM hours", () => {
    expect(formatAvailabilityTimeRange(7, 10)).toBe("7AM-10AM");
  });

  it("formats PM hours", () => {
    expect(formatAvailabilityTimeRange(17, 20)).toBe("5PM-8PM");
  });

  it("formats midnight as 12AM", () => {
    expect(formatAvailabilityTimeRange(0, 1)).toBe("12AM-1AM");
  });

  it("formats noon as 12PM", () => {
    expect(formatAvailabilityTimeRange(12, 13)).toBe("12PM-1PM");
  });
});

describe("buildAvailabilitySummary", () => {
  it("returns empty array for no windows", () => {
    expect(buildAvailabilitySummary([])).toEqual([]);
  });

  it("groups windows by weekday", () => {
    const windows = [
      { weekday: 1, start_hour: 7, end_hour: 10 },
      { weekday: 1, start_hour: 17, end_hour: 20 },
      { weekday: 3, start_hour: 11, end_hour: 14 }
    ];
    const summary = buildAvailabilitySummary(windows);
    expect(summary).toHaveLength(2);
    const mon = summary.find((s) => s.weekday === 1);
    const wed = summary.find((s) => s.weekday === 3);
    expect(mon?.dayLabel).toBe("Mon");
    expect(mon?.label).toBe("Mon: 7AM-10AM, 5PM-8PM");
    expect(wed?.dayLabel).toBe("Wed");
    expect(wed?.label).toBe("Wed: 11AM-2PM");
  });

  it("sorts days in weekday order within the output", () => {
    const windows = [
      { weekday: 5, start_hour: 9, end_hour: 10 },
      { weekday: 0, start_hour: 9, end_hour: 10 }
    ];
    const summary = buildAvailabilitySummary(windows);
    expect(summary[0].weekday).toBe(0); // Sunday
    expect(summary[1].weekday).toBe(5); // Friday
  });
});
