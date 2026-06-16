import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_preview: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.slice(0, 30) + "…"
      : null,
    node_env: process.env.NODE_ENV,
  };

  try {
    const sql = getDb();
    result.db_connected = false;

    const ping = await sql`SELECT 1 AS ok`;
    result.db_connected = ping[0]?.ok === 1;

    const tables = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    result.tables = tables.map((r) => r.tablename);

    const habits = await sql`SELECT id, name, emoji FROM habits ORDER BY id`;
    result.habits_count = habits.length;
    result.habits = habits;

    // Live insert test
    const [inserted] = await sql`
      INSERT INTO habits (name, emoji, target_per_week, color)
      VALUES ('__debug__', '🧪', 1, '#b8d4c8')
      RETURNING id, name
    `;
    result.insert_test = inserted;
    await sql`DELETE FROM habits WHERE name = '__debug__'`;
    result.insert_test_cleaned = true;
  } catch (e) {
    result.error = String(e);
    result.stack = e instanceof Error ? e.stack : undefined;
  }

  return NextResponse.json(result, { status: 200 });
}
