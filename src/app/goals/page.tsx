"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type Milestone = { id: number; goal_id: number; title: string; completed: boolean };
type Goal = { id: number; title: string; description: string | null; category: string; emoji: string; target_date: string | null; progress_pct: number; status: string; color: string; milestones: Milestone[] };

const CATEGORIES = ["personal", "career", "health", "financial", "creative", "learning", "travel", "social"];
const CAT_EMOJI: Record<string, string> = {
  personal: "✨", career: "💼", health: "💪", financial: "💰",
  creative: "🎨", learning: "📚", travel: "✈️", social: "🌸",
};
const GOAL_COLORS = ["#b8d4c8", "#e8b4b8", "#c8b8e0", "#d4a853", "#f0d080", "#deeee8"];

function GoalCard({ goal, onUpdate, onDelete, onAddMilestone, onToggleMilestone, onDeleteMilestone }: {
  goal: Goal;
  onUpdate: (id: number, progress: number) => void;
  onDelete: (id: number) => void;
  onAddMilestone: (goalId: number, title: string) => void;
  onToggleMilestone: (id: number) => void;
  onDeleteMilestone: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newMs, setNewMs] = useState("");
  const [showMsInput, setShowMsInput] = useState(false);
  const [sliderVal, setSliderVal] = useState(goal.progress_pct);

  const done = goal.milestones.filter(m => m.completed).length;
  const total = goal.milestones.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : goal.progress_pct;
  const isComplete = goal.status === "completed";

  const dateStr = goal.target_date
    ? format(parseISO(String(goal.target_date).split("T")[0]), "d MMM yyyy")
    : null;
  const isPast = goal.target_date && new Date(String(goal.target_date).split("T")[0]) < new Date() && !isComplete;

  return (
    <div className="card px-5 py-4" style={{ borderLeft: `4px solid ${goal.color}` }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{goal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold" style={{ color: isComplete ? "var(--text-soft)" : "var(--text-dark)", textDecoration: isComplete ? "line-through" : "none" }}>
                {goal.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${goal.color}30`, color: "var(--text-mid)" }}>
                  {CAT_EMOJI[goal.category] || ""} {goal.category}
                </span>
                {dateStr && (
                  <span className="text-xs" style={{ color: isPast ? "var(--rose)" : "var(--text-soft)" }}>
                    {isPast ? "⚠️ " : "📅 "}{dateStr}
                  </span>
                )}
              </div>
              {goal.description && (
                <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>{goal.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg transition-colors" style={{ color: "var(--text-soft)" }}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button onClick={() => onDelete(goal.id)} className="p-1 rounded-lg opacity-40 hover:opacity-80">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
                {total > 0 ? `${done}/${total} milestones` : "Progress"}
              </span>
              <span className="text-xs font-bold" style={{ color: goal.color }}>{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%`, background: goal.color, transition: "width 0.4s ease" }} />
            </div>
            {total === 0 && (
              <input type="range" min={0} max={100} value={sliderVal}
                onChange={e => setSliderVal(parseInt(e.target.value))}
                onMouseUp={() => onUpdate(goal.id, sliderVal)}
                onTouchEnd={() => onUpdate(goal.id, sliderVal)}
                className="w-full mt-2 accent-sage" style={{ accentColor: goal.color }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Milestones */}
      {expanded && (
        <div className="mt-4 pl-10 space-y-2">
          {goal.milestones.map(ms => (
            <div key={ms.id} className="flex items-center gap-2 group">
              <input type="checkbox" className="checkbox-fairy" checked={ms.completed} onChange={() => onToggleMilestone(ms.id)} />
              <span className="text-sm flex-1" style={{ color: ms.completed ? "var(--text-soft)" : "var(--text-dark)", textDecoration: ms.completed ? "line-through" : "none" }}>
                {ms.title}
              </span>
              <button onClick={() => onDeleteMilestone(ms.id)} className="opacity-0 group-hover:opacity-50 transition-opacity">
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {showMsInput ? (
            <div className="flex gap-2">
              <input autoFocus value={newMs} onChange={e => setNewMs(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newMs.trim()) { onAddMilestone(goal.id, newMs); setNewMs(""); setShowMsInput(false); } if (e.key === "Escape") setShowMsInput(false); }}
                className="input-fairy flex-1 text-sm" placeholder="Milestone title…" />
              <button onClick={() => { if (newMs.trim()) { onAddMilestone(goal.id, newMs); setNewMs(""); setShowMsInput(false); } }} className="btn-primary text-xs px-3">Add</button>
            </div>
          ) : (
            <button onClick={() => setShowMsInput(true)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--sage)" }}>
              <Plus size={12} /> Add milestone
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
  const [showForm, setShowForm] = useState(false);

  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCat, setFCat] = useState("personal");
  const [fEmoji, setFEmoji] = useState("🌟");
  const [fDate, setFDate] = useState("");
  const [fColor, setFColor] = useState(GOAL_COLORS[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals", { cache: "no-store" });
      const data = await res.json();
      setGoals(data.goals || []);
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addGoal = async () => {
    if (!fTitle) return;
    await post({ action: "add-goal", title: fTitle, description: fDesc || null, category: fCat, emoji: fEmoji, targetDate: fDate || null, color: fColor });
    setFTitle(""); setFDesc(""); setFCat("personal"); setFEmoji("🌟"); setFDate(""); setFColor(GOAL_COLORS[0]);
    setShowForm(false); fetchData();
  };

  const updateProgress = async (id: number, progress: number) => {
    await post({ action: "update-progress", id, progress });
    fetchData();
  };

  const deleteGoal = async (id: number) => {
    await post({ action: "delete-goal", id });
    fetchData();
  };

  const addMilestone = async (goalId: number, title: string) => {
    await post({ action: "add-milestone", goalId, title });
    fetchData();
  };

  const toggleMilestone = async (id: number) => {
    await post({ action: "toggle-milestone", id });
    fetchData();
  };

  const deleteMilestone = async (id: number) => {
    await post({ action: "delete-milestone", id });
    fetchData();
  };

  const filtered = goals.filter(g => filter === "all" ? true : filter === "completed" ? g.status === "completed" : g.status === "active");
  const active = goals.filter(g => g.status === "active").length;
  const completed = goals.filter(g => g.status === "completed").length;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(237,232,245,0.85) 0%, rgba(222,238,232,0.75) 60%, rgba(245,213,216,0.6) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Goal Setting</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Goals 🌟</h1>
          </div>
          <span className="text-4xl float select-none">🎯</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "active", value: active, color: "var(--sage)" },
            { label: "completed", value: completed, color: "var(--gold)" },
            { label: "total", value: goals.length, color: "var(--lavender)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["active", "all", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all"
              style={{ background: filter === f ? "var(--lavender)" : "var(--lavender-pale)", color: filter === f ? "var(--text-dark)" : "var(--text-soft)" }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
          <Plus size={14} /> Goal
        </button>
      </div>

      {/* Add goal form */}
      {showForm && (
        <div className="card px-5 py-4 space-y-3">
          <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>New Goal</h3>
          <div className="flex gap-2">
            <input value={fEmoji} onChange={e => setFEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="🌟" />
            <input value={fTitle} onChange={e => setFTitle(e.target.value)} className="input-fairy flex-1" placeholder="Goal title" />
          </div>
          <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Description (optional)" style={{ resize: "none" }} />
          <div className="flex gap-2">
            <select value={fCat} onChange={e => setFCat(e.target.value)} className="input-fairy flex-1">
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
            <input value={fDate} onChange={e => setFDate(e.target.value)} type="date" className="input-fairy flex-1" />
          </div>
          <div className="flex gap-2">
            {GOAL_COLORS.map(c => (
              <button key={c} onClick={() => setFColor(c)} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: fColor === c ? "var(--text-dark)" : "transparent" }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addGoal} className="btn-primary text-sm">Create goal</button>
            <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-3xl mb-2">🌟</p>
          <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
            {filter === "completed" ? "No completed goals yet" : "No goals yet"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Dream big — what are you working towards this year?</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(goal => (
            <GoalCard key={goal.id} goal={goal}
              onUpdate={updateProgress} onDelete={deleteGoal}
              onAddMilestone={addMilestone} onToggleMilestone={toggleMilestone} onDeleteMilestone={deleteMilestone} />
          ))}
        </div>
      )}
    </div>
  );
}
