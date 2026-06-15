import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo uploads require BLOB_READ_WRITE_TOKEN — add it in Vercel dashboard" },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const filename = `wardrobe/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "-")}`;
    const blob     = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
