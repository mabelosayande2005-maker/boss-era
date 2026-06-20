export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) return new Response("url required", { status: 400 });

  // Only proxy Vercel Blob URLs — prevent open-proxy abuse
  try {
    const { hostname } = new URL(blobUrl);
    if (!hostname.endsWith(".blob.vercel-storage.com")) {
      return new Response("invalid url", { status: 400 });
    }
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response("not configured", { status: 503 });
  }

  const res = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!res.ok) return new Response("not found", { status: res.status });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
