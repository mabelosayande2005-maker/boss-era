import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    const today = new Date().toISOString().split("T")[0];
    const [mood] = await sql`SELECT * FROM mood_logs WHERE log_date = ${today}`;
    return NextResponse.json({ mood: mood || null });
  } catch {
    return NextResponse.json({ mood: null });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    const { score, note } = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const [mood] = await sql`
      INSERT INTO mood_logs (log_date, score, note)
      VALUES (${today}, ${score}, ${note || null})
      ON CONFLICT (log_date) DO UPDATE SET score = ${score}, note = ${note || null}
      RETURNING *
    `;
    return NextResponse.json({ mood });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
