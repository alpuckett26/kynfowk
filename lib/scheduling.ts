import { DAYS } from "@/lib/constants";
import type { Suggestion } from "@/lib/types";

interface AvailabilityWindow {
  weekday: number;
  start_hour: number;
  end_hour: number;
  membership_id: string;
}

interface MemberInfo {
  id: string;
  display_name: string;
  status: "active" | "invited";
}

interface HourSlice {
  dateKey: string;
  date: Date;
  hour: number;
  members: string[];
}

export function buildSuggestions(
  windows: AvailabilityWindow[],
  members: MemberInfo[],
  minimumParticipants = 2
): Suggestion[] {
  const activeMembers = members.filter((member) => member.status === "active");
  if (activeMembers.length < minimumParticipants) {
    return [];
  }

  const memberLookup = new Map(activeMembers.map((member) => [member.id, member.display_name]));
  const slices = buildHourSlicesForNextWeek(windows, activeMembers.map((member) => member.id));
  const grouped = mergeNeighboringSlices(slices);

  return grouped
    .filter((group) => group.members.length >= minimumParticipants)
    .map((group) => {
      const availableDurationMinutes = (group.endHour - group.startHour) * 60;
      const durationMinutes = Math.min(availableDurationMinutes, 120);
      const suggestionStart = new Date(group.date);
      suggestionStart.setHours(group.startHour, 0, 0, 0);
      const suggestionEnd = new Date(suggestionStart);
      suggestionEnd.setMinutes(suggestionEnd.getMinutes() + durationMinutes);
      const coverage = group.members.length / activeMembers.length;
      const participantNames = group.members
        .map((memberId) => memberLookup.get(memberId) ?? "Family member")
        .slice(0, 4);

      return {
        start_at: suggestionStart.toISOString(),
        end_at: suggestionEnd.toISOString(),
        duration_minutes: durationMinutes,
        participant_count: group.members.length,
        participant_names: participantNames,
        participant_ids: group.members,
        overlap_strength_label:
          coverage >= 0.75 ? "Best fit" : coverage >= 0.5 ? "Good fit" : "Worth trying",
        coverage,
        label: buildWindowLabel(suggestionStart, suggestionEnd),
        rationale: buildRationale(group.members.length, activeMembers.length, durationMinutes)
      };
    })
    .sort((a, b) => {
      if (b.participant_count !== a.participant_count) {
        return b.participant_count - a.participant_count;
      }

      if (b.coverage !== a.coverage) {
        return b.coverage - a.coverage;
      }

      if (new Date(a.start_at).getTime() !== new Date(b.start_at).getTime()) {
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      }

      return b.duration_minutes - a.duration_minutes;
    })
    .slice(0, 6);
}

function buildHourSlicesForNextWeek(windows: AvailabilityWindow[], activeIds: string[]) {
  const activeSet = new Set(activeIds);
  const grouped = new Map<string, { date: Date; members: Set<string> }>();
  const now = new Date();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const weekday = date.getDay();

    windows.forEach((window) => {
      if (!activeSet.has(window.membership_id) || window.weekday !== weekday) {
        return;
      }

      for (let hour = window.start_hour; hour < window.end_hour; hour += 1) {
        const sliceStart = new Date(date);
        sliceStart.setHours(hour, 0, 0, 0);
        if (sliceStart <= now) {
          continue;
        }

        const key = `${date.toISOString().slice(0, 10)}-${hour}`;
        if (!grouped.has(key)) {
          grouped.set(key, { date: new Date(date), members: new Set() });
        }
        grouped.get(key)?.members.add(window.membership_id);
      }
    });
  }

  return [...grouped.entries()]
    .map(([key, value]) => {
      const hourString = key.split("-").at(-1) ?? "0";
      return {
        dateKey: key.slice(0, 10),
        date: value.date,
        hour: Number(hourString),
        members: [...value.members].sort()
      };
    })
    .sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }

      return a.hour - b.hour;
    });
}

function mergeNeighboringSlices(slices: HourSlice[]) {
  const groups: Array<{
    dateKey: string;
    date: Date;
    startHour: number;
    endHour: number;
    members: string[];
  }> = [];

  for (const slice of slices) {
    const previous = groups.at(-1);
    if (
      previous &&
      previous.dateKey === slice.dateKey &&
      previous.endHour === slice.hour &&
      arraysEqual(previous.members, slice.members)
    ) {
      previous.endHour += 1;
    } else {
      groups.push({
        dateKey: slice.dateKey,
        date: slice.date,
        startHour: slice.hour,
        endHour: slice.hour + 1,
        members: slice.members
      });
    }
  }

  return groups;
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildRationale(participants: number, totalActive: number, durationMinutes: number) {
  const durationLabel =
    durationMinutes >= 120 ? "a two-hour window" : durationMinutes >= 60 ? "an hour-long window" : "a short window";
  return `${participants} of ${totalActive} active family members can make ${durationLabel}.`;
}

function buildWindowLabel(startAt: Date, endAt: Date) {
  const dayLabel = DAYS[startAt.getDay()]?.label ?? "Day";
  return `${dayLabel} ${formatHour(startAt.getHours())}-${formatHour(endAt.getHours())}`;
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}
