import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS se_entries (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    entry_date DATE,
    gross_amount NUMERIC(10,2),
    expenses NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

function normalizeEntry(e: Record<string, unknown>) {
  return { ...e, entry_date: norm(e.entry_date) };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const entries = await sql`
      SELECT * FROM se_entries ORDER BY entry_date DESC NULLS LAST, created_at DESC
    `;
    return NextResponse.json(
      { entries: entries.map(e => normalizeEntry(e as Record<string, unknown>)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[se GET]", e);
    return NextResponse.json({ error: String(e), entries: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, source, entryDate, grossAmount, expenses, netAmount, notes } = body;

    if (action === "add") {
      const [entry] = await sql`
        INSERT INTO se_entries (source, entry_date, gross_amount, expenses, net_amount, notes)
        VALUES (
          ${source}, ${entryDate || null}, ${grossAmount || null},
          ${expenses || 0},
          ${netAmount ?? grossAmount ?? null},
          ${notes || null}
        )
        RETURNING *
      `;
      return NextResponse.json({ entry: normalizeEntry(entry as Record<string, unknown>) });
    }

    if (action === "update") {
      const [entry] = await sql`
        UPDATE se_entries
        SET source = ${source}, entry_date = ${entryDate || null},
            gross_amount = ${grossAmount || null}, expenses = ${expenses || 0},
            net_amount = ${netAmount ?? grossAmount ?? null},
            notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ entry: normalizeEntry(entry as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM se_entries WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[se POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
