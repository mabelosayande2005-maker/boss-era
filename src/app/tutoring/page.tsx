"use client";

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";
import { format, parseISO } from "date-fns";
import { Plus, X, ChevronLeft, Pencil, Trash2, Save, Check } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Client = {
  id: number; name: string; subject: string; exam_board: string; level: string;
  hourly_rate: string | null; session_day: string | null; session_time: string | null;
  is_active: boolean; current_lesson: number; current_topic: string | null;
};

type Session = {
  id: number; client_id: number; session_date: string; lesson_number: number;
  topic_covered: string | null; notes: string | null;
};

type ClientForm = {
  name: string; subject: string; exam_board: string; level: string;
  hourly_rate: string; session_day: string; session_time: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const EXAM_BOARDS = ["AQA","Edexcel","OCR","WJEC","Cambridge","Other"];
const LEVELS = ["GCSE","A-Level","KS3","Primary","Other"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const LEVEL_META: Record<string, { bg: string; color: string }> = {
  "GCSE":    { bg: "var(--sage-pale)",      color: "var(--sage)"      },
  "A-Level": { bg: "var(--lavender-pale)",  color: "var(--lavender)"  },
  "KS3":     { bg: "var(--rose-pale)",      color: "var(--rose)"      },
  "Primary": { bg: "rgba(253,248,236,0.9)", color: "var(--gold)"      },
  "Other":   { bg: "var(--cream-dark)",     color: "var(--text-mid)"  },
};

const BLANK_CLIENT: ClientForm = {
  name: "", subject: "", exam_board: "AQA", level: "GCSE",
  hourly_rate: "", session_day: "", session_time: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
}

function nextSessionDate(day: string | null) {
  if (!day) return "";
  const names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const idx = names.indexOf(day);
  if (idx < 0) return day;
  const today = new Date();
  const diff = (idx - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return format(next, "EEE d MMM");
}

function safeDate(d: string) {
  try { return format(parseISO(String(d).slice(0, 10)), "d MMM yyyy"); }
  catch { return String(d).slice(0, 10); }
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TutoringPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [detail, setDetail] = useState<{ client: Client; sessions: Session[]; prep: { next_lesson_number: number; topic: string | null; notes: string | null } | null } | null>(null);
  const [mainTab, setMainTab] = useState<"overview" | "clients">("overview");
  const [detailTab, setDetailTab] = useState<"progress" | "history" | "prep">("progress");
  const [loading, setLoading] = useState(true);

  // Client form
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [cf, setCf] = useState<ClientForm>(BLANK_CLIENT);

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sf, setSf] = useState({ session_date: new Date().toISOString().slice(0, 10), lesson_number: 1, topic_covered: "", notes: "" });

  // Progress edit
  const [editProgress, setEditProgress] = useState(false);
  const [progressDraft, setProgressDraft] = useState({ current_lesson: 1, current_topic: "" });

  // Prep
  const [prepDraft, setPrepDraft] = useState({ next_lesson_number: 1, topic: "", notes: "" });
  const [prepSaved, setPrepSaved] = useState(false);

  const loadClients = useCallback(async () => {
    const r = await fetch("/api/tutoring");
    const d = await r.json();
    setClients(d.clients || []);
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const r = await fetch(`/api/tutoring?client_id=${id}`);
    const d = await r.json();
    setDetail(d);
    setPrepDraft({
      next_lesson_number: d.prep?.next_lesson_number ?? d.client.current_lesson,
      topic: d.prep?.topic ?? "",
      notes: d.prep?.notes ?? "",
    });
    setProgressDraft({ current_lesson: d.client.current_lesson, current_topic: d.client.current_topic ?? "" });
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ── Client actions ──
  const openAdd = () => { setEditingClient(null); setCf(BLANK_CLIENT); setShowClientForm(true); };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setCf({ name: c.name, subject: c.subject, exam_board: c.exam_board, level: c.level, hourly_rate: c.hourly_rate ?? "", session_day: c.session_day ?? "", session_time: c.session_time ?? "" });
    setShowClientForm(true);
  };

  const saveClient = async () => {
    const action = editingClient ? "update_client" : "add_client";
    await fetch("/api/tutoring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...cf, id: editingClient?.id, is_active: editingClient?.is_active ?? true }),
    });
    setShowClientForm(false);
    loadClients();
    if (detail && editingClient?.id === detail.client.id) loadDetail(detail.client.id);
  };

  const toggleActive = async (c: Client) => {
    await fetch("/api/tutoring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_client", id: c.id, name: c.name, subject: c.subject,
        exam_board: c.exam_board, level: c.level, hourly_rate: c.hourly_rate,
        session_day: c.session_day, session_time: c.session_time, is_active: !c.is_active,
      }),
    });
    loadClients();
  };

  const deleteClient = async (id: number) => {
    if (!confirm("Delete this client and all their session history?")) return;
    await fetch("/api/tutoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_client", id }) });
    if (detail?.client.id === id) setDetail(null);
    loadClients();
  };

  const viewClient = async (c: Client) => {
    await loadDetail(c.id);
    setDetailTab("progress");
    setEditProgress(false);
  };

  const closeDetail = () => { setDetail(null); loadClients(); };

  // ── Progress ──
  const saveProgress = async () => {
    await fetch("/api/tutoring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_progress", client_id: detail!.client.id, ...progressDraft }),
    });
    setDetail(prev => prev ? { ...prev, client: { ...prev.client, ...progressDraft } } : prev);
    setClients(prev => prev.map(c => c.id === detail!.client.id ? { ...c, ...progressDraft } : c));
    setEditProgress(false);
  };

  // ── Sessions ──
  const openAddSession = () => {
    setSf({ session_date: new Date().toISOString().slice(0, 10), lesson_number: detail?.client.current_lesson ?? 1, topic_covered: "", notes: "" });
    setShowSessionForm(true);
  };

  const saveSession = async () => {
    await fetch("/api/tutoring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_session", client_id: detail!.client.id, ...sf }),
    });
    setShowSessionForm(false);
    loadDetail(detail!.client.id);
    loadClients();
  };

  const deleteSession = async (id: number) => {
    await fetch("/api/tutoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_session", id }) });
    loadDetail(detail!.client.id);
  };

  // ── Prep ──
  const savePrep = async () => {
    await fetch("/api/tutoring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_prep", client_id: detail!.client.id, ...prepDraft }),
    });
    setPrepSaved(true);
    setTimeout(() => setPrepSaved(false), 2000);
  };

  const activeClients = clients.filter(c => c.is_active);
  const inactiveClients = clients.filter(c => !c.is_active);

  // ── Detail view ────────────────────────────────────────────────────────────────
  if (detail) {
    const { client, sessions } = detail;
    const lm = LEVEL_META[client.level] ?? LEVEL_META["Other"];

    return (
      <main className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <button onClick={closeDetail} className="flex items-center gap-1 text-sm mb-4 transition-opacity hover:opacity-60" style={{ color: "var(--text-soft)" }}>
          <ChevronLeft size={16} /> All Clients
        </button>

        {/* Client header card */}
        <div className="card px-6 py-5 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold italic text-2xl" style={{ color: "var(--text-dark)" }}>{client.name}</h1>
              <p className="text-base font-medium mt-0.5" style={{ color: "var(--text-mid)" }}>{client.subject}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: lm.bg, color: lm.color }}>{client.level}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(212,168,83,0.15)", color: "var(--gold)" }}>{client.exam_board}</span>
              {client.hourly_rate && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>£{client.hourly_rate}/hr</span>
              )}
            </div>
          </div>
          {(client.session_day || client.session_time) && (
            <p className="text-sm mt-2.5" style={{ color: "var(--text-soft)" }}>
              📅 {client.session_day && <>{client.session_day}s</>}{client.session_time && <> at {fmtTime(client.session_time)}</>}
              {client.session_day && <span className="ml-2 font-medium" style={{ color: "var(--sage)" }}>· Next: {nextSessionDate(client.session_day)}</span>}
            </p>
          )}
        </div>

        {/* Sub-tabs + edit */}
        <div className="flex items-center gap-2 mb-5">
          {(["progress", "history", "prep"] as const).map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: detailTab === t ? "var(--sage)" : "rgba(255,255,255,0.75)",
                color: detailTab === t ? "#fff" : "var(--text-mid)",
                border: detailTab === t ? "none" : "1px solid rgba(200,184,224,0.3)",
              }}>
              {t === "progress" ? "📍 Progress" : t === "history" ? "📜 History" : "📝 Prep"}
            </button>
          ))}
          <button onClick={() => openEdit(client)} className="ml-auto p-2 rounded-xl transition-opacity hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(200,184,224,0.3)" }}>
            <Pencil size={14} style={{ color: "var(--text-soft)" }} />
          </button>
        </div>

        {/* PROGRESS TAB */}
        {detailTab === "progress" && (
          <div className="card px-6 py-8">
            {!editProgress ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center"
                  style={{ background: "var(--iridescent-2)", border: "2px solid rgba(200,184,224,0.4)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Lesson</span>
                  <span className="font-display font-bold italic text-5xl leading-tight" style={{ color: "var(--sage)" }}>{client.current_lesson}</span>
                </div>
                {client.current_topic
                  ? <p className="text-base font-medium" style={{ color: "var(--text-mid)" }}>📖 <em>{client.current_topic}</em></p>
                  : <p className="text-sm" style={{ color: "var(--text-soft)" }}>No current topic set</p>
                }
                <button onClick={() => { setProgressDraft({ current_lesson: client.current_lesson, current_topic: client.current_topic ?? "" }); setEditProgress(true); }}
                  className="px-5 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                  Update Progress
                </button>
              </div>
            ) : (
              <div className="space-y-5 max-w-xs mx-auto">
                <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Update Progress</h3>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-soft)" }}>Current Lesson Number</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setProgressDraft(p => ({ ...p, current_lesson: Math.max(1, p.current_lesson - 1) }))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl"
                      style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>−</button>
                    <input type="number" min="1" value={progressDraft.current_lesson}
                      onChange={e => setProgressDraft(p => ({ ...p, current_lesson: Number(e.target.value) }))}
                      className="w-24 text-center rounded-xl border px-2 py-2 text-2xl font-bold font-display italic"
                      style={{ borderColor: "rgba(200,184,224,0.5)", color: "var(--sage)" }} />
                    <button onClick={() => setProgressDraft(p => ({ ...p, current_lesson: p.current_lesson + 1 }))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl"
                      style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Current Topic</label>
                  <input type="text" placeholder="e.g. Differentiation, Macbeth Act 2…" value={progressDraft.current_topic}
                    onChange={e => setProgressDraft(p => ({ ...p, current_topic: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProgress} className="px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--sage)" }}>Save</button>
                  <button onClick={() => setEditProgress(false)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {detailTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""} logged</p>
              <button onClick={openAddSession} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--sage)" }}>
                <Plus size={14} /> Log Session
              </button>
            </div>

            {sessions.length === 0 && (
              <div className="card px-8 py-16 text-center">
                <p className="text-4xl mb-2">📚</p>
                <p className="font-medium mb-1" style={{ color: "var(--text-soft)" }}>No sessions logged yet</p>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>Log your first session to start building the history.</p>
              </div>
            )}

            {sessions.map(s => (
              <div key={s.id} className="card px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-display italic"
                    style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                    {s.lesson_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>{safeDate(s.session_date)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>Lesson {s.lesson_number}</span>
                    </div>
                    {s.topic_covered && <p className="text-sm mt-1 font-medium" style={{ color: "var(--text-mid)" }}>{s.topic_covered}</p>}
                    {s.notes && <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-soft)" }}>{s.notes}</p>}
                  </div>
                  <button onClick={() => deleteSession(s.id)} className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: "var(--rose)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PREP TAB */}
        {detailTab === "prep" && (
          <div className="card px-6 py-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Next Lesson Plan</h3>
              {prepSaved && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--sage)" }}>
                  <Check size={12} /> Saved!
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-soft)" }}>Lesson Number</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setPrepDraft(p => ({ ...p, next_lesson_number: Math.max(1, p.next_lesson_number - 1) }))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl"
                  style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>−</button>
                <input type="number" min="1" value={prepDraft.next_lesson_number}
                  onChange={e => setPrepDraft(p => ({ ...p, next_lesson_number: Number(e.target.value) }))}
                  className="w-24 text-center rounded-xl border px-2 py-2 text-2xl font-bold font-display italic"
                  style={{ borderColor: "rgba(200,184,224,0.5)", color: "var(--sage)" }} />
                <button onClick={() => setPrepDraft(p => ({ ...p, next_lesson_number: p.next_lesson_number + 1 }))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl"
                  style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>+</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Topic to Cover</label>
              <input type="text" placeholder="e.g. Integration by parts, Hamlet soliloquies…"
                value={prepDraft.topic}
                onChange={e => setPrepDraft(p => ({ ...p, topic: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Preparation Notes</label>
              <textarea
                value={prepDraft.notes}
                onChange={e => setPrepDraft(p => ({ ...p, notes: e.target.value }))}
                rows={12}
                placeholder={"Lesson objectives:\n— \n\nResources needed:\n— \n\nActivities / questions:\n— \n\nHomework to set:\n— "}
                className="w-full rounded-xl border px-3 py-3 text-sm resize-none leading-relaxed"
                style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)", background: "rgba(250,246,240,0.6)", fontFamily: "var(--font-body)" }} />
            </div>

            <button onClick={savePrep} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: "var(--sage)" }}>
              <Save size={14} /> Save Prep Notes
            </button>
          </div>
        )}

        {/* Log Session modal */}
        {showSessionForm && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(61,46,46,0.45)" }}>
            <div className="card w-full max-w-md mx-4 mb-4 md:mb-0 px-6 py-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Log Session</h2>
                <button onClick={() => setShowSessionForm(false)}><X size={18} style={{ color: "var(--text-soft)" }} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Date</label>
                  <input type="date" value={sf.session_date} onChange={e => setSf(p => ({ ...p, session_date: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Lesson Number</label>
                  <input type="number" min="1" value={sf.lesson_number} onChange={e => setSf(p => ({ ...p, lesson_number: Number(e.target.value) }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Topic Covered</label>
                  <input type="text" placeholder="e.g. Quadratic equations, Macbeth Act 3…" value={sf.topic_covered} onChange={e => setSf(p => ({ ...p, topic_covered: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Session Notes</label>
                  <textarea rows={3} placeholder="How did it go? Any areas to revisit?" value={sf.notes} onChange={e => setSf(p => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)", background: "rgba(250,246,240,0.6)" }} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={saveSession} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--sage)" }}>Log Session</button>
                <button onClick={() => setShowSessionForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showClientForm && (
          <ClientFormModal cf={cf} setCf={setCf} editingClient={editingClient} onSave={saveClient} onClose={() => setShowClientForm(false)} />
        )}
      </main>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold italic text-3xl" style={{ color: "var(--text-dark)" }}>Tutoring ✦</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-soft)" }}>
            {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""}
            {activeClients.filter(c => c.session_day).length > 0 && (
              <span className="ml-2">· {activeClients.filter(c => c.session_day).length} scheduled</span>
            )}
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: "var(--sage)" }}>
          <Plus size={14} /> Add Client
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["overview", "clients"] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: mainTab === t ? "var(--sage)" : "rgba(255,255,255,0.75)",
              color: mainTab === t ? "#fff" : "var(--text-mid)",
              border: mainTab === t ? "none" : "1px solid rgba(200,184,224,0.3)",
            }}>
            {t === "overview" ? "✦ Overview" : "👥 Clients"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 font-display italic text-xl" style={{ color: "var(--text-soft)" }}>Loading…</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {mainTab === "overview" && (
            activeClients.length === 0 ? (
              <div className="card px-8 py-16 text-center">
                <p className="text-5xl mb-3">🎓</p>
                <p className="font-display font-bold italic text-2xl mb-1" style={{ color: "var(--text-dark)" }}>No clients yet</p>
                <p className="text-sm mb-5" style={{ color: "var(--text-soft)" }}>Add your first tutoring client to get started.</p>
                <button onClick={openAdd} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--sage)" }}>Add Client</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClients.map(c => {
                  const lm = LEVEL_META[c.level] ?? LEVEL_META["Other"];
                  return (
                    <div key={c.id} className="card px-5 py-5 flex flex-col gap-3 cursor-pointer transition-shadow hover:shadow-lg" onClick={() => viewClient(c)}>
                      {/* Name + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>{c.name}</h3>
                          <p className="text-sm mt-0.5" style={{ color: "var(--text-mid)" }}>{c.subject}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: lm.bg, color: lm.color }}>{c.level}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(212,168,83,0.15)", color: "var(--gold)" }}>{c.exam_board}</span>
                        </div>
                      </div>

                      {/* Lesson tracker */}
                      <div className="flex items-center gap-3">
                        <div className="w-13 h-13 shrink-0 w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center"
                          style={{ background: "var(--iridescent-2)", border: "1.5px solid rgba(200,184,224,0.35)" }}>
                          <span className="text-[9px] font-medium leading-none" style={{ color: "var(--text-soft)" }}>lesson</span>
                          <span className="font-display font-bold italic text-[22px] leading-tight" style={{ color: "var(--sage)" }}>{c.current_lesson}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {c.current_topic
                            ? <p className="text-sm font-medium truncate" style={{ color: "var(--text-mid)" }}>📖 {c.current_topic}</p>
                            : <p className="text-sm" style={{ color: "var(--text-soft)" }}>No topic set</p>
                          }
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-end justify-between pt-2 border-t" style={{ borderColor: "rgba(200,184,224,0.2)" }}>
                        {c.session_day ? (
                          <div>
                            <p className="text-xs" style={{ color: "var(--text-soft)" }}>{c.session_day}s{c.session_time ? ` · ${fmtTime(c.session_time)}` : ""}</p>
                            <p className="text-xs font-semibold" style={{ color: "var(--sage)" }}>Next: {nextSessionDate(c.session_day)}</p>
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: "var(--text-soft)" }}>No schedule set</p>
                        )}
                        {c.hourly_rate && <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>£{c.hourly_rate}/hr</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* CLIENTS LIST */}
          {mainTab === "clients" && (
            <div className="space-y-3">
              {activeClients.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-soft)" }}>Active</p>
                  {activeClients.map(c => (
                    <ClientRow key={c.id} c={c}
                      onView={() => viewClient(c)} onEdit={() => openEdit(c)}
                      onDelete={() => deleteClient(c.id)} onToggle={() => toggleActive(c)} />
                  ))}
                </>
              )}

              {inactiveClients.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-5 mb-2" style={{ color: "var(--text-soft)" }}>Inactive</p>
                  {inactiveClients.map(c => (
                    <ClientRow key={c.id} c={c}
                      onView={() => viewClient(c)} onEdit={() => openEdit(c)}
                      onDelete={() => deleteClient(c.id)} onToggle={() => toggleActive(c)} />
                  ))}
                </>
              )}

              {clients.length === 0 && (
                <div className="card px-8 py-16 text-center">
                  <p className="text-4xl mb-2">👥</p>
                  <p className="font-medium" style={{ color: "var(--text-soft)" }}>No clients yet. Add one above!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showClientForm && (
        <ClientFormModal cf={cf} setCf={setCf} editingClient={editingClient} onSave={saveClient} onClose={() => setShowClientForm(false)} />
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ClientRow({ c, onView, onEdit, onDelete, onToggle }: {
  c: Client; onView: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const lm = LEVEL_META[c.level] ?? LEVEL_META["Other"];
  return (
    <div className="card px-5 py-4 flex items-center gap-3" style={{ opacity: c.is_active ? 1 : 0.65 }}>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold" style={{ color: "var(--text-dark)" }}>{c.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: lm.bg, color: lm.color }}>{c.level}</span>
          <span className="text-xs" style={{ color: "var(--text-soft)" }}>{c.subject} · {c.exam_board}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "var(--sage)" }}>Lesson {c.current_lesson}</span>
          {c.session_day && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{c.session_day}s{c.session_time ? ` · ${fmtTime(c.session_time)}` : ""}</span>}
          {c.hourly_rate && <span className="text-xs" style={{ color: "var(--text-soft)" }}>£{c.hourly_rate}/hr</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onToggle}
          className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
          style={{ background: c.is_active ? "var(--sage-pale)" : "var(--cream-dark)", color: c.is_active ? "var(--sage)" : "var(--text-soft)" }}>
          {c.is_active ? "Active" : "Inactive"}
        </button>
        <button onClick={onEdit} className="p-1.5 rounded-lg transition-opacity hover:opacity-70"><Pencil size={13} style={{ color: "var(--text-soft)" }} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-opacity hover:opacity-70"><Trash2 size={13} style={{ color: "var(--rose)" }} /></button>
      </div>
    </div>
  );
}

function ClientFormModal({ cf, setCf, editingClient, onSave, onClose }: {
  cf: ClientForm; setCf: Dispatch<SetStateAction<ClientForm>>;
  editingClient: Client | null; onSave: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(61,46,46,0.45)" }}>
      <div className="card w-full max-w-md mx-4 mb-4 md:mb-0 px-6 py-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            {editingClient ? "Edit Client" : "Add Client ✦"}
          </h2>
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-soft)" }} /></button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Student Name *</label>
            <input type="text" placeholder="e.g. Emily Smith" value={cf.name}
              onChange={e => setCf(p => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Subject *</label>
            <input type="text" placeholder="e.g. Mathematics, English Literature…" value={cf.subject}
              onChange={e => setCf(p => ({ ...p, subject: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Level</label>
              <select value={cf.level} onChange={e => setCf(p => ({ ...p, level: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Exam Board</label>
              <select value={cf.exam_board} onChange={e => setCf(p => ({ ...p, exam_board: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }}>
                {EXAM_BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Hourly Rate (£)</label>
            <input type="number" min="0" step="0.50" placeholder="e.g. 25" value={cf.hourly_rate}
              onChange={e => setCf(p => ({ ...p, hourly_rate: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Session Day</label>
              <select value={cf.session_day} onChange={e => setCf(p => ({ ...p, session_day: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }}>
                <option value="">— None —</option>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-soft)" }}>Session Time</label>
              <input type="time" value={cf.session_time}
                onChange={e => setCf(p => ({ ...p, session_time: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "rgba(200,184,224,0.4)", color: "var(--text-dark)" }} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onSave} disabled={!cf.name.trim() || !cf.subject.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "var(--sage)" }}>
            {editingClient ? "Save Changes" : "Add Client"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
