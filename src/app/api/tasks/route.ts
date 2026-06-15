import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const today = new Date().toISOString().split("T")[0];
    const tasks = await sql`
      SELECT * FROM tasks
      WHERE is_today = TRUE OR due_date = ${today}
      ORDER BY completed ASC, created_at ASC
    `;
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ tasks: [] });
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
        INSERT INTO tasks (title, stream, due_date, notes, is_today)
        VALUES (${title}, ${stream || "admin"}, ${dueDate || null}, ${notes || null}, TRUE)
        RETURNING *
      `;
      return NextResponse.json({ task });
    }

    if (action === "toggle") {
      const [existing] = await sql`SELECT completed FROM tasks WHERE id = ${taskId}`;
      const newCompleted = !existing.completed;
      const [task] = await sql`
        UPDATE tasks SET completed = ${newCompleted}, completed_at = ${newCompleted ? new Date().toISOString() : null}
        WHERE id = ${taskId} RETURNING *
      `;
      return NextResponse.json({ task });
    }

    if (action === "delete") {
      await sql`DELETE FROM tasks WHERE id = ${taskId}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
