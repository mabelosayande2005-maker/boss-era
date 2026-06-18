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
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 15,
    });

    const events = (res.data.items ?? []).map(e => ({
      id: e.id ?? "",
      title: e.summary ?? "Untitled",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay: !e.start?.dateTime,
      location: e.location ?? null,
      htmlLink: e.htmlLink ?? null,
    }));

    return NextResponse.json({ events, connected: true });
  } catch (e) {
    console.error("[calendar events]", e);
    return NextResponse.json({ events: [], connected: false, error: String(e) }, { status: 500 });
  }
}
