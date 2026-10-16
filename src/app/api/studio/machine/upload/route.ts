import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

function checkApiKey(req: Request): boolean {
  const key = process.env.STUDIO_API_KEY;
  if (!key) return false;
  const header = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return header === key;
}

// POST — multipart: file + videoId + slot (varA | varB | thumbA | thumbB)
export async function POST(request: Request): Promise<Response> {
  if (!checkApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 503 });
  }
  try {
    const formData = await request.formData();
    const file    = formData.get("file")    as File   | null;
    const videoId = formData.get("videoId") as string | null;
    const slot    = formData.get("slot")    as string | null; // varA | varB | thumbA | thumbB

    if (!file)    return NextResponse.json({ error: "No file"    }, { status: 400 });
    if (!videoId) return NextResponse.json({ error: "No videoId" }, { status: 400 });
    if (!slot || !["varA", "varB", "thumbA", "thumbB"].includes(slot)) {
      return NextResponse.json({ error: "slot must be varA | varB | thumbA | thumbB" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const blob = await put(
      `studio/${videoId}/${slot}-${Date.now()}-${safeName}`,
      file,
      { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }
    );

    // Write URL back to the DB
    const sql = getDb();
    const colMap: Record<string, string> = {
      varA:   "var_a_url",
      varB:   "var_b_url",
      thumbA: "thumb_a_url",
      thumbB: "thumb_b_url",
    };
    const col = colMap[slot];
    if (col === "var_a_url")   await sql`UPDATE studio_videos SET var_a_url   = ${blob.url} WHERE id = ${videoId}`;
    if (col === "var_b_url")   await sql`UPDATE studio_videos SET var_b_url   = ${blob.url} WHERE id = ${videoId}`;
    if (col === "thumb_a_url") await sql`UPDATE studio_videos SET thumb_a_url = ${blob.url} WHERE id = ${videoId}`;
    if (col === "thumb_b_url") await sql`UPDATE studio_videos SET thumb_b_url = ${blob.url} WHERE id = ${videoId}`;

    return NextResponse.json({ url: blob.url, slot, videoId });
  } catch (e) {
    console.error("[studio/machine/upload]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
