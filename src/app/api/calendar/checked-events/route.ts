import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_event_checks (
      event_id   TEXT NOT NULL,
      check_date TEXT NOT NULL,
      PRIMARY KEY (event_id, check_date)
    )
  `;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? "";
    const rows = await sql`
      SELECT event_id FROM calendar_event_checks WHERE check_date = ${date}
    ` as { event_id: string }[];
    return NextResponse.json({ checked: rows.map(r => r.event_id) });
  } catch (e) {
    console.error("[calendar/checked-events GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as Record<string, unknown>;
    const { action } = body as { action: string };

    if (action === "set") {
      const { event_id, check_date, checked } = body as { event_id: string; check_date: string; checked: boolean };
      if (checked) {
        await sql`
          INSERT INTO calendar_event_checks (event_id, check_date)
          VALUES (${event_id}, ${check_date})
          ON CONFLICT DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM calendar_event_checks WHERE event_id = ${event_id} AND check_date = ${check_date}
        `;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "set_bulk") {
      const { event_ids, check_date } = body as { event_ids: string[]; check_date: string };
      for (const event_id of event_ids) {
        await sql`
          INSERT INTO calendar_event_checks (event_id, check_date)
          VALUES (${event_id}, ${check_date})
          ON CONFLICT DO NOTHING
        `;
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[calendar/checked-events POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
