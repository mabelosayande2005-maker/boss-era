"use client";

import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
  isFuture,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Check, Pencil } from "lucide-react";

type Habit = {
  id: number;
  name: string;
  emoji: string;
  target_per_week: number;
  color: string;
};

type Completion = {
  habit_id: number;
  completed_date: string; // "YYYY-MM-DD"
};

// Monday-first weeks
function weekMonday(anchor: Date) {
  return startOfWeek(anchor, { weekStartsOn: 1 });
}

function toISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const COLOR_OPTIONS = [
  "#8fada0", "#e8b4b8", "#c8b8e0", "#d4a853",
  "#b8d4c8", "#f0d080", "#f5d5d8", "#deeee8",
  "#a0b8d8", "#d4b8c0", "#b8c8d0", "#c8d4b0",
];

const EMOJI_OPTIONS = [
  "🏋️","💃","🇮🇹","🤖","🧵","✨","📅","📚","🎨","🏃",
  "🧘","💪","🥗","💧","🎸","🖊️","🎯","🌿","⭐","🦋",
];

export default function HabitsPage() {
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [weekAnchor, setWeekAnchor]   = useState(() => weekMonday(new Date()));
  const [loading, setLoading]         = useState(true);
  // Ref tracks whether habits have been fetched at least once.
  // Using a ref (not state) means flipping it never causes a re-render.
  const habitsLoaded = useRef(false);
  const [showForm, setShowForm]       = useState(false);
  const [editHabit, setEditHabit]     = useState<Habit | null>(null);

  // form state
  const [fName,   setFName]   = useState("");
  const [fEmoji,  setFEmoji]  = useState("⭐");
  const [fColor,  setFColor]  = useState("#b8d4c8");
  const [fTarget, setFTarget] = useState(1);

  const weekStart    = weekMonday(weekAnchor);
  const weekStartISO = toISO(weekStart); // stable string — safe as useCallback dep
  const days         = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel    = `${format(weekStart, "d MMM")} – ${format(days[6], "d MMM yyyy")}`;
  const isCurrentWeek = weekStartISO === toISO(weekMonday(new Date()));

  const fetchWeek = useCallback(async (forceHabits = false) => {
    // First ever load (or after seeding): show skeleton and load habits + completions
    if (!habitsLoaded.current || forceHabits) {
      setLoading(true);
      try {
        const res  = await fetch(`/api/habits?weekStart=${weekStartISO}`);
        const data = await res.json();
        setHabits(data.habits ?? []);
        setCompletions(data.completions ?? []);
        habitsLoaded.current = true;
      } catch {}
      setLoading(false);
    } else {
      // Week navigation: habits don't change between weeks — only swap completions.
      // No loading state: cells update in place with their existing CSS transitions.
      try {
        const res  = await fetch(`/api/habits?weekStart=${weekStartISO}`);
        const data = await res.json();
        setCompletions(data.completions ?? []);
      } catch {}
    }
  }, [weekStartISO]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const isDone = (habitId: number, day: Date) =>
    completions.some(
      (c) =>
        c.habit_id === habitId &&
        (c.completed_date as string).startsWith(toISO(day))
    );

  const doneCountThisWeek = (habitId: number) =>
    days.filter((d) => isDone(habitId, d)).length;

  // weekly score = fraction of habits that hit their target
  const habitsOnTarget = habits.filter(
    (h) => doneCountThisWeek(h.id) >= h.target_per_week
  ).length;
  const weeklyScore =
    habits.length > 0 ? Math.round((habitsOnTarget / habits.length) * 100) : 0;

  // total completions this week
  const totalDone  = habits.reduce((s, h) => s + doneCountThisWeek(h.id), 0);
  const totalNeeded = habits.reduce((s, h) => s + h.target_per_week, 0);

  // ── actions ──────────────────────────────────────────────────────────────
  const toggle = async (habitId: number, day: Date) => {
    if (isFuture(addDays(day, 1)) && !isToday(day)) return; // no future
    const date      = toISO(day);
    const wasCompleted = isDone(habitId, day);

    // optimistic update
    setCompletions((prev) =>
      wasCompleted
        ? prev.filter(
            (c) => !(c.habit_id === habitId && (c.completed_date as string).startsWith(date))
          )
        : [...prev, { habit_id: habitId, completed_date: date }]
    );

    await fetch("/api/habits", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "toggle", habitId, date }),
    });
  };

  const openAdd = () => {
    setEditHabit(null);
    setFName(""); setFEmoji("⭐"); setFColor("#b8d4c8"); setFTarget(1);
    setShowForm(true);
  };

  const openEdit = (h: Habit) => {
    setEditHabit(h);
    setFName(h.name); setFEmoji(h.emoji); setFColor(h.color); setFTarget(h.target_per_week);
    setShowForm(true);
  };

  const saveHabit = async () => {
    if (!fName.trim()) return;
    if (editHabit) {
      const res  = await fetch("/api/habits", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "edit", id: editHabit.id, name: fName.trim(), emoji: fEmoji, color: fColor, targetPerWeek: fTarget }),
      });
      const data = await res.json();
      if (data.habit) setHabits((prev) => prev.map((h) => (h.id === editHabit.id ? data.habit : h)));
    } else {
      const res  = await fetch("/api/habits", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "add", name: fName.trim(), emoji: fEmoji, color: fColor, targetPerWeek: fTarget }),
      });
      const data = await res.json();
      if (data.habit) setHabits((prev) => [...prev, data.habit]);
    }
    setShowForm(false);
    setEditHabit(null);
  };

  const deleteHabit = async (id: number) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch("/api/habits", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "delete", id }),
    });
  };

  const seedHabits = async () => {
    await fetch("/api/habits", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "seed" }),
    });
    habitsLoaded.current = false; // force full reload so new habits appear
    fetchWeek(true);
  };

  // ── score label ──────────────────────────────────────────────────────────
  const scoreLabel = () => {
    if (weeklyScore === 100) return { text: "Perfect week ✦", color: "var(--sage)" };
    if (weeklyScore >= 70)   return { text: "Killing it 🔥",  color: "var(--gold)" };
    if (weeklyScore >= 40)   return { text: "Keep going 💪",  color: "var(--rose)" };
    return                          { text: "Just start ✨",  color: "var(--lavender)" };
  };
  const label = scoreLabel();

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 py-2">

      {/* Hero */}
      <div
        className="card px-6 py-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(222,238,232,0.95) 0%, rgba(184,212,200,0.6) 50%, rgba(237,232,245,0.8) 100%)",
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
                Habit Tracker
              </span>
              {isCurrentWeek && (
                <span className="tag tag-sage text-xs">This week</span>
              )}
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              🌿 Weekly Grid
            </h1>
          </div>

          {/* Weekly score badge */}
          <div className="text-right">
            <div
              className="font-display font-black italic text-4xl leading-none"
              style={{ color: label.color }}
            >
              {weeklyScore}%
            </div>
            <div className="text-xs mt-1" style={{ color: label.color }}>{label.text}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "on target", value: `${habitsOnTarget}/${habits.length}`, color: "var(--sage)" },
            { label: "sessions",  value: `${totalDone}/${totalNeeded}`,         color: "var(--rose)" },
            { label: "habits",    value: habits.length,                          color: "var(--lavender)" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl px-3 py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <div
                className="font-display font-bold italic text-2xl leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="mb-1">
          <div className="progress-track h-2">
            <div
              className="progress-fill"
              style={{ width: `${totalNeeded > 0 ? (totalDone / totalNeeded) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.6)", color: "var(--text-mid)" }}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-sm font-medium" style={{ color: "var(--text-mid)" }}>
            {weekLabel}
          </span>

          <button
            onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.6)", color: "var(--text-mid)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* No habits yet */}
      {!loading && habits.length === 0 && (
        <div className="card px-5 py-8 text-center">
          <div className="text-3xl mb-3">🌿</div>
          <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
            No habits yet
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-soft)" }}>
            Load your 7 default habits or create your own.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button className="btn-primary" onClick={seedHabits}>Load defaults ✦</button>
            <button className="btn-primary btn-rose" onClick={openAdd}>Add habit</button>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      {habits.length > 0 && (
        <div className="card overflow-hidden">
          {/* Day header */}
          <div
            className="grid gap-1 px-4 py-2"
            style={{ gridTemplateColumns: "1fr repeat(7, 36px)", background: "rgba(250,246,240,0.9)", borderBottom: "1px solid rgba(200,184,224,0.2)" }}
          >
            <div />
            {days.map((day) => (
              <div key={toISO(day)} className="text-center">
                <div
                  className="text-xs font-medium"
                  style={{ color: isToday(day) ? "var(--sage)" : "var(--text-soft)" }}
                >
                  {format(day, "EEE")[0]}
                </div>
                <div
                  className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: isToday(day) ? "var(--sage)" : "transparent",
                    color: isToday(day) ? "white" : "var(--text-mid)",
                    fontSize: "11px",
                  }}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Habit rows — only skeleton on very first paint */}
          {loading ? (
            <div className="px-4 py-3 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
              ))}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(200,184,224,0.12)" }}>
              {habits.map((habit) => {
                const count   = doneCountThisWeek(habit.id);
                const metGoal = count >= habit.target_per_week;

                return (
                  <div
                    key={habit.id}
                    className="grid items-center gap-1 px-4 py-2.5 group"
                    style={{ gridTemplateColumns: "1fr repeat(7, 36px)" }}
                  >
                    {/* Habit label */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{habit.emoji}</span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-dark)" }}
                        >
                          {habit.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div
                            className="text-xs"
                            style={{ color: metGoal ? habit.color : "var(--text-soft)" }}
                          >
                            {count}/{habit.target_per_week}×
                          </div>
                          {metGoal && (
                            <span className="text-xs" style={{ color: habit.color }}>✓</span>
                          )}
                        </div>
                      </div>
                      {/* Edit/delete — show on row hover */}
                      <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => openEdit(habit)}
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ color: "var(--text-soft)" }}
                          title="Edit habit"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ color: "var(--text-soft)" }}
                          title="Delete habit"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Day cells */}
                    {days.map((day) => {
                      const done   = isDone(habit.id, day);
                      const future = isFuture(day) && !isToday(day);

                      return (
                        <button
                          key={toISO(day)}
                          onClick={() => !future && toggle(habit.id, day)}
                          disabled={future}
                          className="w-8 h-8 rounded-full mx-auto flex items-center justify-center transition-all"
                          style={{
                            background: done
                              ? habit.color
                              : isToday(day)
                              ? `${habit.color}18`
                              : "rgba(240,232,220,0.5)",
                            border: done
                              ? `2px solid ${habit.color}`
                              : isToday(day)
                              ? `2px solid ${habit.color}60`
                              : "2px solid rgba(200,184,224,0.2)",
                            opacity: future ? 0.25 : 1,
                            cursor:  future ? "default" : "pointer",
                            transform: done ? "scale(1.05)" : "scale(1)",
                          }}
                          title={future ? "" : `${done ? "Undo" : "Mark"} ${habit.name} on ${format(day, "EEE d MMM")}`}
                        >
                          {done && (
                            <span className="text-white font-bold" style={{ fontSize: "11px" }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add habit row */}
          <div
            className="px-4 py-3"
            style={{ borderTop: "1px solid rgba(200,184,224,0.15)", background: "rgba(250,246,240,0.5)" }}
          >
            <button
              onClick={openAdd}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-soft)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--sage-pale)", border: "1.5px solid rgba(143,173,160,0.3)" }}
              >
                <Plus size={12} style={{ color: "var(--sage)" }} />
              </div>
              Add habit
            </button>
          </div>
        </div>
      )}

      {/* Habit streaks / this-week summary cards */}
      {habits.length > 0 && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {habits.map((habit) => {
            const count   = doneCountThisWeek(habit.id);
            const target  = habit.target_per_week;
            const pct     = Math.min(100, (count / target) * 100);
            const met     = count >= target;

            return (
              <div
                key={habit.id}
                className="card px-4 py-3"
                style={{
                  background: met
                    ? `linear-gradient(135deg, ${habit.color}18, ${habit.color}08)`
                    : "rgba(255,255,255,0.7)",
                  border: met ? `1.5px solid ${habit.color}50` : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{habit.emoji}</span>
                  {met && <span className="text-xs" style={{ color: habit.color }}>✓ done</span>}
                </div>
                <div
                  className="text-sm font-medium mb-1 truncate"
                  style={{ color: "var(--text-dark)" }}
                >
                  {habit.name}
                </div>
                <div className="progress-track h-1.5 mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: habit.color }}
                  />
                </div>
                <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                  {count}/{target} this week
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit form modal */}
      {showForm && (
        <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(143,173,160,0.4)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              {editHabit ? "Edit habit" : "New habit ✦"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditHabit(null); }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>
              Habit name *
            </label>
            <input
              autoFocus
              className="input-fairy"
              placeholder="e.g. Gym"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveHabit(); }}
            />
          </div>

          {/* Emoji picker */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>
              Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => setFEmoji(em)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
                  style={{
                    background: fEmoji === em ? "var(--sage-pale)" : "rgba(250,246,240,0.8)",
                    border: fEmoji === em ? "2px solid var(--sage)" : "1.5px solid rgba(200,184,224,0.3)",
                    transform: fEmoji === em ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {em}
                </button>
              ))}
              {/* Custom emoji input */}
              <input
                className="w-9 h-9 rounded-xl text-center text-lg border"
                style={{ borderColor: "rgba(200,184,224,0.4)", background: "white" }}
                value={EMOJI_OPTIONS.includes(fEmoji as typeof EMOJI_OPTIONS[number]) ? "" : fEmoji}
                placeholder="✏️"
                onChange={(e) => e.target.value && setFEmoji(e.target.value)}
                maxLength={2}
                title="Type a custom emoji"
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>
              Colour
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFColor(c)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: c,
                    border: fColor === c ? "3px solid var(--text-dark)" : "2px solid rgba(255,255,255,0.8)",
                    transform: fColor === c ? "scale(1.15)" : "scale(1)",
                    boxShadow: fColor === c ? "0 0 0 2px white, 0 0 0 4px " + c : "none",
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Target per week */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>
              Target per week
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setFTarget(n)}
                  className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                  style={{
                    background: fTarget === n ? fColor : "rgba(250,246,240,0.8)",
                    color: fTarget === n ? "white" : "var(--text-mid)",
                    border: fTarget === n ? `2px solid ${fColor}` : "1.5px solid rgba(200,184,224,0.3)",
                  }}
                >
                  {n}
                </button>
              ))}
              <span className="self-center text-sm" style={{ color: "var(--text-soft)" }}>×/week</span>
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
            style={{ background: `${fColor}15`, border: `1.5px solid ${fColor}50` }}
          >
            <span className="text-2xl">{fEmoji}</span>
            <div>
              <div className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>
                {fName || "Habit name"}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                {fTarget}× per week
              </div>
            </div>
            <div className="ml-auto flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full"
                  style={{
                    background: i < fTarget ? fColor : "rgba(200,184,224,0.2)",
                    border: `2px solid ${i < fTarget ? fColor : "rgba(200,184,224,0.2)"}`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={saveHabit}>
              <Check size={14} className="inline mr-1" />
              {editHabit ? "Save changes" : "Add habit ✦"}
            </button>
            {editHabit && (
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all"
                style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                onClick={() => { deleteHabit(editHabit.id); setShowForm(false); setEditHabit(null); }}
              >
                <X size={12} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
