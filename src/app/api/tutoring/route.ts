import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS tutoring_clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      exam_board TEXT NOT NULL DEFAULT 'AQA',
      level TEXT NOT NULL DEFAULT 'GCSE',
      hourly_rate NUMERIC(8,2),
      session_day TEXT,
      session_time TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      current_lesson INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE tutoring_clients ADD COLUMN IF NOT EXISTS current_topic TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS tutoring_sessions (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES tutoring_clients(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      lesson_number INTEGER NOT NULL DEFAULT 1,
      topic_covered TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tutoring_prep (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES tutoring_clients(id) ON DELETE CASCADE UNIQUE,
      next_lesson_number INTEGER DEFAULT 1,
      topic TEXT,
      notes TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: Request) {
  await ensureTables();
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");

  if (clientId) {
    const rows = await sql`SELECT * FROM tutoring_clients WHERE id = ${Number(clientId)}`;
    const client = rows[0] ?? null;
    const sessions = await sql`SELECT * FROM tutoring_sessions WHERE client_id = ${Number(clientId)} ORDER BY session_date DESC, id DESC`;
    const prepRows = await sql`SELECT * FROM tutoring_prep WHERE client_id = ${Number(clientId)}`;
    return NextResponse.json({ client, sessions, prep: prepRows[0] ?? null });
  }

  const clients = await sql`SELECT * FROM tutoring_clients ORDER BY name ASC`;
  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  await ensureTables();
  const sql = getDb();
  const body = await req.json();

  switch (body.action) {
    case "add_client": {
      const { name, subject, exam_board, level, hourly_rate, session_day, session_time } = body;
      const rows = await sql`
        INSERT INTO tutoring_clients (name, subject, exam_board, level, hourly_rate, session_day, session_time)
        VALUES (${name}, ${subject}, ${exam_board}, ${level}, ${hourly_rate || null}, ${session_day || null}, ${session_time || null})
        RETURNING *
      `;
      return NextResponse.json(rows[0]);
    }

    case "update_client": {
      const { id, name, subject, exam_board, level, hourly_rate, session_day, session_time, is_active } = body;
      const rows = await sql`
        UPDATE tutoring_clients
        SET name = ${name}, subject = ${subject}, exam_board = ${exam_board}, level = ${level},
            hourly_rate = ${hourly_rate || null}, session_day = ${session_day || null},
            session_time = ${session_time || null}, is_active = ${is_active ?? true}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json(rows[0]);
    }

    case "delete_client": {
      await sql`DELETE FROM tutoring_clients WHERE id = ${body.id}`;
      return NextResponse.json({ ok: true });
    }

    case "add_session": {
      const { client_id, session_date, lesson_number, topic_covered, notes } = body;
      const rows = await sql`
        INSERT INTO tutoring_sessions (client_id, session_date, lesson_number, topic_covered, notes)
        VALUES (${client_id}, ${session_date}, ${lesson_number}, ${topic_covered || null}, ${notes || null})
        RETURNING *
      `;
      await sql`
        UPDATE tutoring_clients
        SET current_lesson = GREATEST(current_lesson, ${Number(lesson_number) + 1})
        WHERE id = ${client_id}
      `;
      return NextResponse.json(rows[0]);
    }

    case "delete_session": {
      await sql`DELETE FROM tutoring_sessions WHERE id = ${body.id}`;
      return NextResponse.json({ ok: true });
    }

    case "save_prep": {
      const { client_id, next_lesson_number, topic, notes } = body;
      const rows = await sql`
        INSERT INTO tutoring_prep (client_id, next_lesson_number, topic, notes, updated_at)
        VALUES (${client_id}, ${next_lesson_number ?? 1}, ${topic || null}, ${notes || null}, NOW())
        ON CONFLICT (client_id) DO UPDATE SET
          next_lesson_number = EXCLUDED.next_lesson_number,
          topic = EXCLUDED.topic,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `;
      return NextResponse.json(rows[0]);
    }

    case "update_progress": {
      const { client_id, current_lesson, current_topic } = body;
      const rows = await sql`
        UPDATE tutoring_clients
        SET current_lesson = ${current_lesson}, current_topic = ${current_topic || null}
        WHERE id = ${client_id}
        RETURNING *
      `;
      return NextResponse.json(rows[0]);
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
