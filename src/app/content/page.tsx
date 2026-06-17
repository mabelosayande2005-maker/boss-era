"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isToday, parseISO, isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Check, Pencil, Lightbulb, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

// ── types ─────────────────────────────────────────────────────────────────────
type ContentItem = {
  id: number;
  brand: string;
  title: string;
  platform: string | null;
  scheduled_date: string | null;
  status: string;
  notes: string | null;
};

type BrandFilter = "All" | "Personal TikTok" | "StudyGlow";
type ActiveView  = "calendar" | "ideas";

// ── constants ─────────────────────────────────────────────────────────────────
const BRANDS    = ["Personal TikTok", "StudyGlow"] as const;
const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts", "Pinterest"] as const;
const STATUSES  = ["idea", "filmed", "edited", "posted"] as const;
type Status = typeof STATUSES[number];

const STATUS_META: Record<Status, { label: string; color: string; bg: string; emoji: string }> = {
  idea:    { label: "Idea",    color: "#9b8c8c", bg: "rgba(250,246,240,0.9)",  emoji: "💡" },
  filmed:  { label: "Filmed",  color: "#d4a853", bg: "#fdf8ec",                emoji: "🎬" },
  edited:  { label: "Edited",  color: "#8fada0", bg: "var(--sage-pale)",        emoji: "✂️" },
  posted:  { label: "Posted",  color: "#b06070", bg: "var(--rose-pale)",        emoji: "✅" },
};

const BRAND_META: Record<string, { color: string; bg: string; tag: string; emoji: string }> = {
  "Personal TikTok": { color: "#e8b4b8", bg: "var(--rose-pale)",     tag: "tag-rose",     emoji: "🎵" },
  "StudyGlow":       { color: "#c8b8e0", bg: "var(--lavender-pale)", tag: "tag-lavender", emoji: "✨" },
};

function weekMonday(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}
function toISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

// ── status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, onClick }: { status: string; onClick?: () => void }) {
  const meta = STATUS_META[status as Status] ?? STATUS_META.idea;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
      title={onClick ? "Click to advance status" : undefined}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </button>
  );
}

// ── item card used in both views ──────────────────────────────────────────────
function ItemCard({
  item,
  compact = false,
  onStatusAdvance,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  compact?: boolean;
  onStatusAdvance: (id: number, next: Status) => void;
  onEdit: (item: ContentItem) => void;
  onDelete: (id: number) => void;
}) {
  const brand = BRAND_META[item.brand];
  const nextStatus = STATUSES[(STATUSES.indexOf(item.status as Status) + 1) % STATUSES.length];

  if (compact) {
    return (
      <div
        className="rounded-xl px-2.5 py-2 group cursor-pointer transition-all"
        style={{
          background: brand?.bg ?? "rgba(255,255,255,0.7)",
          border: `1.5px solid ${brand?.color ?? "#ddd"}50`,
        }}
        onClick={() => onEdit(item)}
      >
        <div className="flex items-start gap-1.5">
          <span className="text-xs flex-shrink-0">{brand?.emoji ?? "📄"}</span>
          <p className="text-xs font-medium leading-tight flex-1 line-clamp-2" style={{ color: "var(--text-dark)" }}>
            {item.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
          <StatusPill status={item.status} onClick={() => onStatusAdvance(item.id, nextStatus)} />
          {item.platform && (
            <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.platform}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="card px-4 py-3.5 group transition-all"
      style={{
        background: brand?.bg ?? "rgba(255,255,255,0.75)",
        border: `1.5px solid ${brand?.color ?? "#ddd"}40`,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0 mt-0.5">{brand?.emoji ?? "📄"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>{item.title}</p>
          {item.notes && (
            <p className="text-xs mt-0.5 italic" style={{ color: "var(--text-soft)" }}>{item.notes}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusPill status={item.status} onClick={() => onStatusAdvance(item.id, nextStatus)} />
            <span
              className={cn("tag text-xs", brand?.tag)}
              style={{ fontSize: "11px" }}
            >
              {item.brand}
            </span>
            {item.platform && (
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.platform}</span>
            )}
            {item.scheduled_date && (
              <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                {format(parseISO(item.scheduled_date), "d MMM")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ color: "var(--text-soft)" }}
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ color: "var(--text-soft)" }}
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ContentPage() {
  const [scheduled, setScheduled] = useState<ContentItem[]>([]);
  const [ideas,     setIdeas]     = useState<ContentItem[]>([]);
  const [weekAnchor, setWeekAnchor] = useState(() => weekMonday(new Date()));
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("All");
  const [activeView,  setActiveView]  = useState<ActiveView>("calendar");
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // form fields
  const [fBrand,    setFBrand]    = useState<string>("Personal TikTok");
  const [fTitle,    setFTitle]    = useState("");
  const [fPlatform, setFPlatform] = useState<string>("TikTok");
  const [fDate,     setFDate]     = useState("");
  const [fStatus,   setFStatus]   = useState<Status>("idea");
  const [fNotes,    setFNotes]    = useState("");

  const weekStart    = weekMonday(weekAnchor);
  const weekStartISO = toISO(weekStart); // stable string — safe as useCallback dep
  const days         = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel    = `${format(weekStart, "d MMM")} – ${format(days[6], "d MMM yyyy")}`;

  // fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/content?weekStart=${weekStartISO}`, { cache: "no-store" });
      const data = await res.json();
      setScheduled(data.scheduled ?? []);
      setIdeas(data.ideas ?? []);
    } catch {}
    setLoading(false);
  }, [weekStartISO]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // helpers
  const filtered = (items: ContentItem[]) =>
    brandFilter === "All" ? items : items.filter((i) => i.brand === brandFilter);

  const dayItems = (day: Date) =>
    filtered(scheduled).filter(
      (i) => i.scheduled_date && isSameDay(parseISO(i.scheduled_date), day)
    );

  const statusCounts = (items: ContentItem[]) =>
    STATUSES.reduce((acc, s) => {
      acc[s] = items.filter((i) => i.status === s).length;
      return acc;
    }, {} as Record<Status, number>);

  const allItems    = [...scheduled, ...ideas];
  const counts      = statusCounts(filtered(allItems));
  const postedCount = filtered(scheduled).filter((i) => i.status === "posted").length;
  const totalSched  = filtered(scheduled).length;

  // actions
  const advanceStatus = async (id: number, next: Status) => {
    const update = (list: ContentItem[]) =>
      list.map((i) => (i.id === id ? { ...i, status: next } : i));
    setScheduled((p) => update(p));
    setIdeas((p) => update(p));
    await fetch("/api/content", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "status", id, status: next }),
    });
  };

  const deleteItem = async (id: number) => {
    setScheduled((p) => p.filter((i) => i.id !== id));
    setIdeas((p) => p.filter((i) => i.id !== id));
    await fetch("/api/content", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "delete", id }),
    });
  };

  const openAdd = (defaultDate?: string, defaultBrand?: string) => {
    setEditItem(null);
    setFBrand(defaultBrand ?? "Personal TikTok");
    setFTitle(""); setFPlatform("TikTok");
    setFDate(defaultDate ?? ""); setFStatus("idea"); setFNotes("");
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const openEdit = (item: ContentItem) => {
    setEditItem(item);
    setFBrand(item.brand);
    setFTitle(item.title);
    setFPlatform(item.platform ?? "TikTok");
    setFDate(item.scheduled_date?.split("T")[0] ?? "");
    setFStatus(item.status as Status);
    setFNotes(item.notes ?? "");
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const saveItem = async () => {
    if (!fTitle.trim()) return;
    const payload = {
      action:        editItem ? "update" : "add",
      id:            editItem?.id,
      brand:         fBrand,
      title:         fTitle.trim(),
      platform:      fPlatform || null,
      scheduledDate: fDate || null,
      status:        fStatus,
      notes:         fNotes.trim() || null,
    };
    const res  = await fetch("/api/content", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.item) {
      const item: ContentItem = data.item;
      if (editItem) {
        setScheduled((p) => item.scheduled_date
          ? p.map((i) => i.id === item.id ? item : i).concat(p.find((i) => i.id === item.id) ? [] : [item])
          : p.filter((i) => i.id !== item.id)
        );
        setIdeas((p) => !item.scheduled_date
          ? p.map((i) => i.id === item.id ? item : i).concat(p.find((i) => i.id === item.id) ? [] : [item])
          : p.filter((i) => i.id !== item.id)
        );
      } else {
        if (item.scheduled_date) setScheduled((p) => [...p, item]);
        else setIdeas((p) => [item, ...p]);
      }
    }
    setShowForm(false);
    setEditItem(null);
  };

  // promote idea to calendar
  const promoteIdea = (item: ContentItem) => openEdit({ ...item, scheduled_date: toISO(new Date()) });

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 py-2">

      {/* Hero */}
      <div
        className="card px-6 py-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,213,216,0.85) 0%, rgba(237,232,245,0.85) 50%, rgba(222,238,232,0.8) 100%)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
                Content Calendar
              </span>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              🎬 Create & Post
            </h1>
          </div>
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => openAdd()}
          >
            <Plus size={14} /> Add content
          </button>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STATUSES.map((s) => {
            const meta = STATUS_META[s];
            return (
              <div
                key={s}
                className="rounded-xl px-2 py-2 text-center"
                style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
              >
                <div className="text-base mb-0.5">{meta.emoji}</div>
                <div className="font-display font-bold italic text-xl leading-none" style={{ color: meta.color }}>
                  {counts[s]}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{meta.label}</div>
              </div>
            );
          })}
        </div>

        {/* Posted progress */}
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-soft)" }}>
            <span>Posted this week</span>
            <span>{postedCount}/{totalSched}</span>
          </div>
          <div className="progress-track h-2">
            <div
              className="progress-fill"
              style={{ width: totalSched > 0 ? `${(postedCount / totalSched) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Brand filter + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(["All", ...BRANDS] as BrandFilter[]).map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className="nav-item text-sm"
              style={{
                background: brandFilter === b
                  ? (b === "All" ? "var(--sage-pale)" : BRAND_META[b]?.bg ?? "var(--sage-pale)")
                  : "transparent",
                color: brandFilter === b
                  ? (b === "All" ? "var(--sage)" : BRAND_META[b]?.color ?? "var(--sage)")
                  : "var(--text-soft)",
                border: brandFilter === b ? `1px solid ${b === "All" ? "rgba(143,173,160,0.3)" : (BRAND_META[b]?.color ?? "#ddd") + "60"}` : "1px solid transparent",
                padding: "6px 14px",
              }}
            >
              {b !== "All" && <span className="mr-1">{BRAND_META[b]?.emoji}</span>}
              {b === "All" ? "All brands" : b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(200,184,224,0.3)" }}>
          <button
            onClick={() => setActiveView("calendar")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeView === "calendar" ? "white" : "transparent",
              color: activeView === "calendar" ? "var(--text-dark)" : "var(--text-soft)",
              boxShadow: activeView === "calendar" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <CalendarDays size={14} /> Calendar
          </button>
          <button
            onClick={() => setActiveView("ideas")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeView === "ideas" ? "white" : "transparent",
              color: activeView === "ideas" ? "var(--text-dark)" : "var(--text-soft)",
              boxShadow: activeView === "ideas" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <Lightbulb size={14} /> Ideas Bank
            {ideas.length > 0 && (
              <span
                className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "var(--gold)", color: "white", fontSize: "10px" }}
              >
                {ideas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CALENDAR VIEW ───────────────────────────────────────────────── */}
      {activeView === "calendar" && (
        <>
          {/* Week nav */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: "rgba(255,255,255,0.8)", color: "var(--text-mid)", border: "1px solid rgba(200,184,224,0.3)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium" style={{ color: "var(--text-mid)" }}>{weekLabel}</span>
            <button
              onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: "rgba(255,255,255,0.8)", color: "var(--text-mid)", border: "1px solid rgba(200,184,224,0.3)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const items = dayItems(day);
              const todayDay = isToday(day);
              return (
                <div key={toISO(day)} className="min-h-[120px]">
                  {/* Day header */}
                  <div className="text-center mb-1.5">
                    <div
                      className="text-xs font-medium mb-0.5"
                      style={{ color: todayDay ? "var(--sage)" : "var(--text-soft)" }}
                    >
                      {format(day, "EEE")}
                    </div>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-bold"
                      style={{
                        background: todayDay ? "var(--sage)" : "transparent",
                        color: todayDay ? "white" : "var(--text-mid)",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {loading ? (
                      <div className="h-12 rounded-lg animate-pulse" style={{ background: "var(--cream-dark)" }} />
                    ) : (
                      items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          compact
                          onStatusAdvance={advanceStatus}
                          onEdit={openEdit}
                          onDelete={deleteItem}
                        />
                      ))
                    )}

                    {/* Add button — only on today or future days */}
                    <button
                      onClick={() => openAdd(toISO(day), brandFilter !== "All" ? brandFilter : "Personal TikTok")}
                      className="w-full rounded-lg flex items-center justify-center transition-all opacity-0 hover:opacity-100 focus:opacity-100"
                      style={{
                        height: "28px",
                        border: "1.5px dashed rgba(200,184,224,0.4)",
                        color: "var(--text-soft)",
                      }}
                      title={`Add content on ${format(day, "d MMM")}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {!loading && filtered(scheduled).length === 0 && (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                Nothing scheduled this week
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
                Add content to the calendar, or check your Ideas Bank.
              </p>
              <div className="flex gap-3 justify-center">
                <button className="btn-primary" onClick={() => openAdd(toISO(new Date()))}>
                  Schedule something ✦
                </button>
                <button
                  className="btn-primary btn-rose"
                  onClick={() => setActiveView("ideas")}
                >
                  View ideas
                </button>
              </div>
            </div>
          )}

          {/* All-content list below (this month, full detail) */}
          {!loading && filtered(scheduled).length > 0 && (
            <div>
              <h2 className="font-display font-bold italic text-lg mb-3 px-1" style={{ color: "var(--text-dark)" }}>
                This week — full view
              </h2>
              <div className="space-y-2">
                {filtered(scheduled)
                  .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))
                  .map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onStatusAdvance={advanceStatus}
                      onEdit={openEdit}
                      onDelete={deleteItem}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── IDEAS BANK ──────────────────────────────────────────────────── */}
      {activeView === "ideas" && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
                💡 Ideas Bank
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                Dump ideas here. Schedule them to the calendar when you&apos;re ready.
              </p>
            </div>
            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => openAdd(undefined, brandFilter !== "All" ? brandFilter : "Personal TikTok")}
            >
              <Plus size={14} /> New idea
            </button>
          </div>

          {/* Quick add */}
          <QuickAddIdea
            defaultBrand={brandFilter !== "All" ? brandFilter : "Personal TikTok"}
            onAdd={async (title, brand) => {
              const res  = await fetch("/api/content", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ action: "add", brand, title, status: "idea" }),
              });
              const data = await res.json();
              if (data.item) setIdeas((p) => [data.item, ...p]);
            }}
          />

          {filtered(ideas).length === 0 && !loading && (
            <div className="card px-5 py-8 text-center mt-3">
              <div className="text-3xl mb-3">💡</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                Ideas bank is empty
              </p>
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                Quick-add above or tap &ldquo;New idea&rdquo; for more detail.
              </p>
            </div>
          )}

          <div className="space-y-2 mt-3">
            {filtered(ideas).map((item) => (
              <div key={item.id} className="flex gap-2">
                <div className="flex-1">
                  <ItemCard
                    item={item}
                    onStatusAdvance={advanceStatus}
                    onEdit={openEdit}
                    onDelete={deleteItem}
                  />
                </div>
                <button
                  onClick={() => promoteIdea(item)}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 rounded-xl text-xs transition-all"
                  style={{
                    background: "var(--sage-pale)",
                    color: "var(--sage)",
                    border: "1.5px solid rgba(143,173,160,0.3)",
                  }}
                  title="Schedule to calendar"
                >
                  <CalendarDays size={13} />
                  <span style={{ fontSize: "10px" }}>Plan</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT FORM ─────────────────────────────────────────────── */}
      {showForm && (
        <div ref={formRef} className="card px-5 py-5" style={{ border: "1.5px solid rgba(200,184,224,0.5)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              {editItem ? "Edit content" : "Add content ✦"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditItem(null); }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Brand */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Brand</label>
              <div className="flex gap-2">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setFBrand(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: fBrand === b ? BRAND_META[b].bg : "rgba(250,246,240,0.8)",
                      color: fBrand === b ? BRAND_META[b].color : "var(--text-soft)",
                      border: `1.5px solid ${fBrand === b ? BRAND_META[b].color + "60" : "rgba(200,184,224,0.25)"}`,
                    }}
                  >
                    <span>{BRAND_META[b].emoji}</span> {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Platform</label>
              <div className="flex gap-1.5 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setFPlatform(p)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: fPlatform === p ? "var(--sage-pale)" : "rgba(250,246,240,0.8)",
                      color: fPlatform === p ? "var(--sage)" : "var(--text-soft)",
                      border: `1.5px solid ${fPlatform === p ? "rgba(143,173,160,0.4)" : "rgba(200,184,224,0.25)"}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Content title / idea *</label>
              <input
                autoFocus
                className="input-fairy"
                placeholder="e.g. Day in my life as a student in Southampton"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveItem(); }}
              />
            </div>

            {/* Scheduled date */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>
                Scheduled date <span style={{ color: "var(--text-soft)", fontWeight: 400 }}>(leave blank for Ideas Bank)</span>
              </label>
              <input
                type="date"
                className="input-fairy"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map((s) => {
                  const meta = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setFStatus(s)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: fStatus === s ? meta.bg : "rgba(250,246,240,0.8)",
                        color: fStatus === s ? meta.color : "var(--text-soft)",
                        border: `1.5px solid ${fStatus === s ? meta.color + "60" : "rgba(200,184,224,0.2)"}`,
                        transform: fStatus === s ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes / hook ideas</label>
              <textarea
                className="input-fairy resize-none"
                rows={2}
                placeholder="Hook, outfit idea, audio inspo…"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn-primary flex-1" onClick={saveItem}>
              <Check size={14} className="inline mr-1" />
              {editItem ? "Save changes" : fDate ? "Add to calendar ✦" : "Save to ideas ✦"}
            </button>
            {editItem && (
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                onClick={() => { deleteItem(editItem.id); setShowForm(false); setEditItem(null); }}
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

// ── quick-add idea component ──────────────────────────────────────────────────
function QuickAddIdea({
  defaultBrand,
  onAdd,
}: {
  defaultBrand: string;
  onAdd: (title: string, brand: string) => Promise<void>;
}) {
  const [text,  setText]  = useState("");
  const [brand, setBrand] = useState(defaultBrand);

  const submit = async () => {
    if (!text.trim()) return;
    await onAdd(text.trim(), brand);
    setText("");
  };

  return (
    <div
      className="card px-4 py-3 flex gap-2 items-start"
      style={{ background: "rgba(255,255,255,0.8)" }}
    >
      <div className="flex-1">
        <div className="flex gap-1.5 mb-2">
          {BRANDS.map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={{
                background: brand === b ? BRAND_META[b].bg : "transparent",
                color: brand === b ? BRAND_META[b].color : "var(--text-soft)",
                border: `1px solid ${brand === b ? BRAND_META[b].color + "50" : "rgba(200,184,224,0.25)"}`,
              }}
            >
              {BRAND_META[b].emoji} {b}
            </button>
          ))}
        </div>
        <input
          className="input-fairy text-sm"
          placeholder="Quick idea — type and hit Enter…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
      </div>
      <button
        onClick={submit}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-7 transition-all"
        style={{ background: "var(--sage)", color: "white" }}
        disabled={!text.trim()}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
