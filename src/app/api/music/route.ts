import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS music_entries (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'song',
    title TEXT NOT NULL,
    artist TEXT,
    mood TEXT DEFAULT 'Vibing',
    notes TEXT,
    log_date DATE DEFAULT CURRENT_DATE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS music_playlists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    mood TEXT DEFAULT 'Vibing',
    emoji TEXT DEFAULT '🎵',
    link TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const entries = await sql`SELECT * FROM music_entries ORDER BY is_pinned DESC, log_date DESC, created_at DESC`;
    const playlists = await sql`SELECT * FROM music_playlists ORDER BY mood ASC, created_at DESC`;
    return NextResponse.json({ entries, playlists });
  } catch (e) {
    return NextResponse.json({ entries: [], playlists: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-entry") {
      const { type, title, artist, mood, notes, logDate } = body;
      const [entry] = await sql`
        INSERT INTO music_entries (type, title, artist, mood, notes, log_date)
        VALUES (${type || "song"}, ${title}, ${artist || null}, ${mood || "Vibing"}, ${notes || null}, ${logDate || null})
        RETURNING *
      `;
      return NextResponse.json({ entry });
    }

    if (action === "toggle-pin") {
      const [e] = await sql`SELECT is_pinned FROM music_entries WHERE id=${id}`;
      const [entry] = await sql`UPDATE music_entries SET is_pinned=${!e.is_pinned} WHERE id=${id} RETURNING *`;
      return NextResponse.json({ entry });
    }

    if (action === "delete-entry") {
      await sql`DELETE FROM music_entries WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-playlist") {
      const { name, mood, emoji, link, notes } = body;
      const [pl] = await sql`
        INSERT INTO music_playlists (name, mood, emoji, link, notes)
        VALUES (${name}, ${mood || "Vibing"}, ${emoji || "🎵"}, ${link || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ playlist: pl });
    }

    if (action === "delete-playlist") {
      await sql`DELETE FROM music_playlists WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
