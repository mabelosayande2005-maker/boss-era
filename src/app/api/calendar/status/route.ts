import { NextResponse } from "next/server";
import { getTokenRow } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await getTokenRow();
    return NextResponse.json({
      connected: !!row,
      email: row?.google_email ?? null,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  } catch (e) {
    console.error("[calendar status]", e);
    return NextResponse.json({ connected: false, email: null, configured: false });
  }
}
