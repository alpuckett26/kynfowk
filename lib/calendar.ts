function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "family-call";
}

export function buildCallCalendarFile(input: {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingUrl?: string | null;
  circleName: string;
}) {
  const descriptionLines = [
    `Scheduled with Kynfowk for ${input.circleName}.`,
    "A warm family moment, held in one place."
  ];

  if (input.meetingUrl) {
    descriptionLines.push(`Join link: ${input.meetingUrl}`);
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kynfowk//Family Call//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@kynfowk.app`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(input.scheduledStart)}`,
    `DTEND:${formatIcsDate(input.scheduledEnd)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    input.meetingUrl ? `URL:${escapeIcsText(input.meetingUrl)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ]
    .filter(Boolean)
    .join("\r\n");

  return {
    body: ics,
    filename: `${sanitizeFilename(input.title)}.ics`
  };
}
