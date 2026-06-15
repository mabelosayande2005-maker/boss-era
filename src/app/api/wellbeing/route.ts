import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS wellbeing_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL UNIQUE,
    mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    sleep_hours NUMERIC(3,1),
    water_glasses INTEGER DEFAULT 0,
    anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 5),
    journal_entry TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "7");
    const logs = await sql`
      SELECT * FROM wellbeing_logs
      ORDER BY log_date DESC
      LIMIT ${days}
    `;
    const today = new Date().toISOString().split("T")[0];
    const [todayLog] = await sql`SELECT * FROM wellbeing_logs WHERE log_date = ${today}`;
    return NextResponse.json({ logs, todayLog: todayLog || null });
  } catch (e) {
    return NextResponse.json({ logs: [], todayLog: null, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action } = body;

    if (action === "log") {
      const { moodScore, energyLevel, sleepHours, waterGlasses, anxietyLevel, journalEntry } = body;
      const today = new Date().toISOString().split("T")[0];
      const [log] = await sql`
        INSERT INTO wellbeing_logs (log_date, mood_score, energy_level, sleep_hours, water_glasses, anxiety_level, journal_entry)
        VALUES (${today}, ${moodScore || null}, ${energyLevel || null}, ${sleepHours || null}, ${waterGlasses ?? 0}, ${anxietyLevel || null}, ${journalEntry || null})
        ON CONFLICT (log_date) DO UPDATE SET
          mood_score = EXCLUDED.mood_score,
          energy_level = EXCLUDED.energy_level,
          sleep_hours = EXCLUDED.sleep_hours,
          water_glasses = EXCLUDED.water_glasses,
          anxiety_level = EXCLUDED.anxiety_level,
          journal_entry = EXCLUDED.journal_entry
        RETURNING *
      `;
      return NextResponse.json({ log });
    }

    if (action === "water") {
      const { glasses } = body;
      const today = new Date().toISOString().split("T")[0];
      const [log] = await sql`
        INSERT INTO wellbeing_logs (log_date, water_glasses)
        VALUES (${today}, ${glasses})
        ON CONFLICT (log_date) DO UPDATE SET water_glasses = ${glasses}
        RETURNING *
      `;
      return NextResponse.json({ log });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
