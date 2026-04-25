import {
  formatMinutes,
  formatNumber,
  getWeekStart,
  pluralize,
} from "@/lib/utils";

describe("formatMinutes", () => {
  it("returns minutes only when < 60", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(59)).toBe("59m");
  });

  it("returns hours only when exact hour", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
  });

  it("returns h and m for mixed", () => {
    expect(formatMinutes(65)).toBe("1h 5m");
    expect(formatMinutes(122)).toBe("2h 2m");
  });
});

describe("formatNumber", () => {
  it("returns the number as string when < 1000", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("returns k notation for ≥ 1000", () => {
    expect(formatNumber(1000)).toBe("1.0k");
    expect(formatNumber(2400)).toBe("2.4k");
  });
});

describe("pluralize", () => {
  it("uses singular for 1", () => {
    expect(pluralize(1, "call")).toBe("call");
    expect(pluralize(1, "week")).toBe("week");
  });

  it("uses plural for 0 and > 1", () => {
    expect(pluralize(0, "call")).toBe("calls");
    expect(pluralize(2, "call")).toBe("calls");
  });

  it("accepts custom plural", () => {
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});

describe("getWeekStart", () => {
  it("returns a Monday", () => {
    const result = getWeekStart(new Date("2024-03-14")); // Thursday
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getFullYear()).toBe(2024);
  });

  it("returns the same Monday for dates in the same week", () => {
    const mon = getWeekStart(new Date("2024-03-11")); // Monday
    const fri = getWeekStart(new Date("2024-03-15")); // Friday
    expect(mon.toISOString()).toBe(fri.toISOString());
  });
});
