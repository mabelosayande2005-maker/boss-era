import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS job_applications (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      company TEXT NOT NULL,
      category TEXT DEFAULT 'Internship',
      status TEXT DEFAULT 'wishlist',
      deadline DATE,
      date_applied DATE,
      link TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS brand_wishlist (
      id SERIAL PRIMARY KEY,
      brand TEXT NOT NULL,
      platform TEXT DEFAULT 'TikTok',
      category TEXT,
      status TEXT DEFAULT 'dream',
      email TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS networking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      company TEXT,
      how_met TEXT,
      date_met DATE,
      follow_up_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();

    const applications = await sql`
      SELECT * FROM job_applications ORDER BY
        CASE status
          WHEN 'interview' THEN 1
          WHEN 'offer'     THEN 2
          WHEN 'applied'   THEN 3
          WHEN 'wishlist'  THEN 4
          WHEN 'withdrawn' THEN 5
          WHEN 'rejected'  THEN 6
        END, deadline ASC NULLS LAST, created_at DESC
    `;
    const brands = await sql`
      SELECT * FROM brand_wishlist ORDER BY
        CASE status
          WHEN 'in_talks'    THEN 1
          WHEN 'active'      THEN 2
          WHEN 'reached_out' THEN 3
          WHEN 'dream'       THEN 4
          WHEN 'archived'    THEN 5
        END, created_at DESC
    `;
    const contacts = await sql`
      SELECT * FROM networking ORDER BY follow_up_date ASC NULLS LAST, created_at DESC
    `;

    const stats = {
      totalApps:    applications.length,
      activeApps:   applications.filter((a) => !["rejected","withdrawn"].includes(a.status as string)).length,
      interviews:   applications.filter((a) => a.status === "interview").length,
      offers:       applications.filter((a) => a.status === "offer").length,
      dreamBrands:  brands.filter((b) => b.status === "dream").length,
      activeBrands: brands.filter((b) => ["in_talks","active"].includes(b.status as string)).length,
    };

    return NextResponse.json({ applications, brands, contacts, stats });
  } catch (e) {
    return NextResponse.json({ applications: [], brands: [], contacts: [], stats: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql  = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    // ── Applications ────────────────────────────────────────────────────────────
    if (action === "add-app") {
      const { role, company, category, status, deadline, dateApplied, link, notes } = body;
      const [app] = await sql`
        INSERT INTO job_applications (role, company, category, status, deadline, date_applied, link, notes)
        VALUES (${role}, ${company}, ${category || "Internship"}, ${status || "wishlist"},
                ${deadline || null}, ${dateApplied || null}, ${link || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ app });
    }

    if (action === "update-app") {
      const { role, company, category, status, deadline, dateApplied, link, notes } = body;
      const [app] = await sql`
        UPDATE job_applications SET
          role = ${role}, company = ${company}, category = ${category || "Internship"},
          status = ${status || "wishlist"}, deadline = ${deadline || null},
          date_applied = ${dateApplied || null}, link = ${link || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ app });
    }

    if (action === "status-app") {
      const [app] = await sql`
        UPDATE job_applications SET status = ${body.status} WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ app });
    }

    if (action === "delete-app") {
      await sql`DELETE FROM job_applications WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Brand wishlist ──────────────────────────────────────────────────────────
    if (action === "add-brand") {
      const { brand, platform, category, status, email, notes } = body;
      const [b] = await sql`
        INSERT INTO brand_wishlist (brand, platform, category, status, email, notes)
        VALUES (${brand}, ${platform || "TikTok"}, ${category || null},
                ${status || "dream"}, ${email || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ brand: b });
    }

    if (action === "update-brand") {
      const { brand, platform, category, status, email, notes } = body;
      const [b] = await sql`
        UPDATE brand_wishlist SET
          brand = ${brand}, platform = ${platform || "TikTok"}, category = ${category || null},
          status = ${status || "dream"}, email = ${email || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ brand: b });
    }

    if (action === "delete-brand") {
      await sql`DELETE FROM brand_wishlist WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    // ── Networking ──────────────────────────────────────────────────────────────
    if (action === "add-contact") {
      const { name, role, company, howMet, dateMet, followUpDate, notes } = body;
      const [c] = await sql`
        INSERT INTO networking (name, role, company, how_met, date_met, follow_up_date, notes)
        VALUES (${name}, ${role || null}, ${company || null}, ${howMet || null},
                ${dateMet || null}, ${followUpDate || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ contact: c });
    }

    if (action === "update-contact") {
      const { name, role, company, howMet, dateMet, followUpDate, notes } = body;
      const [c] = await sql`
        UPDATE networking SET
          name = ${name}, role = ${role || null}, company = ${company || null},
          how_met = ${howMet || null}, date_met = ${dateMet || null},
          follow_up_date = ${followUpDate || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ contact: c });
    }

    if (action === "delete-contact") {
      await sql`DELETE FROM networking WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
