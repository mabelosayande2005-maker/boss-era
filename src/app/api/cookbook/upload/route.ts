import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 503 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const blob = await put(
      `cookbook/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "-")}`,
      file,
      { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN }
    );
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("[cookbook upload]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
