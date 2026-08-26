import { describe, expect, it } from "vitest";
import { eventIcs, googleCalendarUrl } from "./calendar";

const event = {
  id: 7,
  title: "FJUBAC 分析工作坊",
  summary: "以資料拆解商業問題。",
  startsAt: "2026-09-01T10:00:00.000Z",
  endsAt: "2026-09-01T12:00:00.000Z",
  location: "輔仁大學",
};

describe("活動個人日曆匯出", () => {
  it("產生可交給 Google Calendar 的預填活動連結", () => {
    const url = googleCalendarUrl(event);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(new URL(url).searchParams.get("text")).toBe("FJUBAC 分析工作坊");
  });

  it("產生含時間、標題與地點的標準 ICS 內容", () => {
    const ics = eventIcs(event);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:fjubac-event-7@fjubac");
    expect(ics).toContain("SUMMARY:FJUBAC 分析工作坊");
    expect(ics).toContain("LOCATION:輔仁大學");
  });
});
