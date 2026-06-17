"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, X, Sparkles } from "lucide-react";
import { getGreeting, todayISO } from "@/lib/utils";

type Habit = { id: number; name: string; emoji: string; target_per_week: number; color: string; days?: string | null };
type Task = { id: number; title: string; stream: string; completed: boolean; notes?: string };
type Mood = { score: number; note: string } | null;

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
  const [affirmation, setAffirmation] = useState("");
  const [todayIncome, setTodayIncome] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  const today = todayISO();
  const greeting = getGreeting();
  const dayName = format(new Date(), "EEEE");
  const dateDisplay = format(new Date(), "d MMMM yyyy");

  const fetchAll = useCallback(async () => {
    try {
      const [habitsRes, tasksRes, moodRes, incomeRes, affRes] = await Promise.all([
        fetch("/api/habits", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/mood", { cache: "no-store" }),
        fetch("/api/income", { cache: "no-store" }),
        fetch("/api/affirmations", { cache: "no-store" }),
      ]);
      const [habitsData, tasksData, moodData, incomeData, affData] = await Promise.all([
        habitsRes.json(),
        tasksRes.json(),
        moodRes.json(),
        incomeRes.json(),
        affRes.json(),
      ]);
      setHabits(habitsData.habits || []);
      setCompletedHabits(habitsData.completedToday || []);
      setTasks(tasksData.tasks || []);
      setMood(moodData.mood);
      if (moodData.mood?.note) setMoodNote(moodData.mood.note);
      setTodayIncome(parseFloat(incomeData.todayTotal?.today_net || "0"));
      if (affData.daily) setAffirmation(affData.daily);
      setDbReady(true);
    } catch {
      // db not connected yet
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  const saveMood = async (score: number) => {
    setMood({ score, note: moodNote });
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, note: moodNote }),
    });
  };

  const todayDayIdx = new Date().getDay(); // 0=Sun … 6=Sat
  const todaysHabits = habits.filter(h => {
    if (!h.days) return true;
    return h.days.split(",").map(Number).includes(todayDayIdx);
  });
  const habitsDone = todaysHabits.filter(h => completedHabits.includes(h.id));
  const pendingTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-5 py-2">
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
              &ldquo;{affirmation || "I am magnetic, brilliant, and completely unstoppable."}&rdquo;
            </p>
          </div>
          <div className="text-3xl md:text-4xl ml-4 float select-none">🦋</div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "habits", value: `${habitsDone.length}/${todaysHabits.length}`, color: "var(--sage)" },
            { label: "tasks", value: `${doneTasks.length}/${tasks.length}`, color: "var(--rose)" },
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
                <button
                  onClick={() => deleteTask(task.id)}
                  className="w-5 h-5 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-soft)" }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {doneTasks.length > 0 && (
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
              </>
            )}

            {tasks.length === 0 && !loading && !showAddTask && (
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

        {/* Affirmation */}
        <div className="card card-lavender px-5 py-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} style={{ color: "var(--lavender)" }} />
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              Daily Affirmation
            </h2>
          </div>

          <div className="flex-1 flex items-center">
            <p className="font-display font-bold italic text-xl leading-snug" style={{ color: "var(--text-mid)" }}>
              &ldquo;{affirmation || "I am in my boss era and nothing can stop my glow up."}&rdquo;
            </p>
          </div>

          <p className="text-xs mt-4" style={{ color: "var(--text-soft)" }}>
            ✦ rotates daily · your personal mantras
          </p>
        </div>
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
