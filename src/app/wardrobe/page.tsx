"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Check, Pencil, Shirt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ── types ──────────────────────────────────────────────────────────────────────
type WardrobeItem = {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  photo_url: string | null;
  notes: string | null;
};

type Outfit = {
  id: number;
  name: string;
  notes: string | null;
  items: WardrobeItem[];
};

type MakeupLook = {
  id: number;
  name: string;
  occasion: string;
  photo_url: string | null;
  products: string | null;
  notes: string | null;
};

type Stats = { totalItems: number; outfitCount: number; makeupCount: number };
type Tab   = "closet" | "outfits" | "makeup";

// ── constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = ["Tops","Bottoms","Dresses","Outerwear","Shoes","Bags","Accessories","Swimwear","Other"] as const;
const OCCASIONS  = ["Everyday","Night out","Glam","Natural","Work","Editorial"] as const;

const CAT_META: Record<string, { emoji: string; color: string; bg: string }> = {
  "Tops":        { emoji: "👚", color: "var(--rose)",     bg: "var(--rose-pale)"       },
  "Bottoms":     { emoji: "👖", color: "var(--lavender)", bg: "var(--lavender-pale)"   },
  "Dresses":     { emoji: "👗", color: "var(--gold)",     bg: "rgba(253,248,236,0.9)"  },
  "Outerwear":   { emoji: "🧥", color: "var(--sage)",     bg: "var(--sage-pale)"       },
  "Shoes":       { emoji: "👠", color: "#c8a87a",         bg: "rgba(248,240,228,0.9)"  },
  "Bags":        { emoji: "👜", color: "var(--lavender)", bg: "var(--lavender-pale)"   },
  "Accessories": { emoji: "💍", color: "var(--gold)",     bg: "rgba(253,248,236,0.9)"  },
  "Swimwear":    { emoji: "👙", color: "var(--rose)",     bg: "var(--rose-pale)"       },
  "Other":       { emoji: "✨", color: "var(--text-soft)", bg: "rgba(240,234,228,0.8)" },
};

const OCC_META: Record<string, { emoji: string; color: string }> = {
  "Everyday":  { emoji: "☀️", color: "var(--sage)"     },
  "Night out": { emoji: "🌙", color: "var(--lavender)" },
  "Glam":      { emoji: "✨", color: "var(--gold)"     },
  "Natural":   { emoji: "🌿", color: "var(--sage)"     },
  "Work":      { emoji: "💼", color: "var(--text-mid)" },
  "Editorial": { emoji: "📸", color: "var(--rose)"     },
};

// ── main page ──────────────────────────────────────────────────────────────────
export default function WardrobePage() {
  const [items,       setItems]       = useState<WardrobeItem[]>([]);
  const [outfits,     setOutfits]     = useState<Outfit[]>([]);
  const [makeupLooks, setMakeupLooks] = useState<MakeupLook[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [tab,         setTab]         = useState<Tab>("closet");
  const [loading,     setLoading]     = useState(true);

  // closet filter
  const [catFilter, setCatFilter] = useState("All");

  // item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem,     setEditItem]     = useState<WardrobeItem | null>(null);
  const [fName,     setFName]     = useState("");
  const [fCat,      setFCat]      = useState("Tops");
  const [fBrand,    setFBrand]    = useState("");
  const [fColor,    setFColor]    = useState("");
  const [fPhotoUrl, setFPhotoUrl] = useState("");
  const [fNotes,    setFNotes]    = useState("");
  const [uploading, setUploading] = useState(false);
  const itemFileRef = useRef<HTMLInputElement>(null);

  // outfit builder
  const [showBuilder,      setShowBuilder]      = useState(false);
  const [selectedIds,      setSelectedIds]      = useState<Set<number>>(new Set());
  const [builderCatFilter, setBuilderCatFilter] = useState("All");
  const [outfitName,       setOutfitName]       = useState("");
  const [outfitNotes,      setOutfitNotes]      = useState("");

  // makeup form
  const [showMakeupForm, setShowMakeupForm] = useState(false);
  const [editMakeup,     setEditMakeup]     = useState<MakeupLook | null>(null);
  const [fMName,     setFMName]     = useState("");
  const [fMOcc,      setFMOcc]      = useState("Everyday");
  const [fMPhoto,    setFMPhoto]    = useState("");
  const [fMProds,    setFMProds]    = useState("");
  const [fMNotes,    setFMNotes]    = useState("");
  const [mUploading, setMUploading] = useState(false);
  const makeupFileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/wardrobe");
      const data = await res.json();
      setItems(data.items            ?? []);
      setOutfits(data.outfits        ?? []);
      setMakeupLooks(data.makeupLooks ?? []);
      setStats(data.stats             ?? null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── photo upload ──────────────────────────────────────────────────────────────
  const uploadPhoto = async (file: File, forMakeup = false) => {
    if (forMakeup) setMUploading(true); else setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/wardrobe/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) { if (forMakeup) setFMPhoto(data.url); else setFPhotoUrl(data.url); }
    } catch {}
    if (forMakeup) setMUploading(false); else setUploading(false);
  };

  // ── item CRUD ─────────────────────────────────────────────────────────────────
  const openAddItem = () => {
    setEditItem(null);
    setFName(""); setFCat("Tops"); setFBrand(""); setFColor(""); setFPhotoUrl(""); setFNotes("");
    setShowItemForm(true);
  };
  const openEditItem = (item: WardrobeItem) => {
    setEditItem(item);
    setFName(item.name); setFCat(item.category); setFBrand(item.brand ?? "");
    setFColor(item.color ?? ""); setFPhotoUrl(item.photo_url ?? ""); setFNotes(item.notes ?? "");
    setShowItemForm(true);
  };
  const saveItem = async () => {
    if (!fName.trim()) return;
    const res  = await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editItem ? "update-item" : "add-item", id: editItem?.id,
        name: fName.trim(), category: fCat, brand: fBrand.trim() || null,
        color: fColor.trim() || null, photoUrl: fPhotoUrl || null, notes: fNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.item) {
      if (editItem) setItems((p) => p.map((i) => i.id === editItem.id ? data.item : i));
      else          setItems((p) => [data.item, ...p]);
    }
    setShowItemForm(false); setEditItem(null);
    fetchData();
  };
  const deleteItem = async (id: number) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-item", id }),
    });
    fetchData();
  };

  // ── outfit builder ────────────────────────────────────────────────────────────
  const openBuilder = () => {
    setSelectedIds(new Set()); setOutfitName(""); setOutfitNotes(""); setShowBuilder(true);
  };
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const saveOutfit = async () => {
    if (!outfitName.trim() || selectedIds.size === 0) return;
    const res  = await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-outfit", name: outfitName.trim(),
        itemIds: [...selectedIds], notes: outfitNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.outfit) {
      const full: Outfit = { ...data.outfit, items: items.filter((i) => selectedIds.has(i.id)) };
      setOutfits((p) => [full, ...p]);
    }
    setSelectedIds(new Set()); setOutfitName(""); setOutfitNotes(""); setShowBuilder(false);
    fetchData();
  };
  const deleteOutfit = async (id: number) => {
    setOutfits((p) => p.filter((o) => o.id !== id));
    await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-outfit", id }),
    });
    fetchData();
  };

  // ── makeup CRUD ───────────────────────────────────────────────────────────────
  const openAddMakeup = () => {
    setEditMakeup(null);
    setFMName(""); setFMOcc("Everyday"); setFMPhoto(""); setFMProds(""); setFMNotes("");
    setShowMakeupForm(true);
  };
  const openEditMakeup = (look: MakeupLook) => {
    setEditMakeup(look);
    setFMName(look.name); setFMOcc(look.occasion); setFMPhoto(look.photo_url ?? "");
    setFMProds(look.products ?? ""); setFMNotes(look.notes ?? "");
    setShowMakeupForm(true);
  };
  const saveMakeup = async () => {
    if (!fMName.trim()) return;
    const res  = await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editMakeup ? "update-makeup" : "add-makeup", id: editMakeup?.id,
        name: fMName.trim(), occasion: fMOcc, photoUrl: fMPhoto || null,
        products: fMProds.trim() || null, notes: fMNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.look) {
      if (editMakeup) setMakeupLooks((p) => p.map((l) => l.id === editMakeup.id ? data.look : l));
      else            setMakeupLooks((p) => [data.look, ...p]);
    }
    setShowMakeupForm(false); setEditMakeup(null);
  };
  const deleteMakeup = async (id: number) => {
    setMakeupLooks((p) => p.filter((l) => l.id !== id));
    await fetch("/api/wardrobe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-makeup", id }),
    });
  };

  // ── derived ───────────────────────────────────────────────────────────────────
  const filteredItems        = catFilter === "All"        ? items : items.filter((i) => i.category === catFilter);
  const builderFilteredItems = builderCatFilter === "All" ? items : items.filter((i) => i.category === builderCatFilter);

  return (
    <div className="space-y-5 py-2">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(237,232,245,0.95) 0%, rgba(200,184,224,0.25) 40%, rgba(245,213,216,0.7) 100%)",
      }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Wardrobe</span>
            <h1 className="font-display font-black italic text-3xl md:text-4xl mt-0.5" style={{ color: "var(--text-dark)" }}>
              👗 Style Vault
            </h1>
          </div>
          <button className="btn-primary flex items-center gap-1.5" onClick={
            tab === "closet" ? openAddItem : tab === "outfits" ? openBuilder : openAddMakeup
          }>
            <Plus size={14} />
            {tab === "closet" ? "Add item" : tab === "outfits" ? "Build outfit" : "Add look"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Closet items",  value: stats?.totalItems  ?? 0, color: "var(--rose)",     icon: <Shirt size={15} />    },
            { label: "Saved outfits", value: stats?.outfitCount ?? 0, color: "var(--sage)",     icon: <Sparkles size={15} /> },
            { label: "Makeup looks",  value: stats?.makeupCount ?? 0, color: "var(--lavender)", icon: <Sparkles size={15} /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div style={{ color: s.color }} className="flex justify-center mb-1">{s.icon}</div>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>
                {loading ? "—" : s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5">
        {([
          { key: "closet",  label: "Closet",  emoji: "👗", count: items.length       },
          { key: "outfits", label: "Outfits", emoji: "✨", count: outfits.length     },
          { key: "makeup",  label: "Makeup",  emoji: "💄", count: makeupLooks.length },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("nav-item flex items-center gap-1.5 text-sm", tab === t.key && "active")}>
            <span>{t.emoji}</span> {t.label}
            {t.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: tab === t.key ? "rgba(255,255,255,0.5)" : "var(--cream-dark)", color: tab === t.key ? "var(--sage)" : "var(--text-soft)" }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ────────────────────────────── CLOSET ─────────────────────────────── */}
      {tab === "closet" && (
        <div className="space-y-4">
          {/* Category filter — scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {(["All", ...CATEGORIES] as const).map((c) => {
              const meta   = CAT_META[c as string];
              const active = catFilter === c;
              const count  = c !== "All" ? items.filter(i => i.category === c).length : 0;
              return (
                <button key={c} onClick={() => setCatFilter(c)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? (meta?.bg ?? "var(--sage-pale)") : "rgba(250,246,240,0.8)",
                    color:      active ? (meta?.color ?? "var(--sage)")   : "var(--text-soft)",
                    border: `1.5px solid ${active ? (meta?.color ?? "var(--sage)") + "50" : "rgba(200,184,224,0.2)"}`,
                  }}>
                  {meta ? meta.emoji : "✦"} {c === "All" ? "All items" : c}
                  {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ aspectRatio: "1", background: "var(--cream-dark)" }} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">{catFilter !== "All" ? CAT_META[catFilter]?.emoji ?? "👗" : "👗"}</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                {catFilter !== "All" ? `No ${catFilter.toLowerCase()} yet` : "Closet is empty"}
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
                Add photos to start building your digital wardrobe.
              </p>
              <button className="btn-primary" onClick={openAddItem}>Add first item ✦</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <ClosetItemCard key={item.id} item={item} onEdit={openEditItem} onDelete={deleteItem} />
              ))}
              <button onClick={openAddItem}
                className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                style={{ aspectRatio: "1", background: "rgba(250,246,240,0.8)", border: "2px dashed rgba(200,184,224,0.4)", color: "var(--text-soft)" }}>
                <Plus size={20} /><span className="text-xs">Add item</span>
              </button>
            </div>
          )}

          {showItemForm && (
            <ItemForm
              isEdit={!!editItem}
              name={fName} setName={setFName}
              category={fCat} setCategory={setFCat}
              brand={fBrand} setBrand={setFBrand}
              color={fColor} setColor={setFColor}
              photoUrl={fPhotoUrl} setPhotoUrl={setFPhotoUrl}
              notes={fNotes} setNotes={setFNotes}
              uploading={uploading} fileRef={itemFileRef}
              onUpload={(file) => uploadPhoto(file, false)}
              onSave={saveItem}
              onDelete={editItem ? () => { deleteItem(editItem.id); setShowItemForm(false); } : undefined}
              onCancel={() => { setShowItemForm(false); setEditItem(null); }}
            />
          )}
        </div>
      )}

      {/* ────────────────────────────── OUTFITS ────────────────────────────── */}
      {tab === "outfits" && (
        <div className="space-y-4">

          {/* Builder panel */}
          {showBuilder && (
            <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(143,173,160,0.4)" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Build an outfit ✦</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                    {selectedIds.size === 0 ? "Tap items to select" : `${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} selected`}
                  </p>
                </div>
                <button onClick={() => setShowBuilder(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
              </div>

              {/* Builder category filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-3" style={{ scrollbarWidth: "none" }}>
                {(["All", ...CATEGORIES] as const).map((c) => {
                  const meta   = CAT_META[c as string];
                  const active = builderCatFilter === c;
                  return (
                    <button key={c} onClick={() => setBuilderCatFilter(c)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: active ? (meta?.bg ?? "var(--sage-pale)") : "transparent",
                        color:      active ? (meta?.color ?? "var(--sage)")   : "var(--text-soft)",
                        border: `1px solid ${active ? (meta?.color ?? "var(--sage)") + "40" : "rgba(200,184,224,0.2)"}`,
                      }}>
                      {meta?.emoji ?? "✦"} {c === "All" ? "All" : c}
                    </button>
                  );
                })}
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-soft)" }}>
                  Add items to your closet first.
                </p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4"
                  style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {builderFilteredItems.map((item) => {
                    const selected = selectedIds.has(item.id);
                    const meta     = CAT_META[item.category];
                    return (
                      <button key={item.id} onClick={() => toggleSelect(item.id)}
                        className="relative rounded-xl overflow-hidden transition-all"
                        style={{
                          aspectRatio: "1",
                          background: meta?.bg ?? "rgba(240,234,228,0.8)",
                          border: selected ? "2.5px solid var(--sage)" : "1.5px solid rgba(200,184,224,0.2)",
                          transform: selected ? "scale(0.94)" : "scale(1)",
                        }}>
                        {item.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">{meta?.emoji ?? "✨"}</div>
                        )}
                        {selected && (
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "rgba(143,173,160,0.25)" }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--sage)" }}>
                              <Check size={12} style={{ color: "white" }} />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                          style={{ background: "rgba(255,255,255,0.85)" }}>
                          <p className="truncate" style={{ color: "var(--text-dark)", fontSize: "10px" }}>{item.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Save bar */}
              {selectedIds.size > 0 && (
                <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--sage-pale)", border: "1px solid rgba(143,173,160,0.3)" }}>
                  <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {items.filter(i => selectedIds.has(i.id)).map(i => {
                      const meta = CAT_META[i.category];
                      return (
                        <div key={i.id} className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden"
                          style={{ background: meta?.bg ?? "rgba(240,234,228,0.8)" }}>
                          {i.photo_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={i.photo_url} alt={i.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-sm">{meta?.emoji ?? "✨"}</div>
                          }
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-fairy flex-1 text-sm" placeholder="Outfit name *" autoFocus
                      value={outfitName} onChange={e => setOutfitName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveOutfit()} />
                    <button className="btn-primary flex-shrink-0 flex items-center gap-1 text-sm px-4"
                      onClick={saveOutfit} disabled={!outfitName.trim()}>
                      <Check size={13} /> Save
                    </button>
                  </div>
                  <input className="input-fairy text-sm" placeholder="Notes (occasion, season…)"
                    value={outfitNotes} onChange={e => setOutfitNotes(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Saved outfits */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-3">
              {[1,2].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}
            </div>
          ) : outfits.length === 0 ? (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">✨</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>No outfits saved yet</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
                {items.length === 0
                  ? "Add items to your closet first, then build outfits."
                  : "Select pieces from your closet to save outfit combinations."}
              </p>
              {items.length > 0 && <button className="btn-primary" onClick={openBuilder}>Build first outfit ✦</button>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} onDelete={deleteOutfit} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────── MAKEUP ─────────────────────────────── */}
      {tab === "makeup" && (
        <div className="space-y-4">
          {showMakeupForm && (
            <MakeupForm
              isEdit={!!editMakeup}
              name={fMName} setName={setFMName}
              occasion={fMOcc} setOccasion={setFMOcc}
              photoUrl={fMPhoto} setPhotoUrl={setFMPhoto}
              products={fMProds} setProducts={setFMProds}
              notes={fMNotes} setNotes={setFMNotes}
              uploading={mUploading} fileRef={makeupFileRef}
              onUpload={(file) => uploadPhoto(file, true)}
              onSave={saveMakeup}
              onDelete={editMakeup ? () => { deleteMakeup(editMakeup.id); setShowMakeupForm(false); } : undefined}
              onCancel={() => { setShowMakeupForm(false); setEditMakeup(null); }}
            />
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ aspectRatio: "3/4", background: "var(--cream-dark)" }} />
              ))}
            </div>
          ) : makeupLooks.length === 0 ? (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">💄</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>No makeup looks yet</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>Document your favourite looks with photos and product lists.</p>
              <button className="btn-primary" onClick={openAddMakeup}>Add first look ✦</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {makeupLooks.map((look) => (
                <MakeupCard key={look.id} look={look} onEdit={openEditMakeup} onDelete={deleteMakeup} />
              ))}
              <button onClick={openAddMakeup}
                className="rounded-2xl flex flex-col items-center justify-center gap-2"
                style={{ aspectRatio: "3/4", background: "rgba(250,246,240,0.8)", border: "2px dashed rgba(200,184,224,0.4)", color: "var(--text-soft)" }}>
                <Plus size={22} /><span className="text-xs">Add look</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── closet item card ───────────────────────────────────────────────────────────
function ClosetItemCard({ item, onEdit, onDelete }: {
  item: WardrobeItem;
  onEdit: (i: WardrobeItem) => void;
  onDelete: (id: number) => void;
}) {
  const meta = CAT_META[item.category];
  return (
    <div className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: "1", background: meta?.bg ?? "rgba(240,234,228,0.8)", border: "1.5px solid rgba(200,184,224,0.2)" }}
      onClick={() => onEdit(item)}>
      {item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">{meta?.emoji ?? "✨"}</span></div>
      )}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--sage)" }}><Pencil size={10} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)", color: "#b06070" }}><X size={10} /></button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(4px)" }}>
        <p className="text-xs font-medium truncate" style={{ color: "var(--text-dark)" }}>{item.name}</p>
        {(item.brand || item.color) && (
          <p className="truncate" style={{ color: "var(--text-soft)", fontSize: "10px" }}>
            {[item.brand, item.color].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── outfit card ────────────────────────────────────────────────────────────────
function OutfitCard({ outfit, onDelete }: { outfit: Outfit; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const preview = outfit.items.slice(0, 4);
  const extra   = outfit.items.length - 4;

  return (
    <div className="card px-4 py-4 group cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>{outfit.name}</h3>
          <p className="text-xs" style={{ color: "var(--text-soft)" }}>
            {outfit.items.length} piece{outfit.items.length !== 1 ? "s" : ""} · tap to {expanded ? "collapse" : "expand"}
          </p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(outfit.id); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ background: "var(--rose-pale)", color: "#b06070" }}><X size={11} /></button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {preview.map((item) => {
          const meta = CAT_META[item.category];
          return (
            <div key={item.id} className="rounded-lg overflow-hidden"
              style={{ aspectRatio: "1", background: meta?.bg ?? "rgba(240,234,228,0.8)" }}>
              {item.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-base">{meta?.emoji ?? "✨"}</div>
              }
            </div>
          );
        })}
        {extra > 0 && (
          <div className="rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ aspectRatio: "1", background: "var(--sage-pale)", color: "var(--sage)" }}>+{extra}</div>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(200,184,224,0.2)" }}
          onClick={(e) => e.stopPropagation()}>
          {outfit.items.map((item) => {
            const meta = CAT_META[item.category];
            return (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-sm">{meta?.emoji ?? "✨"}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-dark)" }}>{item.name}</span>
                {item.brand && <span className="text-xs" style={{ color: "var(--text-soft)" }}>· {item.brand}</span>}
                {item.color && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.color}</span>}
              </div>
            );
          })}
          {outfit.notes && <p className="text-xs italic mt-2" style={{ color: "var(--text-soft)" }}>{outfit.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ── makeup card ────────────────────────────────────────────────────────────────
function MakeupCard({ look, onEdit, onDelete }: {
  look: MakeupLook;
  onEdit: (l: MakeupLook) => void;
  onDelete: (id: number) => void;
}) {
  const occ = OCC_META[look.occasion] ?? { emoji: "✨", color: "var(--gold)" };
  return (
    <div className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: "3/4", background: "var(--rose-pale)", border: "1.5px solid rgba(232,180,184,0.3)" }}
      onClick={() => onEdit(look)}>
      {look.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={look.photo_url} alt={look.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">💄</span></div>
      )}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(look); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--sage)" }}><Pencil size={10} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(look.id); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)", color: "#b06070" }}><X size={10} /></button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0.7))" }}>
        <p className="text-xs font-medium truncate mb-0.5" style={{ color: "var(--text-dark)" }}>{look.name}</p>
        <span className="text-xs" style={{ color: occ.color }}>{occ.emoji} {look.occasion}</span>
      </div>
    </div>
  );
}

// ── item form ──────────────────────────────────────────────────────────────────
function ItemForm({ isEdit, name, setName, category, setCategory, brand, setBrand,
  color, setColor, photoUrl, setPhotoUrl, notes, setNotes,
  uploading, fileRef, onUpload, onSave, onDelete, onCancel }: {
  isEdit: boolean;
  name: string; setName: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  brand: string; setBrand: (v: string) => void;
  color: string; setColor: (v: string) => void;
  photoUrl: string; setPhotoUrl: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onSave: () => void; onDelete?: () => void; onCancel: () => void;
}) {
  return (
    <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(200,184,224,0.4)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          {isEdit ? "Edit item" : "Add to closet ✦"}
        </h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: "var(--cream-dark)", border: "1.5px dashed rgba(200,184,224,0.4)" }}>
          {photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photoUrl} alt="preview" className="w-full h-full object-cover" />
            : <Shirt size={24} style={{ color: "var(--text-soft)" }} />
          }
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
          <button className="btn-primary text-xs px-3 py-1.5 mb-1 block"
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {photoUrl && <button className="text-xs block" style={{ color: "var(--text-soft)" }} onClick={() => setPhotoUrl("")}>Remove</button>}
          <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>Requires Vercel Blob</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Item name *</label>
          <input autoFocus className="input-fairy" placeholder="e.g. White linen shirt"
            value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && onSave()} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Category</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => {
              const meta = CAT_META[c];
              return (
                <button key={c} onClick={() => setCategory(c)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: category === c ? meta.bg    : "rgba(250,246,240,0.8)",
                    color:      category === c ? meta.color : "var(--text-soft)",
                    border: `1.5px solid ${category === c ? meta.color + "50" : "rgba(200,184,224,0.2)"}`,
                  }}>
                  {meta.emoji} {c}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Brand</label>
          <input className="input-fairy" placeholder="e.g. Zara, ASOS, Vintage"
            value={brand} onChange={e => setBrand(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Colour</label>
          <input className="input-fairy" placeholder="e.g. Dusty pink, Navy, Cream"
            value={color} onChange={e => setColor(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
          <textarea className="input-fairy resize-none" rows={2} placeholder="Size, when to wear, styling tips…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1" onClick={onSave}>
          <Check size={14} className="inline mr-1" />{isEdit ? "Save changes" : "Add to closet ✦"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}>
            <X size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── makeup form ────────────────────────────────────────────────────────────────
function MakeupForm({ isEdit, name, setName, occasion, setOccasion, photoUrl, setPhotoUrl,
  products, setProducts, notes, setNotes, uploading, fileRef, onUpload,
  onSave, onDelete, onCancel }: {
  isEdit: boolean;
  name: string; setName: (v: string) => void;
  occasion: string; setOccasion: (v: string) => void;
  photoUrl: string; setPhotoUrl: (v: string) => void;
  products: string; setProducts: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onSave: () => void; onDelete?: () => void; onCancel: () => void;
}) {
  return (
    <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(232,180,184,0.4)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          {isEdit ? "Edit look" : "Add makeup look ✦"}
        </h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}><X size={14} /></button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="w-16 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: "var(--rose-pale)", border: "1.5px dashed rgba(232,180,184,0.4)" }}>
          {photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photoUrl} alt="preview" className="w-full h-full object-cover" />
            : <span className="text-2xl">💄</span>
          }
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
          <button className="btn-primary text-xs px-3 py-1.5 mb-1 block"
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {photoUrl && <button className="text-xs block" style={{ color: "var(--text-soft)" }} onClick={() => setPhotoUrl("")}>Remove</button>}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Look name *</label>
          <input autoFocus className="input-fairy" placeholder="e.g. Glazed donut skin, Smoky eye"
            value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && onSave()} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Occasion</label>
          <div className="flex gap-1.5 flex-wrap">
            {OCCASIONS.map(o => {
              const meta = OCC_META[o];
              return (
                <button key={o} onClick={() => setOccasion(o)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: occasion === o ? "var(--rose-pale)" : "rgba(250,246,240,0.8)",
                    color:      occasion === o ? meta.color : "var(--text-soft)",
                    border: `1.5px solid ${occasion === o ? meta.color + "50" : "rgba(200,184,224,0.2)"}`,
                    transform: occasion === o ? "scale(1.05)" : "scale(1)",
                  }}>
                  {meta.emoji} {o}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Products used</label>
          <textarea className="input-fairy resize-none" rows={2}
            placeholder="Foundation, blush, lip liner… paste your product list"
            value={products} onChange={e => setProducts(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes / technique</label>
          <textarea className="input-fairy resize-none" rows={2}
            placeholder="Techniques, skin prep, tips to recreate…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1" onClick={onSave}>
          <Check size={14} className="inline mr-1" />{isEdit ? "Save changes" : "Save look ✦"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}>
            <X size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
