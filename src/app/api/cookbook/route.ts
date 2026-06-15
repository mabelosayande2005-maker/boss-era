import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cuisine TEXT DEFAULT 'Other',
    cook_time_mins INTEGER,
    difficulty TEXT DEFAULT 'Easy',
    ingredients TEXT,
    method TEXT,
    notes TEXT,
    emoji TEXT DEFAULT '🍽️',
    is_favourite BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const cuisine = searchParams.get("cuisine");
    const fav = searchParams.get("fav");
    let recipes;
    if (cuisine && cuisine !== "All") {
      recipes = await sql`SELECT * FROM recipes WHERE cuisine=${cuisine} ORDER BY is_favourite DESC, created_at DESC`;
    } else if (fav === "true") {
      recipes = await sql`SELECT * FROM recipes WHERE is_favourite=TRUE ORDER BY created_at DESC`;
    } else {
      recipes = await sql`SELECT * FROM recipes ORDER BY is_favourite DESC, created_at DESC`;
    }
    const cuisines = await sql`SELECT DISTINCT cuisine FROM recipes ORDER BY cuisine`;
    return NextResponse.json({ recipes, cuisines: cuisines.map(c => c.cuisine) });
  } catch (e) {
    return NextResponse.json({ recipes: [], cuisines: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add") {
      const { title, description, cuisine, cookTimeMins, difficulty, ingredients, method, notes, emoji } = body;
      const [recipe] = await sql`
        INSERT INTO recipes (title, description, cuisine, cook_time_mins, difficulty, ingredients, method, notes, emoji)
        VALUES (${title}, ${description || null}, ${cuisine || "Other"}, ${cookTimeMins || null}, ${difficulty || "Easy"}, ${ingredients || null}, ${method || null}, ${notes || null}, ${emoji || "🍽️"})
        RETURNING *
      `;
      return NextResponse.json({ recipe });
    }

    if (action === "update") {
      const { title, description, cuisine, cookTimeMins, difficulty, ingredients, method, notes, emoji } = body;
      const [recipe] = await sql`
        UPDATE recipes SET title=${title}, description=${description||null}, cuisine=${cuisine||"Other"},
          cook_time_mins=${cookTimeMins||null}, difficulty=${difficulty||"Easy"},
          ingredients=${ingredients||null}, method=${method||null}, notes=${notes||null}, emoji=${emoji||"🍽️"}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ recipe });
    }

    if (action === "toggle-fav") {
      const [r] = await sql`SELECT is_favourite FROM recipes WHERE id=${id}`;
      const [recipe] = await sql`UPDATE recipes SET is_favourite=${!r.is_favourite} WHERE id=${id} RETURNING *`;
      return NextResponse.json({ recipe });
    }

    if (action === "delete") {
      await sql`DELETE FROM recipes WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
