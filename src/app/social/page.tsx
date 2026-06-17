"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

type Event = { id: number; title: string; event_type: string; people: string | null; event_date: string | null; venue: string | null; notes: string | null; vibe_rating: number | null };
type Plan = { id: number; title: string; with_who: string | null; plan_date: string | null; status: string; notes: string | null };

const EVENT_TYPES = ["Hangout", "Night out", "Date", "Party", "Dinner", "Brunch", "Event", "Trip", "Other"];
const VIBE_EMOJIS = ["😐", "🙂", "😊", "🥳", "✨"];
const PLAN_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  idea: { label: "Idea", color: "#9b8c8c", bg: "rgba(155,140,140,0.12)" },
  confirmed: { label: "Confirmed ✓", color: "#d4a853", bg: "rgba(212,168,83,0.15)" },
  done: { label: "Done ✦", color: "#8fada0", bg: "rgba(143,173,160,0.2)" },
  cancelled: { label: "Cancelled", color: "#e8b4b8", bg: "rgba(232,180,184,0.15)" },
};

const dateStr = (d: string | null) => {
  if (!d) return "";
  try { return format(parseISO(String(d).split("T")[0]), "d MMM yyyy"); }
  catch { return ""; }
};

export default function SocialPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plans" | "memories">("plans");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const [eTitle, setETitle] = useState("");
  const [eType, setEType] = useState("Hangout");
  const [ePeople, setEPeople] = useState("");
  const [eDate, setEDate] = useState("");
  const [eVenue, setEVenue] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eVibe, setEVibe] = useState<number | null>(null);

  const [pTitle, setPTitle] = useState("");
  const [pWho, setPWho] = useState("");
  const [pDate, setPDate] = useState("");
  const [pNotes, setPNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social", { cache: "no-store" });
      const data = await res.json();
      setEvents(data.events || []);
      setPlans(data.plans || []);
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addEvent = async () => {
    if (!eTitle) return;
    await post({ action: "add-event", title: eTitle, eventType: eType, people: ePeople || null, eventDate: eDate || null, venue: eVenue || null, notes: eNotes || null, vibeRating: eVibe });
    setETitle(""); setEType("Hangout"); setEPeople(""); setEDate(""); setEVenue(""); setENotes(""); setEVibe(null);
    setShowEventForm(false); fetchData();
  };

  const addPlan = async () => {
    if (!pTitle) return;
    await post({ action: "add-plan", title: pTitle, withWho: pWho || null, planDate: pDate || null, notes: pNotes || null });
    setPTitle(""); setPWho(""); setPDate(""); setPNotes("");
    setShowPlanForm(false); fetchData();
  };

  const activePlans = plans.filter(p => p.status !== "cancelled" && p.status !== "done");
  const pastPlans = plans.filter(p => p.status === "done" || p.status === "cancelled");

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(245,213,216,0.85) 0%, rgba(200,184,224,0.5) 60%, rgba(222,238,232,0.6) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Your Social Life</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Social 🌸</h1>
          </div>
          <span className="text-4xl float select-none">🥂</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "plans", value: activePlans.length, color: "var(--rose)" },
            { label: "memories", value: events.length, color: "var(--sage)" },
            { label: "confirmed", value: plans.filter(p => p.status === "confirmed").length, color: "var(--gold)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["plans", "memories"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--rose)" : "var(--rose-pale)", color: tab === t ? "white" : "var(--text-mid)" }}>
            {t === "plans" ? "📅 Plans" : "✨ Memories"}
          </button>
        ))}
      </div>

      {/* Plans */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Upcoming Plans</h2>
            <button onClick={() => setShowPlanForm(!showPlanForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Plan
            </button>
          </div>

          {showPlanForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>New plan</h3>
              <input value={pTitle} onChange={e => setPTitle(e.target.value)} className="input-fairy w-full" placeholder="What&apos;s the plan?" />
              <div className="flex gap-2">
                <input value={pWho} onChange={e => setPWho(e.target.value)} className="input-fairy flex-1" placeholder="With who?" />
                <input value={pDate} onChange={e => setPDate(e.target.value)} type="date" className="input-fairy flex-1" />
              </div>
              <textarea value={pNotes} onChange={e => setPNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Details, ideas…" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addPlan} className="btn-primary text-sm">Add plan</button>
                <button onClick={() => setShowPlanForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : activePlans.length === 0 && pastPlans.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">🥂</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Nothing planned yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Make some plans — life is meant to be enjoyed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePlans.map(plan => {
                const meta = PLAN_STATUS[plan.status];
                return (
                  <div key={plan.id} className="card px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{plan.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {plan.with_who && <span className="text-xs" style={{ color: "var(--text-soft)" }}>👥 {plan.with_who}</span>}
                          {plan.plan_date && <span className="text-xs" style={{ color: "var(--text-soft)" }}>📅 {dateStr(plan.plan_date)}</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </div>
                        {plan.notes && <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>{plan.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {Object.entries(PLAN_STATUS).filter(([k]) => k !== plan.status).map(([key, m]) => (
                          <button key={key} onClick={() => post({ action: "update-plan", id: plan.id, status: key }).then(() => fetchData())}
                            className="text-xs px-2 py-1 rounded-lg transition-colors"
                            style={{ background: m.bg, color: m.color }}>
                            {m.label.split(" ")[0]}
                          </button>
                        ))}
                        <button onClick={() => post({ action: "delete-plan", id: plan.id }).then(() => fetchData())} className="p-1 opacity-40 hover:opacity-80">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pastPlans.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-semibold cursor-pointer" style={{ color: "var(--text-soft)" }}>Past plans ({pastPlans.length})</summary>
                  <div className="space-y-2 mt-2">
                    {pastPlans.map(plan => (
                      <div key={plan.id} className="card px-4 py-2.5 opacity-50">
                        <p className="text-sm" style={{ color: "var(--text-soft)" }}>{plan.title}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Memories */}
      {tab === "memories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Memory Log</h2>
            <button onClick={() => setShowEventForm(!showEventForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Memory
            </button>
          </div>

          {showEventForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Log a memory</h3>
              <input value={eTitle} onChange={e => setETitle(e.target.value)} className="input-fairy w-full" placeholder="What happened?" />
              <div className="flex gap-2">
                <select value={eType} onChange={e => setEType(e.target.value)} className="input-fairy flex-1">
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input value={eDate} onChange={e => setEDate(e.target.value)} type="date" className="input-fairy flex-1" />
              </div>
              <div className="flex gap-2">
                <input value={ePeople} onChange={e => setEPeople(e.target.value)} className="input-fairy flex-1" placeholder="Who was there?" />
                <input value={eVenue} onChange={e => setEVenue(e.target.value)} className="input-fairy flex-1" placeholder="Where?" />
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--text-soft)" }}>Vibe rating</p>
                <div className="flex gap-2">
                  {VIBE_EMOJIS.map((emoji, i) => (
                    <button key={i} onClick={() => setEVibe(i + 1)}
                      className="flex-1 py-2 rounded-xl text-xl transition-all"
                      style={{ background: eVibe === i + 1 ? "rgba(245,213,216,0.5)" : "var(--cream-dark)", border: `2px solid ${eVibe === i + 1 ? "var(--rose)" : "transparent"}`, transform: eVibe === i + 1 ? "scale(1.1)" : "scale(1)" }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={eNotes} onChange={e => setENotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="What was special about it?" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addEvent} className="btn-primary text-sm">Save memory</button>
                <button onClick={() => setShowEventForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">✨</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No memories logged yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Start capturing the beautiful moments of your social life</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="card px-4 py-3 flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "var(--rose-pale)" }}>
                    {event.vibe_rating ? VIBE_EMOJIS[event.vibe_rating - 1] : "🥂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--rose-pale)", color: "var(--rose)" }}>{event.event_type}</span>
                      {event.event_date && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{dateStr(event.event_date)}</span>}
                      {event.people && <span className="text-xs" style={{ color: "var(--text-soft)" }}>· {event.people}</span>}
                      {event.venue && <span className="text-xs" style={{ color: "var(--text-soft)" }}>@ {event.venue}</span>}
                    </div>
                    {event.notes && <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>{event.notes}</p>}
                  </div>
                  <button onClick={() => post({ action: "delete-event", id: event.id }).then(() => fetchData())} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
