import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    const rows = videoId
      ? await sql`SELECT * FROM studio_requests WHERE video_id = ${videoId} ORDER BY created_at DESC` as Record<string, unknown>[]
      : await sql`SELECT * FROM studio_requests ORDER BY created_at DESC` as Record<string, unknown>[];

    return NextResponse.json({ requests: rows });
  } catch (e) {
    console.error("[studio/requests GET]", e);
    return NextResponse.json({ requests: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { videoId, type, message } = body;
      const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const [row] = await sql`
        INSERT INTO studio_requests (id, video_id, type, message)
        VALUES (${id}, ${videoId}, ${type}, ${message || null})
        RETURNING *
      `;
      return NextResponse.json({ request: row });
    }

    if (action === "mark_done") {
      const { id } = body;
      const [row] = await sql`
        UPDATE studio_requests SET status = 'done' WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ request: row });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[studio/requests POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
