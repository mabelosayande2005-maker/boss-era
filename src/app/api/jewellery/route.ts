import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();

  await sql`CREATE TABLE IF NOT EXISTS jewellery_inspiration (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`ALTER TABLE jewellery_inspiration ADD COLUMN IF NOT EXISTS label TEXT`;
  await sql`ALTER TABLE jewellery_inspiration ADD COLUMN IF NOT EXISTS notes TEXT`;

  await sql`CREATE TABLE IF NOT EXISTS jewellery_products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`ALTER TABLE jewellery_products ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE jewellery_products ADD COLUMN IF NOT EXISTS materials TEXT`;
  await sql`ALTER TABLE jewellery_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2)`;
  await sql`ALTER TABLE jewellery_products ADD COLUMN IF NOT EXISTS sell_price NUMERIC(10,2)`;

  await sql`CREATE TABLE IF NOT EXISTS jewellery_notes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`ALTER TABLE jewellery_notes ADD COLUMN IF NOT EXISTS body TEXT`;

  await sql`CREATE TABLE IF NOT EXISTS jewellery_checklist (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  // Seed default launch checklist on first use only
  await sql`
    INSERT INTO jewellery_checklist (item, sort_order)
    SELECT t.item, t.ord FROM (VALUES
      ('Research suppliers and material costs', 1),
      ('Define your product range (3–5 hero pieces)', 2),
      ('Calculate pricing and profit margins', 3),
      ('Set up business Instagram and TikTok', 4),
      ('Create an Etsy shop or website', 5),
      ('Order starter materials', 6),
      ('Make first product samples', 7),
      ('Take professional product photos', 8),
      ('Write product descriptions and SEO tags', 9),
      ('Set up payment processing', 10),
      ('Plan your launch announcement', 11)
    ) AS t(item, ord)
    WHERE NOT EXISTS (SELECT 1 FROM jewellery_checklist LIMIT 1)
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const inspiration = await sql`SELECT * FROM jewellery_inspiration ORDER BY created_at DESC`;
    const products    = await sql`SELECT * FROM jewellery_products ORDER BY created_at DESC`;
    const notes       = await sql`SELECT * FROM jewellery_notes ORDER BY updated_at DESC`;
    const checklist   = await sql`SELECT * FROM jewellery_checklist ORDER BY sort_order ASC, created_at ASC`;

    return NextResponse.json({
      inspiration,
      products,
      notes,
      checklist,
      stats: {
        inspirationCount: inspiration.length,
        productCount:     products.length,
        noteCount:        notes.length,
        checklistDone:    checklist.filter(c => c.is_done).length,
        checklistTotal:   checklist.length,
      },
    });
  } catch (e) {
    console.error("[jewellery GET]", e);
    return NextResponse.json(
      { inspiration: [], products: [], notes: [], checklist: [], stats: {}, error: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sql  = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    // ── Inspiration ──────────────────────────────────────────────────────────────
    if (action === "add-inspiration") {
      const { image_url, label, notes } = body;
      const [item] = await sql`
        INSERT INTO jewellery_inspiration (image_url, label, notes)
        VALUES (${image_url}, ${label ?? null}, ${notes ?? null})
        RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "update-inspiration") {
      const { label, notes } = body;
      const [item] = await sql`
        UPDATE jewellery_inspiration SET label = ${label ?? null}, notes = ${notes ?? null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "delete-inspiration") {
      await sql`DELETE FROM jewellery_inspiration WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Products ─────────────────────────────────────────────────────────────────
    if (action === "add-product") {
      const { name, description, materials, cost_price, sell_price } = body;
      const [product] = await sql`
        INSERT INTO jewellery_products (name, description, materials, cost_price, sell_price)
        VALUES (${name}, ${description ?? null}, ${materials ?? null}, ${cost_price ?? null}, ${sell_price ?? null})
        RETURNING *
      `;
      return NextResponse.json({ product });
    }

    if (action === "update-product") {
      const { name, description, materials, cost_price, sell_price } = body;
      const [product] = await sql`
        UPDATE jewellery_products SET
          name = ${name}, description = ${description ?? null}, materials = ${materials ?? null},
          cost_price = ${cost_price ?? null}, sell_price = ${sell_price ?? null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ product });
    }

    if (action === "delete-product") {
      await sql`DELETE FROM jewellery_products WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Research Notes ────────────────────────────────────────────────────────────
    if (action === "add-note") {
      const { title, body: noteBody } = body;
      const [note] = await sql`
        INSERT INTO jewellery_notes (title, body)
        VALUES (${title}, ${noteBody ?? null})
        RETURNING *
      `;
      return NextResponse.json({ note });
    }

    if (action === "update-note") {
      const { title, body: noteBody } = body;
      const [note] = await sql`
        UPDATE jewellery_notes SET title = ${title}, body = ${noteBody ?? null}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ note });
    }

    if (action === "delete-note") {
      await sql`DELETE FROM jewellery_notes WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Checklist ─────────────────────────────────────────────────────────────────
    if (action === "add-item") {
      const { item: itemText } = body;
      const [max] = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM jewellery_checklist`;
      const [item] = await sql`
        INSERT INTO jewellery_checklist (item, sort_order)
        VALUES (${itemText}, ${(max.m as number) + 1})
        RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "toggle-item") {
      const [cur] = await sql`SELECT is_done FROM jewellery_checklist WHERE id = ${id}`;
      if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const [item] = await sql`UPDATE jewellery_checklist SET is_done = ${!cur.is_done} WHERE id = ${id} RETURNING *`;
      return NextResponse.json({ item });
    }

    if (action === "delete-item") {
      await sql`DELETE FROM jewellery_checklist WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[jewellery POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
