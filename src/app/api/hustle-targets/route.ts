import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS hustle_targets (
    id SERIAL PRIMARY KEY,
    hustle TEXT NOT NULL,
    target_text TEXT NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    current_count INTEGER NOT NULL DEFAULT 0,
    week_start DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const weekStart = getWeekStart();
    const rows = await sql`
      SELECT * FROM hustle_targets
      WHERE week_start = ${weekStart}
      ORDER BY hustle ASC, created_at ASC
    `;
    return NextResponse.json(
      { targets: rows, weekStart },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[hustle-targets GET]", e);
    return NextResponse.json({ error: String(e), targets: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, hustle, targetText, targetCount } = body;

    if (action === "add") {
      const weekStart = getWeekStart();
      const [row] = await sql`
        INSERT INTO hustle_targets (hustle, target_text, target_count, week_start)
        VALUES (${hustle}, ${targetText}, ${targetCount || 1}, ${weekStart})
        RETURNING *
      `;
      return NextResponse.json({ target: row });
    }

    if (action === "increment") {
      const [row] = await sql`
        UPDATE hustle_targets
        SET current_count = current_count + 1
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ target: row });
    }

    if (action === "decrement") {
      const [row] = await sql`
        UPDATE hustle_targets
        SET current_count = GREATEST(current_count - 1, 0)
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ target: row });
    }

    if (action === "delete") {
      await sql`DELETE FROM hustle_targets WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[hustle-targets POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
