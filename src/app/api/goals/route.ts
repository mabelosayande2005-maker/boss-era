import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'personal',
    emoji TEXT DEFAULT '🌟',
    target_date DATE,
    progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    status TEXT DEFAULT 'active',
    color TEXT DEFAULT '#b8d4c8',
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS goal_milestones (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

function normGoal(g: Record<string, unknown>) {
  return { ...g, target_date: norm(g.target_date) };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const goals = await sql`SELECT * FROM goals ORDER BY status ASC, target_date ASC NULLS LAST, created_at DESC`;
    const milestones = await sql`SELECT * FROM goal_milestones ORDER BY completed ASC, created_at ASC`;
    const goalsWithMilestones = goals.map(g => ({
      ...normGoal(g as Record<string, unknown>),
      milestones: milestones.filter(m => m.goal_id === g.id),
    }));
    return NextResponse.json({ goals: goalsWithMilestones });
  } catch (e) {
    console.error("[goals GET]", e);
    return NextResponse.json({ goals: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-goal") {
      const { title, description, category, emoji, targetDate, color } = body;
      const [goal] = await sql`
        INSERT INTO goals (title, description, category, emoji, target_date, color)
        VALUES (${title}, ${description || null}, ${category || "personal"}, ${emoji || "🌟"}, ${targetDate || null}, ${color || "#b8d4c8"})
        RETURNING *
      `;
      return NextResponse.json({ goal: { ...normGoal(goal as Record<string, unknown>), milestones: [] } });
    }

    if (action === "update-progress") {
      const { progress } = body;
      const status = progress >= 100 ? "completed" : "active";
      const [goal] = await sql`
        UPDATE goals SET progress_pct=${progress}, status=${status} WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ goal: normGoal(goal as Record<string, unknown>) });
    }

    if (action === "delete-goal") {
      await sql`DELETE FROM goals WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-milestone") {
      const { goalId, title } = body;
      const [ms] = await sql`
        INSERT INTO goal_milestones (goal_id, title) VALUES (${goalId}, ${title}) RETURNING *
      `;
      return NextResponse.json({ milestone: ms });
    }

    if (action === "toggle-milestone") {
      const [ms] = await sql`SELECT completed FROM goal_milestones WHERE id=${id}`;
      const done = !ms.completed;
      const [updated] = await sql`
        UPDATE goal_milestones SET completed=${done}, completed_at=${done ? new Date().toISOString() : null}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ milestone: updated });
    }

    if (action === "delete-milestone") {
      await sql`DELETE FROM goal_milestones WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[goals POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
