import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS finance_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '💰',
    monthly_budget NUMERIC(10,2) DEFAULT 0,
    color TEXT DEFAULT '#b8d4c8',
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS finance_expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS finance_savings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount NUMERIC(10,2) NOT NULL,
    current_amount NUMERIC(10,2) DEFAULT 0,
    deadline DATE,
    emoji TEXT DEFAULT '🐷',
    color TEXT DEFAULT '#e8b4b8',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const categories = await sql`SELECT * FROM finance_categories ORDER BY name`;
    const expenses = await sql`
      SELECT e.*, c.name as category_name, c.emoji as category_emoji, c.color as category_color
      FROM finance_expenses e
      LEFT JOIN finance_categories c ON c.id = e.category_id
      WHERE TO_CHAR(e.expense_date, 'YYYY-MM') = ${month}
      ORDER BY e.expense_date DESC, e.created_at DESC
    `;
    const savings = await sql`SELECT * FROM finance_savings ORDER BY created_at DESC`;
    const [totals] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM finance_expenses
      WHERE TO_CHAR(expense_date, 'YYYY-MM') = ${month}
    `;
    const totalBudget = categories.reduce((s, c) => s + parseFloat(String(c.monthly_budget || 0)), 0);

    return NextResponse.json({ categories, expenses, savings, totals, totalBudget });
  } catch (e) {
    return NextResponse.json({ categories: [], expenses: [], savings: [], totals: { total_spent: 0 }, totalBudget: 0, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-category") {
      const { name, emoji, monthlyBudget, color } = body;
      const [cat] = await sql`
        INSERT INTO finance_categories (name, emoji, monthly_budget, color)
        VALUES (${name}, ${emoji || "💰"}, ${monthlyBudget || 0}, ${color || "#b8d4c8"})
        RETURNING *
      `;
      return NextResponse.json({ category: cat });
    }

    if (action === "update-category") {
      const { name, emoji, monthlyBudget, color } = body;
      const [cat] = await sql`
        UPDATE finance_categories SET name=${name}, emoji=${emoji||"💰"}, monthly_budget=${monthlyBudget||0}, color=${color||"#b8d4c8"}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ category: cat });
    }

    if (action === "delete-category") {
      await sql`DELETE FROM finance_categories WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-expense") {
      const { title, amount, categoryId, expenseDate, notes } = body;
      const [exp] = await sql`
        INSERT INTO finance_expenses (title, amount, category_id, expense_date, notes)
        VALUES (${title}, ${amount}, ${categoryId || null}, ${expenseDate || null}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ expense: exp });
    }

    if (action === "delete-expense") {
      await sql`DELETE FROM finance_expenses WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-savings") {
      const { name, targetAmount, currentAmount, deadline, emoji, color, notes } = body;
      const [sav] = await sql`
        INSERT INTO finance_savings (name, target_amount, current_amount, deadline, emoji, color, notes)
        VALUES (${name}, ${targetAmount}, ${currentAmount || 0}, ${deadline || null}, ${emoji || "🐷"}, ${color || "#e8b4b8"}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ saving: sav });
    }

    if (action === "update-savings") {
      const { currentAmount } = body;
      const [sav] = await sql`
        UPDATE finance_savings SET current_amount=${currentAmount} WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ saving: sav });
    }

    if (action === "delete-savings") {
      await sql`DELETE FROM finance_savings WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
