import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS income_entries (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    work_date DATE,
    pay_date DATE,
    gross NUMERIC(10,2),
    tax_fees NUMERIC(10,2) DEFAULT 0,
    net NUMERIC(10,2),
    account TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

// Neon returns DATE columns as JS Date objects server-side.
// Normalise to "yyyy-MM-dd" strings (or null) before JSON response.
const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

function normalizeEntry(e: Record<string, unknown>) {
  return {
    ...e,
    work_date: norm(e.work_date),
    pay_date: norm(e.pay_date),
  };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const entries = await sql`
      SELECT * FROM income_entries ORDER BY work_date DESC, created_at DESC
    `;
    const [totals] = await sql`
      SELECT
        COALESCE(SUM(net), 0) as total_net,
        COALESCE(SUM(gross), 0) as total_gross
      FROM income_entries
    `;
    const bySource = await sql`
      SELECT source, COALESCE(SUM(net), 0) as total
      FROM income_entries
      GROUP BY source
      ORDER BY total DESC
    `;
    const today = new Date().toISOString().split("T")[0];
    const [todayTotal] = await sql`
      SELECT COALESCE(SUM(net), 0) as today_net
      FROM income_entries
      WHERE work_date = ${today}
    `;
    return NextResponse.json({
      entries: entries.map(normalizeEntry),
      totals,
      bySource,
      todayTotal,
    });
  } catch (e) {
    console.error("[income GET]", e);
    return NextResponse.json(
      { error: String(e), entries: [], totals: { total_net: 0, total_gross: 0 }, bySource: [], todayTotal: { today_net: 0 } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, source, workDate, payDate, gross, taxFees, net, account, notes } = body;

    if (action === "add") {
      const [entry] = await sql`
        INSERT INTO income_entries (source, work_date, pay_date, gross, tax_fees, net, account, notes)
        VALUES (${source}, ${workDate || null}, ${payDate || null}, ${gross || null}, ${taxFees || 0}, ${net || gross}, ${account || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ entry: normalizeEntry(entry as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM income_entries WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "update") {
      const [entry] = await sql`
        UPDATE income_entries
        SET source = ${source}, work_date = ${workDate || null}, pay_date = ${payDate || null},
            gross = ${gross || null}, tax_fees = ${taxFees || 0}, net = ${net || gross},
            account = ${account || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ entry: normalizeEntry(entry as Record<string, unknown>) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[income POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
