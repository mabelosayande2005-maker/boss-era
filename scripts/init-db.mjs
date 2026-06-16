import { neon } from "@neondatabase/serverless";

const sql = neon(
  "postgresql://neondb_owner:npg_EzVW90LrxQyJ@ep-bitter-night-aiomfjkn-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
);

const tables = [
  {
    name: "habits",
    sql: `CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      target_per_week INTEGER DEFAULT 1,
      color TEXT DEFAULT '#b8d4c8',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "habit_completions",
    sql: `CREATE TABLE IF NOT EXISTS habit_completions (
      id SERIAL PRIMARY KEY,
      habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
      completed_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(habit_id, completed_date)
    )`,
  },
  {
    name: "tasks",
    sql: `CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      due_date DATE,
      priority TEXT DEFAULT 'medium',
      category TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "mood_logs",
    sql: `CREATE TABLE IF NOT EXISTS mood_logs (
      id SERIAL PRIMARY KEY,
      mood INTEGER,
      energy INTEGER,
      anxiety INTEGER,
      sleep_hours NUMERIC(4,1),
      water_glasses INTEGER DEFAULT 0,
      journal TEXT,
      log_date DATE UNIQUE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "income_entries",
    sql: `CREATE TABLE IF NOT EXISTS income_entries (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      currency TEXT DEFAULT 'GBP',
      date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "affirmations",
    sql: `CREATE TABLE IF NOT EXISTS affirmations (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "goals",
    sql: `CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      target_value NUMERIC(10,2),
      current_value NUMERIC(10,2) DEFAULT 0,
      deadline DATE,
      color TEXT DEFAULT '#8fada0',
      emoji TEXT DEFAULT '🌟',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "goal_milestones",
    sql: `CREATE TABLE IF NOT EXISTS goal_milestones (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "finance_categories",
    sql: `CREATE TABLE IF NOT EXISTS finance_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      budget NUMERIC(10,2),
      color TEXT DEFAULT '#8fada0',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "finance_expenses",
    sql: `CREATE TABLE IF NOT EXISTS finance_expenses (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "finance_savings",
    sql: `CREATE TABLE IF NOT EXISTS finance_savings (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      target NUMERIC(10,2),
      current NUMERIC(10,2) DEFAULT 0,
      color TEXT DEFAULT '#8fada0',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "wellbeing_logs",
    sql: `CREATE TABLE IF NOT EXISTS wellbeing_logs (
      id SERIAL PRIMARY KEY,
      mood INTEGER,
      energy INTEGER,
      anxiety INTEGER,
      sleep_hours NUMERIC(4,1),
      water_glasses INTEGER DEFAULT 0,
      journal TEXT,
      log_date DATE UNIQUE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "learning_books",
    sql: `CREATE TABLE IF NOT EXISTS learning_books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      status TEXT DEFAULT 'want',
      rating INTEGER,
      notes TEXT,
      cover_emoji TEXT DEFAULT '📖',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "learning_courses",
    sql: `CREATE TABLE IF NOT EXISTS learning_courses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      platform TEXT,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "recipes",
    sql: `CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      cuisine TEXT,
      difficulty TEXT DEFAULT 'easy',
      ingredients TEXT,
      method TEXT,
      emoji TEXT DEFAULT '🍽️',
      is_favourite BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "travel_trips",
    sql: `CREATE TABLE IF NOT EXISTS travel_trips (
      id SERIAL PRIMARY KEY,
      destination TEXT NOT NULL,
      country TEXT,
      status TEXT DEFAULT 'wishlist',
      start_date DATE,
      end_date DATE,
      notes TEXT,
      emoji TEXT DEFAULT '✈️',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "travel_bucket",
    sql: `CREATE TABLE IF NOT EXISTS travel_bucket (
      id SERIAL PRIMARY KEY,
      destination TEXT NOT NULL,
      country TEXT,
      emoji TEXT DEFAULT '🌍',
      is_done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "social_events",
    sql: `CREATE TABLE IF NOT EXISTS social_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date DATE,
      people TEXT,
      vibe INTEGER,
      notes TEXT,
      emoji TEXT DEFAULT '🥂',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "social_plans",
    sql: `CREATE TABLE IF NOT EXISTS social_plans (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date DATE,
      people TEXT,
      status TEXT DEFAULT 'idea',
      notes TEXT,
      emoji TEXT DEFAULT '📅',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "music_entries",
    sql: `CREATE TABLE IF NOT EXISTS music_entries (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      mood TEXT,
      notes TEXT,
      is_pinned BOOLEAN DEFAULT FALSE,
      entry_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "music_playlists",
    sql: `CREATE TABLE IF NOT EXISTS music_playlists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      emoji TEXT DEFAULT '🎵',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: "notes",
    sql: `CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      color TEXT DEFAULT '#fff',
      is_pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
];

async function run() {
  console.log("Initialising Boss Era database…\n");
  for (const t of tables) {
    try {
      await sql.unsafe(t.sql);
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      console.error(`  ✗ ${t.name}: ${e.message}`);
    }
  }

  const existing = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log(`\nTables in DB (${existing.length}): ${existing.map((r) => r.tablename).join(", ")}`);
  console.log("\nDone ✦");
}

run().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
