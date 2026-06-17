import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS mood_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL UNIQUE,
    score INTEGER CHECK (score >= 1 AND score <= 5),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const today = new Date().toISOString().split("T")[0];
    const [mood] = await sql`SELECT * FROM mood_logs WHERE log_date = ${today}`;
    return NextResponse.json({ mood: mood ? { ...mood, log_date: norm(mood.log_date) } : null });
  } catch (e) {
    console.error("[mood GET]", e);
    return NextResponse.json({ mood: null });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { score, note } = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const [mood] = await sql`
      INSERT INTO mood_logs (log_date, score, note)
      VALUES (${today}, ${score}, ${note || null})
      ON CONFLICT (log_date) DO UPDATE SET score = ${score}, note = ${note || null}
      RETURNING *
    `;
    return NextResponse.json({ mood: { ...mood, log_date: norm(mood.log_date) } });
  } catch (e) {
    console.error("[mood POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
