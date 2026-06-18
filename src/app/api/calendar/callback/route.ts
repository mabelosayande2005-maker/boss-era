import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuth2Client, ensureTokenTables } from "@/lib/google-calendar";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/?calendar_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?calendar_error=missing_params`);
  }

  try {
    await ensureTokenTables();
    const sql = getDb();

    // Verify CSRF state
    const [stateRow] = await sql`
      SELECT id FROM google_oauth_state
      WHERE state = ${state} AND created_at > NOW() - INTERVAL '10 minutes'
    `;
    if (!stateRow) {
      return NextResponse.redirect(`${appUrl}/?calendar_error=invalid_state`);
    }
    await sql`DELETE FROM google_oauth_state WHERE state = ${state}`;

    // Exchange code for tokens
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch connected Google email
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // One token row per app (single user)
    await sql`DELETE FROM google_oauth_tokens`;
    await sql`
      INSERT INTO google_oauth_tokens (access_token, refresh_token, expiry_date, google_email)
      VALUES (${tokens.access_token!}, ${tokens.refresh_token ?? null}, ${tokens.expiry_date ?? null}, ${userInfo.email ?? null})
    `;

    return NextResponse.redirect(`${appUrl}/?calendar_connected=1`);
  } catch (e) {
    console.error("[calendar callback]", e);
    return NextResponse.redirect(`${appUrl}/?calendar_error=${encodeURIComponent(String(e))}`);
  }
}
