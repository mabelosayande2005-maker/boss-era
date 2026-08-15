import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  // emoji removed from DEFAULT in DDL — embedded emoji in SQL strings can cause encoding
  // issues in some environments; the value is always supplied explicitly from application code.
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
    emoji TEXT,
    is_favourite BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_mins INTEGER`;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS photo_url TEXT`;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const fav = searchParams.get("fav");
    const recipes = fav === "true"
      ? await sql`SELECT * FROM recipes WHERE is_favourite = TRUE ORDER BY created_at DESC`
      : await sql`SELECT * FROM recipes ORDER BY is_favourite DESC, created_at DESC`;
    return NextResponse.json({ recipes });
  } catch (e) {
    console.error("[cookbook GET]", e);
    return NextResponse.json({ recipes: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add") {
      const { title, description, photo_url, prepTimeMins, cookTimeMins, ingredients, method, notes } = body;
      const [recipe] = await sql`
        INSERT INTO recipes (title, description, photo_url, prep_time_mins, cook_time_mins, ingredients, method, notes)
        VALUES (
          ${title},
          ${description ?? null},
          ${photo_url ?? null},
          ${prepTimeMins ?? null},
          ${cookTimeMins ?? null},
          ${ingredients ?? null},
          ${method ?? null},
          ${notes ?? null}
        )
        RETURNING *
      `;
      return NextResponse.json({ recipe });
    }

    if (action === "update") {
      const { title, description, photo_url, prepTimeMins, cookTimeMins, ingredients, method, notes } = body;
      const [recipe] = await sql`
        UPDATE recipes SET
          title = ${title},
          description = ${description ?? null},
          photo_url = ${photo_url ?? null},
          prep_time_mins = ${prepTimeMins ?? null},
          cook_time_mins = ${cookTimeMins ?? null},
          ingredients = ${ingredients ?? null},
          method = ${method ?? null},
          notes = ${notes ?? null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ recipe });
    }

    if (action === "toggle-fav") {
      const [r] = await sql`SELECT is_favourite FROM recipes WHERE id = ${id}`;
      if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const [recipe] = await sql`UPDATE recipes SET is_favourite = ${!r.is_favourite} WHERE id = ${id} RETURNING *`;
      return NextResponse.json({ recipe });
    }

    if (action === "delete") {
      await sql`DELETE FROM recipes WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[cookbook POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
