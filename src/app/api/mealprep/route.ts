import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS mp_stock (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'fridge',
      quantity    TEXT NOT NULL DEFAULT '',
      expiry_date TEXT,
      used        BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order  INT DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mp_recipes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      emoji      TEXT NOT NULL DEFAULT '🍽️',
      sort_order INT DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mp_recipe_ingredients (
      id         SERIAL PRIMARY KEY,
      recipe_id  TEXT REFERENCES mp_recipes(id) ON DELETE CASCADE,
      ingredient TEXT NOT NULL,
      sort_order INT DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mp_meal_plan (
      day       TEXT PRIMARY KEY,
      text      TEXT NOT NULL,
      recipe_id TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mp_shopping (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      checked    BOOLEAN NOT NULL DEFAULT FALSE,
      from_meal  TEXT,
      sort_order INT DEFAULT 0
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const [stockRows, recipeRows, ingredientRows, mealPlanRows, shoppingRows] = await Promise.all([
      sql`SELECT id, name, category, quantity, expiry_date, used FROM mp_stock ORDER BY sort_order ASC, id ASC`,
      sql`SELECT id, title, emoji FROM mp_recipes ORDER BY sort_order ASC, id ASC`,
      sql`SELECT recipe_id, ingredient FROM mp_recipe_ingredients ORDER BY recipe_id, sort_order ASC`,
      sql`SELECT day, text, recipe_id FROM mp_meal_plan`,
      sql`SELECT id, name, checked, from_meal FROM mp_shopping ORDER BY sort_order ASC, id ASC`,
    ]);

    const recipes = recipeRows.map(r => ({
      id: r.id as string,
      title: r.title as string,
      emoji: r.emoji as string,
      ingredients: (ingredientRows as { recipe_id: string; ingredient: string }[])
        .filter(i => i.recipe_id === r.id)
        .map(i => i.ingredient),
    }));

    const mealPlan: Record<string, { text: string; recipeId?: string }> = {};
    for (const row of mealPlanRows) {
      mealPlan[row.day as string] = {
        text: row.text as string,
        ...(row.recipe_id ? { recipeId: row.recipe_id as string } : {}),
      };
    }

    return NextResponse.json({
      stock: stockRows.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        quantity: s.quantity,
        expiryDate: s.expiry_date ?? undefined,
        used: s.used,
      })),
      recipes,
      mealPlan,
      shopping: shoppingRows.map(s => ({
        id: s.id,
        name: s.name,
        checked: s.checked,
        fromMeal: s.from_meal ?? undefined,
      })),
    });
  } catch (e) {
    console.error("[mealprep GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as Record<string, unknown>;
    const { action } = body as { action: string };

    // ── Stock ─────────────────────────────────────────────────────────────────

    if (action === "add_stock") {
      const { id, name, category, quantity, expiryDate } = body as {
        id: string; name: string; category: string; quantity: string; expiryDate?: string;
      };
      const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM mp_stock` as { next: number }[];
      await sql`
        INSERT INTO mp_stock (id, name, category, quantity, expiry_date, sort_order)
        VALUES (${id}, ${name}, ${category}, ${quantity}, ${expiryDate ?? null}, ${maxOrder[0].next})
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle_used") {
      const { id, used } = body as { id: string; used: boolean };
      await sql`UPDATE mp_stock SET used = ${used} WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_stock") {
      const { id } = body as { id: string };
      await sql`DELETE FROM mp_stock WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    // ── Recipes ───────────────────────────────────────────────────────────────

    if (action === "add_recipe") {
      const { id, title, emoji, ingredients } = body as {
        id: string; title: string; emoji: string; ingredients: string[];
      };
      const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM mp_recipes` as { next: number }[];
      await sql`
        INSERT INTO mp_recipes (id, title, emoji, sort_order)
        VALUES (${id}, ${title}, ${emoji}, ${maxOrder[0].next})
        ON CONFLICT (id) DO NOTHING
      `;
      for (let i = 0; i < ingredients.length; i++) {
        await sql`
          INSERT INTO mp_recipe_ingredients (recipe_id, ingredient, sort_order)
          VALUES (${id}, ${ingredients[i]}, ${i})
        `;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_recipe") {
      const { id } = body as { id: string };
      await sql`DELETE FROM mp_recipes WHERE id = ${id}`;
      // Unlink meal plan entries that referenced this recipe
      await sql`UPDATE mp_meal_plan SET recipe_id = NULL WHERE recipe_id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    // ── Meal plan ─────────────────────────────────────────────────────────────

    if (action === "set_day_meal") {
      const { day, text, recipeId } = body as { day: string; text: string; recipeId?: string };
      await sql`
        INSERT INTO mp_meal_plan (day, text, recipe_id)
        VALUES (${day}, ${text}, ${recipeId ?? null})
        ON CONFLICT (day) DO UPDATE SET text = EXCLUDED.text, recipe_id = EXCLUDED.recipe_id
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "clear_day_meal") {
      const { day } = body as { day: string };
      await sql`DELETE FROM mp_meal_plan WHERE day = ${day}`;
      return NextResponse.json({ ok: true });
    }

    // ── Shopping ──────────────────────────────────────────────────────────────

    if (action === "add_shopping") {
      const { id, name, fromMeal } = body as { id: string; name: string; fromMeal?: string };
      const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM mp_shopping` as { next: number }[];
      await sql`
        INSERT INTO mp_shopping (id, name, checked, from_meal, sort_order)
        VALUES (${id}, ${name}, FALSE, ${fromMeal ?? null}, ${maxOrder[0].next})
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk_add_shopping") {
      const { items } = body as { items: { id: string; name: string; fromMeal?: string }[] };
      const maxOrderRes = await sql`SELECT COALESCE(MAX(sort_order), -1) AS mx FROM mp_shopping` as { mx: number }[];
      let nextOrder = (maxOrderRes[0].mx ?? -1) + 1;
      for (const item of items) {
        await sql`
          INSERT INTO mp_shopping (id, name, checked, from_meal, sort_order)
          VALUES (${item.id}, ${item.name}, FALSE, ${item.fromMeal ?? null}, ${nextOrder++})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle_shopping") {
      const { id, checked } = body as { id: string; checked: boolean };
      await sql`UPDATE mp_shopping SET checked = ${checked} WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_shopping") {
      const { id } = body as { id: string };
      await sql`DELETE FROM mp_shopping WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "clear_checked_shopping") {
      await sql`DELETE FROM mp_shopping WHERE checked = TRUE`;
      return NextResponse.json({ ok: true });
    }

    // ── Bulk migration from localStorage ──────────────────────────────────────

    if (action === "migrate") {
      const { stock, recipes, mealPlan, shopping } = body as {
        stock: { id: string; name: string; category: string; quantity: string; expiryDate?: string; used: boolean }[];
        recipes: { id: string; title: string; emoji: string; ingredients: string[] }[];
        mealPlan: Record<string, { text: string; recipeId?: string }>;
        shopping: { id: string; name: string; checked: boolean; fromMeal?: string }[];
      };

      for (let i = 0; i < stock.length; i++) {
        const s = stock[i];
        await sql`
          INSERT INTO mp_stock (id, name, category, quantity, expiry_date, used, sort_order)
          VALUES (${s.id}, ${s.name}, ${s.category}, ${s.quantity}, ${s.expiryDate ?? null}, ${s.used}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i];
        await sql`
          INSERT INTO mp_recipes (id, title, emoji, sort_order)
          VALUES (${r.id}, ${r.title}, ${r.emoji}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
        for (let j = 0; j < r.ingredients.length; j++) {
          await sql`
            INSERT INTO mp_recipe_ingredients (recipe_id, ingredient, sort_order)
            VALUES (${r.id}, ${r.ingredients[j]}, ${j})
          `;
        }
      }

      for (const [day, meal] of Object.entries(mealPlan)) {
        await sql`
          INSERT INTO mp_meal_plan (day, text, recipe_id)
          VALUES (${day}, ${meal.text}, ${meal.recipeId ?? null})
          ON CONFLICT (day) DO NOTHING
        `;
      }

      for (let i = 0; i < shopping.length; i++) {
        const s = shopping[i];
        await sql`
          INSERT INTO mp_shopping (id, name, checked, from_meal, sort_order)
          VALUES (${s.id}, ${s.name}, ${s.checked}, ${s.fromMeal ?? null}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[mealprep POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
