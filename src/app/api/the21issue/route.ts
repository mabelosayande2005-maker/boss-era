import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS the21issue_checks (
      item_id TEXT PRIMARY KEY,
      checked BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const rows = await sql`
      SELECT item_id FROM the21issue_checks WHERE checked = TRUE
    ` as { item_id: string }[];
    return NextResponse.json({ checked: rows.map(r => r.item_id) });
  } catch (e) {
    console.error("[the21issue GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as Record<string, unknown>;
    const { action } = body as { action: string };

    if (action === "set") {
      const { item_id, checked } = body as { item_id: string; checked: boolean };
      await sql`
        INSERT INTO the21issue_checks (item_id, checked)
        VALUES (${item_id}, ${checked})
        ON CONFLICT (item_id) DO UPDATE SET checked = EXCLUDED.checked
      `;
      return NextResponse.json({ ok: true });
    }

    // Bulk migration from localStorage
    if (action === "set_bulk") {
      const { item_ids } = body as { item_ids: string[] };
      for (const item_id of item_ids) {
        await sql`
          INSERT INTO the21issue_checks (item_id, checked)
          VALUES (${item_id}, TRUE)
          ON CONFLICT (item_id) DO UPDATE SET checked = TRUE
        `;
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[the21issue POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
