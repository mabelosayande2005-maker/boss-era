"use client";

import { useState, useEffect } from "react";
import { Check, Plus, X, ChevronUp, ChevronDown } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ChecklistItem = {
  id: string;
  label: string;
  dueDate: string;
  dueLabel: string;
};

type TimelineSegment = {
  id: string;
  title: string;
  durationMins: number;
  emoji: string;
  color: string;
  start: number;
};

type CostItem = {
  id: string;
  name: string;
  amount: number;
  receipt?: string;
};

type BudgetData = {
  ticketsSold: number;
  costs: CostItem[];
};

type ThemeItem = {
  id: string;
  title: string;
};

type Tab = "checklist" | "running-order" | "budget" | "themes";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHECKLIST: ChecklistItem[] = [
  { id: "ct-tiktok-announce", label: "Record and post CT announcement TikTok and poster",                                              dueDate: "2026-10-25", dueLabel: "25 Oct" },
  { id: "ct-susu-message",    label: "Message SUSU about room booking and non-Southampton student attendance",                          dueDate: "2026-10-31", dueLabel: "31 Oct" },
  { id: "ct-venue-confirm",   label: "Confirm venue — backup is aunty's restaurant in Southampton",                                    dueDate: "2026-11-07", dueLabel: "7 Nov"  },
  { id: "ct-ticket-page",     label: "Set up £3 ticket page and post it; order gift bag items including fake PearPhones",             dueDate: "2026-11-09", dueLabel: "9 Nov"  },
  { id: "ct-quiz-plan",       label: "Pick episode, write Brain Squeezers quiz questions, plan games and teams",                       dueDate: "2026-11-16", dueLabel: "w/c 16 Nov" },
  { id: "ct-prizes-hype",     label: "Buy prizes and badges, set up buzzer app, post hype TikToks, ask a friend to help on the night", dueDate: "2026-11-23", dueLabel: "w/c 23 Nov" },
  { id: "ct-snacks",          label: "Buy snacks based on ticket numbers",                                                             dueDate: "2026-11-28", dueLabel: "28–29 Nov" },
  { id: "ct-event-night",     label: "Victorious Night",                                                                              dueDate: "2026-11-30", dueLabel: "30 Nov" },
];

const TIMELINE_RAW = [
  { id: "arrival",  title: "Arrival & teams",                        durationMins: 10, emoji: "🎟️", color: "var(--sage)"     },
  { id: "episode",  title: "Episode watch",                          durationMins: 25, emoji: "📺", color: "var(--lavender)" },
  { id: "improv",   title: "Sikowitz improv warm-up",               durationMins: 15, emoji: "🎭", color: "var(--rose)"     },
  { id: "quiz",     title: "Brain Squeezers buzzer quiz",           durationMins: 30, emoji: "🧠", color: "var(--gold)"     },
  { id: "snack",    title: "Snack break",                           durationMins: 10, emoji: "🍿", color: "var(--sage)"     },
  { id: "showcase", title: "Big Showcase — lip-sync & dance battle", durationMins: 20, emoji: "💃", color: "var(--rose)"     },
  { id: "finale",   title: "Finale, winners & Make It Shine",       durationMins: 10, emoji: "🏆", color: "var(--lavender)" },
];

const TIMELINE: TimelineSegment[] = TIMELINE_RAW.map((seg, i, arr) => ({
  ...seg,
  start: arr.slice(0, i).reduce((s, x) => s + x.durationMins, 0),
}));

const TOTAL_MINS = TIMELINE_RAW.reduce((s, t) => s + t.durationMins, 0);

const DEFAULT_THEMES: ThemeItem[] = [
  { id: "theme-lizzie", title: "Lizzie McGuire"      },
  { id: "theme-hannah", title: "Hannah Montana"      },
  { id: "theme-hsm",    title: "High School Musical" },
  { id: "theme-icarly", title: "iCarly"              },
  { id: "theme-tracy",  title: "Tracy Beaker"        },
];

const LS_CHECKLIST = "ct_checklist";
const LS_BUDGET    = "ct_budget";
const LS_THEMES    = "ct_themes";

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function minsToTime(mins: number, startHour = 19): string {
  const totalH = startHour + Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = totalH > 12 ? totalH - 12 : totalH === 0 ? 12 : totalH;
  return `${h12}:${String(m).padStart(2, "0")} ${totalH >= 12 ? "pm" : "am"}`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CTPage() {
  const [tab, setTab] = useState<Tab>("checklist");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [budget, setBudget] = useState<BudgetData>({ ticketsSold: 0, costs: [] });
  const [themes, setThemes] = useState<ThemeItem[]>(DEFAULT_THEMES);

  const [costName, setCostName] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costReceipt, setCostReceipt] = useState("");
  const [addingCost, setAddingCost] = useState(false);

  const [newTheme, setNewTheme] = useState("");
  const [addingTheme, setAddingTheme] = useState(false);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CHECKLIST);
      if (raw) setChecked(new Set(JSON.parse(raw)));
      const bRaw = localStorage.getItem(LS_BUDGET);
      if (bRaw) setBudget(JSON.parse(bRaw));
      const tRaw = localStorage.getItem(LS_THEMES);
      if (tRaw) setThemes(JSON.parse(tRaw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(LS_CHECKLIST, JSON.stringify([...next]));
      return next;
    });
  }

  function saveBudget(next: BudgetData) {
    setBudget(next);
    localStorage.setItem(LS_BUDGET, JSON.stringify(next));
  }

  function addCost() {
    const amt = parseFloat(costAmount);
    if (!costName.trim() || isNaN(amt) || amt <= 0) return;
    const cost: CostItem = {
      id: `cost-${Date.now()}`,
      name: costName.trim(),
      amount: amt,
      receipt: costReceipt.trim() || undefined,
    };
    saveBudget({ ...budget, costs: [...budget.costs, cost] });
    setCostName(""); setCostAmount(""); setCostReceipt("");
    setAddingCost(false);
  }

  function deleteCost(id: string) {
    saveBudget({ ...budget, costs: budget.costs.filter(c => c.id !== id) });
  }

  function saveThemes(next: ThemeItem[]) {
    setThemes(next);
    localStorage.setItem(LS_THEMES, JSON.stringify(next));
  }

  function addTheme() {
    if (!newTheme.trim()) return;
    saveThemes([...themes, { id: `theme-${Date.now()}`, title: newTheme.trim() }]);
    setNewTheme(""); setAddingTheme(false);
  }

  function deleteTheme(id: string) {
    saveThemes(themes.filter(t => t.id !== id));
  }

  function moveTheme(id: string, dir: -1 | 1) {
    const idx = themes.findIndex(t => t.id === id);
    if (idx < 0) return;
    const next = [...themes];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveThemes(next);
  }

  const ticketIncome = budget.ticketsSold * 3;
  const totalCosts   = budget.costs.reduce((s, c) => s + c.amount, 0);
  const balance      = ticketIncome - totalCosts;
  const ticketsNeeded = balance < 0 ? Math.ceil(Math.abs(balance) / 3) : 0;

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "checklist",     label: "Checklist",     emoji: "✅" },
    { id: "running-order", label: "Running Order", emoji: "⏱️" },
    { id: "budget",        label: "Budget",        emoji: "💰" },
    { id: "themes",        label: "Themes",        emoji: "🎬" },
  ];

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center gap-2 text-2xl select-none">
            <span>📺</span><span>✦</span><span>🌟</span>
          </div>
          <h1
            className="font-display font-bold italic mb-1"
            style={{ fontSize: "clamp(2rem, 6vw, 2.8rem)", color: "var(--text-dark)", lineHeight: 1.1 }}
          >
            Childhood Throwbacks
          </h1>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            Nostalgic student event &nbsp;·&nbsp; 30 November 2026
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(200,184,224,0.25)" }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-medium transition-all"
              style={{
                background: tab === t.id ? "white" : "transparent",
                color: tab === t.id ? "var(--text-dark)" : "var(--text-soft)",
                boxShadow: tab === t.id ? "0 1px 6px rgba(143,173,160,0.18)" : "none",
              }}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Checklist ─────────────────────────────────────────────────────── */}
        {tab === "checklist" && (
          <div className="space-y-2">
            {CHECKLIST.map(item => {
              const done     = loaded && checked.has(item.id);
              const days     = daysUntil(item.dueDate);
              const overdue  = days < 0 && !done;
              const isToday  = days === 0 && !done;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                  style={{
                    background: done    ? "rgba(143,173,160,0.07)"
                              : overdue ? "rgba(220,80,80,0.05)"
                              : isToday ? "rgba(212,168,83,0.07)"
                              : "rgba(255,255,255,0.75)",
                    border: done    ? "1px solid rgba(143,173,160,0.2)"
                          : overdue ? "1px solid rgba(220,80,80,0.18)"
                          : isToday ? "1px solid rgba(212,168,83,0.22)"
                          : "1px solid rgba(200,184,224,0.25)",
                    boxShadow: done ? "none" : "0 1px 6px rgba(143,173,160,0.07)",
                  }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-md mt-0.5 transition-all"
                    style={{
                      width: 20, height: 20,
                      background: done ? "var(--sage)" : "rgba(255,255,255,0.9)",
                      border: done ? "none" : overdue ? "1.5px solid rgba(220,80,80,0.35)" : "1.5px solid rgba(200,184,224,0.5)",
                      boxShadow: done ? "0 2px 6px rgba(143,173,160,0.3)" : "none",
                    }}
                  >
                    {done && <Check size={11} color="white" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium leading-snug"
                      style={{
                        color: done ? "var(--text-soft)" : "var(--text-dark)",
                        textDecoration: done ? "line-through" : "none",
                        textDecorationColor: "var(--text-soft)",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: overdue ? "#dc5050" : "var(--text-soft)" }}
                    >
                      Due {item.dueLabel}
                    </p>
                  </div>

                  {done ? (
                    <span
                      className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full self-start mt-0.5"
                      style={{ background: "rgba(143,173,160,0.1)", color: "var(--text-soft)" }}
                    >
                      done ✓
                    </span>
                  ) : (
                    <span
                      className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full self-start mt-0.5 whitespace-nowrap"
                      style={{
                        background: overdue  ? "rgba(220,80,80,0.1)"
                                  : isToday  ? "rgba(212,168,83,0.12)"
                                  : "rgba(200,184,224,0.15)",
                        color: overdue  ? "#dc5050"
                             : isToday  ? "var(--gold)"
                             : "var(--text-soft)",
                        border: overdue  ? "1px solid rgba(220,80,80,0.18)"
                              : isToday  ? "1px solid rgba(212,168,83,0.18)"
                              : "1px solid rgba(200,184,224,0.18)",
                      }}
                    >
                      {overdue ? `${Math.abs(days)}d overdue` : isToday ? "today" : `${days}d`}
                    </span>
                  )}
                </button>
              );
            })}

            {loaded && (
              <div className="card px-4 py-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>Progress</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--sage)" }}>
                    {[...checked].filter(id => CHECKLIST.some(c => c.id === id)).length}/{CHECKLIST.length} tasks
                  </span>
                </div>
                <div className="progress-track" style={{ height: "6px" }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${([...checked].filter(id => CHECKLIST.some(c => c.id === id)).length / CHECKLIST.length) * 100}%`,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Running Order ──────────────────────────────────────────────────── */}
        {tab === "running-order" && (
          <div>
            <div
              className="card px-4 py-2.5 mb-5 text-center"
              style={{ background: "rgba(222,238,232,0.4)", border: "1px solid rgba(143,173,160,0.2)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                2-hour schedule &nbsp;·&nbsp; estimated start 7:00 pm
              </p>
            </div>

            <div className="space-y-0">
              {TIMELINE.map((seg, idx) => (
                <div key={seg.id} className="flex gap-3 items-stretch">

                  {/* Time label */}
                  <div className="flex flex-col items-end justify-start shrink-0 w-[52px] pt-2.5">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-mid)" }}>
                      {minsToTime(seg.start)}
                    </span>
                  </div>

                  {/* Dot + connector line */}
                  <div className="flex flex-col items-center shrink-0 w-5 pt-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: seg.color, boxShadow: `0 0 0 3px ${seg.color}22` }}
                    />
                    {idx < TIMELINE.length - 1 && (
                      <div className="flex-1 w-px my-1" style={{ background: "rgba(200,184,224,0.35)", minHeight: "28px" }} />
                    )}
                  </div>

                  {/* Segment card */}
                  <div className="flex-1 pb-3">
                    <div
                      className="rounded-2xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(200,184,224,0.22)",
                        boxShadow: "0 1px 6px rgba(143,173,160,0.07)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg leading-none">{seg.emoji}</span>
                        <span className="font-medium text-sm flex-1" style={{ color: "var(--text-dark)" }}>
                          {seg.title}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${seg.color}18`, color: seg.color }}
                        >
                          {seg.durationMins} min
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: "3px" }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(seg.durationMins / TOTAL_MINS) * 100}%`,
                            background: seg.color,
                            animation: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* End marker */}
              <div className="flex gap-3 items-center">
                <div className="w-[52px] text-right">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-mid)" }}>
                    {minsToTime(TOTAL_MINS)}
                  </span>
                </div>
                <div className="w-5 flex justify-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: "var(--gold)", boxShadow: "0 0 0 3px rgba(212,168,83,0.2)" }}
                  />
                </div>
                <div
                  className="flex-1 px-4 py-2.5 rounded-2xl"
                  style={{ background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.2)" }}
                >
                  <span className="font-display font-bold italic text-sm" style={{ color: "var(--gold)" }}>
                    End of night 🌟
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Budget ────────────────────────────────────────────────────────── */}
        {tab === "budget" && (
          <div className="space-y-4">

            {/* Ticket income */}
            <div className="card px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎟️</span>
                <h2 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
                  Ticket Income
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm flex-1" style={{ color: "var(--text-mid)" }}>Tickets sold</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveBudget({ ...budget, ticketsSold: Math.max(0, budget.ticketsSold - 1) })}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-colors hover:opacity-70"
                    style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}
                  >
                    −
                  </button>
                  <span
                    className="font-display font-bold text-xl tabular-nums w-10 text-center"
                    style={{ color: "var(--text-dark)" }}
                  >
                    {budget.ticketsSold}
                  </span>
                  <button
                    onClick={() => saveBudget({ ...budget, ticketsSold: budget.ticketsSold + 1 })}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-colors hover:opacity-70"
                    style={{ background: "rgba(143,173,160,0.15)", color: "var(--sage)" }}
                  >
                    +
                  </button>
                </div>
                <span className="font-display font-bold text-xl w-20 text-right" style={{ color: "var(--sage)" }}>
                  £{ticketIncome.toFixed(2)}
                </span>
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>£3 per ticket</p>
            </div>

            {/* Costs */}
            <div className="card px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💸</span>
                <h2 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
                  Costs
                </h2>
                <button
                  onClick={() => setAddingCost(v => !v)}
                  className="ml-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                  style={{
                    background: "var(--rose-pale)",
                    color: "var(--rose)",
                    border: "1.5px solid rgba(232,180,184,0.3)",
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {addingCost && (
                <div
                  className="space-y-2 mb-3 p-3 rounded-xl"
                  style={{ background: "var(--rose-pale)", border: "1px solid rgba(232,180,184,0.25)" }}
                >
                  <input
                    autoFocus
                    placeholder="Item name (e.g. Snacks)"
                    value={costName}
                    onChange={e => setCostName(e.target.value)}
                    className="input-fairy text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount £"
                      value={costAmount}
                      onChange={e => setCostAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCost(); if (e.key === "Escape") setAddingCost(false); }}
                      className="input-fairy text-sm flex-1"
                    />
                    <button onClick={addCost} className="btn-primary text-sm px-4">Add</button>
                  </div>
                  <input
                    placeholder="Receipt note (optional)"
                    value={costReceipt}
                    onChange={e => setCostReceipt(e.target.value)}
                    className="input-fairy text-sm"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  />
                </div>
              )}

              {budget.costs.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-soft)" }}>
                  No costs added yet ✦
                </p>
              ) : (
                <div className="space-y-2">
                  {budget.costs.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl group"
                      style={{ background: "rgba(250,246,240,0.8)", border: "1.5px solid rgba(200,184,224,0.2)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>{c.name}</p>
                        {c.receipt && (
                          <p className="text-xs" style={{ color: "var(--text-soft)" }}>{c.receipt}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0" style={{ color: "var(--rose)" }}>
                        −£{c.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => deleteCost(c.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                      >
                        <X size={13} style={{ color: "var(--text-soft)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div
              className="card px-5 py-4 space-y-3"
              style={{
                background: balance >= 0 ? "rgba(222,238,232,0.5)" : "rgba(253,240,241,0.5)",
                border: balance >= 0 ? "1px solid rgba(143,173,160,0.3)" : "1px solid rgba(232,180,184,0.3)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--text-mid)" }}>Total income</span>
                <span className="font-semibold text-sm" style={{ color: "var(--sage)" }}>
                  +£{ticketIncome.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--text-mid)" }}>Total costs</span>
                <span className="font-semibold text-sm" style={{ color: "var(--rose)" }}>
                  −£{totalCosts.toFixed(2)}
                </span>
              </div>
              <div className="divider-fairy" />
              <div className="flex items-center justify-between">
                <span className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
                  {balance >= 0 ? "Surplus" : "Deficit"}
                </span>
                <span
                  className="font-display font-bold italic text-2xl"
                  style={{ color: balance >= 0 ? "var(--sage)" : "#dc5050" }}
                >
                  {balance >= 0 ? "+" : "−"}£{Math.abs(balance).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-center" style={{ color: "var(--text-soft)" }}>
                {budget.ticketsSold === 0
                  ? "Goal: cost-covering only ✦ start selling tickets!"
                  : balance >= 0
                    ? "You're covered 🎉 goal is cost-covering only"
                    : `Need ${ticketsNeeded} more ticket${ticketsNeeded !== 1 ? "s" : ""} to break even`}
              </p>
            </div>
          </div>
        )}

        {/* ── Future Themes ─────────────────────────────────────────────────── */}
        {tab === "themes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                Dream line-up for future events
              </p>
              <button
                onClick={() => setAddingTheme(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                style={{
                  background: "var(--lavender-pale)",
                  color: "var(--lavender)",
                  border: "1.5px solid rgba(200,184,224,0.3)",
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {addingTheme && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="Theme name…"
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addTheme(); if (e.key === "Escape") { setAddingTheme(false); setNewTheme(""); } }}
                  className="input-fairy flex-1 text-sm"
                />
                <button onClick={addTheme} className="btn-primary text-sm px-4">Add</button>
              </div>
            )}

            {themes.length === 0 && !addingTheme && (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-soft)" }}>
                No themes yet — tap + to add ✦
              </p>
            )}

            {themes.map((theme, idx) => (
              <div
                key={theme.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(200,184,224,0.22)",
                  boxShadow: "0 1px 6px rgba(143,173,160,0.07)",
                }}
              >
                <span
                  className="flex-shrink-0 font-display font-bold italic text-sm w-5 text-center"
                  style={{ color: "var(--lavender)" }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  {theme.title}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveTheme(theme.id, -1)}
                    disabled={idx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-20"
                    style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => moveTheme(theme.id, 1)}
                    disabled={idx === themes.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-20"
                    style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={() => deleteTheme(theme.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "rgba(232,180,184,0.2)", color: "var(--rose)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}

            <p className="text-center text-xs mt-4" style={{ color: "var(--text-soft)" }}>
              ✦ &nbsp; each one a childhood classic &nbsp; ✦
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
