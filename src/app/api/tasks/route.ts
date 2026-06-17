import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    stream TEXT DEFAULT 'admin',
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    notes TEXT,
    is_today BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  // task_date tracks which day's list this task belongs to (separate from due_date deadline).
  // Add without DEFAULT so existing rows get NULL rather than today's date.
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_date DATE`;
  // Backfill rows with no task_date (first deploy after column add).
  await sql`UPDATE tasks SET task_date = created_at::date WHERE task_date IS NULL`;
  // Fix rows incorrectly stamped with CURRENT_DATE by a prior migration that used DEFAULT CURRENT_DATE.
  await sql`UPDATE tasks SET task_date = created_at::date WHERE task_date = CURRENT_DATE AND created_at::date < CURRENT_DATE`;
  // Ensure future inserts default to today.
  await sql`ALTER TABLE tasks ALTER COLUMN task_date SET DEFAULT CURRENT_DATE`;
  // Keep is_today accurate: old completed tasks should not carry over via the is_today flag
  // (guards against the legacy GET query on older deploys that used is_today instead of task_date).
  await sql`UPDATE tasks SET is_today = FALSE WHERE is_today = TRUE AND completed = TRUE AND created_at::date < CURRENT_DATE`;
}

// Neon returns DATE/TIMESTAMP columns as JS Date objects server-side.
const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

function normalizeTask(t: Record<string, unknown>) {
  return {
    ...t,
    due_date: norm(t.due_date),
    task_date: norm(t.task_date),
    completed_at: t.completed_at instanceof Date
      ? (t.completed_at as Date).toISOString()
      : t.completed_at ?? null,
  };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const today = new Date().toISOString().split("T")[0];
    // Show today's tasks (any completion state) + incomplete tasks from previous days
    const tasks = await sql`
      SELECT * FROM tasks
      WHERE task_date::date = ${today}::date
         OR (task_date::date < ${today}::date AND completed = FALSE)
      ORDER BY completed ASC, task_date ASC, created_at ASC
    `;
    return NextResponse.json({ tasks: tasks.map(normalizeTask) });
  } catch (e) {
    console.error("[tasks GET]", e);
    return NextResponse.json({ error: String(e), tasks: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, taskId, title, stream, dueDate, notes } = body;

    if (action === "add") {
      const [task] = await sql`
        INSERT INTO tasks (title, stream, due_date, notes, is_today, task_date)
        VALUES (${title}, ${stream || "admin"}, ${dueDate || null}, ${notes || null}, TRUE, CURRENT_DATE)
        RETURNING *
      `;
      return NextResponse.json({ task: normalizeTask(task as Record<string, unknown>) });
    }

    if (action === "toggle") {
      const [existing] = await sql`SELECT completed FROM tasks WHERE id = ${taskId}`;
      const newCompleted = !existing.completed;
      const [task] = await sql`
        UPDATE tasks
        SET completed = ${newCompleted},
            completed_at = ${newCompleted ? new Date().toISOString() : null}
        WHERE id = ${taskId} RETURNING *
      `;
      return NextResponse.json({ task: normalizeTask(task as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM tasks WHERE id = ${taskId}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[tasks POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
