import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      brand TEXT,
      color TEXT,
      photo_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wardrobe_outfits (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wardrobe_outfit_items (
      outfit_id INTEGER REFERENCES wardrobe_outfits(id) ON DELETE CASCADE,
      item_id   INTEGER REFERENCES wardrobe_items(id)   ON DELETE CASCADE,
      PRIMARY KEY (outfit_id, item_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS makeup_looks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      occasion TEXT DEFAULT 'Everyday',
      photo_url TEXT,
      products TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const items      = await sql`SELECT * FROM wardrobe_items ORDER BY category, created_at DESC`;
    const outfits    = await sql`SELECT * FROM wardrobe_outfits ORDER BY created_at DESC`;
    const outfitRows = await sql`
      SELECT oi.outfit_id, wi.id, wi.name, wi.category, wi.brand, wi.color, wi.photo_url, wi.notes
      FROM wardrobe_outfit_items oi
      JOIN wardrobe_items wi ON wi.id = oi.item_id
    `;
    const makeupLooks = await sql`SELECT * FROM makeup_looks ORDER BY created_at DESC`;

    const outfitsWithItems = outfits.map((o) => ({
      ...o,
      items: outfitRows.filter((r) => r.outfit_id === o.id),
    }));

    return NextResponse.json({
      items,
      outfits: outfitsWithItems,
      makeupLooks,
      stats: {
        totalItems:  items.length,
        outfitCount: outfits.length,
        makeupCount: makeupLooks.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ items: [], outfits: [], makeupLooks: [], stats: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql  = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    // ── Wardrobe items ──────────────────────────────────────────────────────────
    if (action === "add-item") {
      const { name, category, brand, color, photoUrl, notes } = body;
      const [item] = await sql`
        INSERT INTO wardrobe_items (name, category, brand, color, photo_url, notes)
        VALUES (${name}, ${category || "Other"}, ${brand || null}, ${color || null}, ${photoUrl || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "update-item") {
      const { name, category, brand, color, photoUrl, notes } = body;
      const [item] = await sql`
        UPDATE wardrobe_items SET
          name = ${name}, category = ${category || "Other"}, brand = ${brand || null},
          color = ${color || null}, photo_url = ${photoUrl || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "delete-item") {
      await sql`DELETE FROM wardrobe_items WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Outfits ─────────────────────────────────────────────────────────────────
    if (action === "add-outfit") {
      const { name, itemIds, notes } = body;
      const [outfit] = await sql`
        INSERT INTO wardrobe_outfits (name, notes) VALUES (${name}, ${notes || null}) RETURNING *
      `;
      for (const itemId of (itemIds ?? [])) {
        await sql`INSERT INTO wardrobe_outfit_items (outfit_id, item_id) VALUES (${outfit.id}, ${itemId})`;
      }
      return NextResponse.json({ outfit });
    }

    if (action === "delete-outfit") {
      await sql`DELETE FROM wardrobe_outfits WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Makeup looks ────────────────────────────────────────────────────────────
    if (action === "add-makeup") {
      const { name, occasion, photoUrl, products, notes } = body;
      const [look] = await sql`
        INSERT INTO makeup_looks (name, occasion, photo_url, products, notes)
        VALUES (${name}, ${occasion || "Everyday"}, ${photoUrl || null}, ${products || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ look });
    }

    if (action === "update-makeup") {
      const { name, occasion, photoUrl, products, notes } = body;
      const [look] = await sql`
        UPDATE makeup_looks SET
          name = ${name}, occasion = ${occasion || "Everyday"},
          photo_url = ${photoUrl || null}, products = ${products || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ look });
    }

    if (action === "delete-makeup") {
      await sql`DELETE FROM makeup_looks WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
