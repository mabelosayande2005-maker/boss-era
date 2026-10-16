import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 503 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const blob = await put(
      `studio/${Date.now()}-${safeName}`,
      file,
      { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }
    );
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("[studio/upload]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
