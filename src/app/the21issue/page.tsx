"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

type BadgeVariant = "pages" | "note";

type Item = {
  id: string;
  label: string;
  pages: number;             // contribution to progress bar (min value for ranges)
  badge: string | null;      // text shown on right — null = no badge
  badgeVariant?: BadgeVariant;
};

type Chapter = {
  id: string;
  title: string;
  emoji: string;
  accent: string;
  bg: string;
  items: Item[];
};

// ─── data (exact order from original checklist) ───────────────────────────────
// IMPORTANT: never change an item's `id` once set — ids are the localStorage keys
// that preserve Mabel's ticked state across code updates. Only add new ids; never
// renumber or rename existing ones, even if you reorder or rename the label.

const CHAPTERS: Chapter[] = [
  {
    id: "setup",
    title: "Set-up",
    emoji: "⚙️",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "setup-gather-photos",    label: "Gather all photos & memories",              pages: 0, badge: null },
      { id: "setup-collect-content",  label: "Collect written content from friends",       pages: 0, badge: null },
      { id: "setup-canva-template",   label: "Set up Canva template & cover design",       pages: 0, badge: null },
      { id: "setup-fonts-palette",    label: "Choose fonts, colour palette & aesthetic",   pages: 0, badge: null },
      { id: "setup-page-count",       label: "Plan final page count & Mixam spec",         pages: 0, badge: null },
    ],
  },
  {
    id: "cover",
    title: "Cover and inside cover",
    emoji: "✨",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "cover-front",    label: "Front cover",                     pages: 0, badge: null },
      { id: "cover-spine",    label: "Spine",                           pages: 0, badge: null },
      { id: "cover-ifc",      label: "Inside front cover: Contents",    pages: 0, badge: "do last", badgeVariant: "note" },
    ],
  },
  {
    id: "front",
    title: "Front of the magazine",
    emoji: "🌸",
    accent: "var(--lavender)",
    bg: "var(--lavender-pale)",
    items: [
      { id: "front-editors-letter",   label: "Editor's letter",          pages: 1, badge: "1 page",    badgeVariant: "pages" },
      { id: "front-meet-editor",      label: "Meet the editor",          pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "front-notes-people",     label: "Notes from my people",     pages: 1, badge: "1–2 pages", badgeVariant: "pages" },
      { id: "front-21-things",        label: "21 things I learned",      pages: 2, badge: "2 pages",   badgeVariant: "pages" },
    ],
  },
  {
    id: "ch1",
    title: "Chapter 1: The Recap",
    emoji: "📸",
    accent: "var(--gold)",
    bg: "rgba(253,248,232,0.9)",
    items: [
      { id: "ch1-year-in-review",  label: "Year in review",   pages: 4, badge: "4 pages", badgeVariant: "pages" },
      { id: "ch1-brainstorm",      label: "Brainstorm page",  pages: 1, badge: "1 page",  badgeVariant: "pages" },
    ],
  },
  {
    id: "ch2",
    title: "Chapter 2: Lifestyle",
    emoji: "🌿",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "ch2-routines",       label: "Routines",                                                    pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "ch2-plan-my-day",    label: "How I plan my day (one of each)",                             pages: 1, badge: "1–2 pages", badgeVariant: "pages" },
      { id: "ch2-glow-up",        label: "The glow-up",                                                 pages: 2, badge: "2–4 pages", badgeVariant: "pages" },
      { id: "ch2-style-edit",     label: "Style edit",                                                  pages: 4, badge: "4 pages",   badgeVariant: "pages" },
      { id: "ch2-solo-date",      label: "Solo date bucket list",                                       pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "ch2-whats-in-bag",   label: "Optional: What's in Mabel's bag, fragrance and make-up",     pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "ch2-brainstorm",     label: "Brainstorm page",                                             pages: 1, badge: "1 page",    badgeVariant: "pages" },
    ],
  },
  {
    id: "ch3",
    title: "Chapter 3: The Hustle",
    emoji: "💸",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "ch3-income-streams",  label: "Income streams, investments and balance",  pages: 4, badge: "4 pages", badgeVariant: "pages" },
      { id: "ch3-creator-page",    label: "The creator page",                         pages: 2, badge: "2 pages", badgeVariant: "pages" },
      { id: "ch3-career-mindmap",  label: "Career mindmap",                           pages: 2, badge: "2 pages", badgeVariant: "pages" },
      { id: "ch3-brainstorm",      label: "Brainstorm page",                          pages: 1, badge: "1 page",  badgeVariant: "pages" },
    ],
  },
  {
    id: "ch4",
    title: "Chapter 4: Faith and Mind",
    emoji: "🕊️",
    accent: "var(--lavender)",
    bg: "var(--lavender-pale)",
    items: [
      { id: "ch4-journey-god",        label: "My journey with God, faith and testimony",  pages: 4, badge: "4 pages",   badgeVariant: "pages" },
      { id: "ch4-letter-god",         label: "Letter to God",                             pages: 1, badge: "1–2 pages", badgeVariant: "pages" },
      { id: "ch4-my-prayers",         label: "My prayers",                                pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "ch4-answered-prayers",   label: "Answered prayers",                          pages: 2, badge: "2 pages",   badgeVariant: "pages" },
      { id: "ch4-journal-pages",      label: "Journal pages",                             pages: 4, badge: "4–6 pages", badgeVariant: "pages" },
      { id: "ch4-brainstorm",         label: "Brainstorm page",                           pages: 1, badge: "1 page",    badgeVariant: "pages" },
    ],
  },
  {
    id: "ch5",
    title: "Chapter 5: The Future",
    emoji: "🌙",
    accent: "var(--gold)",
    bg: "rgba(253,248,232,0.9)",
    items: [
      { id: "ch5-vision-board",    label: "Vision board",     pages: 2, badge: "2–4 pages", badgeVariant: "pages" },
      { id: "ch5-goal-pages",      label: "Goal pages",       pages: 1, badge: "1 per goal", badgeVariant: "note" },
      { id: "ch5-passport-ready",  label: "Passport ready",   pages: 4, badge: "4 pages",   badgeVariant: "pages" },
      { id: "ch5-dream-man",       label: "Dream Man",        pages: 1, badge: "1 page",    badgeVariant: "pages" },
    ],
  },
  {
    id: "back",
    title: "Back of the magazine",
    emoji: "💌",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "back-sudoku",      label: "Sudoku",                                       pages: 2, badge: "2 pages", badgeVariant: "pages" },
      { id: "back-ibc-letter",  label: "Inside back cover: Letter to 22-year-old me", pages: 1, badge: "1 page",  badgeVariant: "pages" },
      { id: "back-cover",       label: "Back cover",                                   pages: 0, badge: null },
    ],
  },
  {
    id: "printing",
    title: "Before printing",
    emoji: "🖨️",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "print-delete-colour",    label: "Delete the colour page",                pages: 0, badge: null },
      { id: "print-check-pg-numbers", label: "Check every heart page number",         pages: 0, badge: null },
      { id: "print-proofread",        label: "Proofread and check photos are sharp",  pages: 0, badge: null },
      { id: "print-even-count",       label: "Make sure the page count is even",      pages: 0, badge: null },
      { id: "print-export-pdf",       label: "Export PDF Print with bleed",           pages: 0, badge: null },
      { id: "print-order-mixam",      label: "Order on Mixam by 12 November",         pages: 0, badge: null },
    ],
  },
];

const ALL_ITEMS = CHAPTERS.flatMap(c => c.items);
// Progress counts only items with actual pages (covers/tasks = 0)
const TOTAL_PAGES = ALL_ITEMS.reduce((sum, i) => sum + i.pages, 0);
const BIRTHDAY = new Date("2026-11-25T00:00:00");
const LS_KEY = "the21issue_checked";

// ─── countdown hook ───────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, mins: 0, secs: 0 }); return; }
      setT({
        days:  Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000) / 60000),
        secs:  Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

// ─── badge component ──────────────────────────────────────────────────────────

function Badge({ text, variant, done }: { text: string; variant?: BadgeVariant; done: boolean }) {
  if (done) {
    return (
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
        style={{ background: "rgba(143,173,160,0.12)", color: "var(--text-soft)" }}
      >
        {text}
      </span>
    );
  }
  if (variant === "note") {
    return (
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
        style={{
          background: "rgba(212,168,83,0.12)",
          color: "var(--gold)",
          border: "1px solid rgba(212,168,83,0.2)",
        }}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: "linear-gradient(135deg, #deeee8 0%, #ede8f5 50%, #fdf0f1 100%)",
        color: "var(--text-mid)",
        border: "1px solid rgba(200,184,224,0.25)",
      }}
    >
      {text}
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function The21IssuePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const countdown = useCountdown(BIRTHDAY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const donePages = ALL_ITEMS
    .filter(i => i.pages > 0 && checked.has(i.id))
    .reduce((sum, i) => sum + i.pages, 0);

  const pct = TOTAL_PAGES > 0 ? (donePages / TOTAL_PAGES) * 100 : 0;
  const allDone = loaded && ALL_ITEMS.every(i => checked.has(i.id));

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center gap-2 text-2xl">
            <span>🌸</span><span>✦</span><span>🦋</span>
          </div>
          <h1
            className="font-display font-bold italic mb-2"
            style={{ fontSize: "clamp(2.2rem, 7vw, 3.2rem)", color: "var(--text-dark)", lineHeight: 1.1 }}
          >
            The 21 Issue
          </h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-soft)" }}>
            Every page in order. Tick each one off as you finish it. ✦
          </p>
        </div>

        {/* ── Countdown ─────────────────────────────────────────── */}
        <div className="card mb-5 p-5">
          <p
            className="text-center text-xs font-medium uppercase tracking-widest mb-4"
            style={{ color: "var(--text-soft)" }}
          >
            Opening on your birthday ✦ 25 November 2026
          </p>
          <div className="flex justify-center gap-2 md:gap-4">
            {[
              { val: countdown.days, label: "days" },
              { val: countdown.hours, label: "hours" },
              { val: countdown.mins, label: "mins" },
              { val: countdown.secs, label: "secs" },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="font-display font-bold flex items-center justify-center rounded-2xl"
                  style={{
                    fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
                    width: "clamp(3.2rem, 13vw, 4.5rem)",
                    height: "clamp(3rem, 12vw, 4rem)",
                    background: "linear-gradient(135deg, #deeee8 0%, #ede8f5 50%, #fdf0f1 100%)",
                    color: "var(--text-dark)",
                    border: "1px solid rgba(200,184,224,0.35)",
                    boxShadow: "0 2px 10px rgba(200,184,224,0.2), 0 1px 0 rgba(255,255,255,0.8) inset",
                  }}
                >
                  {String(val).padStart(2, "0")}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-soft)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Dates ─────────────────────────────────────────── */}
        <div
          className="card mb-5 p-4"
          style={{ background: "rgba(253,240,241,0.7)", border: "1px solid rgba(232,180,184,0.35)" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--text-soft)" }}>
            Key Dates
          </p>
          <div className="space-y-2">
            {[
              { date: "1 November", note: "Friends' notes due", emoji: "📮", color: "var(--sage)" },
              { date: "12 November", note: "Order on Mixam", emoji: "🖨️", color: "var(--gold)" },
              { date: "25 November", note: "Open it on your birthday", emoji: "🎂", color: "var(--rose)" },
            ].map(({ date, note, emoji, color }) => (
              <div
                key={date}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.6)" }}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="font-display font-bold italic text-[15px]" style={{ color }}>{date}</span>
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>— {note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Progress ──────────────────────────────────────────── */}
        <div className="card mb-8 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
              Pages Complete
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--sage)" }}>
              {loaded ? donePages : 0} / {TOTAL_PAGES} pages
            </span>
          </div>
          <div className="progress-track" style={{ height: "10px" }}>
            <div className="progress-fill" style={{ width: loaded ? `${pct}%` : "0%" }} />
          </div>
          <p className="text-xs mt-2 text-right" style={{ color: "var(--text-soft)" }}>
            {loaded ? pct.toFixed(0) : 0}% done
          </p>
        </div>

        {/* ── Chapters ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {CHAPTERS.map(chapter => {
            const chDone = chapter.items.filter(i => checked.has(i.id)).length;
            return (
              <div key={chapter.id} className="card overflow-hidden" style={{ padding: 0 }}>

                {/* Chapter header */}
                <div
                  className="px-5 py-3.5 flex items-center justify-between"
                  style={{ background: chapter.bg, borderBottom: "1px solid rgba(255,255,255,0.7)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{chapter.emoji}</span>
                    <span
                      className="font-display font-bold italic text-[17px]"
                      style={{ color: chapter.accent }}
                    >
                      {chapter.title}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.75)",
                      color: chapter.accent,
                      border: "1px solid rgba(255,255,255,0.6)",
                    }}
                  >
                    {chDone}/{chapter.items.length}
                  </span>
                </div>

                {/* Items */}
                <div>
                  {chapter.items.map((item, idx) => {
                    const done = loaded && checked.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
                        style={{
                          background: done ? "rgba(143,173,160,0.07)" : "transparent",
                          borderTop: idx > 0 ? "1px solid rgba(200,184,224,0.12)" : "none",
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-md transition-all"
                          style={{
                            width: 20,
                            height: 20,
                            background: done ? "var(--sage)" : "rgba(255,255,255,0.8)",
                            border: done ? "none" : "1.5px solid rgba(200,184,224,0.6)",
                            boxShadow: done ? "0 2px 8px rgba(143,173,160,0.3)" : "none",
                          }}
                        >
                          {done && <Check size={11} color="white" strokeWidth={3} />}
                        </div>

                        {/* Label */}
                        <span
                          className="flex-1 text-sm font-medium"
                          style={{
                            color: done ? "var(--text-soft)" : "var(--text-dark)",
                            textDecoration: done ? "line-through" : "none",
                            textDecorationColor: "var(--text-soft)",
                          }}
                        >
                          {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && (
                          <Badge text={item.badge} variant={item.badgeVariant} done={done} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── All done ──────────────────────────────────────────── */}
        {allDone && (
          <div
            className="mt-8 text-center rounded-3xl p-7"
            style={{
              background: "linear-gradient(135deg, #deeee8 0%, #ede8f5 50%, #fdf0f1 100%)",
              border: "1px solid rgba(200,184,224,0.4)",
            }}
          >
            <div className="text-4xl mb-2">🎉🦋✨</div>
            <p className="font-display font-bold italic text-2xl mb-1" style={{ color: "var(--text-dark)" }}>
              The 21 Issue is ready to print!
            </p>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              Every page done. Happy birthday, Mabel. ✦
            </p>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: "var(--text-soft)" }}>
          ✦ &nbsp; made with love &nbsp; ✦
        </p>

      </div>
    </main>
  );
}
