"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

// ─── types & data ─────────────────────────────────────────────────────────────

type Item = {
  id: string;
  label: string;
  pages: number;
  pageRef: string;
};

type Chapter = {
  id: string;
  title: string;
  emoji: string;
  accent: string;
  bg: string;
  items: Item[];
};

const CHAPTERS: Chapter[] = [
  {
    id: "setup",
    title: "Setup",
    emoji: "⚙️",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "s1", label: "Gather all photos & memories", pages: 0, pageRef: "task" },
      { id: "s2", label: "Collect written content from friends", pages: 0, pageRef: "task" },
      { id: "s3", label: "Set up Canva template & cover design", pages: 0, pageRef: "task" },
      { id: "s4", label: "Choose fonts, colour palette & aesthetic", pages: 0, pageRef: "task" },
      { id: "s5", label: "Plan final page count & Mixam spec", pages: 0, pageRef: "task" },
    ],
  },
  {
    id: "cover",
    title: "Cover & Inside Cover",
    emoji: "✨",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "c1", label: "Front Cover", pages: 1, pageRef: "p. 1" },
      { id: "c2", label: "Inside Front Cover", pages: 1, pageRef: "p. 2" },
      { id: "c3", label: "Dedication & Opening Quote", pages: 1, pageRef: "p. 3" },
      { id: "c4", label: "Table of Contents", pages: 1, pageRef: "p. 4" },
    ],
  },
  {
    id: "front",
    title: "Front of Magazine",
    emoji: "🌸",
    accent: "var(--lavender)",
    bg: "var(--lavender-pale)",
    items: [
      { id: "f1", label: "Editor's Letter / Welcome", pages: 1, pageRef: "p. 5" },
      { id: "f2", label: "21 Facts About Mabel", pages: 2, pageRef: "pp. 6–7" },
      { id: "f3", label: "Year in Numbers", pages: 1, pageRef: "p. 8" },
      { id: "f4", label: "Opening Spread", pages: 2, pageRef: "pp. 9–10" },
      { id: "f5", label: "Acknowledgements Strip", pages: 1, pageRef: "p. 11" },
    ],
  },
  {
    id: "ch1",
    title: "Chapter 1: The Recap",
    emoji: "📸",
    accent: "var(--gold)",
    bg: "rgba(253,248,232,0.9)",
    items: [
      { id: "ch1-1", label: "Chapter Opener", pages: 1, pageRef: "p. 12" },
      { id: "ch1-2", label: "Birth & Early Childhood", pages: 2, pageRef: "pp. 13–14" },
      { id: "ch1-3", label: "Primary School Years", pages: 2, pageRef: "pp. 15–16" },
      { id: "ch1-4", label: "Secondary School Era", pages: 2, pageRef: "pp. 17–18" },
      { id: "ch1-5", label: "Sixth Form & Uni Life", pages: 2, pageRef: "pp. 19–20" },
      { id: "ch1-6", label: "The Glow-Up Gallery", pages: 1, pageRef: "p. 21" },
    ],
  },
  {
    id: "ch2",
    title: "Chapter 2: Lifestyle",
    emoji: "🌿",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "ch2-1", label: "Chapter Opener", pages: 1, pageRef: "p. 22" },
      { id: "ch2-2", label: "Fashion & Style", pages: 2, pageRef: "pp. 23–24" },
      { id: "ch2-3", label: "Food & Favourite Recipes", pages: 2, pageRef: "pp. 25–26" },
      { id: "ch2-4", label: "Travel & Adventures", pages: 2, pageRef: "pp. 27–28" },
      { id: "ch2-5", label: "Wellness & Self-Care", pages: 1, pageRef: "p. 29" },
    ],
  },
  {
    id: "ch3",
    title: "Chapter 3: The Hustle",
    emoji: "💸",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "ch3-1", label: "Chapter Opener", pages: 1, pageRef: "p. 30" },
      { id: "ch3-2", label: "StudyGlow & Content Creation", pages: 2, pageRef: "pp. 31–32" },
      { id: "ch3-3", label: "Vinted & Jewellery Business", pages: 2, pageRef: "pp. 33–34" },
      { id: "ch3-4", label: "Tutoring & Skills", pages: 1, pageRef: "p. 35" },
      { id: "ch3-5", label: "Goals & Wins This Year", pages: 2, pageRef: "pp. 36–37" },
      { id: "ch3-6", label: "The Vision Board", pages: 1, pageRef: "p. 38" },
    ],
  },
  {
    id: "ch4",
    title: "Chapter 4: Faith and Mind",
    emoji: "🕊️",
    accent: "var(--lavender)",
    bg: "var(--lavender-pale)",
    items: [
      { id: "ch4-1", label: "Chapter Opener", pages: 1, pageRef: "p. 39" },
      { id: "ch4-2", label: "Faith Story", pages: 2, pageRef: "pp. 40–41" },
      { id: "ch4-3", label: "Gratitude & Affirmations", pages: 2, pageRef: "pp. 42–43" },
      { id: "ch4-4", label: "Mindset & Growth", pages: 1, pageRef: "p. 44" },
      { id: "ch4-5", label: "Prayers & Intentions", pages: 1, pageRef: "p. 45" },
    ],
  },
  {
    id: "ch5",
    title: "Chapter 5: The Future",
    emoji: "🌙",
    accent: "var(--gold)",
    bg: "rgba(253,248,232,0.9)",
    items: [
      { id: "ch5-1", label: "Chapter Opener", pages: 1, pageRef: "p. 46" },
      { id: "ch5-2", label: "21 Dreams & Bucket List", pages: 2, pageRef: "pp. 47–48" },
      { id: "ch5-3", label: "Career & Ambitions", pages: 2, pageRef: "pp. 49–50" },
      { id: "ch5-4", label: "Letter to 30-Year-Old Mabel", pages: 2, pageRef: "pp. 51–52" },
      { id: "ch5-5", label: "Manifesting Board", pages: 1, pageRef: "p. 53" },
    ],
  },
  {
    id: "back",
    title: "Back of Magazine",
    emoji: "💌",
    accent: "var(--rose)",
    bg: "var(--rose-pale)",
    items: [
      { id: "b1", label: "Friends' Notes & Letters", pages: 3, pageRef: "pp. 54–56" },
      { id: "b2", label: "Birthday Messages Collage", pages: 2, pageRef: "pp. 57–58" },
      { id: "b3", label: "Final Spread", pages: 1, pageRef: "p. 59" },
      { id: "b4", label: "Back Cover", pages: 1, pageRef: "p. 60" },
    ],
  },
  {
    id: "printing",
    title: "Before Printing",
    emoji: "🖨️",
    accent: "var(--sage)",
    bg: "var(--sage-pale)",
    items: [
      { id: "p1", label: "Proofread all text", pages: 0, pageRef: "task" },
      { id: "p2", label: "Check all images are high-res (300 dpi+)", pages: 0, pageRef: "task" },
      { id: "p3", label: "Export PDF in correct Mixam spec", pages: 0, pageRef: "task" },
      { id: "p4", label: "Place order on Mixam", pages: 0, pageRef: "task" },
      { id: "p5", label: "Final check & approve proof", pages: 0, pageRef: "task" },
    ],
  },
];

const ALL_ITEMS = CHAPTERS.flatMap(c => c.items);
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

  const allPagesDone = donePages === TOTAL_PAGES;

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
            Mabel's birthday magazine · production tracker ✦
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
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-soft)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Dates ─────────────────────────────────────────── */}
        <div className="card mb-5 p-4" style={{ background: "rgba(253,240,241,0.7)", border: "1px solid rgba(232,180,184,0.35)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--text-soft)" }}>
            Key Dates
          </p>
          <div className="space-y-2">
            {[
              { date: "1 November", note: "Friends' notes due", emoji: "📮", color: "var(--sage)" },
              { date: "12 November", note: "Order on Mixam", emoji: "🖨️", color: "var(--gold)" },
              { date: "25 November", note: "Open on your birthday", emoji: "🎂", color: "var(--rose)" },
            ].map(({ date, note, emoji, color }) => (
              <div
                key={date}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.6)" }}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="font-display font-bold italic text-[15px]" style={{ color }}>
                  {date}
                </span>
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
              {loaded ? donePages : 0} / {TOTAL_PAGES}
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
              <div
                key={chapter.id}
                className="card overflow-hidden"
                style={{ padding: 0 }}
              >
                {/* Chapter header */}
                <div
                  className="px-5 py-3.5 flex items-center justify-between"
                  style={{
                    background: chapter.bg,
                    borderBottom: "1px solid rgba(255,255,255,0.7)",
                  }}
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
                    const isTask = item.pageRef === "task";
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
                            background: done
                              ? "var(--sage)"
                              : "rgba(255,255,255,0.8)",
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

                        {/* Page ref / task badge */}
                        {isTask ? (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: "rgba(200,184,224,0.12)",
                              color: "var(--text-soft)",
                            }}
                          >
                            task
                          </span>
                        ) : (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: done
                                ? "rgba(143,173,160,0.12)"
                                : "linear-gradient(135deg, #deeee8 0%, #ede8f5 50%, #fdf0f1 100%)",
                              color: done ? "var(--text-soft)" : "var(--text-mid)",
                              border: "1px solid rgba(200,184,224,0.2)",
                            }}
                          >
                            {item.pageRef}
                          </span>
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
        {loaded && allPagesDone && (
          <div
            className="mt-8 text-center rounded-3xl p-7"
            style={{
              background: "linear-gradient(135deg, #deeee8 0%, #ede8f5 50%, #fdf0f1 100%)",
              border: "1px solid rgba(200,184,224,0.4)",
            }}
          >
            <div className="text-4xl mb-2">🎉🦋✨</div>
            <p className="font-display font-bold italic text-2xl mb-1" style={{ color: "var(--text-dark)" }}>
              The 21 Issue is ready!
            </p>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              All {TOTAL_PAGES} pages complete. Happy birthday, Mabel. ✦
            </p>
          </div>
        )}

        {/* ── Bottom sparkle ────────────────────────────────────── */}
        <p className="text-center text-xs mt-8" style={{ color: "var(--text-soft)" }}>
          ✦ &nbsp; made with love &nbsp; ✦
        </p>

      </div>
    </main>
  );
}
