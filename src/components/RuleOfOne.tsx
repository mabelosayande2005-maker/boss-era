"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { format } from "date-fns";

type Option   = { id: number; label: string; sort_order: number };
type Category = { id: number; name: string; sort_order: number; options: Option[] };
type PicksMap = Record<number, { option_id: number | null; option_label: string }>;

// Parse "YYYY-MM-DD" without UTC drift by constructing at local noon.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export default function RuleOfOne({ onEditClick }: { onEditClick?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [picks,      setPicks]      = useState<PicksMap>({});
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [today,      setToday]      = useState("");
  const [saveError,  setSaveError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/rule-of-one", { cache: "no-store" });
      const data = await res.json();
      setCategories(data.categories ?? []);
      setPicks(data.picks ?? {});
      setToday(data.today ?? "");
    } catch { /* silent — db may not be ready yet */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showError(msg: string) {
    setSaveError(msg);
    setTimeout(() => setSaveError(null), 3500);
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/rule-of-one", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
  }

  async function handlePick(cat: Category, opt: Option) {
    const prevPicks    = picks;
    const prevExpanded = expanded;
    const isSelected   = picks[cat.id]?.option_id === opt.id;

    if (isSelected) {
      // Tap selected pill → optimistically clear; keep row open so user can swap
      setPicks(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
      try {
        await post({ action: "clear_pick", categoryId: cat.id });
      } catch {
        setPicks(prevPicks);
        showError("Couldn't clear — check your connection");
      }
    } else {
      // Tap unselected pill → optimistically set and collapse
      setPicks(prev => ({ ...prev, [cat.id]: { option_id: opt.id, option_label: opt.label } }));
      setExpanded(null);
      try {
        await post({ action: "pick", categoryId: cat.id, categoryName: cat.name, optionId: opt.id, optionLabel: opt.label });
      } catch {
        setPicks(prevPicks);
        setExpanded(prevExpanded); // re-open the row we collapsed
        showError("Couldn't save — check your connection");
      }
    }
  }

  const pickedCount = categories.filter(c => picks[c.id]).length;
  const allPicked   = categories.length > 0 && pickedCount === categories.length;
  const dateDisplay = today ? format(parseLocalDate(today), "EEEE d MMMM") : "";

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(253,240,241,0.92) 0%, rgba(250,246,240,0.97) 55%, rgba(237,232,245,0.55) 100%)",
        border: "1px solid rgba(232,180,184,0.35)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="font-display font-bold italic leading-tight"
              style={{ fontSize: "1.45rem", color: "var(--text-dark)" }}
            >
              Today&apos;s One
            </h2>
            {dateDisplay && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                {dateDisplay}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-0.5 shrink-0">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: allPicked ? "var(--sage-pale)"            : "rgba(232,180,184,0.18)",
                color:      allPicked ? "var(--sage)"                 : "var(--rose)",
                border:     `1px solid ${allPicked ? "rgba(143,173,160,0.3)" : "rgba(232,180,184,0.3)"}`,
                transition: "background 0.3s, color 0.3s",
              }}
            >
              {loading ? "—" : `${pickedCount} of ${categories.length} picked`}
            </span>

            <button
              onClick={onEditClick}
              title="Edit options"
              className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.75)", color: "var(--text-soft)" }}
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Rows ────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(232,180,184,0.2)" }}>
        {loading ? (
          <div className="px-5 py-3 space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="h-11 rounded-xl animate-pulse"
                style={{ background: "rgba(232,180,184,0.1)" }}
              />
            ))}
          </div>
        ) : (
          categories.map((cat, idx) => {
            const pick       = picks[cat.id];
            const isExpanded = expanded === cat.id;
            const isLast     = idx === categories.length - 1;

            return (
              <div
                key={cat.id}
                style={{ borderBottom: isLast ? "none" : "1px solid rgba(232,180,184,0.13)" }}
              >
                {/* Row toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : cat.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  style={{ background: isExpanded ? "rgba(232,180,184,0.07)" : "transparent" }}
                >
                  {/* Category label */}
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest shrink-0"
                    style={{ color: "var(--text-soft)", width: "76px" }}
                  >
                    {cat.name}
                  </span>

                  {/* Current pick or placeholder */}
                  <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
                    {pick ? (
                      <span
                        className="text-xs font-medium px-3 py-1 rounded-full truncate"
                        style={{
                          background:  "var(--rose)",
                          color:       "white",
                          boxShadow:   "0 1px 5px rgba(232,180,184,0.45)",
                          maxWidth:    "180px",
                        }}
                      >
                        {pick.option_label}
                      </span>
                    ) : (
                      <span className="text-xs italic" style={{ color: "rgba(155,140,140,0.6)" }}>
                        tap to choose
                      </span>
                    )}

                    <ChevronDown
                      size={14}
                      style={{
                        color:      "var(--text-soft)",
                        flexShrink: 0,
                        transform:  isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </div>
                </button>

                {/* Option pills */}
                {isExpanded && (
                  <div
                    className="px-5 pt-1 pb-4 flex flex-wrap gap-2"
                    style={{ background: "rgba(255,255,255,0.35)" }}
                  >
                    {cat.options.map(opt => {
                      const isSelected = pick?.option_id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handlePick(cat, opt)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-95"
                          style={{
                            background:  isSelected ? "var(--rose)"              : "rgba(255,255,255,0.9)",
                            color:       isSelected ? "white"                    : "var(--text-mid)",
                            border:      isSelected ? "none"                     : "1.5px solid rgba(232,180,184,0.45)",
                            boxShadow:   isSelected ? "0 1px 6px rgba(232,180,184,0.45)" : "none",
                          }}
                        >
                          {isSelected ? `✓ ${opt.label}` : opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Save error ──────────────────────────────────────────── */}
      {saveError && (
        <div
          className="px-5 py-2"
          style={{ background: "rgba(232,180,184,0.18)", borderTop: "1px solid rgba(232,180,184,0.2)" }}
        >
          <p className="text-xs text-center" style={{ color: "var(--rose)" }}>
            ⚠ {saveError}
          </p>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid rgba(232,180,184,0.18)" }}
      >
        <p
          className="font-display italic text-sm text-center"
          style={{ color: "var(--text-soft)" }}
        >
          focus beats frantic
        </p>
      </div>
    </div>
  );
}
