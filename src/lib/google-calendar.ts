import { google } from "googleapis";
import { getDb } from "./db";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const REDIRECT_URI = `${APP_URL}/api/calendar/callback`;

export function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state: string) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
    state,
  });
}

export async function ensureTokenTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS google_oauth_tokens (
    id SERIAL PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    google_email TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS google_oauth_state (
    id SERIAL PRIMARY KEY,
    state TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function getTokenRow() {
  const sql = getDb();
  await ensureTokenTables();
  const [row] = await sql`SELECT * FROM google_oauth_tokens LIMIT 1`;
  return row ?? null;
}

export async function getCalendarClient() {
  const tokenRow = await getTokenRow();
  if (!tokenRow) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokenRow.access_token as string,
    refresh_token: (tokenRow.refresh_token as string | null) ?? undefined,
    expiry_date: tokenRow.expiry_date ? Number(tokenRow.expiry_date) : undefined,
  });

  client.on("tokens", async (tokens) => {
    try {
      const sql = getDb();
      await sql`
        UPDATE google_oauth_tokens SET
          access_token = ${tokens.access_token!},
          expiry_date = ${tokens.expiry_date ?? null},
          updated_at = NOW()
        WHERE id = ${tokenRow.id as number}
      `;
    } catch { /* best-effort */ }
  });

  return google.calendar({ version: "v3", auth: client });
}
