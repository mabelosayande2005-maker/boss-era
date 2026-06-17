import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS social_events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT 'Hangout',
    people TEXT,
    event_date DATE,
    venue TEXT,
    notes TEXT,
    vibe_rating INTEGER CHECK (vibe_rating >= 1 AND vibe_rating <= 5),
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS social_plans (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    with_who TEXT,
    plan_date DATE,
    status TEXT DEFAULT 'idea',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

function normEvent(e: Record<string, unknown>) {
  return { ...e, event_date: norm(e.event_date) };
}

function normPlan(p: Record<string, unknown>) {
  return { ...p, plan_date: norm(p.plan_date) };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const events = await sql`SELECT * FROM social_events ORDER BY event_date DESC NULLS LAST, created_at DESC`;
    const plans = await sql`SELECT * FROM social_plans ORDER BY status ASC, plan_date ASC NULLS LAST, created_at DESC`;
    return NextResponse.json({
      events: events.map(e => normEvent(e as Record<string, unknown>)),
      plans: plans.map(p => normPlan(p as Record<string, unknown>)),
    });
  } catch (e) {
    console.error("[social GET]", e);
    return NextResponse.json({ events: [], plans: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-event") {
      const { title, eventType, people, eventDate, venue, notes, vibeRating } = body;
      const [event] = await sql`
        INSERT INTO social_events (title, event_type, people, event_date, venue, notes, vibe_rating)
        VALUES (${title}, ${eventType || "Hangout"}, ${people || null}, ${eventDate || null}, ${venue || null}, ${notes || null}, ${vibeRating || null})
        RETURNING *
      `;
      return NextResponse.json({ event: normEvent(event as Record<string, unknown>) });
    }

    if (action === "delete-event") {
      await sql`DELETE FROM social_events WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-plan") {
      const { title, withWho, planDate, notes } = body;
      const [plan] = await sql`
        INSERT INTO social_plans (title, with_who, plan_date, notes)
        VALUES (${title}, ${withWho || null}, ${planDate || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ plan: normPlan(plan as Record<string, unknown>) });
    }

    if (action === "update-plan") {
      const { status } = body;
      const [plan] = await sql`UPDATE social_plans SET status=${status} WHERE id=${id} RETURNING *`;
      return NextResponse.json({ plan: normPlan(plan as Record<string, unknown>) });
    }

    if (action === "delete-plan") {
      await sql`DELETE FROM social_plans WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[social POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
