"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, X, BookOpen, CalendarDays, Calendar, Target, Film } from "lucide-react";
import { getGreeting, todayISO } from "@/lib/utils";

type Habit = { id: number; name: string; emoji: string; target_per_week: number; color: string; days?: string | null };
type Task = { id: number; title: string; stream: string; completed: boolean; notes?: string };
type Mood = { score: number; note: string } | null;
type CalEvent = { id: string; title: string; start: string | null; end: string | null; allDay: boolean; htmlLink: string | null };
type WeeklyGoal = { id: number; text: string };
type ContentTask = { id: number; title: string; brand: string; status: string };

const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "✨"];
const MOOD_LABELS = ["Rough", "Meh", "Okay", "Good", "Amazing"];

const STREAM_COLORS: Record<string, string> = {
  "Personal TikTok": "tag-rose",
  StudyGlow: "tag-lavender",
  Vinted: "tag-gold",
  Skills: "tag-sage",
  Admin: "tag-sage",
};

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<number[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mood, setMood] = useState<Mood>(null);
  const [moodNote, setMoodNote] = useState("");
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [newWeeklyGoal, setNewWeeklyGoal] = useState("");
  const [addingWeeklyGoal, setAddingWeeklyGoal] = useState(false);
  const [contentTasks, setContentTasks] = useState<ContentTask[]>([]);
  const [checkedContentTasks, setCheckedContentTasks] = useState<Set<number>>(new Set());
  const [todayIncome, setTodayIncome] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // Calendar
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [calConnected, setCalConnected] = useState(false);
  const [calConfigured, setCalConfigured] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const [syncingTask, setSyncingTask] = useState<number | null>(null);
  const [syncedTasks, setSyncedTasks] = useState<Set<number>>(new Set());
  const [checkedCalEvents, setCheckedCalEvents] = useState<Set<string>>(new Set());
  const [calBanner, setCalBanner] = useState<"connected" | "error" | null>(null);

  const today = todayISO();
  // Per-day localStorage keys — stale automatically tomorrow
  const syncedKey = `cal_synced_tasks_${today}`;
  const checkedEventsKey = `cal_checked_events_${today}`;

  const greeting = getGreeting();
  const dayName = format(new Date(), "EEEE");
  const dateDisplay = format(new Date(), "d MMMM yyyy");

  const fetchAll = useCallback(async () => {
    try {
      const [habitsRes, tasksRes, moodRes, incomeRes, verseRes, weeklyGoalsRes, contentRes] = await Promise.all([
        fetch("/api/habits", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/mood", { cache: "no-store" }),
        fetch("/api/income", { cache: "no-store" }),
        fetch("/api/verse", { cache: "no-store" }),
        fetch("/api/weekly-goals", { cache: "no-store" }),
        fetch(`/api/content?date=${today}`, { cache: "no-store" }),
      ]);
      const [habitsData, tasksData, moodData, incomeData, verseData, weeklyGoalsData, contentData] = await Promise.all([
        habitsRes.json(),
        tasksRes.json(),
        moodRes.json(),
        incomeRes.json(),
        verseRes.json(),
        weeklyGoalsRes.json(),
        contentRes.json(),
      ]);
      setHabits(habitsData.habits || []);
      setCompletedHabits(habitsData.completedToday || []);
      setTasks(tasksData.tasks || []);
      setMood(moodData.mood);
      if (moodData.mood?.note) setMoodNote(moodData.mood.note);
      setTodayIncome(parseFloat(incomeData.todayTotal?.today_net || "0"));
      if (verseData.verse) setVerse(verseData.verse);
      setWeeklyGoals(weeklyGoalsData.goals || []);
      setContentTasks(contentData.items || []);
      setDbReady(true);
    } catch {
      // db not connected yet
    }
    setLoading(false);
  }, []);

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch("/api/calendar/status", { cache: "no-store" }),
        fetch("/api/calendar/events", { cache: "no-store" }),
      ]);
      const [statusData, eventsData] = await Promise.all([statusRes.json(), eventsRes.json()]);
      setCalConfigured(statusData.configured ?? false);
      setCalConnected(statusData.connected ?? false);
      setCalEvents(eventsData.events ?? []);
    } catch { /* calendar is optional */ }
    setCalLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetchCalendar();
    // Restore persisted sync/checked state from localStorage (cleared automatically next day via key)
    try {
      const saved = localStorage.getItem(syncedKey);
      if (saved) setSyncedTasks(new Set(JSON.parse(saved) as number[]));
      const savedChecked = localStorage.getItem(checkedEventsKey);
      if (savedChecked) setCheckedCalEvents(new Set(JSON.parse(savedChecked) as string[]));
      const savedContent = localStorage.getItem(`content_checked_${today}`);
      if (savedContent) setCheckedContentTasks(new Set(JSON.parse(savedContent) as number[]));
    } catch { /* localStorage unavailable */ }

    // Check for OAuth callback result in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "1") {
      setCalBanner("connected");
      window.history.replaceState({}, "", "/");
    } else if (params.get("calendar_error")) {
      setCalBanner("error");
      window.history.replaceState({}, "", "/");
    }
  }, [fetchCalendar, syncedKey, checkedEventsKey]);

  const toggleHabit = async (habitId: number) => {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", habitId, date: today }),
    });
    const data = await res.json();
    setCompletedHabits(prev =>
      data.completed ? [...prev, habitId] : prev.filter(id => id !== habitId)
    );
  };

  const toggleTask = async (taskId: number) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", taskId }),
    });
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    );
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", title: newTask, stream: "admin" }),
    });
    const data = await res.json();
    if (data.task) setTasks(prev => [...prev, data.task]);
    setNewTask("");
    setShowAddTask(false);
  };

  const deleteTask = async (taskId: number) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", taskId }),
    });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const toggleCalEvent = (eventId: string) => {
    setCheckedCalEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) { next.delete(eventId); } else { next.add(eventId); }
      try { localStorage.setItem(checkedEventsKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleContentTask = (id: number) => {
    setCheckedContentTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      try { localStorage.setItem(`content_checked_${today}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const addWeeklyGoal = async () => {
    if (!newWeeklyGoal.trim()) return;
    const res = await fetch("/api/weekly-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", text: newWeeklyGoal }),
    });
    const data = await res.json();
    if (data.goal) setWeeklyGoals(prev => [...prev, data.goal]);
    setNewWeeklyGoal("");
    setAddingWeeklyGoal(false);
  };

  const deleteWeeklyGoal = async (id: number) => {
    await fetch("/api/weekly-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setWeeklyGoals(prev => prev.filter(g => g.id !== id));
  };

  const saveMood = async (score: number) => {
    setMood({ score, note: moodNote });
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, note: moodNote }),
    });
  };

  const syncTaskToCalendar = async (task: Task) => {
    if (syncingTask === task.id || syncedTasks.has(task.id)) return;
    setSyncingTask(task.id);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: task.title, date: today, description: `Task from Boss Era${task.stream && task.stream !== "admin" ? ` · ${task.stream}` : ""}` }),
      });
      if (res.ok) {
        setSyncedTasks(prev => {
          const next = new Set([...prev, task.id]);
          try { localStorage.setItem(syncedKey, JSON.stringify([...next])); } catch { /* ignore */ }
          return next;
        });
      }
    } catch { /* best-effort */ }
    setSyncingTask(null);
  };

  const disconnectCalendar = async () => {
    await fetch("/api/calendar/disconnect", { method: "POST" });
    setCalConnected(false);
    setCalEvents([]);
  };

  const fmtTime = (dt: string | null) => {
    if (!dt) return "";
    try { return format(parseISO(dt), "h:mm a"); } catch { return ""; }
  };

  const todayDayIdx = new Date().getDay(); // 0=Sun … 6=Sat
  const todaysHabits = habits.filter(h => {
    if (!h.days) return true;
    return h.days.split(",").map(Number).includes(todayDayIdx);
  });
  const habitsDone = todaysHabits.filter(h => completedHabits.includes(h.id));
  const pendingTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);
  const pendingCalTasks = calEvents.filter(e => !checkedCalEvents.has(e.id));
  const doneCalTasks = calEvents.filter(e => checkedCalEvents.has(e.id));
  const pendingContentTasks = contentTasks.filter(c => !checkedContentTasks.has(c.id));
  const doneContentTasks = contentTasks.filter(c => checkedContentTasks.has(c.id));

  return (
    <div className="space-y-5 py-2">
      {/* OAuth result banner */}
      {calBanner === "connected" && (
        <div className="card px-4 py-3 flex items-center gap-3" style={{ background: "rgba(184,212,200,0.35)", border: "1.5px solid rgba(143,173,160,0.5)" }}>
          <span>✅</span>
          <span className="text-sm font-medium" style={{ color: "var(--sage)" }}>Google Calendar connected!</span>
          <button className="ml-auto opacity-60 hover:opacity-100 transition-opacity" onClick={() => setCalBanner(null)}><X size={14} /></button>
        </div>
      )}
      {calBanner === "error" && (
        <div className="card px-4 py-3 flex items-center gap-3" style={{ background: "rgba(232,180,184,0.35)", border: "1.5px solid rgba(200,100,100,0.3)" }}>
          <span>⚠️</span>
          <span className="text-sm font-medium" style={{ color: "var(--rose)" }}>Calendar connection failed — check your Google credentials.</span>
          <button className="ml-auto opacity-60 hover:opacity-100 transition-opacity" onClick={() => setCalBanner(null)}><X size={14} /></button>
        </div>
      )}

      {/* Header hero card */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(222,238,232,0.9) 0%, rgba(245,213,216,0.7) 50%, rgba(237,232,245,0.8) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
                {dayName}
              </span>
              <span style={{ color: "var(--rose)" }}>✦</span>
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>{dateDisplay}</span>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl mb-1" style={{ color: "var(--text-dark)" }}>
              {greeting}, Mabel ✨
            </h1>
            <p className="text-sm italic mt-2 max-w-sm" style={{ color: "var(--text-mid)" }}>
              &ldquo;{verse?.text || "The LORD is my strength and my shield; my heart trusts in him."}&rdquo;
            </p>
          </div>
          <div className="text-3xl md:text-4xl ml-4 float select-none">🦋</div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "habits", value: `${habitsDone.length}/${todaysHabits.length}`, color: "var(--sage)" },
            { label: "tasks", value: `${doneTasks.length + doneCalTasks.length + doneContentTasks.length}/${tasks.length + calEvents.length + contentTasks.length}`, color: "var(--rose)" },
            { label: "today", value: `£${todayIncome.toFixed(0)}`, color: "var(--gold)" },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column grid */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Habits */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🌿</span>
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              Today&apos;s Habits
            </h2>
            <div className="ml-auto progress-track flex-1 max-w-[80px]">
              <div
                className="progress-fill"
                style={{ width: habits.length ? `${(habitsDone.length / habits.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {todaysHabits.map(habit => {
                const done = completedHabits.includes(habit.id);
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: done ? `${habit.color}20` : "rgba(250,246,240,0.8)",
                      border: `1.5px solid ${done ? habit.color + "60" : "rgba(200,184,224,0.2)"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0 font-bold"
                      style={{
                        background: done ? habit.color : "white",
                        border: `2px solid ${habit.color}`,
                        color: "white",
                        fontSize: "11px",
                      }}
                    >
                      {done ? "✓" : ""}
                    </div>
                    <span className="text-base">{habit.emoji}</span>
                    <span className="text-sm font-medium flex-1" style={{
                      color: done ? "var(--text-soft)" : "var(--text-dark)",
                      textDecoration: done ? "line-through" : "none",
                    }}>
                      {habit.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {habit.target_per_week}×/wk
                    </span>
                  </button>
                );
              })}
              {todaysHabits.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-soft)" }}>
                  {habits.length === 0
                    ? <>Set up habits in the <a href="/habits" className="underline" style={{ color: "var(--sage)" }}>Habits</a> section</>
                    : "No habits scheduled for today ✦"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✅</span>
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              Today&apos;s Tasks
            </h2>
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="ml-auto w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "var(--sage-pale)", color: "var(--sage)", border: "1.5px solid rgba(143,173,160,0.3)" }}
            >
              <Plus size={14} />
            </button>
          </div>

          {showAddTask && (
            <div className="flex gap-2 mb-3">
              <input
                autoFocus
                className="input-fairy flex-1 text-sm"
                placeholder="What needs doing today?"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowAddTask(false); }}
              />
              <button className="btn-primary text-xs px-3" onClick={addTask}>Add</button>
            </div>
          )}

          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl group"
                style={{ background: "rgba(250,246,240,0.8)", border: "1.5px solid rgba(200,184,224,0.2)" }}
              >
                <input
                  type="checkbox"
                  className="checkbox-fairy"
                  checked={false}
                  onChange={() => toggleTask(task.id)}
                />
                <span className="text-sm flex-1" style={{ color: "var(--text-dark)" }}>{task.title}</span>
                {task.stream && task.stream !== "admin" && (
                  <span className={`tag ${STREAM_COLORS[task.stream] || "tag-sage"} text-xs`}>{task.stream}</span>
                )}
                {calConnected && (
                  <button
                    onClick={() => syncTaskToCalendar(task)}
                    disabled={syncingTask === task.id}
                    title="Add to Google Calendar"
                    className="w-5 h-5 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20"
                    style={{ color: syncedTasks.has(task.id) ? "var(--sage)" : "var(--text-soft)" }}
                  >
                    {syncingTask === task.id ? <span className="text-[9px]">…</span> : <Calendar size={11} />}
                  </button>
                )}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="w-5 h-5 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-soft)" }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {pendingCalTasks.map(ev => (
              <div
                key={ev.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(184,212,200,0.12)", border: "1.5px solid rgba(143,173,160,0.22)" }}
              >
                <input
                  type="checkbox"
                  className="checkbox-fairy"
                  checked={false}
                  onChange={() => toggleCalEvent(ev.id)}
                />
                <CalendarDays size={13} className="flex-shrink-0" style={{ color: "var(--sage)" }} />
                <span className="text-sm flex-1" style={{ color: "var(--text-dark)" }}>{ev.title}</span>
              </div>
            ))}

            {pendingContentTasks.map(ct => (
              <div
                key={ct.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(245,213,216,0.15)", border: "1.5px solid rgba(200,150,160,0.22)" }}
              >
                <input type="checkbox" className="checkbox-fairy" checked={false} onChange={() => toggleContentTask(ct.id)} />
                <Film size={13} className="flex-shrink-0" style={{ color: "var(--rose)" }} />
                <a href="/content" className="text-sm flex-1 truncate hover:underline" style={{ color: "var(--text-dark)", textDecoration: "none" }}>
                  {ct.title}
                </a>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 capitalize" style={{
                  background: ct.status === "posted" ? "rgba(184,212,200,0.3)" : ct.status === "edited" ? "rgba(200,184,224,0.3)" : ct.status === "filmed" ? "rgba(253,248,236,0.9)" : "rgba(250,246,240,0.9)",
                  color:      ct.status === "posted" ? "var(--sage)"    : ct.status === "edited" ? "var(--lavender)"   : ct.status === "filmed" ? "var(--gold)"    : "var(--text-soft)",
                }}>{ct.status}</span>
              </div>
            ))}

            {(doneTasks.length > 0 || doneCalTasks.length > 0 || doneContentTasks.length > 0) && (
              <>
                <div className="divider-fairy" />
                {doneTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl opacity-50"
                    style={{ background: "rgba(250,246,240,0.4)" }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-fairy"
                      checked={true}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className="text-sm line-through flex-1" style={{ color: "var(--text-soft)" }}>{task.title}</span>
                  </div>
                ))}
                {doneCalTasks.map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl opacity-50"
                    style={{ background: "rgba(184,212,200,0.08)" }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-fairy"
                      checked={true}
                      onChange={() => toggleCalEvent(ev.id)}
                    />
                    <CalendarDays size={13} className="flex-shrink-0" style={{ color: "var(--sage)" }} />
                    <span className="text-sm line-through flex-1" style={{ color: "var(--text-soft)" }}>{ev.title}</span>
                  </div>
                ))}
                {doneContentTasks.map(ct => (
                  <div key={ct.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl opacity-50" style={{ background: "rgba(245,213,216,0.08)" }}>
                    <input type="checkbox" className="checkbox-fairy" checked={true} onChange={() => toggleContentTask(ct.id)} />
                    <Film size={13} className="flex-shrink-0" style={{ color: "var(--rose)" }} />
                    <span className="text-sm line-through flex-1" style={{ color: "var(--text-soft)" }}>{ct.title}</span>
                  </div>
                ))}
              </>
            )}

            {tasks.length === 0 && calEvents.length === 0 && contentTasks.length === 0 && !loading && !showAddTask && (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-soft)" }}>
                Clear slate ✦ tap + to add tasks
              </p>
            )}
          </div>
        </div>

        {/* Mood */}
        <div className="card card-rose px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🌸</span>
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              Mood Check-In
            </h2>
            {mood && (
              <span className="ml-auto text-lg">{MOOD_EMOJIS[(mood.score || 1) - 1]}</span>
            )}
          </div>

          <div className="flex items-end gap-2 mb-4">
            {MOOD_EMOJIS.map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <button
                  className={`mood-btn w-full ${mood?.score === i + 1 ? "selected" : ""}`}
                  style={{ width: "100%", maxWidth: "52px", margin: "0 auto" }}
                  onClick={() => saveMood(i + 1)}
                  title={MOOD_LABELS[i]}
                >
                  {emoji}
                </button>
                <span className="text-xs text-center" style={{ color: "var(--text-soft)", fontSize: "10px" }}>
                  {MOOD_LABELS[i]}
                </span>
              </div>
            ))}
          </div>

          <input
            className="input-fairy text-sm"
            placeholder="Any thoughts? (optional)"
            value={moodNote}
            onChange={e => setMoodNote(e.target.value)}
            onBlur={() => mood?.score && saveMood(mood.score)}
            style={{ background: "rgba(255,255,255,0.7)" }}
          />
        </div>

        {/* Bible Verse */}
        <div className="card card-lavender px-5 py-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} style={{ color: "var(--lavender)" }} />
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              Daily Bible Verse
            </h2>
          </div>

          <div className="flex-1 flex items-center">
            <p className="font-display font-bold italic text-xl leading-snug" style={{ color: "var(--text-mid)" }}>
              &ldquo;{verse?.text || "The LORD is my strength and my shield; my heart trusts in him."}&rdquo;
            </p>
          </div>

          <p className="text-xs mt-4" style={{ color: "var(--text-soft)" }}>
            ✦ {verse?.ref || "Psalm 28:7"} · rotates daily
          </p>
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} style={{ color: "var(--rose)" }} />
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            This Week&apos;s Goals
          </h2>
          <button
            onClick={() => setAddingWeeklyGoal(v => !v)}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
            style={{ background: "var(--rose-pale)", color: "var(--rose)" }}
            aria-label="Add goal"
          >
            <Plus size={15} />
          </button>
        </div>

        {addingWeeklyGoal && (
          <div className="flex gap-2 mb-3">
            <input
              autoFocus
              value={newWeeklyGoal}
              onChange={e => setNewWeeklyGoal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addWeeklyGoal(); if (e.key === "Escape") { setAddingWeeklyGoal(false); setNewWeeklyGoal(""); } }}
              placeholder="e.g. Film content this week…"
              className="flex-1 px-3 py-2 rounded-xl text-sm border-0 outline-none"
              style={{ background: "var(--cream-dark)", color: "var(--text-dark)" }}
            />
            <button
              onClick={addWeeklyGoal}
              className="btn-primary text-sm px-3 py-2"
            >
              Add
            </button>
          </div>
        )}

        {weeklyGoals.length === 0 && !addingWeeklyGoal ? (
          <p className="text-sm text-center py-3" style={{ color: "var(--text-soft)" }}>
            No goals set for this week yet ✦
          </p>
        ) : (
          <ul className="space-y-2">
            {weeklyGoals.map(goal => (
              <li
                key={goal.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                style={{ background: "rgba(245,213,216,0.2)", border: "1.5px solid rgba(200,150,160,0.2)" }}
              >
                <span className="text-rose-400 flex-shrink-0 select-none" style={{ color: "var(--rose)" }}>✦</span>
                <span className="flex-1 text-sm leading-snug" style={{ color: "var(--text-dark)" }}>{goal.text}</span>
                <button
                  onClick={() => deleteWeeklyGoal(goal.id)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Delete goal"
                >
                  <X size={14} style={{ color: "var(--text-soft)" }} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Google Calendar — Today's Schedule */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} style={{ color: "var(--sage)" }} />
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            Today&apos;s Schedule
          </h2>
          {calConnected && (
            <button
              onClick={disconnectCalendar}
              className="ml-auto text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-70"
              style={{ color: "var(--text-soft)", background: "var(--cream-dark)" }}
            >
              Disconnect
            </button>
          )}
        </div>

        {calLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
            ))}
          </div>
        ) : !calConfigured ? (
          <div className="text-center py-5 space-y-2">
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              Add <code className="px-1 rounded text-xs" style={{ background: "var(--cream-dark)" }}>GOOGLE_CLIENT_ID</code> and{" "}
              <code className="px-1 rounded text-xs" style={{ background: "var(--cream-dark)" }}>GOOGLE_CLIENT_SECRET</code> to your env vars to enable calendar sync.
            </p>
          </div>
        ) : !calConnected ? (
          <div className="flex flex-col items-center gap-3 py-5">
            <p className="text-sm text-center" style={{ color: "var(--text-soft)" }}>
              See today&apos;s events and push tasks &amp; habits straight to Google Calendar.
            </p>
            <a
              href="/api/calendar/auth"
              className="btn-primary text-sm"
              style={{ textDecoration: "none" }}
            >
              Connect Google Calendar
            </a>
          </div>
        ) : calEvents.length === 0 ? (
          <p className="text-sm text-center py-5" style={{ color: "var(--text-soft)" }}>
            Nothing scheduled today ✦
          </p>
        ) : (
          <div className="space-y-2">
            {calEvents.map(ev => (
              <a
                key={ev.id}
                href={ev.htmlLink ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-75"
                style={{ background: "rgba(184,212,200,0.15)", border: "1.5px solid rgba(143,173,160,0.25)", textDecoration: "none" }}
              >
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: "var(--sage)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text-dark)" }}>{ev.title}</div>
                  <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                    {ev.allDay ? "All day" : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}
                  </div>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-soft)" }}>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Income strip */}
      <a href="/income" className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow block" style={{ textDecoration: "none" }}>
        <span className="text-2xl">💸</span>
        <div className="flex-1">
          <div className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
            {todayIncome > 0 ? `£${todayIncome.toFixed(2)} today` : "Income Tracker"}
          </div>
          <div className="text-xs" style={{ color: "var(--text-soft)" }}>
            {todayIncome > 0 ? "tap to log more or view full tracker" : "Log earnings · £5k summer goal"}
          </div>
        </div>
        <span className="text-lg" style={{ color: "var(--text-soft)" }}>→</span>
      </a>

      {/* DB not ready notice */}
      {!loading && !dbReady && (
        <div className="card px-5 py-5 text-center">
          <div className="text-2xl mb-3">🦋</div>
          <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
            Connect your database
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            Add <code className="px-1 rounded" style={{ background: "var(--cream-dark)" }}>DATABASE_URL</code> to your environment, then initialise below.
          </p>
          <button
            className="btn-primary"
            onClick={async () => {
              const res = await fetch("/api/init", { method: "POST" });
              if (res.ok) fetchAll();
            }}
          >
            Initialise Database ✦
          </button>
        </div>
      )}
    </div>
  );
}
