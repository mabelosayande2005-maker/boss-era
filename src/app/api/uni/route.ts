import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS uni_modules (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      short_name TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#8fada0',
      sort_order INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS uni_assignments (
      id                 SERIAL PRIMARY KEY,
      module_id          INTEGER REFERENCES uni_modules(id) ON DELETE CASCADE,
      title              TEXT NOT NULL,
      deadline           DATE,
      status             TEXT NOT NULL DEFAULT 'not_started',
      word_count_target  INTEGER,
      word_count_current INTEGER NOT NULL DEFAULT 0,
      notes              TEXT,
      created_at         TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS uni_assignment_goals (
      id            SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES uni_assignments(id) ON DELETE CASCADE,
      text          TEXT NOT NULL,
      week_start    DATE NOT NULL,
      completed     BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at  TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS uni_lectures (
      id             SERIAL PRIMARY KEY,
      module_id      INTEGER REFERENCES uni_modules(id) ON DELETE CASCADE,
      topic          TEXT NOT NULL,
      lecture_date   DATE NOT NULL,
      understanding  TEXT NOT NULL DEFAULT 'green',
      notes          TEXT,
      created_at     TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS uni_study_tasks (
      id           SERIAL PRIMARY KEY,
      module_id    INTEGER REFERENCES uni_modules(id) ON DELETE SET NULL,
      title        TEXT NOT NULL,
      completed    BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMP,
      task_date    DATE NOT NULL,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `;
}

const SEED_MODULES = [
  { name: "Digital Business",     short_name: "Digital Biz", color: "#e8b4b8", sort_order: 1 },
  { name: "Financial Management", short_name: "Finance",     color: "#d4a853", sort_order: 2 },
  { name: "Visualising Data",     short_name: "Vis Data",    color: "#8fada0", sort_order: 3 },
  { name: "Algorithmic Thinking", short_name: "Algo",        color: "#c8b8e0", sort_order: 4 },
];

async function seedModules() {
  const sql = getDb();
  for (const m of SEED_MODULES) {
    await sql`
      INSERT INTO uni_modules (name, short_name, color, sort_order)
      VALUES (${m.name}, ${m.short_name}, ${m.color}, ${m.sort_order})
      ON CONFLICT (name) DO NOTHING
    `;
  }
}

function todayUK(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function weekStartUK(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toLocaleDateString("en-CA");
}

export async function GET() {
  try {
    await ensureTables();
    await seedModules();
    const sql = getDb();

    const today = todayUK();
    const modules       = await sql`SELECT * FROM uni_modules ORDER BY sort_order ASC, id ASC`;
    const assignments   = await sql`SELECT * FROM uni_assignments ORDER BY deadline ASC NULLS LAST, created_at ASC`;
    const goals         = await sql`SELECT * FROM uni_assignment_goals ORDER BY week_start DESC, created_at ASC`;
    const lectures      = await sql`SELECT * FROM uni_lectures ORDER BY lecture_date DESC, created_at DESC`;
    const studyTasks    = await sql`
      SELECT * FROM uni_study_tasks
      WHERE completed = FALSE OR (completed_at IS NOT NULL AND completed_at::date = ${today}::date)
      ORDER BY completed ASC, created_at ASC
    `;

    const assignmentsWithGoals = assignments.map(a => ({
      ...a,
      goals: goals.filter(g => g.assignment_id === a.id),
    }));

    return NextResponse.json({ modules, assignments: assignmentsWithGoals, lectures, studyTasks, today });
  } catch (e) {
    console.error("[uni GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const sql = getDb();
    const body = await req.json();
    const { action } = body as { action: string };

    // ── assignments ──────────────────────────────────────────────────────────

    if (action === "add_assignment") {
      const { moduleId, title, deadline, status, wordCountTarget, notes } = body as {
        moduleId: number; title: string; deadline?: string; status?: string;
        wordCountTarget?: number; notes?: string;
      };
      const [row] = await sql`
        INSERT INTO uni_assignments (module_id, title, deadline, status, word_count_target, notes)
        VALUES (${moduleId}, ${title.trim()}, ${deadline || null}, ${status || "not_started"}, ${wordCountTarget || null}, ${notes?.trim() || null})
        RETURNING *
      `;
      return NextResponse.json({ assignment: { ...row, goals: [] } });
    }

    if (action === "update_assignment") {
      const { id, status, wordCountCurrent, notes, deadline, wordCountTarget } = body as {
        id: number; status: string; wordCountCurrent: number; notes?: string;
        deadline?: string; wordCountTarget?: number;
      };
      const [row] = await sql`
        UPDATE uni_assignments SET
          status             = ${status},
          word_count_current = ${wordCountCurrent},
          notes              = ${notes ?? null},
          deadline           = ${deadline ?? null},
          word_count_target  = ${wordCountTarget ?? null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ assignment: row });
    }

    if (action === "delete_assignment") {
      await sql`DELETE FROM uni_assignments WHERE id = ${(body as { id: number }).id}`;
      return NextResponse.json({ ok: true });
    }

    // ── goals ────────────────────────────────────────────────────────────────

    if (action === "add_goal") {
      const { assignmentId, text } = body as { assignmentId: number; text: string };
      const ws = weekStartUK();
      const [row] = await sql`
        INSERT INTO uni_assignment_goals (assignment_id, text, week_start)
        VALUES (${assignmentId}, ${text.trim()}, ${ws})
        RETURNING *
      `;
      return NextResponse.json({ goal: row });
    }

    if (action === "toggle_goal") {
      const { id, completed } = body as { id: number; completed: boolean };
      const [row] = await sql`
        UPDATE uni_assignment_goals SET
          completed    = ${completed},
          completed_at = ${completed ? new Date().toISOString() : null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ goal: row });
    }

    if (action === "delete_goal") {
      await sql`DELETE FROM uni_assignment_goals WHERE id = ${(body as { id: number }).id}`;
      return NextResponse.json({ ok: true });
    }

    // ── lectures ─────────────────────────────────────────────────────────────

    if (action === "add_lecture") {
      const { moduleId, topic, lectureDate, understanding, notes } = body as {
        moduleId: number; topic: string; lectureDate: string;
        understanding: string; notes?: string;
      };
      const [row] = await sql`
        INSERT INTO uni_lectures (module_id, topic, lecture_date, understanding, notes)
        VALUES (${moduleId}, ${topic.trim()}, ${lectureDate}, ${understanding || "green"}, ${notes?.trim() || null})
        RETURNING *
      `;
      return NextResponse.json({ lecture: row });
    }

    if (action === "delete_lecture") {
      await sql`DELETE FROM uni_lectures WHERE id = ${(body as { id: number }).id}`;
      return NextResponse.json({ ok: true });
    }

    // ── study tasks ──────────────────────────────────────────────────────────

    if (action === "add_study_task") {
      const { moduleId, title } = body as { moduleId?: number; title: string };
      const today = todayUK();
      const [row] = await sql`
        INSERT INTO uni_study_tasks (module_id, title, task_date)
        VALUES (${moduleId ?? null}, ${title.trim()}, ${today})
        RETURNING *
      `;
      return NextResponse.json({ task: row });
    }

    if (action === "toggle_study_task") {
      const { id, completed } = body as { id: number; completed: boolean };
      const [row] = await sql`
        UPDATE uni_study_tasks SET
          completed    = ${completed},
          completed_at = ${completed ? new Date().toISOString() : null}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ task: row });
    }

    if (action === "delete_study_task") {
      await sql`DELETE FROM uni_study_tasks WHERE id = ${(body as { id: number }).id}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[uni POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
