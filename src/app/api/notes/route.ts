import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    color TEXT DEFAULT '#deeee8',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    let notes;
    if (tag) {
      notes = await sql`SELECT * FROM notes WHERE tags ILIKE ${'%' + tag + '%'} ORDER BY is_pinned DESC, updated_at DESC`;
    } else {
      notes = await sql`SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC`;
    }
    const allTags = await sql`SELECT DISTINCT UNNEST(STRING_TO_ARRAY(tags, ',')) as tag FROM notes WHERE tags IS NOT NULL ORDER BY tag`;
    return NextResponse.json({ notes, tags: allTags.map(t => (t.tag as string).trim()).filter(Boolean) });
  } catch (e) {
    console.error("[notes GET]", e);
    return NextResponse.json({ notes: [], tags: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add") {
      const { title, content, tags, color } = body;
      const [note] = await sql`
        INSERT INTO notes (title, content, tags, color)
        VALUES (${title}, ${content || null}, ${tags || null}, ${color || "#deeee8"})
        RETURNING *
      `;
      return NextResponse.json({ note });
    }

    if (action === "update") {
      const { title, content, tags, color } = body;
      const [note] = await sql`
        UPDATE notes SET title=${title}, content=${content||null}, tags=${tags||null}, color=${color||"#deeee8"}, updated_at=NOW()
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ note });
    }

    if (action === "toggle-pin") {
      const [n] = await sql`SELECT is_pinned FROM notes WHERE id=${id}`;
      const [note] = await sql`UPDATE notes SET is_pinned=${!n.is_pinned} WHERE id=${id} RETURNING *`;
      return NextResponse.json({ note });
    }

    if (action === "delete") {
      await sql`DELETE FROM notes WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[notes POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
