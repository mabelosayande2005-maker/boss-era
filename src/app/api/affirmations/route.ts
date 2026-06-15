import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    const affirmations = await sql`SELECT text FROM affirmations WHERE is_active = TRUE` as {text: string}[];
    if (affirmations.length === 0) {
      return NextResponse.json({ daily: null, all: [] });
    }
    // Pick one deterministically based on day of year
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const idx = dayOfYear % affirmations.length;
    return NextResponse.json({ daily: affirmations[idx].text, all: affirmations.map(a => a.text) });
  } catch {
    const fallback = [
      "I am magnetic, brilliant, and completely unstoppable.",
      "I am in my boss era and nothing can stop my glow up.",
      "Everything I need is already within me.",
      "Money flows to me easily and abundantly.",
    ];
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return NextResponse.json({ daily: fallback[dayOfYear % fallback.length], all: fallback });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    const { text } = await req.json();
    const [aff] = await sql`INSERT INTO affirmations (text) VALUES (${text}) RETURNING *`;
    return NextResponse.json({ affirmation: aff });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
