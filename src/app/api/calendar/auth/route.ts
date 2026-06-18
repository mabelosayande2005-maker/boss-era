import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUrl, ensureTokenTables } from "@/lib/google-calendar";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.redirect(`${appUrl}/?calendar_error=not_configured`);
    }

    await ensureTokenTables();
    const sql = getDb();

    // Clean up expired states
    await sql`DELETE FROM google_oauth_state WHERE created_at < NOW() - INTERVAL '10 minutes'`;

    const state = crypto.randomBytes(16).toString("hex");
    await sql`INSERT INTO google_oauth_state (state) VALUES (${state}) ON CONFLICT DO NOTHING`;

    return NextResponse.redirect(getAuthUrl(state));
  } catch (e) {
    console.error("[calendar auth]", e);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/?calendar_error=${encodeURIComponent(String(e))}`);
  }
}
