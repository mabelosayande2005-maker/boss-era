import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  try {
    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT,
        target_per_week INTEGER DEFAULT 1,
        color TEXT DEFAULT '#b8d4c8',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS habit_completions (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
        completed_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(habit_id, completed_date)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        stream TEXT DEFAULT 'admin',
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        notes TEXT,
        is_today BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS income_entries (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        work_date DATE,
        pay_date DATE,
        gross NUMERIC(10,2),
        tax_fees NUMERIC(10,2) DEFAULT 0,
        net NUMERIC(10,2),
        account TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS mood_logs (
        id SERIAL PRIMARY KEY,
        log_date DATE NOT NULL UNIQUE,
        score INTEGER CHECK (score >= 1 AND score <= 5),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS affirmations (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

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

    const defaultAffirmations = [
      "I am magnetic, brilliant, and completely unstoppable.",
      "Everything I need is already within me.",
      "I am in my boss era and nothing can stop my glow up.",
      "Money flows to me easily and abundantly.",
      "I attract opportunities that align with my highest self.",
      "My consistency is building something incredible.",
      "I deserve all the beautiful things coming my way.",
      "Every day I become more of who I was always meant to be.",
      "I am the main character of my own story.",
      "My dreams are valid and totally achievable.",
      "I radiate confidence, warmth, and magnetic energy.",
      "This summer is changing everything for me.",
    ];

    for (const text of defaultAffirmations) {
      await sql`
        INSERT INTO affirmations (text)
        SELECT ${text}
        WHERE NOT EXISTS (SELECT 1 FROM affirmations WHERE text = ${text})
      `;
    }

    const defaultHabits = [
      { name: "Gym", emoji: "🏋️", target_per_week: 3, color: "#8fada0" },
      { name: "Dance", emoji: "💃", target_per_week: 1, color: "#e8b4b8" },
      { name: "Italian", emoji: "🇮🇹", target_per_week: 2, color: "#c8b8e0" },
      { name: "AI Course", emoji: "🤖", target_per_week: 2, color: "#d4a853" },
      { name: "Sewing", emoji: "🧵", target_per_week: 2, color: "#b8d4c8" },
      { name: "StudyGlow Post", emoji: "✨", target_per_week: 1, color: "#f0d080" },
      { name: "Sunday Planning", emoji: "📅", target_per_week: 1, color: "#deeee8" },
    ];

    for (const h of defaultHabits) {
      await sql`
        INSERT INTO habits (name, emoji, target_per_week, color)
        SELECT ${h.name}, ${h.emoji}, ${h.target_per_week}, ${h.color}
        WHERE NOT EXISTS (SELECT 1 FROM habits WHERE name = ${h.name})
      `;
    }

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
