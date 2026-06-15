import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart"); // YYYY-MM-DD

    // Ensure table exists
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

    let scheduled: Record<string, unknown>[] = [];
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

    return NextResponse.json({ scheduled, ideas });
  } catch (e) {
    return NextResponse.json({ scheduled: [], ideas: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
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
      return NextResponse.json({ item });
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
      return NextResponse.json({ item });
    }

    if (action === "status") {
      // Quick status bump
      const [item] = await sql`
        UPDATE content_items SET status = ${status} WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "schedule") {
      // Promote an idea to the calendar by assigning a date
      const [item] = await sql`
        UPDATE content_items
        SET scheduled_date = ${scheduledDate}, status = ${status || "idea"}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "delete") {
      await sql`DELETE FROM content_items WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
