import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (d: unknown) =>
  d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS paye_payslips (
    id SERIAL PRIMARY KEY,
    employer TEXT NOT NULL,
    pay_date DATE,
    gross_pay NUMERIC(10,2),
    tax_deducted NUMERIC(10,2) DEFAULT 0,
    ni_deducted NUMERIC(10,2) DEFAULT 0,
    tax_code TEXT,
    net_pay NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

function normalizePayslip(p: Record<string, unknown>) {
  return { ...p, pay_date: norm(p.pay_date) };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const payslips = await sql`
      SELECT * FROM paye_payslips ORDER BY pay_date DESC, created_at DESC
    `;
    const [totals] = await sql`
      SELECT
        COALESCE(SUM(gross_pay), 0) as total_gross,
        COALESCE(SUM(tax_deducted), 0) as total_tax,
        COALESCE(SUM(ni_deducted), 0) as total_ni,
        COALESCE(SUM(net_pay), 0) as total_net
      FROM paye_payslips
    `;
    const [latestCode] = await sql`
      SELECT tax_code FROM paye_payslips
      WHERE tax_code IS NOT NULL AND tax_code != ''
      ORDER BY pay_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;
    return NextResponse.json(
      {
        payslips: payslips.map(p => normalizePayslip(p as Record<string, unknown>)),
        totals,
        latestTaxCode: (latestCode as Record<string, unknown> | undefined)?.tax_code ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[paye GET]", e);
    return NextResponse.json({ error: String(e), payslips: [], totals: {}, latestTaxCode: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id, employer, payDate, grossPay, taxDeducted, niDeducted, taxCode, netPay, notes } = body;

    if (action === "add") {
      const [payslip] = await sql`
        INSERT INTO paye_payslips (employer, pay_date, gross_pay, tax_deducted, ni_deducted, tax_code, net_pay, notes)
        VALUES (
          ${employer}, ${payDate || null}, ${grossPay || null},
          ${taxDeducted || 0}, ${niDeducted || 0},
          ${taxCode || null}, ${netPay || null}, ${notes || null}
        )
        RETURNING *
      `;
      return NextResponse.json({ payslip: normalizePayslip(payslip as Record<string, unknown>) });
    }

    if (action === "update") {
      const [payslip] = await sql`
        UPDATE paye_payslips
        SET employer = ${employer}, pay_date = ${payDate || null},
            gross_pay = ${grossPay || null}, tax_deducted = ${taxDeducted || 0},
            ni_deducted = ${niDeducted || 0}, tax_code = ${taxCode || null},
            net_pay = ${netPay || null}, notes = ${notes || null}
        WHERE id = ${id} RETURNING *
      `;
      return NextResponse.json({ payslip: normalizePayslip(payslip as Record<string, unknown>) });
    }

    if (action === "delete") {
      await sql`DELETE FROM paye_payslips WHERE id = ${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[paye POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
