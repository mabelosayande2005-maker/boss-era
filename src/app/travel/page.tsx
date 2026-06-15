"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, MapPin, ChevronDown, ChevronUp } from "lucide-react";

type Trip = {
  id: number; destination: string; country: string | null; emoji: string; status: string;
  start_date: string | null; end_date: string | null; budget_target: number | null;
  budget_spent: number; accommodation: string | null; notes: string | null; highlights: string | null;
};
type BucketItem = { id: number; item: string; category: string; done: boolean };

const TRIP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  wishlist: { label: "Wishlist", color: "#9b8c8c", bg: "rgba(155,140,140,0.12)" },
  planned: { label: "Planned ✈️", color: "#d4a853", bg: "rgba(212,168,83,0.15)" },
  visited: { label: "Been there ✓", color: "#8fada0", bg: "rgba(143,173,160,0.2)" },
};
const BUCKET_CATS = ["Experience", "Food", "Adventure", "Culture", "Nature", "City", "Beach", "Other"];

function TripCard({ trip, onUpdate, onDelete }: { trip: Trip; onUpdate: (id: number, status: string) => void; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TRIP_STATUS[trip.status] || TRIP_STATUS.wishlist;

  const dateRange = trip.start_date && trip.end_date
    ? `${format(parseISO(String(trip.start_date).split("T")[0]), "d MMM")} – ${format(parseISO(String(trip.end_date).split("T")[0]), "d MMM yyyy")}`
    : trip.start_date ? format(parseISO(String(trip.start_date).split("T")[0]), "d MMMM yyyy") : null;

  const budgetTarget = trip.budget_target ? parseFloat(String(trip.budget_target)) : null;
  const budgetSpent = parseFloat(String(trip.budget_spent || 0));

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{trip.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{trip.destination}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {trip.country && <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-soft)" }}><MapPin size={10} /> {trip.country}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                {dateRange && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{dateRange}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setExpanded(!expanded)} className="p-1" style={{ color: "var(--text-soft)" }}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button onClick={() => onDelete(trip.id)} className="p-1 opacity-40 hover:opacity-80">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {budgetTarget && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-soft)" }}>
                <span>Budget</span>
                <span>£{budgetSpent.toFixed(0)} / £{budgetTarget.toFixed(0)}</span>
              </div>
              <div className="progress-track" style={{ height: "5px" }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (budgetSpent / budgetTarget) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 pl-2">
          {trip.accommodation && <p className="text-sm" style={{ color: "var(--text-dark)" }}>🏨 {trip.accommodation}</p>}
          {trip.highlights && <p className="text-sm" style={{ color: "var(--text-mid)" }}>✨ {trip.highlights}</p>}
          {trip.notes && <p className="text-sm" style={{ color: "var(--text-soft)" }}>📝 {trip.notes}</p>}
          <div className="flex gap-2 pt-2">
            {Object.entries(TRIP_STATUS).map(([key, m]) => (
              <button key={key} onClick={() => onUpdate(trip.id, key)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{ background: trip.status === key ? m.bg : "var(--cream-dark)", color: trip.status === key ? "var(--text-dark)" : "var(--text-soft)", border: `1.5px solid ${trip.status === key ? "rgba(143,173,160,0.4)" : "transparent"}` }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TravelPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bucket, setBucket] = useState<BucketItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"trips" | "bucket">("trips");
  const [statusFilter, setStatusFilter] = useState<"all" | "wishlist" | "planned" | "visited">("all");
  const [showTripForm, setShowTripForm] = useState(false);
  const [showBucketForm, setShowBucketForm] = useState(false);

  const [tDest, setTDest] = useState("");
  const [tCountry, setTCountry] = useState("");
  const [tEmoji, setTEmoji] = useState("✈️");
  const [tStatus, setTStatus] = useState("wishlist");
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [tBudget, setTBudget] = useState("");
  const [tAccom, setTAccom] = useState("");
  const [tNotes, setTNotes] = useState("");
  const [bItem, setBItem] = useState("");
  const [bCat, setBCat] = useState("Experience");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel");
      const data = await res.json();
      setTrips(data.trips || []);
      setBucket(data.bucket || []);
      setStats(data.stats || {});
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/travel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addTrip = async () => {
    if (!tDest) return;
    await post({ action: "add-trip", destination: tDest, country: tCountry || null, emoji: tEmoji, status: tStatus, startDate: tStart || null, endDate: tEnd || null, budgetTarget: tBudget ? parseFloat(tBudget) : null, accommodation: tAccom || null, notes: tNotes || null });
    setTDest(""); setTCountry(""); setTEmoji("✈️"); setTStatus("wishlist"); setTStart(""); setTEnd(""); setTBudget(""); setTAccom(""); setTNotes("");
    setShowTripForm(false); fetchData();
  };

  const addBucket = async () => {
    if (!bItem) return;
    await post({ action: "add-bucket", item: bItem, category: bCat });
    setBItem(""); setBCat("Experience");
    setShowBucketForm(false); fetchData();
  };

  const filtered = trips.filter(t => statusFilter === "all" ? true : t.status === statusFilter);

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(184,212,200,0.6) 0%, rgba(237,232,245,0.6) 60%, rgba(212,168,83,0.2) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Dream & Plan</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Travel ✈️</h1>
          </div>
          <span className="text-4xl float select-none">🌍</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "visited", value: stats.visited || 0, color: "var(--sage)" },
            { label: "planned", value: stats.planned || 0, color: "var(--gold)" },
            { label: "wishlist", value: stats.wishlist || 0, color: "var(--lavender)" },
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
        {(["trips", "bucket"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--sage)" : "var(--sage-pale)", color: tab === t ? "white" : "var(--text-mid)" }}>
            {t === "trips" ? "🗺️ Trips" : "🌟 Bucket List"}
          </button>
        ))}
      </div>

      {/* Trips */}
      {tab === "trips" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {(["all", "wishlist", "planned", "visited"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                  style={{ background: statusFilter === s ? "var(--rose)" : "var(--rose-pale)", color: statusFilter === s ? "white" : "var(--text-mid)" }}>
                  {s === "all" ? "All" : TRIP_STATUS[s]?.label || s}
                </button>
              ))}
            </div>
            <button onClick={() => setShowTripForm(!showTripForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1 shrink-0 ml-2">
              <Plus size={14} /> Trip
            </button>
          </div>

          {showTripForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Add trip</h3>
              <div className="flex gap-2">
                <input value={tEmoji} onChange={e => setTEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="✈️" />
                <input value={tDest} onChange={e => setTDest(e.target.value)} className="input-fairy flex-1" placeholder="Destination" />
                <input value={tCountry} onChange={e => setTCountry(e.target.value)} className="input-fairy flex-1" placeholder="Country" />
              </div>
              <div className="flex gap-2">
                {Object.entries(TRIP_STATUS).map(([key, m]) => (
                  <button key={key} onClick={() => setTStatus(key)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: tStatus === key ? m.bg : "var(--cream-dark)", color: tStatus === key ? "var(--text-dark)" : "var(--text-soft)", border: `1.5px solid ${tStatus === key ? "rgba(143,173,160,0.5)" : "transparent"}` }}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tStart} onChange={e => setTStart(e.target.value)} type="date" className="input-fairy flex-1" placeholder="Start date" />
                <input value={tEnd} onChange={e => setTEnd(e.target.value)} type="date" className="input-fairy flex-1" placeholder="End date" />
              </div>
              <div className="flex gap-2">
                <input value={tBudget} onChange={e => setTBudget(e.target.value)} type="number" className="input-fairy flex-1" placeholder="£ budget" />
                <input value={tAccom} onChange={e => setTAccom(e.target.value)} className="input-fairy flex-1" placeholder="Accommodation" />
              </div>
              <textarea value={tNotes} onChange={e => setTNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Notes, plans, ideas…" style={{ resize: "none" }} />
              <div className="flex gap-2">
                <button onClick={addTrip} className="btn-primary text-sm">Add trip</button>
                <button onClick={() => setShowTripForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="card px-5 py-12 text-center">
              <p className="text-3xl mb-2">🌍</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No trips yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Start planning your adventures ✨</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(trip => (
                <TripCard key={trip.id} trip={trip}
                  onUpdate={(id, status) => post({ action: "update-trip", id, status }).then(() => fetchData())}
                  onDelete={id => post({ action: "delete-trip", id }).then(() => fetchData())} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bucket list */}
      {tab === "bucket" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Travel Bucket List</h2>
            <button onClick={() => setShowBucketForm(!showBucketForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>

          {showBucketForm && (
            <div className="card px-5 py-4 space-y-3">
              <div className="flex gap-2">
                <input autoFocus value={bItem} onChange={e => setBItem(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addBucket(); }}
                  className="input-fairy flex-1" placeholder="E.g. See the Northern Lights" />
                <select value={bCat} onChange={e => setBCat(e.target.value)} className="input-fairy w-36">
                  {BUCKET_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addBucket} className="btn-primary text-sm">Add</button>
                <button onClick={() => setShowBucketForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {bucket.filter(b => !b.done).map(b => (
              <div key={b.id} className="card px-4 py-3 flex items-center gap-3">
                <input type="checkbox" className="checkbox-fairy" checked={false} onChange={() => post({ action: "toggle-bucket", id: b.id }).then(() => fetchData())} />
                <span className="flex-1 text-sm" style={{ color: "var(--text-dark)" }}>{b.item}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>{b.category}</span>
                <button onClick={() => post({ action: "delete-bucket", id: b.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {bucket.some(b => b.done) && (
              <>
                <p className="text-xs font-semibold mt-4" style={{ color: "var(--text-soft)" }}>DONE ✓</p>
                {bucket.filter(b => b.done).map(b => (
                  <div key={b.id} className="card px-4 py-3 flex items-center gap-3 opacity-50">
                    <input type="checkbox" className="checkbox-fairy" checked={true} onChange={() => post({ action: "toggle-bucket", id: b.id }).then(() => fetchData())} />
                    <span className="flex-1 text-sm line-through" style={{ color: "var(--text-soft)" }}>{b.item}</span>
                    <button onClick={() => post({ action: "delete-bucket", id: b.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {bucket.length === 0 && (
              <div className="card px-5 py-10 text-center">
                <p className="text-3xl mb-2">🌟</p>
                <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Empty bucket list</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>What experiences do you dream of? Sunsets in Santorini? Northern Lights?</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
