import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS vinted_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      brand TEXT,
      purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      listing_price NUMERIC(10,2),
      sale_price NUMERIC(10,2),
      date_purchased DATE,
      date_listed DATE,
      date_sold DATE,
      status TEXT DEFAULT 'sourced',
      photo_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS vinted_wishlist (
      id SERIAL PRIMARY KEY,
      item_name TEXT NOT NULL,
      brand TEXT,
      max_price NUMERIC(10,2),
      notes TEXT,
      found BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const items = await sql`
      SELECT * FROM vinted_items ORDER BY created_at DESC
    `;
    const wishlist = await sql`
      SELECT * FROM vinted_wishlist ORDER BY found ASC, created_at DESC
    `;

    // Aggregate stats
    const sold    = items.filter((i) => i.status === "sold");
    const listed  = items.filter((i) => i.status === "listed");
    const sourced = items.filter((i) => i.status === "sourced");

    const totalProfit   = sold.reduce((s, i) => s + (parseFloat(i.sale_price  ?? 0) - parseFloat(i.purchase_price ?? 0)), 0);
    const totalRevenue  = sold.reduce((s, i) => s + parseFloat(i.sale_price   ?? 0), 0);
    const totalInvested = [...listed, ...sourced].reduce((s, i) => s + parseFloat(i.purchase_price ?? 0), 0);
    const potentialProfit = listed.reduce((s, i) => s + (parseFloat(i.listing_price ?? 0) - parseFloat(i.purchase_price ?? 0)), 0);

    return NextResponse.json({
      items,
      wishlist,
      stats: {
        totalProfit,
        totalRevenue,
        totalInvested,
        potentialProfit,
        soldCount:   sold.length,
        listedCount: listed.length,
        sourcedCount: sourced.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ items: [], wishlist: [], stats: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();

    const body = await req.json();
    const { action, id } = body;

    // ── Inventory actions ───────────────────────────────────────────────
    if (action === "add-item") {
      const { name, category, brand, purchasePrice, listingPrice, datePurchased, dateListed, status, photoUrl, notes } = body;
      const [item] = await sql`
        INSERT INTO vinted_items
          (name, category, brand, purchase_price, listing_price, date_purchased, date_listed, status, photo_url, notes)
        VALUES
          (${name}, ${category || "Other"}, ${brand || null}, ${purchasePrice || 0},
           ${listingPrice || null}, ${datePurchased || null}, ${dateListed || null},
           ${status || "sourced"}, ${photoUrl || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "update-item") {
      const { name, category, brand, purchasePrice, listingPrice, datePurchased, dateListed, status, photoUrl, notes } = body;
      const [item] = await sql`
        UPDATE vinted_items SET
          name = ${name}, category = ${category || "Other"}, brand = ${brand || null},
          purchase_price = ${purchasePrice || 0}, listing_price = ${listingPrice || null},
          date_purchased = ${datePurchased || null}, date_listed = ${dateListed || null},
          status = ${status || "sourced"}, photo_url = ${photoUrl || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "mark-sold") {
      const { salePrice, dateSold } = body;
      const [item] = await sql`
        UPDATE vinted_items SET
          status = 'sold', sale_price = ${salePrice}, date_sold = ${dateSold || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ item });
    }

    if (action === "delete-item") {
      await sql`DELETE FROM vinted_items WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Wishlist actions ────────────────────────────────────────────────
    if (action === "add-wish") {
      const { itemName, brand, maxPrice, notes } = body;
      const [wish] = await sql`
        INSERT INTO vinted_wishlist (item_name, brand, max_price, notes)
        VALUES (${itemName}, ${brand || null}, ${maxPrice || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ wish });
    }

    if (action === "toggle-found") {
      const [wish] = await sql`SELECT found FROM vinted_wishlist WHERE id = ${id}` as { found: boolean }[];
      const [updated] = await sql`
        UPDATE vinted_wishlist SET found = ${!wish.found} WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ wish: updated });
    }

    if (action === "delete-wish") {
      await sql`DELETE FROM vinted_wishlist WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
