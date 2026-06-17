import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS summer_tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      stream TEXT NOT NULL DEFAULT 'Admin',
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const tasks = await sql`
      SELECT * FROM summer_tasks ORDER BY stream ASC, sort_order ASC, created_at ASC
    `;
    return NextResponse.json({ tasks });
  } catch (e) {
    console.error("[summer-tasks GET]", e);
    return NextResponse.json({ tasks: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, title, stream, notes } = body;

    if (action === "add") {
      const [maxOrder] = await sql`
        SELECT COALESCE(MAX(sort_order), 0) as max_order FROM summer_tasks WHERE stream = ${stream}
      ` as { max_order: number }[];
      const [task] = await sql`
        INSERT INTO summer_tasks (title, stream, notes, sort_order)
        VALUES (${title}, ${stream}, ${notes || null}, ${(maxOrder?.max_order ?? 0) + 1})
        RETURNING *
      `;
      return NextResponse.json({ task });
    }

    if (action === "toggle") {
      const [existing] = await sql`SELECT completed FROM summer_tasks WHERE id = ${id}` as { completed: boolean }[];
      const newCompleted = !existing.completed;
      const [task] = await sql`
        UPDATE summer_tasks
        SET completed = ${newCompleted}, completed_at = ${newCompleted ? new Date().toISOString() : null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ task });
    }

    if (action === "delete") {
      await sql`DELETE FROM summer_tasks WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "update") {
      const [task] = await sql`
        UPDATE summer_tasks SET title = ${title}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ task });
    }

    if (action === "seed") {
      const seeds = [
        { title: "Post 3× a week consistently", stream: "Personal TikTok", order: 1 },
        { title: "Film summer aesthetic content", stream: "Personal TikTok", order: 2 },
        { title: "Reach 1k followers milestone", stream: "Personal TikTok", order: 3 },
        { title: "Set up TikTok Shop affiliate", stream: "Personal TikTok", order: 4 },
        { title: "Film first brand deal content", stream: "Personal TikTok", order: 5 },
        { title: "Post 1× per week StudyGlow content", stream: "StudyGlow", order: 1 },
        { title: "Plan back-to-uni content series", stream: "StudyGlow", order: 2 },
        { title: "Film 'my summer study routine' video", stream: "StudyGlow", order: 3 },
        { title: "Reach 5k StudyGlow followers", stream: "StudyGlow", order: 4 },
        { title: "List everything from current wardrobe", stream: "Vinted", order: 1 },
        { title: "First Fleek haul and flip", stream: "Vinted", order: 2 },
        { title: "Hit £200 Vinted profit", stream: "Vinted", order: 3 },
        { title: "Set up Vinted bundle offers", stream: "Vinted", order: 4 },
        { title: "Complete AI course (current module)", stream: "Skills", order: 1 },
        { title: "Finish current sewing project", stream: "Skills", order: 2 },
        { title: "Italian — reach B1 level", stream: "Skills", order: 3 },
        { title: "Dance class every week", stream: "Skills", order: 4 },
        { title: "Update CV for September placements", stream: "Admin", order: 1 },
        { title: "Research target placement companies", stream: "Admin", order: 2 },
        { title: "Set up Sunday planning ritual", stream: "Admin", order: 3 },
        { title: "Book doctor / dentist appointments", stream: "Admin", order: 4 },
        { title: "Sort student finance for next year", stream: "Admin", order: 5 },
      ];
      for (const s of seeds) {
        await sql`
          INSERT INTO summer_tasks (title, stream, sort_order)
          SELECT ${s.title}, ${s.stream}, ${s.order}
          WHERE NOT EXISTS (SELECT 1 FROM summer_tasks WHERE title = ${s.title})
        `;
      }
      return NextResponse.json({ seeded: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[summer-tasks POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
