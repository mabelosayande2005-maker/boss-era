import { NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return NextResponse.json({ events: [], connected: false });
    }

    const now = new Date();

    // Compute startOfDay in Europe/London so BST and UTC servers both use the same window.
    // "sv" locale formats as YYYY-MM-DD which we then parse as midnight UTC.
    // We then shift by London's UTC offset at that moment (0 in winter, -1h in summer).
    const tz = "Europe/London";
    const londonDate = new Intl.DateTimeFormat("sv", { timeZone: tz }).format(now);
    const utcMidnight = new Date(londonDate + "T00:00:00Z");
    const londonHourAtUtcMidnight = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false, hourCycle: "h23" }).format(utcMidnight)
    );
    const startOfDay = new Date(utcMidnight.getTime() - londonHourAtUtcMidnight * 3_600_000);
    const endOfDay   = new Date(startOfDay.getTime() + 24 * 3_600_000);

    console.log("[calendar events] server now (UTC):", now.toISOString());
    console.log("[calendar events] london date:", londonDate, "utcOffset:", londonHourAtUtcMidnight);
    console.log("[calendar events] request params", {
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const data = res.data;
    console.log("[calendar events] response meta", {
      kind:          data.kind,
      summary:       data.summary,       // calendar display name
      timeZone:      data.timeZone,      // calendar's own timezone setting
      itemCount:     data.items?.length ?? 0,
      nextPageToken: data.nextPageToken ?? null,  // non-null → more pages exist
    });

    const raw = data.items ?? [];
    raw.forEach((e, i) => {
      console.log(`[calendar events] item[${i}]`, {
        id:               e.id,
        summary:          e.summary,
        status:           e.status,
        start:            e.start,
        end:              e.end,
        organizer:        e.organizer?.email,
        recurringEventId: e.recurringEventId ?? null,
        iCalUID:          e.iCalUID,
      });
    });

    const events = raw.map(e => ({
      id:      e.id ?? "",
      title:   e.summary ?? "Untitled",
      start:   e.start?.dateTime ?? e.start?.date ?? null,
      end:     e.end?.dateTime   ?? e.end?.date   ?? null,
      allDay:  !e.start?.dateTime,
      location: e.location ?? null,
      htmlLink: e.htmlLink ?? null,
    }));

    console.log("[calendar events] returning", events.length, "events to client");
    return NextResponse.json(
      { events, connected: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[calendar events]", e);
    return NextResponse.json(
      { events: [], connected: false, error: String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
