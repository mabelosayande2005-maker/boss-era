import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS studio_videos (
      id TEXT PRIMARY KEY,
      account TEXT NOT NULL,
      style TEXT NOT NULL,
      title TEXT,
      post_date DATE,
      brand_deal_deadline DATE,
      status TEXT DEFAULT 'Editing',
      progress_find BOOLEAN DEFAULT false,
      progress_sort BOOLEAN DEFAULT false,
      progress_build BOOLEAN DEFAULT false,
      progress_check BOOLEAN DEFAULT false,
      progress_done BOOLEAN DEFAULT false,
      var_a_url TEXT,
      var_b_url TEXT,
      thumb_a_url TEXT,
      thumb_b_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS studio_requests (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

function normRow(r: Record<string, unknown>) {
  const norm = (d: unknown) =>
    d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  return {
    ...r,
    post_date: norm(r.post_date),
    brand_deal_deadline: norm(r.brand_deal_deadline),
  };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const rows = await sql`
      SELECT * FROM studio_videos ORDER BY created_at DESC
    ` as Record<string, unknown>[];
    return NextResponse.json({ videos: rows.map(normRow) });
  } catch (e) {
    console.error("[studio/videos GET]", e);
    return NextResponse.json({ videos: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { id, account, style, title, post_date, brand_deal_deadline } = body;
      const [row] = await sql`
        INSERT INTO studio_videos (id, account, style, title, post_date, brand_deal_deadline)
        VALUES (
          ${id},
          ${account},
          ${style},
          ${title || null},
          ${post_date || null},
          ${brand_deal_deadline || null}
        )
        RETURNING *
      `;
      return NextResponse.json({ video: normRow(row as Record<string, unknown>) });
    }

    if (action === "progress") {
      const { id, progress_find, progress_sort, progress_build, progress_check, progress_done, status, notes } = body;
      const [row] = await sql`
        UPDATE studio_videos SET
          progress_find  = ${progress_find  ?? false},
          progress_sort  = ${progress_sort  ?? false},
          progress_build = ${progress_build ?? false},
          progress_check = ${progress_check ?? false},
          progress_done  = ${progress_done  ?? false},
          status = ${status ?? "Editing"},
          notes  = ${notes  ?? null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ video: normRow(row as Record<string, unknown>) });
    }

    if (action === "update") {
      const { id, title, post_date, brand_deal_deadline, status } = body;
      const [row] = await sql`
        UPDATE studio_videos SET
          title                = ${title || null},
          post_date            = ${post_date || null},
          brand_deal_deadline  = ${brand_deal_deadline || null},
          status               = ${status ?? "Editing"}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ video: normRow(row as Record<string, unknown>) });
    }

    if (action === "set_urls") {
      const { id, var_a_url, var_b_url, thumb_a_url, thumb_b_url } = body;
      const [row] = await sql`
        UPDATE studio_videos SET
          var_a_url   = COALESCE(${var_a_url   || null}, var_a_url),
          var_b_url   = COALESCE(${var_b_url   || null}, var_b_url),
          thumb_a_url = COALESCE(${thumb_a_url || null}, thumb_a_url),
          thumb_b_url = COALESCE(${thumb_b_url || null}, thumb_b_url)
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ video: normRow(row as Record<string, unknown>) });
    }

    if (action === "delete") {
      const { id } = body;
      await sql`DELETE FROM studio_requests WHERE video_id = ${id}`;
      await sql`DELETE FROM studio_videos WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[studio/videos POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
