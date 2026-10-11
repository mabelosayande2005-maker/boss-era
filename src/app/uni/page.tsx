"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Plus, X, ChevronDown, ChevronUp, Pencil, Check, BookOpen, Layers, ListTodo, LayoutGrid } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Module     = { id: number; name: string; short_name: string; color: string; sort_order: number };
type Goal       = { id: number; assignment_id: number; text: string; week_start: string; completed: boolean; completed_at: string | null };
type Assignment = { id: number; module_id: number; title: string; deadline: string | null; status: string; word_count_target: number | null; word_count_current: number; notes: string | null; goals: Goal[] };
type Lecture    = { id: number; module_id: number; topic: string; lecture_date: string; understanding: string; notes: string | null };
type StudyTask  = { id: number; module_id: number | null; title: string; completed: boolean; completed_at: string | null; task_date: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "modules",     label: "Modules",      icon: LayoutGrid  },
  { key: "assignments", label: "Assignments",   icon: Layers      },
  { key: "lectures",    label: "Lectures",      icon: BookOpen    },
  { key: "tasks",       label: "Study To-Do",   icon: ListTodo    },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATUS_META = {
  not_started: { label: "Not started", color: "var(--text-soft)",  bg: "var(--cream-dark)",     border: "rgba(155,140,140,0.25)" },
  in_progress:  { label: "In progress", color: "#7060a0",           bg: "var(--lavender-pale)",  border: "rgba(200,184,224,0.4)"  },
  done:         { label: "Done",        color: "var(--sage)",       bg: "var(--sage-pale)",      border: "rgba(143,173,160,0.3)"  },
};

const UNDERSTANDING_META = {
  green: { label: "Got it",          color: "#388040", bg: "#eaf5e8", dot: "#4caf50" },
  amber: { label: "Need to revisit", color: "#a06010", bg: "#fdf5e4", dot: "#ff9800" },
  red:   { label: "Lost",            color: "#c03030", bg: "#fde8e8", dot: "#f44336" },
};

const STATUS_CYCLE: Record<string, string> = {
  not_started: "in_progress",
  in_progress: "done",
  done:        "not_started",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function weekStartMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toLocaleDateString("en-CA");
}

function daysUntil(iso: string): number {
  const d = parseLocalDate(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function deadlineBadge(deadline: string | null): { label: string; color: string; bg: string } | null {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: "#c03030", bg: "#fde8e8" };
  if (days === 0) return { label: "Due today",                  color: "#c03030", bg: "#fde8e8" };
  if (days <= 3)  return { label: `${days}d left`,              color: "#b06070", bg: "var(--rose-pale)" };
  if (days <= 7)  return { label: `${days}d left`,              color: "#a06010", bg: "#fdf5e4" };
  return           { label: `${days}d left`,                    color: "var(--sage)", bg: "var(--sage-pale)" };
}

function fmtWeek(ws: string): string {
  return `Week of ${format(parseLocalDate(ws), "d MMM")}`;
}

function safeDate(d: string): string {
  try { return format(parseLocalDate(String(d).slice(0, 10)), "d MMM yyyy"); }
  catch { return String(d).slice(0, 10); }
}

function groupGoalsByWeek(goals: Goal[]): Array<{ weekStart: string; goals: Goal[] }> {
  const map = new Map<string, Goal[]>();
  for (const g of goals) {
    if (!map.has(g.week_start)) map.set(g.week_start, []);
    map.get(g.week_start)!.push(g);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, goals]) => ({ weekStart, goals }));
}

// ── Blank forms ───────────────────────────────────────────────────────────────

const BLANK_ASSIGNMENT = { moduleId: 0, title: "", deadline: "", status: "not_started", wordCountTarget: "", notes: "" };
const BLANK_LECTURE    = { moduleId: 0, topic: "", lectureDate: "", understanding: "green" as "green" | "amber" | "red", notes: "" };

// ── Main component ────────────────────────────────────────────────────────────

export default function UniPage() {

  // ── data state ───────────────────────────────────────────────────────────────
  const [modules,     setModules]     = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lectures,    setLectures]    = useState<Lecture[]>([]);
  const [studyTasks,  setStudyTasks]  = useState<StudyTask[]>([]);
  const [loading,     setLoading]     = useState(true);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [tab,                  setTab]                  = useState<TabKey>("modules");
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<number | null>(null);
  const [editingWordCount,     setEditingWordCount]     = useState<{ id: number; value: string } | null>(null);
  const [editingNotes,         setEditingNotes]         = useState<{ id: number; value: string } | null>(null);
  const [addingGoalFor,        setAddingGoalFor]        = useState<number | null>(null);
  const [goalText,             setGoalText]             = useState("");
  const [confirmDeleteAsgn,    setConfirmDeleteAsgn]    = useState<number | null>(null);
  const [confirmDeleteLecture, setConfirmDeleteLecture] = useState<number | null>(null);

  // ── form state ───────────────────────────────────────────────────────────────
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [af,                setAf]                = useState(BLANK_ASSIGNMENT);
  const [showAddLecture,    setShowAddLecture]    = useState(false);
  const [lf,                setLf]                = useState(BLANK_LECTURE);
  const [taskInput,         setTaskInput]         = useState("");
  const [taskModule,        setTaskModule]        = useState<number | "">("");

  const wcInputRef   = useRef<HTMLInputElement>(null);
  const notesRef     = useRef<HTMLTextAreaElement>(null);
  const goalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingWordCount) wcInputRef.current?.focus();   }, [editingWordCount]);
  useEffect(() => { if (editingNotes)     notesRef.current?.focus();     }, [editingNotes]);
  useEffect(() => { if (addingGoalFor)    goalInputRef.current?.focus(); }, [addingGoalFor]);

  // ── load ──────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/uni", { cache: "no-store" });
      const data = await res.json();
      setModules(data.modules     ?? []);
      setAssignments(data.assignments ?? []);
      setLectures(data.lectures   ?? []);
      setStudyTasks(data.studyTasks ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── API helper ────────────────────────────────────────────────────────────────

  async function api(body: Record<string, unknown>) {
    const res = await fetch("/api/uni", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  // ── Assignment actions ────────────────────────────────────────────────────────

  async function handleAddAssignment() {
    if (!af.title.trim() || !af.moduleId) return;
    const data = await api({
      action:         "add_assignment",
      moduleId:       af.moduleId,
      title:          af.title,
      deadline:       af.deadline || undefined,
      status:         af.status,
      wordCountTarget: af.wordCountTarget ? Number(af.wordCountTarget) : undefined,
      notes:          af.notes || undefined,
    });
    setAssignments(prev => [...prev, data.assignment].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    }));
    setAf(BLANK_ASSIGNMENT);
    setShowAddAssignment(false);
  }

  async function handleCycleStatus(a: Assignment) {
    const newStatus = STATUS_CYCLE[a.status] ?? "not_started";
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x));
    try {
      await api({ action: "update_assignment", id: a.id, status: newStatus, wordCountCurrent: a.word_count_current, notes: a.notes ?? undefined, deadline: a.deadline ?? undefined, wordCountTarget: a.word_count_target ?? undefined });
    } catch {
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: a.status } : x));
    }
  }

  async function handleSaveWordCount(a: Assignment, rawVal: string) {
    const val = Math.max(0, parseInt(rawVal, 10) || 0);
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, word_count_current: val } : x));
    setEditingWordCount(null);
    try {
      await api({ action: "update_assignment", id: a.id, status: a.status, wordCountCurrent: val, notes: a.notes ?? undefined, deadline: a.deadline ?? undefined, wordCountTarget: a.word_count_target ?? undefined });
    } catch {
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, word_count_current: a.word_count_current } : x));
    }
  }

  async function handleSaveNotes(a: Assignment, val: string) {
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, notes: val } : x));
    setEditingNotes(null);
    try {
      await api({ action: "update_assignment", id: a.id, status: a.status, wordCountCurrent: a.word_count_current, notes: val, deadline: a.deadline ?? undefined, wordCountTarget: a.word_count_target ?? undefined });
    } catch {
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, notes: a.notes } : x));
    }
  }

  async function handleDeleteAssignment(id: number) {
    setAssignments(prev => prev.filter(x => x.id !== id));
    setConfirmDeleteAsgn(null);
    await api({ action: "delete_assignment", id });
  }

  // ── Goal actions ──────────────────────────────────────────────────────────────

  async function handleAddGoal(assignmentId: number) {
    if (!goalText.trim()) return;
    const data = await api({ action: "add_goal", assignmentId, text: goalText });
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, goals: [...a.goals, data.goal] } : a
    ));
    setGoalText("");
    setAddingGoalFor(null);
  }

  async function handleToggleGoal(assignmentId: number, goal: Goal) {
    const newVal = !goal.completed;
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, goals: a.goals.map(g => g.id === goal.id ? { ...g, completed: newVal } : g) } : a
    ));
    try {
      await api({ action: "toggle_goal", id: goal.id, completed: newVal });
    } catch {
      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, goals: a.goals.map(g => g.id === goal.id ? { ...g, completed: goal.completed } : g) } : a
      ));
    }
  }

  async function handleDeleteGoal(assignmentId: number, goalId: number) {
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, goals: a.goals.filter(g => g.id !== goalId) } : a
    ));
    await api({ action: "delete_goal", id: goalId });
  }

  // ── Lecture actions ───────────────────────────────────────────────────────────

  async function handleAddLecture() {
    if (!lf.topic.trim() || !lf.moduleId || !lf.lectureDate) return;
    const data = await api({
      action:       "add_lecture",
      moduleId:     lf.moduleId,
      topic:        lf.topic,
      lectureDate:  lf.lectureDate,
      understanding: lf.understanding,
      notes:        lf.notes || undefined,
    });
    setLectures(prev => [data.lecture, ...prev]);
    setLf(BLANK_LECTURE);
    setShowAddLecture(false);
  }

  async function handleDeleteLecture(id: number) {
    setLectures(prev => prev.filter(x => x.id !== id));
    setConfirmDeleteLecture(null);
    await api({ action: "delete_lecture", id });
  }

  // ── Study task actions ────────────────────────────────────────────────────────

  async function handleAddStudyTask() {
    if (!taskInput.trim()) return;
    const data = await api({ action: "add_study_task", title: taskInput, moduleId: taskModule || undefined });
    setStudyTasks(prev => [data.task, ...prev]);
    setTaskInput("");
    setTaskModule("");
  }

  async function handleToggleStudyTask(task: StudyTask) {
    const newVal = !task.completed;
    setStudyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newVal } : t));
    try {
      await api({ action: "toggle_study_task", id: task.id, completed: newVal });
      if (newVal) {
        setTimeout(() => setStudyTasks(prev => prev.filter(t => t.id !== task.id)), 1200);
      }
    } catch {
      setStudyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
    }
  }

  async function handleDeleteStudyTask(id: number) {
    setStudyTasks(prev => prev.filter(t => t.id !== id));
    await api({ action: "delete_study_task", id });
  }

  // ── Shared style helpers ──────────────────────────────────────────────────────

  const divider = { borderTop: "1px solid rgba(200,184,224,0.18)" } as const;

  function ModuleChip({ moduleId }: { moduleId: number | null }) {
    const m = modules.find(x => x.id === moduleId);
    if (!m) return null;
    return (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: m.color + "28", color: m.color, border: `1px solid ${m.color}44` }}
      >
        {m.short_name}
      </span>
    );
  }

  // ── Modules tab ───────────────────────────────────────────────────────────────

  function renderModules() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {modules.map(m => {
            const mAssignments = assignments.filter(a => a.module_id === m.id);
            const done         = mAssignments.filter(a => a.status === "done").length;
            const total        = mAssignments.length;
            const progress     = total > 0 ? Math.round((done / total) * 100) : 0;
            const mLectures    = lectures.filter(l => l.module_id === m.id);
            const needRevisit  = mLectures.filter(l => l.understanding === "amber" || l.understanding === "red").length;
            return (
              <div
                key={m.id}
                className="card p-4"
                style={{ borderTop: `3px solid ${m.color}` }}
              >
                <p className="font-display font-bold italic text-base leading-tight mb-3" style={{ color: "var(--text-dark)" }}>
                  {m.name}
                </p>

                {total > 0 ? (
                  <>
                    <div className="progress-track mb-1.5">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: "var(--text-soft)" }}>
                      {done}/{total} assignments done
                    </p>
                  </>
                ) : (
                  <p className="text-xs mb-3 italic" style={{ color: "var(--text-soft)" }}>No assignments yet</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(200,184,224,0.18)", color: "var(--text-soft)" }}>
                    {mLectures.length} lecture{mLectures.length !== 1 ? "s" : ""}
                  </span>
                  {needRevisit > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#fdf5e4", color: "#a06010" }}>
                      {needRevisit} to revisit
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Assignments tab ───────────────────────────────────────────────────────────

  function renderAssignments() {
    return (
      <div className="space-y-3">

        {/* Add button / form */}
        {!showAddAssignment ? (
          <button
            onClick={() => { setShowAddAssignment(true); setAf({ ...BLANK_ASSIGNMENT, moduleId: modules[0]?.id ?? 0 }); }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Add assignment
          </button>
        ) : (
          <div className="card p-4 space-y-3">
            <p className="font-display font-bold italic" style={{ color: "var(--text-dark)" }}>New assignment</p>

            <select className="input-fairy" value={af.moduleId} onChange={e => setAf(p => ({ ...p, moduleId: Number(e.target.value) }))}>
              <option value={0} disabled>Module…</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <input className="input-fairy" placeholder="Title / essay question" value={af.title} onChange={e => setAf(p => ({ ...p, title: e.target.value }))} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Deadline</label>
                <input type="date" className="input-fairy" value={af.deadline} onChange={e => setAf(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Word count target</label>
                <input type="number" className="input-fairy" placeholder="e.g. 2000" value={af.wordCountTarget} onChange={e => setAf(p => ({ ...p, wordCountTarget: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Status</label>
              <div className="flex gap-2">
                {(["not_started", "in_progress", "done"] as const).map(s => {
                  const meta = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setAf(p => ({ ...p, status: s }))}
                      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                      style={{
                        background: af.status === s ? meta.bg     : "rgba(255,255,255,0.7)",
                        color:      af.status === s ? meta.color  : "var(--text-soft)",
                        border:     `1px solid ${af.status === s ? meta.border : "transparent"}`,
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea className="input-fairy" placeholder="Notes (optional)" rows={2} value={af.notes} onChange={e => setAf(p => ({ ...p, notes: e.target.value }))} />

            <div className="flex gap-2">
              <button onClick={handleAddAssignment} className="btn-primary flex-1" disabled={!af.title.trim() || !af.moduleId}>Save</button>
              <button onClick={() => setShowAddAssignment(false)} className="btn-rose flex-1 btn-primary">Cancel</button>
            </div>
          </div>
        )}

        {/* Assignment cards */}
        {assignments.length === 0 && !loading && (
          <p className="text-center text-sm italic py-8" style={{ color: "var(--text-soft)" }}>No assignments yet ✦</p>
        )}

        {assignments.map(a => {
          const statusMeta  = STATUS_META[a.status as keyof typeof STATUS_META] ?? STATUS_META.not_started;
          const badge       = deadlineBadge(a.deadline);
          const isExpanded  = expandedAssignmentId === a.id;
          const wcPct       = a.word_count_target ? Math.min(100, Math.round((a.word_count_current / a.word_count_target) * 100)) : null;
          const isEdWc      = editingWordCount?.id === a.id;
          const isEdNotes   = editingNotes?.id === a.id;
          const weekGroups  = groupGoalsByWeek(a.goals);
          const thisWeek    = weekStartMonday();

          return (
            <div key={a.id} className="card overflow-hidden">

              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <ModuleChip moduleId={a.module_id} />
                      {badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      )}
                      {a.deadline && (
                        <span className="text-[10px]" style={{ color: "var(--text-soft)" }}>
                          {safeDate(a.deadline)}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm leading-snug" style={{ color: "var(--text-dark)" }}>{a.title}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {/* Status badge — tap to cycle */}
                    <button
                      onClick={() => handleCycleStatus(a)}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95"
                      style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}
                      title="Tap to cycle status"
                    >
                      {statusMeta.label}
                    </button>

                    {/* Delete */}
                    {confirmDeleteAsgn === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteAssignment(a.id)} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: "var(--rose)", color: "white" }}>Delete</button>
                        <button onClick={() => setConfirmDeleteAsgn(null)} className="text-[10px] px-2 py-1 rounded-full" style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteAsgn(a.id)} className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-80" style={{ color: "var(--text-soft)" }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Word count */}
                {a.word_count_target !== null && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      {isEdWc ? (
                        <input
                          ref={wcInputRef}
                          type="number"
                          value={editingWordCount!.value}
                          onChange={e => setEditingWordCount({ id: a.id, value: e.target.value })}
                          onBlur={() => handleSaveWordCount(a, editingWordCount!.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSaveWordCount(a, editingWordCount!.value); if (e.key === "Escape") setEditingWordCount(null); }}
                          className="input-fairy text-xs py-1 w-24"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingWordCount({ id: a.id, value: String(a.word_count_current) })}
                          className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
                          style={{ color: "var(--text-mid)" }}
                          title="Tap to update word count"
                        >
                          <span className="font-semibold">{a.word_count_current.toLocaleString()}</span>
                          <span style={{ color: "var(--text-soft)" }}>/ {a.word_count_target.toLocaleString()} words</span>
                          <Pencil size={10} style={{ color: "var(--text-soft)" }} />
                        </button>
                      )}
                      <span className="text-xs ml-auto" style={{ color: wcPct === 100 ? "var(--sage)" : "var(--text-soft)" }}>
                        {wcPct}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${wcPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedAssignmentId(isExpanded ? null : a.id)}
                  className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70 w-full justify-center pt-1"
                  style={{ color: "var(--text-soft)" }}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{isExpanded ? "Less" : "Notes & goals"}</span>
                </button>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div className="p-4 pt-3 space-y-4" style={{ ...divider, background: "rgba(255,255,255,0.45)" }}>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Notes</p>
                      {!isEdNotes && (
                        <button onClick={() => setEditingNotes({ id: a.id, value: a.notes ?? "" })} className="opacity-50 hover:opacity-90">
                          <Pencil size={12} style={{ color: "var(--text-soft)" }} />
                        </button>
                      )}
                    </div>
                    {isEdNotes ? (
                      <div className="space-y-2">
                        <textarea
                          ref={notesRef}
                          value={editingNotes!.value}
                          onChange={e => setEditingNotes({ id: a.id, value: e.target.value })}
                          rows={3}
                          className="input-fairy text-sm"
                          style={{ background: "rgba(255,255,255,0.9)" }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveNotes(a, editingNotes!.value)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                          <button onClick={() => setEditingNotes(null)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: a.notes ? "var(--text-mid)" : "var(--text-soft)", fontStyle: a.notes ? "normal" : "italic" }}>
                        {a.notes || "No notes yet — tap ✎ to add"}
                      </p>
                    )}
                  </div>

                  {/* Weekly goals */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Weekly goals</p>
                      {addingGoalFor !== a.id && (
                        <button
                          onClick={() => { setAddingGoalFor(a.id); setGoalText(""); }}
                          className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
                          style={{ color: "var(--rose)" }}
                        >
                          <Plus size={12} /> This week
                        </button>
                      )}
                    </div>

                    {addingGoalFor === a.id && (
                      <div className="flex gap-2 mb-3">
                        <input
                          ref={goalInputRef}
                          value={goalText}
                          onChange={e => setGoalText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAddGoal(a.id); if (e.key === "Escape") setAddingGoalFor(null); }}
                          placeholder="e.g. write 500 words"
                          className="input-fairy text-sm flex-1 py-1.5"
                          style={{ background: "rgba(255,255,255,0.9)" }}
                        />
                        <button onClick={() => handleAddGoal(a.id)} disabled={!goalText.trim()} className="btn-primary text-xs px-3 disabled:opacity-40">Add</button>
                        <button onClick={() => setAddingGoalFor(null)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={12} /></button>
                      </div>
                    )}

                    {weekGroups.length === 0 && (
                      <p className="text-xs italic" style={{ color: "var(--text-soft)" }}>No goals yet</p>
                    )}

                    {weekGroups.map(({ weekStart, goals: wGoals }) => (
                      <div key={weekStart} className="mb-3">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                          style={{ color: weekStart === thisWeek ? "var(--rose)" : "var(--text-soft)" }}
                        >
                          {weekStart === thisWeek ? "This week ✦" : fmtWeek(weekStart)}
                        </p>
                        <div className="space-y-1.5">
                          {wGoals.map(g => (
                            <div key={g.id} className="flex items-center gap-2 group">
                              <button
                                onClick={() => handleToggleGoal(a.id, g)}
                                className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                                style={{
                                  borderColor: g.completed ? "var(--sage)" : "rgba(200,184,224,0.5)",
                                  background:  g.completed ? "var(--sage)" : "white",
                                }}
                              >
                                {g.completed && <Check size={10} color="white" />}
                              </button>
                              <span
                                className="text-sm flex-1"
                                style={{
                                  color:          g.completed ? "var(--text-soft)" : "var(--text-mid)",
                                  textDecoration: g.completed ? "line-through" : "none",
                                }}
                              >
                                {g.text}
                              </span>
                              <button
                                onClick={() => handleDeleteGoal(a.id, g.id)}
                                className="w-5 h-5 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 shrink-0"
                                style={{ color: "var(--text-soft)" }}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Lectures tab ──────────────────────────────────────────────────────────────

  function renderLectures() {
    const needsRevisit = lectures.filter(l => l.understanding === "amber" || l.understanding === "red");

    return (
      <div className="space-y-4">

        {/* Add form toggle */}
        {!showAddLecture ? (
          <button
            onClick={() => { setShowAddLecture(true); setLf({ ...BLANK_LECTURE, moduleId: modules[0]?.id ?? 0, lectureDate: new Date().toLocaleDateString("en-CA") }); }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Log lecture
          </button>
        ) : (
          <div className="card p-4 space-y-3">
            <p className="font-display font-bold italic" style={{ color: "var(--text-dark)" }}>Log a lecture</p>

            <select className="input-fairy" value={lf.moduleId} onChange={e => setLf(p => ({ ...p, moduleId: Number(e.target.value) }))}>
              <option value={0} disabled>Module…</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <input className="input-fairy" placeholder="Topic / lecture title" value={lf.topic} onChange={e => setLf(p => ({ ...p, topic: e.target.value }))} />

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Date</label>
              <input type="date" className="input-fairy" value={lf.lectureDate} onChange={e => setLf(p => ({ ...p, lectureDate: e.target.value }))} />
            </div>

            {/* Traffic light */}
            <div>
              <label className="text-xs mb-2 block" style={{ color: "var(--text-soft)" }}>How well did you follow it?</label>
              <div className="grid grid-cols-3 gap-2">
                {(["green", "amber", "red"] as const).map(u => {
                  const meta = UNDERSTANDING_META[u];
                  return (
                    <button
                      key={u}
                      onClick={() => setLf(p => ({ ...p, understanding: u }))}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                      style={{
                        background: lf.understanding === u ? meta.bg   : "rgba(255,255,255,0.6)",
                        border:     lf.understanding === u ? `2px solid ${meta.dot}` : "2px solid transparent",
                      }}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ background: meta.dot }} />
                      <span className="text-[10px] font-medium text-center leading-tight" style={{ color: lf.understanding === u ? meta.color : "var(--text-soft)" }}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAddLecture} className="btn-primary flex-1" disabled={!lf.topic.trim() || !lf.moduleId || !lf.lectureDate}>Save</button>
              <button onClick={() => setShowAddLecture(false)} className="btn-rose flex-1 btn-primary">Cancel</button>
            </div>
          </div>
        )}

        {/* Needs Revisiting banner */}
        {needsRevisit.length > 0 && (
          <div className="card p-4" style={{ background: "#fdf5e4", border: "1px solid rgba(212,168,83,0.3)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#a06010" }}>
              ⚠ Needs revisiting ({needsRevisit.length})
            </p>
            <div className="space-y-1.5">
              {needsRevisit.map(l => {
                const meta = UNDERSTANDING_META[l.understanding as keyof typeof UNDERSTANDING_META];
                return (
                  <div key={l.id} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                    <ModuleChip moduleId={l.module_id} />
                    <span className="text-sm flex-1" style={{ color: "var(--text-dark)" }}>{l.topic}</span>
                    <span className="text-xs" style={{ color: "var(--text-soft)" }}>{safeDate(l.lecture_date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lectures list */}
        {lectures.length === 0 && !loading && (
          <p className="text-center text-sm italic py-8" style={{ color: "var(--text-soft)" }}>No lectures logged yet ✦</p>
        )}

        <div className="space-y-2">
          {lectures.map(l => {
            const meta = UNDERSTANDING_META[l.understanding as keyof typeof UNDERSTANDING_META] ?? UNDERSTANDING_META.green;
            return (
              <div key={l.id} className="card p-3.5 flex items-center gap-3" style={{ background: meta.bg, border: `1px solid ${meta.dot}33` }}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: meta.dot }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <ModuleChip moduleId={l.module_id} />
                    <span className="text-xs" style={{ color: "var(--text-soft)" }}>{safeDate(l.lecture_date)}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>{l.topic}</p>
                  {l.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{l.notes}</p>}
                </div>
                {confirmDeleteLecture === l.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleDeleteLecture(l.id)} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: "var(--rose)", color: "white" }}>Delete</button>
                    <button onClick={() => setConfirmDeleteLecture(null)} className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.8)", color: "var(--text-soft)" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteLecture(l.id)} className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 shrink-0" style={{ color: "var(--text-soft)" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Study To-Do tab ───────────────────────────────────────────────────────────

  function renderStudyTodo() {
    const incomplete = studyTasks.filter(t => !t.completed);
    const done       = studyTasks.filter(t => t.completed);

    return (
      <div className="space-y-3">

        {/* Add task */}
        <div className="card p-3 flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <input
              className="input-fairy"
              placeholder="Add a study task…"
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddStudyTask(); }}
            />
            <select
              className="input-fairy text-sm"
              value={taskModule}
              onChange={e => setTaskModule(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">No module tag</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAddStudyTask}
            disabled={!taskInput.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-40 shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>

        {incomplete.length === 0 && done.length === 0 && !loading && (
          <p className="text-center text-sm italic py-8" style={{ color: "var(--text-soft)" }}>Nothing to study today ✦</p>
        )}

        {/* Incomplete tasks */}
        {incomplete.map(t => (
          <div key={t.id} className="card p-3 flex items-center gap-3">
            <button
              onClick={() => handleToggleStudyTask(t)}
              className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
              style={{ borderColor: "rgba(200,184,224,0.5)", background: "white" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {t.module_id && <ModuleChip moduleId={t.module_id} />}
              </div>
              <p className="text-sm" style={{ color: "var(--text-dark)" }}>{t.title}</p>
            </div>
            <button onClick={() => handleDeleteStudyTask(t.id)} className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 shrink-0" style={{ color: "var(--text-soft)" }}>
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Done today */}
        {done.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-soft)" }}>Done today</p>
            {done.map(t => (
              <div key={t.id} className="card p-3 mb-2 flex items-center gap-3 opacity-60">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--sage)" }}>
                  <Check size={10} color="white" />
                </div>
                <div className="flex-1 min-w-0">
                  {t.module_id && <div className="mb-0.5"><ModuleChip moduleId={t.module_id} /></div>}
                  <p className="text-sm line-through" style={{ color: "var(--text-soft)" }}>{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display font-bold italic text-3xl mb-1" style={{ color: "var(--text-dark)" }}>
          Uni ✦
        </h1>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>2025/26 academic year</p>
        <div className="iridescent-bar h-0.5 mt-3 rounded-full opacity-60" />
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-5"
        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(200,184,224,0.2)" }}
      >
        {TABS.map(t => {
          const Icon     = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all text-[10px] font-semibold"
              style={{
                background: isActive ? "white" : "transparent",
                color:      isActive ? "var(--sage)" : "var(--text-soft)",
                boxShadow:  isActive ? "0 1px 6px rgba(143,173,160,0.18)" : "none",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(200,184,224,0.1)" }} />
          ))}
        </div>
      ) : (
        <>
          {tab === "modules"     && renderModules()}
          {tab === "assignments" && renderAssignments()}
          {tab === "lectures"    && renderLectures()}
          {tab === "tasks"       && renderStudyTodo()}
        </>
      )}
    </div>
  );
}
