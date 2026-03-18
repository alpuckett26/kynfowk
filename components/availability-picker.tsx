"use client";

import { DAYS, TIME_BLOCKS } from "@/lib/constants";

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

export function AvailabilityPicker({ currentSlots }: { currentSlots: string[] }) {
  return (
    <div className="avail-picker">
      {DAYS.map((day) => (
        <div className="avail-day" key={day.value}>
          <span className="avail-day-name">{day.fullLabel ?? day.label}</span>
          <div className="avail-chips">
            {TIME_BLOCKS.map((block) => {
              const slotValue = `${day.value}|${block.startHour}|${block.endHour}`;
              return (
                <label className="avail-chip" key={slotValue}>
                  <input
                    defaultChecked={currentSlots.includes(slotValue)}
                    name="slots"
                    type="checkbox"
                    value={slotValue}
                  />
                  <span className="avail-chip-inner">
                    <span className="avail-chip-name">{block.label}</span>
                    <span className="avail-chip-time">
                      {formatHour(block.startHour)}–{formatHour(block.endHour)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
