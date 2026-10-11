"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, Pencil, ArrowLeft, Plus, X, Check } from "lucide-react";
import { format } from "date-fns";

// ─── types ────────────────────────────────────────────────────────────────────

type Option   = { id: number; label: string; sort_order: number };
type Category = { id: number; name: string; sort_order: number; options: Option[] };
type PicksMap = Record<number, { option_id: number | null; option_label: string }>;

// Parse "YYYY-MM-DD" without UTC drift by constructing at local noon.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// ─── component ────────────────────────────────────────────────────────────────

export default function RuleOfOne() {
  // ── data state ──────────────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [picks,         setPicks]         = useState<PicksMap>({});
  const [today,         setToday]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  // ── pick-view state ─────────────────────────────────────────────────────────
  const [expanded,      setExpanded]      = useState<number | null>(null);

  // ── edit-view state ─────────────────────────────────────────────────────────
  const [showEdit,           setShowEdit]           = useState(false);
  const [editingOptId,       setEditingOptId]       = useState<number | null>(null);
  const [editingLabel,       setEditingLabel]       = useState("");
  const [newOptTexts,        setNewOptTexts]        = useState<Record<number, string>>({});
  const [addingCat,          setAddingCat]          = useState(false);
  const [newCatName,         setNewCatName]         = useState("");
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<number | null>(null);

  const renameRef = useRef<HTMLInputElement>(null);

  // ── load ────────────────────────────────────────────────────────────────────

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

  // Focus rename input when it mounts
  useEffect(() => {
    if (editingOptId !== null) renameRef.current?.focus();
  }, [editingOptId]);

  // ── shared helpers ──────────────────────────────────────────────────────────

  function showError(msg: string) {
    setSaveError(msg);
    setTimeout(() => setSaveError(null), 3500);
  }

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch("/api/rule-of-one", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  // ── pick-view actions ────────────────────────────────────────────────────────

  async function handlePick(cat: Category, opt: Option) {
    const prevPicks    = picks;
    const prevExpanded = expanded;
    const isSelected   = picks[cat.id]?.option_id === opt.id;

    if (isSelected) {
      // Tap selected pill → clear; keep row open so user can swap immediately
      setPicks(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
      try {
        await apiPost({ action: "clear_pick", categoryId: cat.id });
      } catch {
        setPicks(prevPicks);
        showError("Couldn't clear — check your connection");
      }
    } else {
      // Tap unselected pill → set and collapse
      setPicks(prev => ({ ...prev, [cat.id]: { option_id: opt.id, option_label: opt.label } }));
      setExpanded(null);
      try {
        await apiPost({ action: "pick", categoryId: cat.id, categoryName: cat.name, optionId: opt.id, optionLabel: opt.label });
      } catch {
        setPicks(prevPicks);
        setExpanded(prevExpanded);
        showError("Couldn't save — check your connection");
      }
    }
  }

  // ── edit-view actions ────────────────────────────────────────────────────────

  async function addOption(catId: number) {
    const label = (newOptTexts[catId] ?? "").trim();
    if (!label) return;
    const tempId = -(Date.now());
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, options: [...c.options, { id: tempId, label, sort_order: 9999 }] } : c
    ));
    setNewOptTexts(prev => ({ ...prev, [catId]: "" }));
    try {
      const data = await apiPost({ action: "add_option", categoryId: catId, label });
      setCategories(prev => prev.map(c =>
        c.id === catId ? { ...c, options: c.options.map(o =>
          o.id === tempId ? { id: data.option.id as number, label, sort_order: data.option.sort_order as number } : o
        )} : c
      ));
    } catch {
      setCategories(prev => prev.map(c =>
        c.id === catId ? { ...c, options: c.options.filter(o => o.id !== tempId) } : c
      ));
      showError("Couldn't add option");
    }
  }

  function startRename(opt: Option) {
    setEditingOptId(opt.id);
    setEditingLabel(opt.label);
  }

  async function commitRename() {
    if (editingOptId === null) return;
    const label = editingLabel.trim();
    setEditingOptId(null);
    if (!label) return;
    const prevCats = categories;
    setCategories(prev => prev.map(c => ({
      ...c,
      options: c.options.map(o => o.id === editingOptId ? { ...o, label } : o),
    })));
    try {
      await apiPost({ action: "rename_option", optionId: editingOptId, label });
    } catch {
      setCategories(prevCats);
      showError("Couldn't rename option");
    }
  }

  async function deleteOption(catId: number, optId: number) {
    const prevCats  = categories;
    const prevPicks = picks;
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, options: c.options.filter(o => o.id !== optId) } : c
    ));
    // Clear the pick for today if it was this option
    if (picks[catId]?.option_id === optId) {
      setPicks(prev => { const n = { ...prev }; delete n[catId]; return n; });
    }
    try {
      await apiPost({ action: "delete_option", optionId: optId });
    } catch {
      setCategories(prevCats);
      setPicks(prevPicks);
      showError("Couldn't delete option");
    }
  }

  async function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const tempId = -(Date.now());
    setCategories(prev => [...prev, { id: tempId, name, sort_order: 9999, options: [] }]);
    setNewCatName("");
    setAddingCat(false);
    try {
      const data = await apiPost({ action: "add_category", name });
      setCategories(prev => prev.map(c =>
        c.id === tempId ? { ...c, id: data.category.id as number, sort_order: data.category.sort_order as number } : c
      ));
    } catch {
      setCategories(prev => prev.filter(c => c.id !== tempId));
      showError("Couldn't add category");
    }
  }

  async function deleteCategory(catId: number) {
    const prevCats  = categories;
    const prevPicks = picks;
    setCategories(prev => prev.filter(c => c.id !== catId));
    setPicks(prev => { const n = { ...prev }; delete n[catId]; return n; });
    try {
      await apiPost({ action: "delete_category", categoryId: catId });
    } catch {
      setCategories(prevCats);
      setPicks(prevPicks);
      showError("Couldn't delete category");
    }
  }

  // ── derived ─────────────────────────────────────────────────────────────────

  const pickedCount = categories.filter(c => picks[c.id]).length;
  const allPicked   = categories.length > 0 && pickedCount === categories.length;
  const dateDisplay = today ? format(parseLocalDate(today), "EEEE d MMMM") : "";

  // ── shared chrome ────────────────────────────────────────────────────────────

  const cardStyle = {
    padding:    0,
    overflow:   "hidden",
    background: "linear-gradient(135deg, rgba(253,240,241,0.92) 0%, rgba(250,246,240,0.97) 55%, rgba(237,232,245,0.55) 100%)",
    border:     "1px solid rgba(232,180,184,0.35)",
  } as const;

  const dividerStyle = { borderTop: "1px solid rgba(232,180,184,0.18)" } as const;

  function ErrorBanner() {
    if (!saveError) return null;
    return (
      <div className="px-5 py-2" style={{ background: "rgba(232,180,184,0.18)", ...dividerStyle }}>
        <p className="text-xs text-center" style={{ color: "var(--rose)" }}>⚠ {saveError}</p>
      </div>
    );
  }

  function Footer() {
    return (
      <div className="px-5 py-3" style={dividerStyle}>
        <p className="font-display italic text-sm text-center" style={{ color: "var(--text-soft)" }}>
          focus beats frantic
        </p>
      </div>
    );
  }

  // ── edit view ────────────────────────────────────────────────────────────────

  if (showEdit) {
    return (
      <div className="card" style={cardStyle}>

        {/* Edit header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <button
            onClick={() => { setShowEdit(false); setEditingOptId(null); setAddingCat(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 shrink-0"
            style={{ background: "rgba(255,255,255,0.75)", color: "var(--text-soft)" }}
            title="Back"
          >
            <ArrowLeft size={13} />
          </button>
          <h2
            className="font-display font-bold italic leading-tight"
            style={{ fontSize: "1.45rem", color: "var(--text-dark)" }}
          >
            Edit options
          </h2>
        </div>

        {/* Category list */}
        <div style={dividerStyle}>
          {categories.map((cat, catIdx) => (
            <div
              key={cat.id}
              style={{ borderBottom: catIdx < categories.length - 1 ? "1px solid rgba(232,180,184,0.13)" : "none" }}
            >
              {/* Category header */}
              {confirmDeleteCatId === cat.id ? (
                <div
                  className="flex items-center justify-between px-5 py-2.5 gap-3"
                  style={{ background: "rgba(232,180,184,0.12)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-dark)", flexShrink: 1, minWidth: 0 }}>
                    Delete <strong>{cat.name}</strong> and its {cat.options.length} option{cat.options.length !== 1 ? "s" : ""}?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmDeleteCatId(null)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-70"
                      style={{ background: "rgba(255,255,255,0.8)", color: "var(--text-soft)", border: "1px solid rgba(200,190,190,0.4)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteCatId(null); deleteCategory(cat.id); }}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-80"
                      style={{ background: "var(--rose)", color: "white" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between px-5 py-2.5"
                  style={{ background: "rgba(232,180,184,0.07)" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {cat.name}
                  </span>
                  <button
                    onClick={() => setConfirmDeleteCatId(cat.id)}
                    title={`Delete ${cat.name}`}
                    className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-80"
                    style={{ color: "var(--rose)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Options */}
              <div className="py-1">
                {cat.options.map(opt => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-2 px-5 py-2"
                  >
                    {editingOptId === opt.id ? (
                      <input
                        ref={renameRef}
                        value={editingLabel}
                        onChange={e => setEditingLabel(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                          if (e.key === "Enter")  commitRename();
                          if (e.key === "Escape") setEditingOptId(null);
                        }}
                        className="input-fairy text-sm flex-1 py-1"
                        style={{ background: "rgba(255,255,255,0.9)" }}
                      />
                    ) : (
                      <button
                        onClick={() => startRename(opt)}
                        className="flex-1 text-left text-sm py-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--text-dark)" }}
                        title="Tap to rename"
                      >
                        {opt.label}
                      </button>
                    )}
                    {editingOptId === opt.id ? (
                      <button
                        onMouseDown={e => { e.preventDefault(); commitRename(); }}
                        className="w-6 h-6 flex items-center justify-center rounded-full shrink-0"
                        style={{ background: "var(--sage-pale)", color: "var(--sage)" }}
                      >
                        <Check size={11} />
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteOption(cat.id, opt.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-80 shrink-0"
                        style={{ color: "var(--text-soft)" }}
                        title="Delete option"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add option row */}
                <div className="flex items-center gap-2 px-5 pt-1 pb-3">
                  <input
                    value={newOptTexts[cat.id] ?? ""}
                    onChange={e => setNewOptTexts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") addOption(cat.id); }}
                    placeholder="Add option…"
                    className="input-fairy text-sm flex-1 py-1.5"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  />
                  <button
                    onClick={() => addOption(cat.id)}
                    disabled={!(newOptTexts[cat.id] ?? "").trim()}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity disabled:opacity-30"
                    style={{ background: "var(--rose-pale)", color: "var(--rose)" }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add category */}
          <div className="px-5 py-3" style={{ borderTop: categories.length > 0 ? "1px solid rgba(232,180,184,0.13)" : "none" }}>
            {addingCat ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  addCategory();
                    if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); }
                  }}
                  placeholder="Category name…"
                  className="input-fairy text-sm flex-1 py-1.5"
                  style={{ background: "rgba(255,255,255,0.7)" }}
                />
                <button
                  onClick={addCategory}
                  disabled={!newCatName.trim()}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingCat(false); setNewCatName(""); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full"
                  style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingCat(true)}
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
                style={{ color: "var(--rose)" }}
              >
                <Plus size={14} />
                <span className="font-medium">Add category</span>
              </button>
            )}
          </div>
        </div>

        <ErrorBanner />
        <Footer />
      </div>
    );
  }

  // ── pick view ─────────────────────────────────────────────────────────────────

  return (
    <div className="card" style={cardStyle}>

      {/* Header */}
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
              <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{dateDisplay}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-0.5 shrink-0">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: allPicked ? "var(--sage-pale)"  : "rgba(232,180,184,0.18)",
                color:      allPicked ? "var(--sage)"       : "var(--rose)",
                border:     `1px solid ${allPicked ? "rgba(143,173,160,0.3)" : "rgba(232,180,184,0.3)"}`,
                transition: "background 0.3s, color 0.3s",
              }}
            >
              {loading ? "—" : `${pickedCount} of ${categories.length} picked`}
            </span>

            <button
              onClick={() => setShowEdit(true)}
              title="Edit options"
              className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.75)", color: "var(--text-soft)" }}
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Category rows */}
      <div style={dividerStyle}>
        {loading ? (
          <div className="px-5 py-3 space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "rgba(232,180,184,0.1)" }} />
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
                <button
                  onClick={() => setExpanded(isExpanded ? null : cat.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  style={{ background: isExpanded ? "rgba(232,180,184,0.07)" : "transparent" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest shrink-0"
                    style={{ color: "var(--text-soft)", width: "76px" }}
                  >
                    {cat.name}
                  </span>
                  <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
                    {pick ? (
                      <span
                        className="text-xs font-medium px-3 py-1 rounded-full truncate"
                        style={{
                          background: "var(--rose)",
                          color:      "white",
                          boxShadow:  "0 1px 5px rgba(232,180,184,0.45)",
                          maxWidth:   "180px",
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
                            background: isSelected ? "var(--rose)"                    : "rgba(255,255,255,0.9)",
                            color:      isSelected ? "white"                          : "var(--text-mid)",
                            border:     isSelected ? "none"                           : "1.5px solid rgba(232,180,184,0.45)",
                            boxShadow:  isSelected ? "0 1px 6px rgba(232,180,184,0.45)" : "none",
                          }}
                        >
                          {isSelected ? `✓ ${opt.label}` : opt.label}
                        </button>
                      );
                    })}
                    {cat.options.length === 0 && (
                      <span className="text-xs italic" style={{ color: "var(--text-soft)" }}>
                        No options yet — tap ✏️ to add some
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ErrorBanner />
      <Footer />
    </div>
  );
}
