import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS ct_checklist_state (
      item_id TEXT PRIMARY KEY,
      checked BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ct_budget_state (
      id    INT PRIMARY KEY DEFAULT 1,
      tickets_sold INT NOT NULL DEFAULT 0
    )
  `;
  await sql`
    INSERT INTO ct_budget_state (id, tickets_sold) VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ct_costs (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      amount     NUMERIC NOT NULL,
      receipt    TEXT,
      sort_order INT DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ct_themes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      sort_order INT DEFAULT 0
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const checkRows  = await sql`SELECT item_id FROM ct_checklist_state WHERE checked = TRUE` as { item_id: string }[];
    const budgetRows = await sql`SELECT tickets_sold FROM ct_budget_state WHERE id = 1` as { tickets_sold: number }[];
    const costRows   = await sql`SELECT id, name, amount, receipt FROM ct_costs ORDER BY sort_order ASC, id ASC` as { id: string; name: string; amount: string; receipt: string | null }[];
    const themeRows  = await sql`SELECT id, title FROM ct_themes ORDER BY sort_order ASC, id ASC` as { id: string; title: string }[];

    return NextResponse.json({
      checklist: checkRows.map(r => r.item_id),
      budget: {
        ticketsSold: budgetRows[0]?.tickets_sold ?? 0,
        costs: costRows.map(c => ({
          id: c.id,
          name: c.name,
          amount: parseFloat(String(c.amount)),
          receipt: c.receipt ?? undefined,
        })),
      },
      themes: themeRows,
    });
  } catch (e) {
    console.error("[ct GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json() as Record<string, unknown>;
    const { action } = body as { action: string };

    // ── checklist ─────────────────────────────────────────────────────────────

    if (action === "set_check") {
      const { item_id, checked } = body as { item_id: string; checked: boolean };
      await sql`
        INSERT INTO ct_checklist_state (item_id, checked)
        VALUES (${item_id}, ${checked})
        ON CONFLICT (item_id) DO UPDATE SET checked = EXCLUDED.checked
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "set_bulk_checks") {
      const { item_ids } = body as { item_ids: string[] };
      for (const item_id of item_ids) {
        await sql`
          INSERT INTO ct_checklist_state (item_id, checked)
          VALUES (${item_id}, TRUE)
          ON CONFLICT (item_id) DO UPDATE SET checked = TRUE
        `;
      }
      return NextResponse.json({ ok: true });
    }

    // ── budget ────────────────────────────────────────────────────────────────

    if (action === "set_tickets") {
      const { tickets_sold } = body as { tickets_sold: number };
      await sql`UPDATE ct_budget_state SET tickets_sold = ${tickets_sold} WHERE id = 1`;
      return NextResponse.json({ ok: true });
    }

    if (action === "add_cost") {
      const { id, name, amount, receipt } = body as { id: string; name: string; amount: number; receipt?: string };
      const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ct_costs` as { next: number }[];
      await sql`
        INSERT INTO ct_costs (id, name, amount, receipt, sort_order)
        VALUES (${id}, ${name}, ${amount}, ${receipt ?? null}, ${maxOrder[0].next})
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_cost") {
      const { id } = body as { id: string };
      await sql`DELETE FROM ct_costs WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    // Bulk migration
    if (action === "migrate_budget") {
      const { tickets_sold, costs } = body as {
        tickets_sold: number;
        costs: { id: string; name: string; amount: number; receipt?: string }[];
      };
      await sql`UPDATE ct_budget_state SET tickets_sold = ${tickets_sold} WHERE id = 1`;
      for (let i = 0; i < costs.length; i++) {
        const c = costs[i];
        await sql`
          INSERT INTO ct_costs (id, name, amount, receipt, sort_order)
          VALUES (${c.id}, ${c.name}, ${c.amount}, ${c.receipt ?? null}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      return NextResponse.json({ ok: true });
    }

    // ── themes ────────────────────────────────────────────────────────────────

    if (action === "add_theme") {
      const { id, title } = body as { id: string; title: string };
      const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ct_themes` as { next: number }[];
      await sql`
        INSERT INTO ct_themes (id, title, sort_order)
        VALUES (${id}, ${title}, ${maxOrder[0].next})
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_theme") {
      const { id } = body as { id: string };
      await sql`DELETE FROM ct_themes WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_themes") {
      const { ordered_ids } = body as { ordered_ids: string[] };
      for (let i = 0; i < ordered_ids.length; i++) {
        await sql`UPDATE ct_themes SET sort_order = ${i} WHERE id = ${ordered_ids[i]}`;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "migrate_themes") {
      const { themes } = body as { themes: { id: string; title: string }[] };
      for (let i = 0; i < themes.length; i++) {
        await sql`
          INSERT INTO ct_themes (id, title, sort_order)
          VALUES (${themes[i].id}, ${themes[i].title}, ${i})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[ct POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
