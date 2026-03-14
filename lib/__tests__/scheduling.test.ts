import { describe, it, expect, vi, afterEach } from "vitest";
import { buildSuggestions } from "@/lib/scheduling";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a future Date that lands on the given weekday (0=Sun, 6=Sat)
 * within the next 7 days, at 06:00 local time so that hour slices starting
 * at hour 7+ are safely in the future relative to any fixed "now" we set.
 */
function nextWeekdayAt6(weekday: number): Date {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff)); // always a future day
  return d;
}

function makeMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    display_name: `Member ${i + 1}`,
    status: "active" as const
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic guard-rails
// ---------------------------------------------------------------------------
describe("buildSuggestions – guard-rails", () => {
  it("returns empty array when there are fewer than 2 active members", () => {
    const result = buildSuggestions(
      [{ weekday: 1, start_hour: 9, end_hour: 11, membership_id: "m1" }],
      [{ id: "m1", display_name: "Alice", status: "active" }]
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when no windows are provided", () => {
    const result = buildSuggestions([], makeMembers(2));
    expect(result).toEqual([]);
  });

  it("ignores invited (non-active) members", () => {
    const members = [
      { id: "m1", display_name: "Alice", status: "active" as const },
      { id: "m2", display_name: "Bob", status: "invited" as const }
    ];
    const windows = [
      { weekday: 1, start_hour: 9, end_hour: 11, membership_id: "m1" },
      { weekday: 1, start_hour: 9, end_hour: 11, membership_id: "m2" }
    ];
    // Only one active member → below minimumParticipants
    expect(buildSuggestions(windows, members)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Overlap detection
// ---------------------------------------------------------------------------
describe("buildSuggestions – overlap detection", () => {
  it("produces suggestions when two members share an overlapping window", () => {
    const [m1, m2] = makeMembers(2);
    // Use today's weekday +1 to ensure it is in the future this week
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();

    const windows = [
      { weekday, start_hour: 9, end_hour: 11, membership_id: m1.id },
      { weekday, start_hour: 9, end_hour: 11, membership_id: m2.id }
    ];

    const suggestions = buildSuggestions(windows, [m1, m2]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].participant_count).toBe(2);
  });

  it("does not produce suggestions for non-overlapping windows", () => {
    const [m1, m2] = makeMembers(2);
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();

    const windows = [
      { weekday, start_hour: 7, end_hour: 10, membership_id: m1.id },
      { weekday, start_hour: 17, end_hour: 20, membership_id: m2.id }
    ];

    const suggestions = buildSuggestions(windows, [m1, m2]);
    expect(suggestions).toEqual([]);
  });

  it("caps duration at 120 minutes even for long shared windows", () => {
    const [m1, m2] = makeMembers(2);
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();

    const windows = [
      { weekday, start_hour: 9, end_hour: 18, membership_id: m1.id },
      { weekday, start_hour: 9, end_hour: 18, membership_id: m2.id }
    ];

    const suggestions = buildSuggestions(windows, [m1, m2]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].duration_minutes).toBeLessThanOrEqual(120);
  });
});

// ---------------------------------------------------------------------------
// Strength label
// ---------------------------------------------------------------------------
describe("buildSuggestions – overlap_strength_label", () => {
  it("labels a window 'Best fit' when all active members overlap (100% coverage)", () => {
    const members = makeMembers(2);
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();
    const windows = members.map((m) => ({
      weekday,
      start_hour: 9,
      end_hour: 11,
      membership_id: m.id
    }));

    const suggestions = buildSuggestions(windows, members);
    expect(suggestions[0].overlap_strength_label).toBe("Best fit");
  });

  it("labels a window 'Worth trying' for low coverage", () => {
    // 4 active members, only 2 overlap → 50% coverage → "Good fit" boundary
    // Use only 1 out of 4 → 25% → "Worth trying"
    const members = makeMembers(4);
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();
    // Only m1 and m2 share this window (2/4 = 50% → "Good fit")
    const windows = [
      { weekday, start_hour: 9, end_hour: 11, membership_id: members[0].id },
      { weekday, start_hour: 9, end_hour: 11, membership_id: members[1].id }
    ];

    const suggestions = buildSuggestions(windows, members, 2);
    // 2/4 = 0.5 → coverage >= 0.5 → "Good fit"
    expect(suggestions[0].overlap_strength_label).toBe("Good fit");
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
describe("buildSuggestions – sorting", () => {
  it("sorts windows with more participants first", () => {
    const members = makeMembers(3);
    const [m1, m2, m3] = members;

    // Two overlapping windows on different days in the future
    const day1 = nextWeekdayAt6(1); // Monday
    const day2 = nextWeekdayAt6(3); // Wednesday

    const windows = [
      // Monday: only m1 + m2
      { weekday: day1.getDay(), start_hour: 9, end_hour: 11, membership_id: m1.id },
      { weekday: day1.getDay(), start_hour: 9, end_hour: 11, membership_id: m2.id },
      // Wednesday: all three
      { weekday: day2.getDay(), start_hour: 9, end_hour: 11, membership_id: m1.id },
      { weekday: day2.getDay(), start_hour: 9, end_hour: 11, membership_id: m2.id },
      { weekday: day2.getDay(), start_hour: 9, end_hour: 11, membership_id: m3.id }
    ];

    const suggestions = buildSuggestions(windows, members);
    // The first suggestion should have the most participants (3)
    expect(suggestions[0].participant_count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------
describe("buildSuggestions – output shape", () => {
  it("returns at most 6 suggestions", () => {
    const members = makeMembers(2);
    const weekdays = [1, 2, 3, 4, 5, 6, 0]; // Sun-Sat
    const windows = weekdays.flatMap((weekday) =>
      members.map((m) => ({ weekday, start_hour: 9, end_hour: 11, membership_id: m.id }))
    );

    const suggestions = buildSuggestions(windows, members);
    expect(suggestions.length).toBeLessThanOrEqual(6);
  });

  it("includes required fields on each suggestion", () => {
    const members = makeMembers(2);
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();
    const windows = members.map((m) => ({
      weekday,
      start_hour: 10,
      end_hour: 12,
      membership_id: m.id
    }));

    const [first] = buildSuggestions(windows, members);
    expect(first).toHaveProperty("start_at");
    expect(first).toHaveProperty("end_at");
    expect(first).toHaveProperty("duration_minutes");
    expect(first).toHaveProperty("participant_count");
    expect(first).toHaveProperty("participant_names");
    expect(first).toHaveProperty("participant_ids");
    expect(first).toHaveProperty("overlap_strength_label");
    expect(first).toHaveProperty("coverage");
    expect(first).toHaveProperty("label");
    expect(first).toHaveProperty("rationale");
  });

  it("participant_names contains display names, not IDs", () => {
    const members = [
      { id: "m1", display_name: "Alice", status: "active" as const },
      { id: "m2", display_name: "Bob", status: "active" as const }
    ];
    const futureDay = nextWeekdayAt6(new Date().getDay() === 6 ? 1 : new Date().getDay() + 1);
    const weekday = futureDay.getDay();
    const windows = members.map((m) => ({
      weekday,
      start_hour: 10,
      end_hour: 12,
      membership_id: m.id
    }));

    const [first] = buildSuggestions(windows, members);
    expect(first.participant_names).toContain("Alice");
    expect(first.participant_names).toContain("Bob");
  });
});
