import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS digital_product_sales (
    id SERIAL PRIMARY KEY,
    customer_email TEXT,
    platform TEXT NOT NULL,
    product TEXT NOT NULL,
    sale_date DATE,
    amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`ALTER TABLE digital_product_sales ADD COLUMN IF NOT EXISTS user_handle TEXT`;
}

function normalizeSale(e: Record<string, unknown>) {
  return { ...e, sale_date: norm(e.sale_date) };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const sales = await sql`
      SELECT * FROM digital_product_sales ORDER BY sale_date DESC NULLS LAST, created_at DESC
    `;
    const normalized = sales.map(s => normalizeSale(s as Record<string, unknown>));

    let totalRevenue = 0;
    const byPlatform: Record<string, { count: number; revenue: number }> = {};
    for (const s of sales) {
      const amt = parseFloat(String((s as Record<string, unknown>).amount || "0")) || 0;
      const p = String((s as Record<string, unknown>).platform);
      totalRevenue += amt;
      if (!byPlatform[p]) byPlatform[p] = { count: 0, revenue: 0 };
      byPlatform[p].count += 1;
      byPlatform[p].revenue += amt;
    }

    return NextResponse.json(
      { sales: normalized, totalRevenue, byPlatform },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[digital-products GET]", e);
    return NextResponse.json({ error: String(e), sales: [], totalRevenue: 0, byPlatform: {} }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTable();
    const body = await req.json();
    const { action, id, customerEmail, userHandle, platform, product, saleDate, amount } = body;

    if (action === "add") {
      const [sale] = await sql`
        INSERT INTO digital_product_sales (customer_email, user_handle, platform, product, sale_date, amount)
        VALUES (${customerEmail || null}, ${userHandle || null}, ${platform}, ${product}, ${saleDate || null}, ${amount || null})
        RETURNING *
      `;
      return NextResponse.json({ sale: normalizeSale(sale as Record<string, unknown>) });
    }

    if (action === "update") {
      const [sale] = await sql`
        UPDATE digital_product_sales
        SET customer_email = ${customerEmail || null},
            user_handle = ${userHandle || null},
            platform = ${platform},
            product = ${product},
            sale_date = ${saleDate || null},
            amount = ${amount || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ sale: normalizeSale(sale as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM digital_product_sales WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[digital-products POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
