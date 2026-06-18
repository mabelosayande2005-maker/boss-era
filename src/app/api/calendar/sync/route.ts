import { NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not connected" }, { status: 401 });
    }

    const body = await req.json();
    const { title, date, time, duration, description } = body as {
      title: string;
      date: string;      // "yyyy-MM-dd"
      time?: string;     // "HH:MM" — omit for all-day
      duration?: number; // minutes, default 60
      description?: string;
    };

    let startObj: { date?: string; dateTime?: string; timeZone?: string };
    let endObj: { date?: string; dateTime?: string; timeZone?: string };

    if (time) {
      const [h, m] = time.split(":").map(Number);
      const startMs = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).getTime();
      const endMs = startMs + (duration ?? 60) * 60 * 1000;
      const tz = "Europe/London";
      startObj = { dateTime: new Date(startMs).toISOString(), timeZone: tz };
      endObj   = { dateTime: new Date(endMs).toISOString(), timeZone: tz };
    } else {
      // All-day: end is exclusive next day
      const nextDate = new Date(date + "T00:00:00");
      nextDate.setDate(nextDate.getDate() + 1);
      startObj = { date };
      endObj   = { date: nextDate.toISOString().slice(0, 10) };
    }

    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description: description ?? "Added from Boss Era ✦",
        start: startObj,
        end: endObj,
        source: {
          title: "Boss Era",
          url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        },
      },
    });

    return NextResponse.json({ eventId: res.data.id, htmlLink: res.data.htmlLink });
  } catch (e) {
    console.error("[calendar sync]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
