"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Pencil, Trash2, Check, ImageIcon, Upload, ChevronDown, ChevronUp } from "lucide-react";

// ── types ──────────────────────────────────────────────────────────────────────
type InspirationItem = { id: number; image_url: string; label: string | null; notes: string | null };
type Product = { id: number; name: string; description: string | null; materials: string | null; cost_price: number | null; sell_price: number | null };
type ResearchNote = { id: number; title: string; body: string | null; updated_at: string };
type ChecklistItem = { id: number; item: string; is_done: boolean; sort_order: number };
type Stats = { inspirationCount: number; productCount: number; noteCount: number; checklistDone: number; checklistTotal: number };
type Tab = "inspiration" | "products" | "notes" | "checklist";

// ── helpers ───────────────────────────────────────────────────────────────────
function imgSrc(url: string) {
  return `/api/vinted/photo?url=${encodeURIComponent(url)}`;
}

function profitInfo(cost: number | null, sell: number | null) {
  if (!cost || !sell || sell <= 0) return null;
  const pct = ((sell - cost) / sell) * 100;
  const profit = sell - cost;
  if (pct >= 50) return { pct, profit, label: "Great", color: "var(--sage)",    bg: "var(--sage-pale)" };
  if (pct >= 30) return { pct, profit, label: "Decent", color: "var(--gold)",   bg: "rgba(253,248,232,0.9)" };
  if (pct > 0)   return { pct, profit, label: "Thin",   color: "#c08040",       bg: "var(--cream-dark)" };
  return         { pct, profit, label: "Loss",  color: "#b06070",       bg: "var(--rose-pale)" };
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function JewelleryPage() {
  const [inspiration, setInspiration] = useState<InspirationItem[]>([]);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [notes,       setNotes]       = useState<ResearchNote[]>([]);
  const [checklist,   setChecklist]   = useState<ChecklistItem[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>("inspiration");

  // Inspiration form
  const [showInsForm, setShowInsForm]   = useState(false);
  const [insUrl,      setInsUrl]        = useState("");
  const [insLabel,    setInsLabel]      = useState("");
  const [insNotes,    setInsNotes]      = useState("");
  const [insUploading, setInsUploading] = useState(false);
  const [insUploadErr, setInsUploadErr] = useState<string | null>(null);
  const [editInsId,   setEditInsId]     = useState<number | null>(null);
  const [editInsLabel, setEditInsLabel] = useState("");
  const [editInsNotes, setEditInsNotes] = useState("");
  const insFileRef = useRef<HTMLInputElement>(null);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct,     setEditProduct]     = useState<Product | null>(null);
  const [pName,  setPName]  = useState("");
  const [pDesc,  setPDesc]  = useState("");
  const [pMats,  setPMats]  = useState("");
  const [pCost,  setPCost]  = useState("");
  const [pSell,  setPSell]  = useState("");

  // Note form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editNote,     setEditNote]     = useState<ResearchNote | null>(null);
  const [nTitle, setNTitle] = useState("");
  const [nBody,  setNBody]  = useState("");
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  // Checklist
  const [newItem, setNewItem] = useState("");

  // ── data fetching ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/jewellery", { cache: "no-store" });
      const data = await res.json();
      setInspiration(data.inspiration ?? []);
      setProducts(data.products       ?? []);
      setNotes(data.notes             ?? []);
      setChecklist(data.checklist     ?? []);
      setStats(data.stats             ?? null);
    } catch { /* silent — loading state handles UX */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/jewellery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  // ── inspiration ───────────────────────────────────────────────────────────────
  const uploadInsPhoto = async (file: File) => {
    setInsUploading(true); setInsUploadErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/jewellery/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setInsUrl(data.url);
      else setInsUploadErr(data.error || "Upload failed");
    } catch { setInsUploadErr("Upload failed"); }
    setInsUploading(false);
  };

  const saveInspiration = async () => {
    if (!insUrl) return;
    await post({ action: "add-inspiration", image_url: insUrl, label: insLabel.trim() || null, notes: insNotes.trim() || null });
    setInsUrl(""); setInsLabel(""); setInsNotes(""); setShowInsForm(false);
    fetchData();
  };

  const saveInsEdit = async (id: number) => {
    await post({ action: "update-inspiration", id, label: editInsLabel.trim() || null, notes: editInsNotes.trim() || null });
    setEditInsId(null);
    setInspiration(prev => prev.map(i => i.id === id ? { ...i, label: editInsLabel.trim() || null, notes: editInsNotes.trim() || null } : i));
  };

  const deleteInspiration = async (id: number) => {
    setInspiration(prev => prev.filter(i => i.id !== id));
    await post({ action: "delete-inspiration", id });
  };

  // ── products ──────────────────────────────────────────────────────────────────
  const openAddProduct = () => {
    setEditProduct(null); setPName(""); setPDesc(""); setPMats(""); setPCost(""); setPSell("");
    setShowProductForm(true);
  };
  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    setPName(p.name); setPDesc(p.description ?? ""); setPMats(p.materials ?? "");
    setPCost(p.cost_price != null ? String(p.cost_price) : "");
    setPSell(p.sell_price != null ? String(p.sell_price) : "");
    setShowProductForm(true);
  };
  const saveProduct = async () => {
    if (!pName.trim()) return;
    const payload = {
      name: pName.trim(), description: pDesc.trim() || null, materials: pMats.trim() || null,
      cost_price: pCost ? parseFloat(pCost) : null,
      sell_price: pSell ? parseFloat(pSell) : null,
    };
    const res  = await post({ action: editProduct ? "update-product" : "add-product", id: editProduct?.id, ...payload });
    const data = await res.json();
    if (data.product) {
      if (editProduct) setProducts(prev => prev.map(p => p.id === editProduct.id ? data.product : p));
      else setProducts(prev => [data.product, ...prev]);
    }
    setShowProductForm(false); setEditProduct(null);
    fetchData();
  };
  const deleteProduct = async (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await post({ action: "delete-product", id });
  };

  // ── notes ─────────────────────────────────────────────────────────────────────
  const openAddNote = () => {
    setEditNote(null); setNTitle(""); setNBody("");
    setShowNoteForm(true);
  };
  const openEditNote = (n: ResearchNote) => {
    setEditNote(n); setNTitle(n.title); setNBody(n.body ?? "");
    setShowNoteForm(true); setExpandedNoteId(null);
  };
  const saveNote = async () => {
    if (!nTitle.trim()) return;
    const res  = await post({ action: editNote ? "update-note" : "add-note", id: editNote?.id, title: nTitle.trim(), body: nBody.trim() || null });
    const data = await res.json();
    if (data.note) {
      if (editNote) setNotes(prev => prev.map(n => n.id === editNote.id ? data.note : n));
      else setNotes(prev => [data.note, ...prev]);
    }
    setShowNoteForm(false); setEditNote(null);
  };
  const deleteNote = async (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await post({ action: "delete-note", id });
  };

  // ── checklist ─────────────────────────────────────────────────────────────────
  const toggleItem = async (item: ChecklistItem) => {
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, is_done: !c.is_done } : c));
    await post({ action: "toggle-item", id: item.id });
    fetchData();
  };
  const addItem = async () => {
    if (!newItem.trim()) return;
    const res  = await post({ action: "add-item", item: newItem.trim() });
    const data = await res.json();
    if (data.item) setChecklist(prev => [...prev, data.item]);
    setNewItem("");
  };
  const deleteItem = async (id: number) => {
    setChecklist(prev => prev.filter(c => c.id !== id));
    await post({ action: "delete-item", id });
  };

  // ── derived ───────────────────────────────────────────────────────────────────
  const livePct   = checklist.length ? Math.round(checklist.filter(c => c.is_done).length / checklist.length * 100) : 0;
  const liveProfit = profitInfo(pCost ? parseFloat(pCost) : null, pSell ? parseFloat(pSell) : null);

  return (
    <div className="space-y-5 py-2">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(245,213,216,0.65) 45%, rgba(237,232,245,0.85) 100%)",
      }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Research & Development</span>
            <h1 className="font-display font-black italic text-3xl md:text-4xl mt-0.5" style={{ color: "var(--text-dark)" }}>
              💎 Jewellery Studio
            </h1>
          </div>
          <span className="text-4xl float select-none">🪩</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Inspo images",   value: loading ? "—" : stats?.inspirationCount ?? 0,  color: "var(--rose)",    tab: "inspiration" as Tab },
            { label: "Product ideas",  value: loading ? "—" : stats?.productCount ?? 0,       color: "var(--gold)",    tab: "products"    as Tab },
            { label: "Research notes", value: loading ? "—" : stats?.noteCount ?? 0,          color: "var(--sage)",    tab: "notes"       as Tab },
            { label: "Launch tasks",   value: loading ? "—" : `${stats?.checklistDone ?? 0}/${stats?.checklistTotal ?? 0}`, color: "var(--lavender)", tab: "checklist" as Tab },
          ].map(s => (
            <button key={s.label} onClick={() => setTab(s.tab)}
              className="rounded-2xl px-3 py-2.5 text-center transition-transform hover:scale-[1.02]"
              style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { key: "inspiration", label: "Inspiration",  emoji: "🌸", color: "var(--rose)",    bg: "var(--rose-pale)"    },
          { key: "products",    label: "Product Ideas", emoji: "💍", color: "var(--gold)",    bg: "rgba(253,248,232,1)" },
          { key: "notes",       label: "Research",      emoji: "📋", color: "var(--sage)",    bg: "var(--sage-pale)"    },
          { key: "checklist",   label: "Checklist",     emoji: "✅", color: "var(--lavender)", bg: "var(--lavender-pale)" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? t.bg : "rgba(250,246,240,0.8)",
              color: tab === t.key ? t.color : "var(--text-soft)",
              border: `1.5px solid ${tab === t.key ? t.color + "50" : "rgba(200,184,224,0.2)"}`,
            }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1 — INSPIRATION MOOD BOARD
      ════════════════════════════════════════════════════════════════════ */}
      {tab === "inspiration" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
              Mood Board · {inspiration.length} image{inspiration.length !== 1 ? "s" : ""}
            </p>
            <button onClick={() => { setShowInsForm(true); setInsUrl(""); setInsLabel(""); setInsNotes(""); setInsUploadErr(null); }}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add image
            </button>
          </div>

          {/* Add form */}
          {showInsForm && (
            <div className="card px-5 py-4 space-y-3" style={{ border: "1.5px solid rgba(232,180,184,0.35)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Add to mood board</h3>
                <button onClick={() => setShowInsForm(false)}><X size={16} style={{ color: "var(--text-soft)" }} /></button>
              </div>

              {insUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(insUrl)} alt="preview" className="rounded-xl object-cover shrink-0"
                    style={{ width: 80, height: 80, border: "2px solid var(--rose-pale)" }} />
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => insFileRef.current?.click()}
                      className="text-sm px-3 py-1 rounded-xl flex items-center gap-1.5 font-medium"
                      style={{ background: "var(--rose-pale)", color: "#b06070" }}>
                      <Upload size={12} /> Replace
                    </button>
                    <button onClick={() => setInsUrl("")} className="text-xs" style={{ color: "var(--text-soft)" }}>Remove</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => insFileRef.current?.click()} disabled={insUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-medium"
                  style={{ borderColor: "var(--rose)", color: "var(--text-mid)", background: "var(--rose-pale)", padding: "16px" }}>
                  {insUploading
                    ? <span className="animate-pulse">Uploading…</span>
                    : <><ImageIcon size={15} style={{ color: "var(--rose)" }} /> Upload a photo</>}
                </button>
              )}
              <input ref={insFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadInsPhoto(e.target.files[0])} />
              {insUploadErr && <p className="text-xs" style={{ color: "var(--rose)" }}>{insUploadErr}</p>}

              <input value={insLabel} onChange={e => setInsLabel(e.target.value)}
                className="input-fairy w-full text-sm" placeholder="Label (e.g. Minimalist rings, 70s vibe…)" />
              <textarea value={insNotes} onChange={e => setInsNotes(e.target.value)}
                className="input-fairy w-full text-sm" rows={2}
                placeholder="Notes — what do you love about this? How could you recreate it?" style={{ resize: "vertical" }} />

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowInsForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
                <button onClick={saveInspiration} disabled={!insUrl}
                  className="btn-primary text-sm px-4" style={{ opacity: insUrl ? 1 : 0.5 }}>
                  Save to board
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="rounded-2xl animate-pulse aspect-[4/3]" style={{ background: "var(--cream-dark)" }} />)}
            </div>
          ) : inspiration.length === 0 ? (
            <div className="card px-5 py-12 text-center">
              <p className="text-3xl mb-2">🌸</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>Your mood board is empty</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Save images that inspire your jewellery aesthetic</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {inspiration.map(item => (
                <div key={item.id} className="rounded-2xl overflow-hidden group relative"
                  style={{ background: "var(--cream-dark)", border: "1px solid rgba(200,184,224,0.2)" }}>
                  {/* Image */}
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc(item.image_url)} alt={item.label || "Inspiration"}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {/* Hover actions */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditInsId(item.id); setEditInsLabel(item.label ?? ""); setEditInsNotes(item.notes ?? ""); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.9)", color: "var(--sage)" }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteInspiration(item.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.9)", color: "#b06070" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Label / edit */}
                  {editInsId === item.id ? (
                    <div className="p-2.5 space-y-2">
                      <input value={editInsLabel} onChange={e => setEditInsLabel(e.target.value)}
                        className="input-fairy w-full text-xs py-1.5" placeholder="Label…" autoFocus />
                      <textarea value={editInsNotes} onChange={e => setEditInsNotes(e.target.value)}
                        className="input-fairy w-full text-xs py-1.5" rows={2} placeholder="Notes…" style={{ resize: "vertical" }} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditInsId(null)} className="text-xs" style={{ color: "var(--text-soft)" }}>Cancel</button>
                        <button onClick={() => saveInsEdit(item.id)}
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>Save</button>
                      </div>
                    </div>
                  ) : (item.label || item.notes) ? (
                    <div className="px-3 py-2.5">
                      {item.label && <p className="text-xs font-semibold truncate" style={{ color: "var(--text-dark)" }}>{item.label}</p>}
                      {item.notes && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-soft)" }}>{item.notes}</p>}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2 — PRODUCT IDEAS
      ════════════════════════════════════════════════════════════════════ */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
              Product Ideas · {products.length}
            </p>
            <button onClick={openAddProduct}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add idea
            </button>
          </div>

          {/* Product form */}
          {showProductForm && (
            <div className="card px-5 py-5 space-y-4" style={{ border: "1.5px solid rgba(212,168,83,0.4)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
                  {editProduct ? "Edit product idea" : "New product idea ✦"}
                </h3>
                <button onClick={() => { setShowProductForm(false); setEditProduct(null); }}>
                  <X size={16} style={{ color: "var(--text-soft)" }} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Product name *</label>
                  <input value={pName} onChange={e => setPName(e.target.value)}
                    className="input-fairy w-full font-semibold" placeholder="e.g. Gold Hoop Earrings" autoFocus />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Description</label>
                  <textarea value={pDesc} onChange={e => setPDesc(e.target.value)}
                    className="input-fairy w-full text-sm" rows={2}
                    placeholder="Describe the product, style, target customer…" style={{ resize: "vertical" }} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Materials needed</label>
                  <input value={pMats} onChange={e => setPMats(e.target.value)}
                    className="input-fairy w-full text-sm" placeholder="e.g. 14k gold-filled wire, cultured pearls, jump rings" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Cost price (£)</label>
                  <input value={pCost} onChange={e => setPCost(e.target.value)}
                    type="number" min="0" step="0.01" className="input-fairy w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Sell price (£)</label>
                  <input value={pSell} onChange={e => setPSell(e.target.value)}
                    type="number" min="0" step="0.01" className="input-fairy w-full" placeholder="0.00" />
                </div>
              </div>

              {/* Live margin preview */}
              {liveProfit && (
                <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{ background: liveProfit.bg, border: `1px solid ${liveProfit.color}30` }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: liveProfit.color }}>{liveProfit.label} margin</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                      Profit per unit: <span className="font-semibold" style={{ color: liveProfit.color }}>£{liveProfit.profit.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="text-2xl font-display font-bold italic" style={{ color: liveProfit.color }}>
                    {liveProfit.pct.toFixed(0)}%
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={saveProduct} className="btn-primary flex-1">
                  <Check size={14} className="inline mr-1" />
                  {editProduct ? "Save changes" : "Add product idea ✦"}
                </button>
                {editProduct && (
                  <button onClick={() => { deleteProduct(editProduct.id); setShowProductForm(false); setEditProduct(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                    style={{ background: "var(--rose-pale)", color: "#b06070" }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Product list */}
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : products.length === 0 && !showProductForm ? (
            <div className="card px-5 py-12 text-center">
              <p className="text-3xl mb-2">💍</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No product ideas yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Add ideas, calculate margins, and build your range</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => {
                const info = profitInfo(p.cost_price, p.sell_price);
                return (
                  <div key={p.id} className="card px-5 py-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{p.name}</p>
                          {info && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}30` }}>
                              {info.pct.toFixed(0)}% margin
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-sm mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-soft)" }}>{p.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {p.materials && (
                            <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                              🪡 {p.materials}
                            </span>
                          )}
                          {(p.cost_price != null || p.sell_price != null) && (
                            <span className="text-xs font-medium" style={{ color: "var(--text-mid)" }}>
                              {p.cost_price != null ? `Cost £${Number(p.cost_price).toFixed(2)}` : ""}
                              {p.cost_price != null && p.sell_price != null ? " · " : ""}
                              {p.sell_price != null ? `Sell £${Number(p.sell_price).toFixed(2)}` : ""}
                              {info ? ` · Profit £${info.profit.toFixed(2)}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEditProduct(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}>
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3 — RESEARCH NOTES
      ════════════════════════════════════════════════════════════════════ */}
      {tab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
              Research Notes · {notes.length}
            </p>
            <button onClick={openAddNote}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add note
            </button>
          </div>

          {/* Note form */}
          {showNoteForm && (
            <div className="card px-5 py-5 space-y-3" style={{ border: "1.5px solid rgba(143,173,160,0.4)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
                  {editNote ? "Edit note" : "New research note ✦"}
                </h3>
                <button onClick={() => { setShowNoteForm(false); setEditNote(null); }}>
                  <X size={16} style={{ color: "var(--text-soft)" }} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Title *</label>
                <input value={nTitle} onChange={e => setNTitle(e.target.value)}
                  className="input-fairy w-full font-semibold" placeholder="e.g. Etsy supplier research, Competitor prices…" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
                <textarea value={nBody} onChange={e => setNBody(e.target.value)}
                  className="input-fairy w-full text-sm leading-relaxed" rows={8}
                  placeholder="Write your research, links, findings, thoughts…" style={{ resize: "vertical" }} />
              </div>
              <div className="flex gap-3">
                <button onClick={saveNote} className="btn-primary flex-1">
                  <Check size={14} className="inline mr-1" />
                  {editNote ? "Save changes" : "Save note ✦"}
                </button>
                {editNote && (
                  <button onClick={() => { deleteNote(editNote.id); setShowNoteForm(false); setEditNote(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                    style={{ background: "var(--rose-pale)", color: "#b06070" }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Note list */}
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : notes.length === 0 && !showNoteForm ? (
            <div className="card px-5 py-12 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No research notes yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Log supplier links, competitor prices, platform research</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => {
                const expanded = expandedNoteId === note.id;
                return (
                  <div key={note.id} className="card px-5 py-4 group">
                    <div className="flex items-start justify-between gap-2">
                      <button className="flex-1 text-left min-w-0"
                        onClick={() => setExpandedNoteId(expanded ? null : note.id)}>
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{note.title}</p>
                        {!expanded && note.body && (
                          <p className="text-sm mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-soft)" }}>{note.body}</p>
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditNote(note)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setExpandedNoteId(expanded ? null : note.id)}
                          className="p-1.5" style={{ color: "var(--text-soft)" }}>
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                    {expanded && note.body && (
                      <div className="mt-3 pt-3 text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: "var(--text-mid)", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        {note.body}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4 — LAUNCH CHECKLIST
      ════════════════════════════════════════════════════════════════════ */}
      {tab === "checklist" && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="card px-5 py-4" style={{ background: "linear-gradient(135deg, rgba(237,232,245,0.8) 0%, rgba(222,238,232,0.6) 100%)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text-dark)" }}>Launch progress</p>
              <p className="font-display font-bold italic text-xl" style={{ color: "var(--lavender)" }}>
                {livePct}%
              </p>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${livePct}%` }} />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
              {checklist.filter(c => c.is_done).length} of {checklist.length} tasks complete
            </p>
          </div>

          {/* Items */}
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : (
            <div className="space-y-2">
              {checklist.map(item => (
                <div key={item.id} className="card flex items-center gap-3 px-4 py-3.5 group transition-all"
                  style={{ opacity: item.is_done ? 0.65 : 1 }}>
                  <button
                    onClick={() => toggleItem(item)}
                    className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: item.is_done ? "var(--lavender)" : "rgba(200,184,224,0.5)",
                      background: item.is_done ? "var(--lavender)" : "transparent",
                    }}>
                    {item.is_done && <Check size={11} color="white" strokeWidth={3} />}
                  </button>
                  <p className="flex-1 text-sm" style={{
                    color: item.is_done ? "var(--text-soft)" : "var(--text-dark)",
                    textDecoration: item.is_done ? "line-through" : "none",
                  }}>
                    {item.item}
                  </p>
                  <button onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0">
                    <X size={14} style={{ color: "var(--text-soft)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new item */}
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
              className="input-fairy flex-1 text-sm"
              placeholder="Add a launch task…"
            />
            <button
              onClick={addItem}
              disabled={!newItem.trim()}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-1"
              style={{ opacity: newItem.trim() ? 1 : 0.5 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
