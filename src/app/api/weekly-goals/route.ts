import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS weekly_goals (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
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
      SELECT id, text
      FROM weekly_goals
      WHERE week_start = ${weekStart}
      ORDER BY created_at ASC
    ` as { id: number; text: string }[];
    return NextResponse.json({ goals: rows, weekStart });
  } catch (e) {
    console.error("[weekly-goals GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as { action: string; text?: string; id?: number };

    if (body.action === "add") {
      if (!body.text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      const weekStart = getWeekStart();
      const [goal] = await sql`
        INSERT INTO weekly_goals (text, week_start)
        VALUES (${body.text.trim()}, ${weekStart})
        RETURNING id, text
      ` as { id: number; text: string }[];
      return NextResponse.json({ goal });
    }

    if (body.action === "delete") {
      await sql`DELETE FROM weekly_goals WHERE id = ${body.id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[weekly-goals POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
