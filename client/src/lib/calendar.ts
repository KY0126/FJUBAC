export type CalendarExportEvent = {
  id: number;
  title: string;
  summary?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  location?: string | null;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toGoogleDate(value: Date | string) {
  const date = toDate(value);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function googleCalendarUrl(event: CalendarExportEvent) {
  const details = [event.summary, "加入後可在 Google 日曆中設定個人提醒。"].filter(Boolean).join("\n\n");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.startsAt)}/${toGoogleDate(event.endsAt)}`,
    details,
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function eventIcs(event: CalendarExportEvent) {
  const now = toGoogleDate(new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FJUBAC//Events//ZH-TW",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:fjubac-event-${event.id}@fjubac`,
    `DTSTAMP:${now}`,
    `DTSTART:${toGoogleDate(event.startsAt)}`,
    `DTEND:${toGoogleDate(event.endsAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs([event.summary, "加入後可在個人日曆中設定提醒。"].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${escapeIcs(event.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
