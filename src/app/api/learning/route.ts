import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS learning_books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT DEFAULT 'Non-fiction',
    status TEXT DEFAULT 'want',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    date_started DATE,
    date_finished DATE,
    cover_emoji TEXT DEFAULT '📖',
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS learning_courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    platform TEXT,
    category TEXT DEFAULT 'Skill',
    progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    status TEXT DEFAULT 'in_progress',
    link TEXT,
    notes TEXT,
    emoji TEXT DEFAULT '🎓',
    created_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables();
    const books = await sql`SELECT * FROM learning_books ORDER BY status ASC, created_at DESC`;
    const courses = await sql`SELECT * FROM learning_courses ORDER BY status ASC, created_at DESC`;
    const stats = {
      booksRead: books.filter(b => b.status === "read").length,
      booksReading: books.filter(b => b.status === "reading").length,
      booksWant: books.filter(b => b.status === "want").length,
      coursesCompleted: courses.filter(c => c.status === "completed").length,
      coursesActive: courses.filter(c => c.status === "in_progress").length,
    };
    return NextResponse.json({ books, courses, stats });
  } catch (e) {
    return NextResponse.json({ books: [], courses: [], stats: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();
    await ensureTables();
    const body = await req.json();
    const { action, id } = body;

    if (action === "add-book") {
      const { title, author, genre, status, coverEmoji, notes } = body;
      const [book] = await sql`
        INSERT INTO learning_books (title, author, genre, status, cover_emoji, notes)
        VALUES (${title}, ${author || null}, ${genre || "Non-fiction"}, ${status || "want"}, ${coverEmoji || "📖"}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ book });
    }

    if (action === "update-book") {
      const { status, rating, notes, dateStarted, dateFinished } = body;
      const [book] = await sql`
        UPDATE learning_books SET status=${status}, rating=${rating || null}, notes=${notes || null},
          date_started=${dateStarted || null}, date_finished=${dateFinished || null}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ book });
    }

    if (action === "delete-book") {
      await sql`DELETE FROM learning_books WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    if (action === "add-course") {
      const { title, platform, category, link, emoji, notes } = body;
      const [course] = await sql`
        INSERT INTO learning_courses (title, platform, category, link, emoji, notes)
        VALUES (${title}, ${platform || null}, ${category || "Skill"}, ${link || null}, ${emoji || "🎓"}, ${notes || null})
        RETURNING *
      `;
      return NextResponse.json({ course });
    }

    if (action === "update-course") {
      const { progress, status, notes } = body;
      const finalStatus = progress >= 100 ? "completed" : (status || "in_progress");
      const [course] = await sql`
        UPDATE learning_courses SET progress_pct=${progress}, status=${finalStatus}, notes=${notes || null}
        WHERE id=${id} RETURNING *
      `;
      return NextResponse.json({ course });
    }

    if (action === "delete-course") {
      await sql`DELETE FROM learning_courses WHERE id=${id}`;
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
