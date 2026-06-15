import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    // weekStart = ISO date of the Monday of the requested week
    const weekStart = searchParams.get("weekStart") ?? new Date().toISOString().split("T")[0];

    const habits = await sql`SELECT * FROM habits ORDER BY id ASC`;

    // Fetch every completion for the 7 days starting weekStart
    const completions = await sql`
      SELECT habit_id, completed_date
      FROM habit_completions
      WHERE completed_date >= ${weekStart}::date
        AND completed_date < (${weekStart}::date + INTERVAL '7 days')
    `;

    // Also return today's completions separately (used by home dashboard)
    const today = new Date().toISOString().split("T")[0];
    const todayCompletions = completions.filter(
      (c) => (c.completed_date as string).startsWith(today)
    );

    return NextResponse.json({
      habits,
      completions,           // {habit_id, completed_date}[] for the full week
      completedToday: todayCompletions.map((c) => c.habit_id as number),
    });
  } catch {
    return NextResponse.json({ habits: [], completions: [], completedToday: [] });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    const body = await req.json();
    const { action, habitId, date, name, emoji, color, targetPerWeek, id } = body;

    if (action === "toggle") {
      const existing = await sql`
        SELECT id FROM habit_completions
        WHERE habit_id = ${habitId} AND completed_date = ${date}
      `;
      if (existing.length > 0) {
        await sql`DELETE FROM habit_completions WHERE habit_id = ${habitId} AND completed_date = ${date}`;
        return NextResponse.json({ completed: false });
      } else {
        await sql`INSERT INTO habit_completions (habit_id, completed_date) VALUES (${habitId}, ${date})`;
        return NextResponse.json({ completed: true });
      }
    }

    if (action === "add") {
      const [habit] = await sql`
        INSERT INTO habits (name, emoji, target_per_week, color)
        VALUES (${name}, ${emoji || "⭐"}, ${targetPerWeek ?? 1}, ${color || "#b8d4c8"})
        RETURNING *
      `;
      return NextResponse.json({ habit });
    }

    if (action === "edit") {
      const [habit] = await sql`
        UPDATE habits
        SET name = ${name}, emoji = ${emoji}, target_per_week = ${targetPerWeek}, color = ${color}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ habit });
    }

    if (action === "delete") {
      await sql`DELETE FROM habit_completions WHERE habit_id = ${id}`;
      await sql`DELETE FROM habits WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "seed") {
      const defaultHabits = [
        { name: "Gym",            emoji: "🏋️", target_per_week: 3, color: "#8fada0" },
        { name: "Dance",          emoji: "💃",  target_per_week: 1, color: "#e8b4b8" },
        { name: "Italian",        emoji: "🇮🇹", target_per_week: 2, color: "#c8b8e0" },
        { name: "AI Course",      emoji: "🤖",  target_per_week: 2, color: "#d4a853" },
        { name: "Sewing",         emoji: "🧵",  target_per_week: 2, color: "#b8d4c8" },
        { name: "StudyGlow Post", emoji: "✨",  target_per_week: 1, color: "#f0d080" },
        { name: "Sunday Planning",emoji: "📅",  target_per_week: 1, color: "#deeee8" },
      ];
      for (const h of defaultHabits) {
        await sql`
          INSERT INTO habits (name, emoji, target_per_week, color)
          SELECT ${h.name}, ${h.emoji}, ${h.target_per_week}, ${h.color}
          WHERE NOT EXISTS (SELECT 1 FROM habits WHERE name = ${h.name})
        `;
      }
      return NextResponse.json({ seeded: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
