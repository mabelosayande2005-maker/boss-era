import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS content_items (
      id SERIAL PRIMARY KEY,
      brand TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT,
      scheduled_date DATE,
      status TEXT DEFAULT 'idea',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

function normItem(i: Record<string, unknown>) {
  return { ...i, scheduled_date: norm(i.scheduled_date) };
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");

    let scheduled: Record<string, unknown>[];
    if (weekStart) {
      scheduled = await sql`
        SELECT * FROM content_items
        WHERE scheduled_date >= ${weekStart}::date
          AND scheduled_date < (${weekStart}::date + INTERVAL '7 days')
        ORDER BY scheduled_date ASC, created_at ASC
      ` as Record<string, unknown>[];
    } else {
      scheduled = await sql`
        SELECT * FROM content_items
        WHERE scheduled_date IS NOT NULL
        ORDER BY scheduled_date ASC, created_at ASC
      ` as Record<string, unknown>[];
    }

    const ideas = await sql`
      SELECT * FROM content_items
      WHERE scheduled_date IS NULL
      ORDER BY created_at DESC
    ` as Record<string, unknown>[];

    return NextResponse.json({
      scheduled: scheduled.map(normItem),
      ideas: ideas.map(normItem),
    });
  } catch (e) {
    console.error("[content GET]", e);
    return NextResponse.json({ scheduled: [], ideas: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, brand, title, platform, scheduledDate, status, notes } = body;

    if (action === "add") {
      const [item] = await sql`
        INSERT INTO content_items (brand, title, platform, scheduled_date, status, notes)
        VALUES (
          ${brand},
          ${title},
          ${platform || null},
          ${scheduledDate || null},
          ${status || "idea"},
          ${notes || null}
        )
        RETURNING *
      `;
      return NextResponse.json({ item: normItem(item as Record<string, unknown>) });
    }

    if (action === "update") {
      const [item] = await sql`
        UPDATE content_items
        SET brand = ${brand},
            title = ${title},
            platform = ${platform || null},
            scheduled_date = ${scheduledDate || null},
            status = ${status || "idea"},
            notes = ${notes || null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ item: normItem(item as Record<string, unknown>) });
    }

    if (action === "status") {
      const [item] = await sql`
        UPDATE content_items SET status = ${status} WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item: normItem(item as Record<string, unknown>) });
    }

    if (action === "schedule") {
      const [item] = await sql`
        UPDATE content_items
        SET scheduled_date = ${scheduledDate}, status = ${status || "idea"}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ item: normItem(item as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM content_items WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[content POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
