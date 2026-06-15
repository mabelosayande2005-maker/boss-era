"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Lock, ChevronDown, ChevronUp, Check, Pencil } from "lucide-react";
import { summerProgress, SUMMER_START, SUMMER_END } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

type SummerTask = {
  id: number;
  title: string;
  stream: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

const STREAMS = [
  { name: "Personal TikTok", emoji: "🎵", color: "#e8b4b8", bg: "var(--rose-pale)", border: "rgba(232,180,184,0.5)", tag: "tag-rose" },
  { name: "StudyGlow",       emoji: "✨", color: "#c8b8e0", bg: "var(--lavender-pale)", border: "rgba(200,184,224,0.5)", tag: "tag-lavender" },
  { name: "Vinted",          emoji: "🛍️", color: "#d4a853", bg: "#fdf8ec", border: "rgba(212,168,83,0.4)", tag: "tag-gold" },
  { name: "Skills",          emoji: "🧠", color: "#8fada0", bg: "var(--sage-pale)", border: "rgba(143,173,160,0.5)", tag: "tag-sage" },
  { name: "Admin",           emoji: "📋", color: "#9b8c8c", bg: "rgba(250,246,240,0.9)", border: "rgba(155,140,140,0.3)", tag: "" },
] as const;

type StreamName = (typeof STREAMS)[number]["name"];

const WINTER_UNLOCK = new Date("2026-09-01");

export default function SummerPlanPage() {
  const [tasks, setTasks] = useState<SummerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [addingTo, setAddingTo] = useState<StreamName | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [collapsedStreams, setCollapsedStreams] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // All new Date() calls deferred to client to avoid SSR/client hydration mismatch
  const now              = mounted ? new Date() : SUMMER_START;
  const isWinterUnlocked = mounted && now >= WINTER_UNLOCK;
  const summerPct        = mounted ? summerProgress() : 0;
  const daysTotal        = differenceInDays(SUMMER_END, SUMMER_START);
  const daysLeft         = mounted ? Math.max(0, differenceInDays(SUMMER_END, now)) : daysTotal;
  const daysGone         = daysTotal - daysLeft;
  const daysUntilWinter  = mounted ? Math.max(0, differenceInDays(WINTER_UNLOCK, now)) : 78;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/summer-tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
      setSeeded((data.tasks || []).length > 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    await fetch("/api/summer-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
  };

  const addTask = async (stream: StreamName) => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/summer-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", title: newTitle.trim(), stream, notes: newNotes.trim() || null }),
    });
    const data = await res.json();
    if (data.task) setTasks(prev => [...prev, data.task]);
    setNewTitle("");
    setNewNotes("");
    setAddingTo(null);
  };

  const deleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch("/api/summer-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
  };

  const saveEdit = async (id: number) => {
    if (!editTitle.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: editTitle.trim() } : t));
    await fetch("/api/summer-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, title: editTitle.trim() }),
    });
    setEditingId(null);
    setEditTitle("");
  };

  const seedTasks = async () => {
    await fetch("/api/summer-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    fetchTasks();
  };

  const toggleCollapse = (stream: string) => {
    setCollapsedStreams(prev => {
      const next = new Set(prev);
      if (next.has(stream)) next.delete(stream);
      else next.add(stream);
      return next;
    });
  };

  const tasksByStream = (stream: string) => tasks.filter(t => t.stream === stream);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.completed).length;
  const overallPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-5 py-2">

      {/* Hero */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(253,248,236,0.95) 0%, rgba(222,238,232,0.85) 40%, rgba(237,232,245,0.8) 100%)",
      }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
                12 Jun – 31 Aug 2026
              </span>
              <span style={{ color: "var(--gold)" }}>✦</span>
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                {daysLeft} days left
              </span>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              Boss Era ☀️
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-mid)" }}>
              Summer Plan · {doneTasks}/{totalTasks} tasks complete
            </p>
          </div>
          <div className="text-right">
            <div className="font-display font-bold italic text-3xl" style={{ color: "var(--gold)" }}>
              {overallPct.toFixed(0)}%
            </div>
            <div className="text-xs" style={{ color: "var(--text-soft)" }}>done</div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-soft)" }}>
            <span>Overall completion</span>
            <span>{doneTasks}/{totalTasks}</span>
          </div>
          <div className="progress-track h-2.5">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* Summer calendar */}
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.55)" }}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              ☀️ Summer calendar
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--sage)" }}>
              Day {daysGone} of {daysTotal}
            </span>
          </div>
          <div className="progress-track h-2">
            <div className="progress-fill" style={{ width: `${summerPct}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>
            <span>12 Jun</span>
            <span className="font-medium" style={{ color: "var(--text-mid)" }}>Today</span>
            <span>31 Aug</span>
          </div>
        </div>

        {/* Stream mini-bars */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {STREAMS.map(stream => {
            const streamTasks = tasksByStream(stream.name);
            const streamDone = streamTasks.filter(t => t.completed).length;
            const streamPct = streamTasks.length > 0 ? (streamDone / streamTasks.length) * 100 : 0;
            return (
              <div key={stream.name} className="text-center">
                <div className="text-base mb-1">{stream.emoji}</div>
                <div className="progress-track h-1.5 mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${streamPct}%`, background: stream.color }}
                  />
                </div>
                <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                  {streamDone}/{streamTasks.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seed prompt */}
      {!loading && !seeded && (
        <div className="card px-5 py-5 text-center">
          <div className="text-2xl mb-3">☀️</div>
          <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
            Start your Summer Plan
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            Load suggested tasks across all streams, or add your own below.
          </p>
          <button className="btn-primary" onClick={seedTasks}>
            Load suggested tasks ✦
          </button>
        </div>
      )}

      {/* Stream sections */}
      {!loading && STREAMS.map(stream => {
        const streamTasks = tasksByStream(stream.name);
        const streamDone = streamTasks.filter(t => t.completed).length;
        const streamPct = streamTasks.length > 0 ? (streamDone / streamTasks.length) * 100 : 0;
        const collapsed = collapsedStreams.has(stream.name);
        const pending = streamTasks.filter(t => !t.completed);
        const done = streamTasks.filter(t => t.completed);

        return (
          <div key={stream.name} className="card overflow-hidden">
            {/* Stream header */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none"
              style={{ background: stream.bg, borderBottom: collapsed ? "none" : `1px solid ${stream.border}` }}
              onClick={() => toggleCollapse(stream.name)}
            >
              <span className="text-xl">{stream.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
                    {stream.name}
                  </h2>
                  <span className={`tag ${stream.tag} text-xs`} style={{ flexShrink: 0 }}>
                    {streamDone}/{streamTasks.length}
                  </span>
                </div>
                <div className="progress-track h-1 mt-1.5 max-w-[100px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${streamPct}%`, background: stream.color }}
                  />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isOpening = addingTo !== stream.name;
                  setAddingTo(isOpening ? stream.name as StreamName : null);
                  setNewTitle("");
                  setNewNotes("");
                  if (isOpening && collapsed) toggleCollapse(stream.name);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: `${stream.color}30`, color: stream.color, border: `1.5px solid ${stream.color}60` }}
                title={`Add task to ${stream.name}`}
              >
                <Plus size={13} />
              </button>
              {collapsed
                ? <ChevronDown size={16} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                : <ChevronUp size={16} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
              }
            </div>

            {!collapsed && (
              <div className="px-5 py-3 space-y-1.5">
                {/* Add form */}
                {addingTo === stream.name && (
                  <div className="rounded-xl p-3 mb-2" style={{ background: `${stream.color}12`, border: `1.5px solid ${stream.color}40` }}>
                    <input
                      autoFocus
                      className="input-fairy text-sm mb-2"
                      placeholder={`Add task to ${stream.name}…`}
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") addTask(stream.name);
                        if (e.key === "Escape") setAddingTo(null);
                      }}
                    />
                    <input
                      className="input-fairy text-sm mb-2.5"
                      placeholder="Notes (optional)"
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTask(stream.name); }}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-4 py-1.5"
                        style={{
                          background: `linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%), ${stream.color}`,
                          border: "1px solid rgba(255,255,255,0.4)",
                          color: stream.name === "Vinted" || stream.name === "Admin" ? "white" : "white",
                        }}
                        onClick={() => addTask(stream.name)}
                      >
                        Add task
                      </button>
                      <button
                        className="text-xs px-3 py-1.5 rounded-full transition-colors"
                        style={{ color: "var(--text-soft)" }}
                        onClick={() => setAddingTo(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending tasks */}
                {pending.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    streamColor={stream.color}
                    editingId={editingId}
                    editTitle={editTitle}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onStartEdit={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    onSaveEdit={() => saveEdit(task.id)}
                    onCancelEdit={() => { setEditingId(null); setEditTitle(""); }}
                    onEditTitleChange={setEditTitle}
                  />
                ))}

                {/* Divider between pending and done */}
                {pending.length > 0 && done.length > 0 && (
                  <div className="divider-fairy" />
                )}

                {/* Done tasks */}
                {done.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    streamColor={stream.color}
                    editingId={editingId}
                    editTitle={editTitle}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onStartEdit={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    onSaveEdit={() => saveEdit(task.id)}
                    onCancelEdit={() => { setEditingId(null); setEditTitle(""); }}
                    onEditTitleChange={setEditTitle}
                  />
                ))}

                {streamTasks.length === 0 && addingTo !== stream.name && (
                  <button
                    className="w-full text-sm py-3 text-left transition-colors"
                    style={{ color: "var(--text-soft)" }}
                    onClick={() => setAddingTo(stream.name)}
                  >
                    ✦ No tasks yet — tap + to add one
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Winter Lock In */}
      <div className="card overflow-hidden" style={{ opacity: isWinterUnlocked ? 1 : 0.85 }}>
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            background: isWinterUnlocked
              ? "linear-gradient(135deg, rgba(200,184,224,0.4), rgba(143,173,160,0.25))"
              : "linear-gradient(135deg, rgba(200,184,224,0.12), rgba(143,173,160,0.08))",
            borderBottom: "1px solid rgba(200,184,224,0.25)",
          }}
        >
          <span className="text-2xl">{isWinterUnlocked ? "❄️" : "🔒"}</span>
          <div className="flex-1">
            <h2
              className="font-display font-bold italic text-xl"
              style={{ color: isWinterUnlocked ? "var(--text-dark)" : "var(--text-soft)" }}
            >
              Winter Lock In
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
              {isWinterUnlocked
                ? "September onwards — your winter season plan"
                : `Unlocks ${format(WINTER_UNLOCK, "d MMMM yyyy")}`}
            </p>
          </div>
          {!isWinterUnlocked && <Lock size={20} style={{ color: "var(--text-soft)" }} />}
        </div>

        <div className="px-5 py-6 text-center">
          {isWinterUnlocked ? (
            <p className="text-sm" style={{ color: "var(--text-mid)" }}>
              Winter season tasks — add your goals for September onwards here.
            </p>
          ) : (
            <>
              <div
                className="text-4xl mb-3 select-none"
                style={{ filter: "blur(3px)", userSelect: "none", letterSpacing: "0.2em" }}
                aria-hidden="true"
              >
                ❄️🌙⭐📚💪
              </div>
              <p className="text-sm italic mb-1" style={{ color: "var(--text-soft)" }}>
                Focus on summer first, queen ✦
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-soft)", opacity: 0.7 }}>
                Your Winter Lock In plan unlocks on 1 September 2026
              </p>
              <div className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5" style={{ background: "rgba(200,184,224,0.15)", border: "1px solid rgba(200,184,224,0.3)" }}>
                <span className="font-display font-black italic text-2xl" style={{ color: "var(--lavender)" }}>
                  {daysUntilWinter}
                </span>
                <span className="text-sm" style={{ color: "var(--text-soft)" }}>days away</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card px-5 py-4">
              <div className="h-6 w-36 rounded animate-pulse mb-3" style={{ background: "var(--cream-dark)" }} />
              <div className="space-y-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-10 rounded-xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  streamColor,
  editingId,
  editTitle,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTitleChange,
}: {
  task: SummerTask;
  streamColor: string;
  editingId: number | null;
  editTitle: string;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTitleChange: (v: string) => void;
}) {
  const isEditing = editingId === task.id;

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: `${streamColor}12`, border: `1.5px solid ${streamColor}40` }}
      >
        <input
          autoFocus
          className="input-fairy flex-1 text-sm py-1"
          value={editTitle}
          onChange={e => onEditTitleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        <button
          onClick={onSaveEdit}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: streamColor, color: "white" }}
        >
          <Check size={12} />
        </button>
        <button
          onClick={onCancelEdit}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl group transition-all"
      style={{
        background: task.completed ? "rgba(250,246,240,0.35)" : "rgba(250,246,240,0.8)",
        border: task.completed ? "1.5px solid transparent" : "1.5px solid rgba(200,184,224,0.2)",
        opacity: task.completed ? 0.6 : 1,
      }}
    >
      <button
        onClick={onToggle}
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: task.completed ? streamColor : "white",
          border: `2px solid ${streamColor}`,
          color: "white",
          fontSize: "11px",
          fontWeight: "bold",
        }}
      >
        {task.completed && "✓"}
      </button>

      <span
        className="text-sm flex-1"
        style={{
          color: task.completed ? "var(--text-soft)" : "var(--text-dark)",
          textDecoration: task.completed ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>

      {task.notes && !task.completed && (
        <span
          className="text-xs italic hidden sm:block"
          style={{
            color: "var(--text-soft)",
            maxWidth: "140px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.notes}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!task.completed && (
          <button
            onClick={onStartEdit}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ color: "var(--text-soft)" }}
            title="Edit"
          >
            <Pencil size={11} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ color: "var(--text-soft)" }}
          title="Delete"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
