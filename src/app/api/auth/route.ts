import { NextResponse } from "next/server";

const COOKIE = "boss_era_session";
const MAX_AGE = 365 * 24 * 60 * 60; // 1 year

async function computeToken(): Promise<string> {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pw),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("boss-era-auth-v1"));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!password || password !== process.env.DASHBOARD_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
    const token = await computeToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
