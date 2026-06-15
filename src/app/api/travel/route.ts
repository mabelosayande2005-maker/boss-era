import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS travel_trips (
    id SERIAL PRIMARY KEY,
    destination TEXT NOT NULL,
    country TEXT,
    emoji TEXT DEFAULT '✈️',
    status TEXT DEFAULT 'wishlist',
    start_date DATE,
    end_date DATE,
    budget_target NUMERIC(10,2),
    budget_spent NUMERIC(10,2) DEFAULT 0,
    accommodation TEXT,
    notes TEXT,
    highlights TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS travel_bucket (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    category TEXT DEFAULT 'Experience',
    done BOOLEAN DEFAULT FALSE,
    trip_id INTEGER REFERENCES travel_trips(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const trips = await sql`SELECT * FROM travel_trips ORDER BY status ASC, start_date ASC NULLS LAST, created_at DESC`;
    const bucket = await sql`SELECT * FROM travel_bucket ORDER BY done ASC, created_at DESC`;
    const stats = {
      visited: trips.filter(t => t.status === "visited").length,
      planned: trips.filter(t => t.status === "planned").length,
      wishlist: trips.filter(t => t.status === "wishlist").length,
    };
    return NextResponse.json({ trips, bucket, stats });
  } catch (e) {
    return NextResponse.json({ trips: [], bucket: [], stats: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-trip") {
      const { destination, country, emoji, status, startDate, endDate, budgetTarget, accommodation, notes } = body;
      const [trip] = await sql`
        INSERT INTO travel_trips (destination, country, emoji, status, start_date, end_date, budget_target, accommodation, notes)
        VALUES (${destination}, ${country || null}, ${emoji || "✈️"}, ${status || "wishlist"}, ${startDate || null}, ${endDate || null}, ${budgetTarget || null}, ${accommodation || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ trip });
    }

    if (action === "update-trip") {
      const { status, budgetSpent, highlights, notes } = body;
      const [trip] = await sql`
        UPDATE travel_trips SET status=${status}, budget_spent=${budgetSpent || 0}, highlights=${highlights || null}, notes=${notes || null}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ trip });
    }

    if (action === "delete-trip") {
      await sql`DELETE FROM travel_trips WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-bucket") {
      const { item, category } = body;
      const [b] = await sql`
        INSERT INTO travel_bucket (item, category) VALUES (${item}, ${category || "Experience"}) RETURNING *
      `;
      return NextResponse.json({ bucket: b });
    }

    if (action === "toggle-bucket") {
      const [b] = await sql`SELECT done FROM travel_bucket WHERE id=${id}`;
      const [updated] = await sql`UPDATE travel_bucket SET done=${!b.done} WHERE id=${id} RETURNING *`;
      return NextResponse.json({ bucket: updated });
    }

    if (action === "delete-bucket") {
      await sql`DELETE FROM travel_bucket WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
