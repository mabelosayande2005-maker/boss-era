import { NextResponse } from "next/server";
import { createOAuth2Client, getTokenRow } from "@/lib/google-calendar";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sql = getDb();
    const row = await getTokenRow();

    if (row?.access_token) {
      try {
        const client = createOAuth2Client();
        await client.revokeToken(row.access_token as string);
      } catch { /* best-effort — token may already be invalid */ }
    }

    await sql`DELETE FROM google_oauth_tokens`;
    return NextResponse.json({ disconnected: true });
  } catch (e) {
    console.error("[calendar disconnect]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
