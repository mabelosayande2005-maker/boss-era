import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

const SEED_CATEGORIES = [
  { name: "Digital Business",     color: "#e8b4b8", sort_order: 1  },
  { name: "Financial Management", color: "#d4a853", sort_order: 2  },
  { name: "Visualising Data",     color: "#8fada0", sort_order: 3  },
  { name: "Algorithmic Thinking", color: "#c8b8e0", sort_order: 4  },
  { name: "Placement",            color: "#7060a0", sort_order: 5  },
  { name: "Content",              color: "#e8b4b8", sort_order: 6  },
  { name: "Hobby",                color: "#d4a853", sort_order: 7  },
  { name: "TikTok Shop",          color: "#b06070", sort_order: 8  },
  { name: "UGC",                  color: "#c8b8e0", sort_order: 9  },
  { name: "Tutoring",             color: "#4ab89a", sort_order: 10 },
  { name: "Agency shifts",        color: "#c4785a", sort_order: 11 },
];

async function ensureTables() {
  const sql = getDb();

  await sql`CREATE TABLE IF NOT EXISTS weekly_goal_categories (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL DEFAULT '#8fada0',
    sort_order INTEGER DEFAULT 0
  )`;

  await sql`CREATE TABLE IF NOT EXISTS weekly_goals (
    id         SERIAL PRIMARY KEY,
    text       TEXT NOT NULL,
    week_start DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  await sql`ALTER TABLE weekly_goals ADD COLUMN IF NOT EXISTS category TEXT`;

  // One-time migration: remove the old single "Uni" category
  await sql`UPDATE weekly_goals SET category = NULL WHERE category = 'Uni'`;
  await sql`DELETE FROM weekly_goal_categories WHERE name = 'Uni'`;

  for (const cat of SEED_CATEGORIES) {
    await sql`
      INSERT INTO weekly_goal_categories (name, color, sort_order)
      VALUES (${cat.name}, ${cat.color}, ${cat.sort_order})
      ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, color = EXCLUDED.color
    `;
  }
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const weekStart = getWeekStart();

    const rows = await sql`
      SELECT id, text, category
      FROM weekly_goals
      WHERE week_start = ${weekStart}
      ORDER BY created_at ASC
    ` as { id: number; text: string; category: string | null }[];

    const categories = await sql`
      SELECT id, name, color
      FROM weekly_goal_categories
      ORDER BY sort_order ASC, id ASC
    ` as { id: number; name: string; color: string }[];

    return NextResponse.json({ goals: rows, categories, weekStart });
  } catch (e) {
    console.error("[weekly-goals GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as Record<string, unknown>;
    const { action } = body as { action: string };

    // ── goals ────────────────────────────────────────────────────────────────

    if (action === "add") {
      const { text, category } = body as { text: string; category?: string | null };
      if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
      const weekStart = getWeekStart();
      const [goal] = await sql`
        INSERT INTO weekly_goals (text, week_start, category)
        VALUES (${text.trim()}, ${weekStart}, ${category || null})
        RETURNING id, text, category
      ` as { id: number; text: string; category: string | null }[];
      return NextResponse.json({ goal });
    }

    if (action === "delete") {
      const { id } = body as { id: number };
      await sql`DELETE FROM weekly_goals WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "set_category") {
      const { id, category } = body as { id: number; category: string | null };
      const [goal] = await sql`
        UPDATE weekly_goals SET category = ${category || null} WHERE id = ${id}
        RETURNING id, text, category
      ` as { id: number; text: string; category: string | null }[];
      return NextResponse.json({ goal });
    }

    // ── categories ────────────────────────────────────────────────────────────

    if (action === "add_category") {
      const { name, color } = body as { name: string; color?: string };
      if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
      const [category] = await sql`
        INSERT INTO weekly_goal_categories (name, color, sort_order)
        VALUES (
          ${name.trim()},
          ${color || "#8fada0"},
          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM weekly_goal_categories)
        )
        RETURNING id, name, color
      ` as { id: number; name: string; color: string }[];
      return NextResponse.json({ category });
    }

    if (action === "rename_category") {
      const { id, newName } = body as { id: number; newName: string };
      if (!newName?.trim()) return NextResponse.json({ error: "newName required" }, { status: 400 });
      const [old] = await sql`SELECT name FROM weekly_goal_categories WHERE id = ${id}` as { name: string }[];
      if (!old) return NextResponse.json({ error: "not found" }, { status: 404 });
      await sql`UPDATE weekly_goal_categories SET name = ${newName.trim()} WHERE id = ${id}`;
      await sql`UPDATE weekly_goals SET category = ${newName.trim()} WHERE category = ${old.name}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_category") {
      const { id } = body as { id: number };
      const [cat] = await sql`SELECT name FROM weekly_goal_categories WHERE id = ${id}` as { name: string }[];
      if (cat) await sql`UPDATE weekly_goals SET category = null WHERE category = ${cat.name}`;
      await sql`DELETE FROM weekly_goal_categories WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[weekly-goals POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
