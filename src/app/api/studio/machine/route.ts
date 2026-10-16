import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = process.env.STUDIO_API_KEY;
  if (!key) return false;
  const header = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return header === key;
}

// GET /api/studio/machine?action=requests[&videoId=xxx]
// Returns pending requests so the Mac can act on them
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    const rows = videoId
      ? await sql`
          SELECT r.*, v.account, v.style, v.var_a_url, v.var_b_url
          FROM studio_requests r
          JOIN studio_videos v ON v.id = r.video_id
          WHERE r.video_id = ${videoId} AND r.status = 'pending'
          ORDER BY r.created_at ASC
        ` as Record<string, unknown>[]
      : await sql`
          SELECT r.*, v.account, v.style, v.var_a_url, v.var_b_url
          FROM studio_requests r
          JOIN studio_videos v ON v.id = r.video_id
          WHERE r.status = 'pending'
          ORDER BY r.created_at ASC
        ` as Record<string, unknown>[];

    return NextResponse.json({ requests: rows });
  } catch (e) {
    console.error("[studio/machine GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/studio/machine
// Body: { action: "progress" | "mark_request_done" | "set_urls" }
export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sql = getDb();
    const body = await req.json();
    const { action } = body;

    // Update video progress + status + editor notes
    if (action === "progress") {
      const { videoId, progress, status, notes } = body;
      const [row] = await sql`
        UPDATE studio_videos SET
          progress_find  = ${progress?.find  ?? false},
          progress_sort  = ${progress?.sort  ?? false},
          progress_build = ${progress?.build ?? false},
          progress_check = ${progress?.check ?? false},
          progress_done  = ${progress?.done  ?? false},
          status = ${status ?? "Editing"},
          notes  = ${notes  ?? null}
        WHERE id = ${videoId}
        RETURNING id, status, progress_find, progress_sort, progress_build, progress_check, progress_done
      `;
      return NextResponse.json({ updated: row ?? null });
    }

    // Mark a request as done after the Mac has acted on it
    if (action === "mark_request_done") {
      const { requestId } = body;
      const [row] = await sql`
        UPDATE studio_requests SET status = 'done' WHERE id = ${requestId} RETURNING *
      `;
      return NextResponse.json({ request: row ?? null });
    }

    // Set preview video / thumbnail URLs after Mac uploads
    if (action === "set_urls") {
      const { videoId, var_a_url, var_b_url, thumb_a_url, thumb_b_url } = body;
      const [row] = await sql`
        UPDATE studio_videos SET
          var_a_url   = COALESCE(${var_a_url   || null}, var_a_url),
          var_b_url   = COALESCE(${var_b_url   || null}, var_b_url),
          thumb_a_url = COALESCE(${thumb_a_url || null}, thumb_a_url),
          thumb_b_url = COALESCE(${thumb_b_url || null}, thumb_b_url)
        WHERE id = ${videoId}
        RETURNING id, var_a_url, var_b_url, thumb_a_url, thumb_b_url
      `;
      return NextResponse.json({ updated: row ?? null });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[studio/machine POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
