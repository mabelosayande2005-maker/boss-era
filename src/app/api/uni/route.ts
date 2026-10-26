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

  // Timetable-aware lecture log. session_key links to the timetable constant in
  // the frontend; NULL for ad-hoc sessions.
  await sql`
    CREATE TABLE IF NOT EXISTS uni_lecture_logs (
      id            SERIAL PRIMARY KEY,
      session_key   TEXT,
      module_id     INTEGER REFERENCES uni_modules(id) ON DELETE SET NULL,
      session_type  TEXT NOT NULL DEFAULT 'Lecture',
      topic         TEXT,
      session_date  DATE NOT NULL,
      attended      BOOLEAN NOT NULL DEFAULT TRUE,
      understanding TEXT,
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `;

  // One log per timetabled session per date (NULLs are not equal, so ad-hoc
  // sessions with session_key IS NULL are exempt from this constraint).
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uni_lecture_logs_key_date_idx
      ON uni_lecture_logs (session_key, session_date)
      WHERE session_key IS NOT NULL
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
    const lectureLogs   = await sql`SELECT * FROM uni_lecture_logs ORDER BY session_date DESC, created_at DESC`;
    const studyTasks    = await sql`
      SELECT * FROM uni_study_tasks
      WHERE completed = FALSE OR (completed_at IS NOT NULL AND completed_at::date = ${today}::date)
      ORDER BY completed ASC, created_at ASC
    `;

    const assignmentsWithGoals = assignments.map(a => ({
      ...a,
      goals: goals.filter(g => g.assignment_id === a.id),
    }));

    // Log a sample of date values to aid debugging if a render crash occurs
    if (goals.length > 0) {
      const sample = goals[0];
      console.log("[uni GET] sample goal week_start raw:", sample.week_start, typeof sample.week_start);
    }
    if (lectureLogs.length > 0) {
      const sample = lectureLogs[0];
      console.log("[uni GET] sample log session_date raw:", sample.session_date, typeof sample.session_date);
    }

    return NextResponse.json({ modules, assignments: assignmentsWithGoals, lectureLogs, studyTasks, today });
  } catch (e) {
    console.error("[uni GET] error:", e);
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

    // ── lecture logs ─────────────────────────────────────────────────────────

    if (action === "log_session") {
      const { sessionKey, moduleId, sessionType, topic, sessionDate, attended, understanding, notes } = body as {
        sessionKey: string | null; moduleId: number | null; sessionType: string;
        topic?: string; sessionDate: string; attended: boolean;
        understanding?: string | null; notes?: string;
      };

      let row;
      if (sessionKey) {
        // Upsert for timetabled sessions
        [row] = await sql`
          INSERT INTO uni_lecture_logs (session_key, module_id, session_type, topic, session_date, attended, understanding, notes)
          VALUES (${sessionKey}, ${moduleId}, ${sessionType}, ${topic ?? null}, ${sessionDate}, ${attended}, ${understanding ?? null}, ${notes?.trim() ?? null})
          ON CONFLICT (session_key, session_date) WHERE session_key IS NOT NULL
          DO UPDATE SET
            attended      = EXCLUDED.attended,
            understanding = EXCLUDED.understanding,
            notes         = EXCLUDED.notes
          RETURNING *
        `;
      } else {
        // Insert for ad-hoc sessions (no conflict clause — NULLs are exempt)
        [row] = await sql`
          INSERT INTO uni_lecture_logs (session_key, module_id, session_type, topic, session_date, attended, understanding, notes)
          VALUES (NULL, ${moduleId}, ${sessionType}, ${topic?.trim() ?? null}, ${sessionDate}, ${attended}, ${understanding ?? null}, ${notes?.trim() ?? null})
          RETURNING *
        `;
      }
      return NextResponse.json({ log: row });
    }

    if (action === "delete_session_log") {
      await sql`DELETE FROM uni_lecture_logs WHERE id = ${(body as { id: number }).id}`;
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
