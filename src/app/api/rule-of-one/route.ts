import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns today's date in Europe/London time as YYYY-MM-DD.
// Using en-CA locale because it produces YYYY-MM-DD format reliably.
function todayUK(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

async function ensureTables() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS rule_of_one_categories (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rule_of_one_options (
      id          SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES rule_of_one_categories(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      sort_order  INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rule_of_one_picks (
      id            SERIAL PRIMARY KEY,
      pick_date     DATE NOT NULL,
      category_id   INTEGER REFERENCES rule_of_one_categories(id) ON DELETE SET NULL,
      category_name TEXT NOT NULL,
      option_id     INTEGER REFERENCES rule_of_one_options(id) ON DELETE SET NULL,
      option_label  TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `;

  // Partial unique index: one pick per live category per day.
  // NULL category_id rows (deleted categories) are exempt so past picks survive.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS rop_picks_date_cat_idx
      ON rule_of_one_picks (pick_date, category_id)
      WHERE category_id IS NOT NULL
  `;
}

const SEED_CATEGORIES = [
  { name: "Work",       sort_order: 1, options: ["TikTok Shop", "UGC", "Agency shift", "iDirect", "Tutoring", "Placement applications"] },
  { name: "Uni module", sort_order: 2, options: ["Analytics Implementation II: Visualising Data", "Business Analytics Programming II: Algorithmic Thinking", "Digital Business", "Financial Management"] },
  { name: "Content",    sort_order: 3, options: ["studyglow", "That Girl Mabel", "Boss Era"] },
  { name: "Hobby",      sort_order: 4, options: ["Gym", "Dance", "Diamond art", "Making my magazine"] },
  { name: "Extra",      sort_order: 5, options: ["Xtern", "Vinted"] },
];

async function seed() {
  const sql = getDb();
  for (const cat of SEED_CATEGORIES) {
    const [row] = await sql`
      INSERT INTO rule_of_one_categories (name, sort_order)
      VALUES (${cat.name}, ${cat.sort_order})
      ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order
      RETURNING id
    `;
    for (let i = 0; i < cat.options.length; i++) {
      await sql`
        INSERT INTO rule_of_one_options (category_id, label, sort_order)
        SELECT ${row.id}, ${cat.options[i]}, ${i}
        WHERE NOT EXISTS (
          SELECT 1 FROM rule_of_one_options
          WHERE category_id = ${row.id} AND label = ${cat.options[i]}
        )
      `;
    }
  }
}

export async function GET() {
  try {
    await ensureTables();
    const sql = getDb();

    const today = todayUK();

    const categories = await sql`
      SELECT id, name, sort_order
      FROM rule_of_one_categories
      ORDER BY sort_order ASC, id ASC
    `;

    const options = await sql`
      SELECT id, category_id, label, sort_order
      FROM rule_of_one_options
      ORDER BY sort_order ASC, id ASC
    `;

    const picks = await sql`
      SELECT category_id, category_name, option_id, option_label
      FROM rule_of_one_picks
      WHERE pick_date = ${today}
        AND category_id IS NOT NULL
    `;

    // Shape: [{ id, name, sort_order, options: [...] }]
    const categoriesWithOptions = categories.map(cat => ({
      id:         cat.id as number,
      name:       cat.name as string,
      sort_order: cat.sort_order as number,
      options:    options
        .filter(o => o.category_id === cat.id)
        .map(o => ({ id: o.id as number, label: o.label as string, sort_order: o.sort_order as number })),
    }));

    // Shape: { [categoryId]: { option_id, option_label } }
    const picksMap: Record<number, { option_id: number | null; option_label: string }> = {};
    for (const p of picks) {
      if (p.category_id != null) {
        picksMap[p.category_id as number] = {
          option_id:    p.option_id as number | null,
          option_label: p.option_label as string,
        };
      }
    }

    return NextResponse.json({
      today,
      categories: categoriesWithOptions,
      picks:      picksMap,
    });
  } catch (e) {
    console.error("[rule-of-one GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const sql = getDb();
    const body = await req.json();
    const { action } = body;

    // ── pick ─────────────────────────────────────────────────────────────────
    if (action === "pick") {
      const { categoryId, categoryName, optionId, optionLabel } = body as {
        categoryId: number;
        categoryName: string;
        optionId: number;
        optionLabel: string;
      };
      const today = todayUK();
      // ON CONFLICT must include the partial index predicate so Postgres
      // knows which index to target.
      const [pick] = await sql`
        INSERT INTO rule_of_one_picks
          (pick_date, category_id, category_name, option_id, option_label)
        VALUES
          (${today}, ${categoryId}, ${categoryName}, ${optionId}, ${optionLabel})
        ON CONFLICT (pick_date, category_id) WHERE category_id IS NOT NULL
        DO UPDATE SET
          option_id    = EXCLUDED.option_id,
          option_label = EXCLUDED.option_label
        RETURNING *
      `;
      return NextResponse.json({ pick });
    }

    // ── clear_pick ───────────────────────────────────────────────────────────
    if (action === "clear_pick") {
      const { categoryId } = body as { categoryId: number };
      const today = todayUK();
      await sql`
        DELETE FROM rule_of_one_picks
        WHERE pick_date = ${today} AND category_id = ${categoryId}
      `;
      return NextResponse.json({ ok: true });
    }

    // ── add_option ───────────────────────────────────────────────────────────
    if (action === "add_option") {
      const { categoryId, label } = body as { categoryId: number; label: string };
      const [option] = await sql`
        INSERT INTO rule_of_one_options (category_id, label, sort_order)
        VALUES (
          ${categoryId},
          ${label.trim()},
          (SELECT COALESCE(MAX(sort_order), -1) + 1
           FROM rule_of_one_options WHERE category_id = ${categoryId})
        )
        RETURNING *
      `;
      return NextResponse.json({ option });
    }

    // ── rename_option ────────────────────────────────────────────────────────
    if (action === "rename_option") {
      const { optionId, label } = body as { optionId: number; label: string };
      const [option] = await sql`
        UPDATE rule_of_one_options
        SET label = ${label.trim()}
        WHERE id = ${optionId}
        RETURNING *
      `;
      return NextResponse.json({ option });
    }

    // ── delete_option ────────────────────────────────────────────────────────
    if (action === "delete_option") {
      const { optionId } = body as { optionId: number };
      // Picks that reference this option keep their option_label; option_id goes NULL.
      await sql`DELETE FROM rule_of_one_options WHERE id = ${optionId}`;
      return NextResponse.json({ ok: true });
    }

    // ── add_category ─────────────────────────────────────────────────────────
    if (action === "add_category") {
      const { name } = body as { name: string };
      const [category] = await sql`
        INSERT INTO rule_of_one_categories (name, sort_order)
        VALUES (
          ${name.trim()},
          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM rule_of_one_categories)
        )
        RETURNING *
      `;
      return NextResponse.json({ category });
    }

    // ── delete_category ──────────────────────────────────────────────────────
    if (action === "delete_category") {
      const { categoryId } = body as { categoryId: number };
      // Options cascade-delete. Picks' category_id goes NULL (ON DELETE SET NULL).
      await sql`DELETE FROM rule_of_one_categories WHERE id = ${categoryId}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[rule-of-one POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
