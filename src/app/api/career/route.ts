import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS job_applications (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      company TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Internship'`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'wishlist'`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS deadline DATE`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS date_applied DATE`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS link TEXT`;
  await sql`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS notes TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS brand_wishlist (
      id SERIAL PRIMARY KEY,
      brand TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE brand_wishlist ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'TikTok'`;
  await sql`ALTER TABLE brand_wishlist ADD COLUMN IF NOT EXISTS category TEXT`;
  await sql`ALTER TABLE brand_wishlist ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'dream'`;
  await sql`ALTER TABLE brand_wishlist ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE brand_wishlist ADD COLUMN IF NOT EXISTS notes TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS networking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS role TEXT`;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS company TEXT`;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS how_met TEXT`;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS date_met DATE`;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS follow_up_date DATE`;
  await sql`ALTER TABLE networking ADD COLUMN IF NOT EXISTS notes TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS skills_certificates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE skills_certificates ADD COLUMN IF NOT EXISTS source TEXT`;
  await sql`ALTER TABLE skills_certificates ADD COLUMN IF NOT EXISTS date_earned DATE`;
}

function normApp(a: Record<string, unknown>): Record<string, unknown> {
  return { ...a, deadline: norm(a.deadline), date_applied: norm(a.date_applied) };
}

function normSkill(s: Record<string, unknown>): Record<string, unknown> {
  return { ...s, date_earned: norm(s.date_earned) };
}

function normContact(c: Record<string, unknown>) {
  return { ...c, date_met: norm(c.date_met), follow_up_date: norm(c.follow_up_date) };
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
    const skills = await sql`
      SELECT * FROM skills_certificates ORDER BY date_earned DESC NULLS LAST, created_at DESC
    `;

    const normApps = applications.map(a => normApp(a as Record<string, unknown>));
    const stats = {
      totalApps:    normApps.length,
      activeApps:   normApps.filter(a => !["rejected","withdrawn"].includes(a.status as string)).length,
      interviews:   normApps.filter(a => a.status === "interview").length,
      offers:       normApps.filter(a => a.status === "offer").length,
      dreamBrands:  brands.filter(b => b.status === "dream").length,
      activeBrands: brands.filter(b => ["in_talks","active"].includes(b.status as string)).length,
    };

    return NextResponse.json({
      applications: normApps,
      brands,
      contacts: contacts.map(c => normContact(c as Record<string, unknown>)),
      skills: skills.map(s => normSkill(s as Record<string, unknown>)),
      stats,
    });
  } catch (e) {
    console.error("[career GET]", e);
    return NextResponse.json({ applications: [], brands: [], contacts: [], skills: [], stats: {}, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql  = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-app") {
      const { role, company, category, status, deadline, dateApplied, link, notes } = body;
      const [app] = await sql`
        INSERT INTO job_applications (role, company, category, status, deadline, date_applied, link, notes)
        VALUES (${role}, ${company}, ${category ?? "Internship"}, ${status ?? "wishlist"},
                ${deadline ?? null}, ${dateApplied ?? null}, ${link ?? null}, ${notes ?? null})
        RETURNING *
      `;
      return NextResponse.json({ app: normApp(app as Record<string, unknown>) });
    }

    if (action === "update-app") {
      const { role, company, category, status, deadline, dateApplied, link, notes } = body;
      const [app] = await sql`
        UPDATE job_applications SET
          role = ${role}, company = ${company}, category = ${category ?? "Internship"},
          status = ${status ?? "wishlist"}, deadline = ${deadline ?? null},
          date_applied = ${dateApplied ?? null}, link = ${link ?? null}, notes = ${notes ?? null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ app: normApp(app as Record<string, unknown>) });
    }

    if (action === "status-app") {
      const [app] = await sql`
        UPDATE job_applications SET status = ${body.status} WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ app: normApp(app as Record<string, unknown>) });
    }

    if (action === "delete-app") {
      await sql`DELETE FROM job_applications WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-brand") {
      const { brand, platform, category, status, email, notes } = body;
      const [b] = await sql`
        INSERT INTO brand_wishlist (brand, platform, category, status, email, notes)
        VALUES (${brand}, ${platform ?? "TikTok"}, ${category ?? null},
                ${status ?? "dream"}, ${email ?? null}, ${notes ?? null})
        RETURNING *
      `;
      return NextResponse.json({ brand: b });
    }

    if (action === "update-brand") {
      const { brand, platform, category, status, email, notes } = body;
      const [b] = await sql`
        UPDATE brand_wishlist SET
          brand = ${brand}, platform = ${platform ?? "TikTok"}, category = ${category ?? null},
          status = ${status ?? "dream"}, email = ${email ?? null}, notes = ${notes ?? null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ brand: b });
    }

    if (action === "delete-brand") {
      await sql`DELETE FROM brand_wishlist WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-contact") {
      const { name, role, company, howMet, dateMet, followUpDate, notes } = body;
      const [c] = await sql`
        INSERT INTO networking (name, role, company, how_met, date_met, follow_up_date, notes)
        VALUES (${name}, ${role ?? null}, ${company ?? null}, ${howMet ?? null},
                ${dateMet ?? null}, ${followUpDate ?? null}, ${notes ?? null})
        RETURNING *
      `;
      return NextResponse.json({ contact: normContact(c as Record<string, unknown>) });
    }

    if (action === "update-contact") {
      const { name, role, company, howMet, dateMet, followUpDate, notes } = body;
      const [c] = await sql`
        UPDATE networking SET
          name = ${name}, role = ${role ?? null}, company = ${company ?? null},
          how_met = ${howMet ?? null}, date_met = ${dateMet ?? null},
          follow_up_date = ${followUpDate ?? null}, notes = ${notes ?? null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ contact: normContact(c as Record<string, unknown>) });
    }

    if (action === "delete-contact") {
      await sql`DELETE FROM networking WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-skill") {
      const { name, source, dateEarned } = body;
      const [skill] = await sql`
        INSERT INTO skills_certificates (name, source, date_earned)
        VALUES (${name}, ${source ?? null}, ${dateEarned ?? null})
        RETURNING *
      `;
      return NextResponse.json({ skill: normSkill(skill as Record<string, unknown>) });
    }

    if (action === "delete-skill") {
      await sql`DELETE FROM skills_certificates WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[career POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
