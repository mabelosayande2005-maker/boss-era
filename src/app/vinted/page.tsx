"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Plus, X, Check, Pencil, ShoppingBag, TrendingUp, Package, Star } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";

// ── types ──────────────────────────────────────────────────────────────────────
type VintedItem = {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  purchase_price: string;
  listing_price: string | null;
  sale_price: string | null;
  date_purchased: string | null;
  date_listed: string | null;
  date_sold: string | null;
  status: "sourced" | "listed" | "sold" | "unlisted";
  photo_url: string | null;
  notes: string | null;
};

type WishlistItem = {
  id: number;
  item_name: string;
  brand: string | null;
  max_price: string | null;
  notes: string | null;
  found: boolean;
};

type Stats = {
  totalProfit: number;
  totalRevenue: number;
  totalInvested: number;
  potentialProfit: number;
  soldCount: number;
  listedCount: number;
  sourcedCount: number;
};

type Tab = "inventory" | "sold" | "wishlist";

// ── constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Tops", "Bottoms", "Dresses", "Coats & Jackets",
  "Shoes", "Bags", "Accessories", "Sportswear", "Other",
] as const;

const STATUS_META = {
  sourced:  { label: "Sourced",   color: "#9b8c8c", bg: "rgba(250,246,240,0.9)", emoji: "📦" },
  listed:   { label: "Listed",    color: "#8fada0", bg: "var(--sage-pale)",       emoji: "🏷️" },
  sold:     { label: "Sold",      color: "#b06070", bg: "var(--rose-pale)",       emoji: "✅" },
  unlisted: { label: "Unlisted",  color: "#c8b8e0", bg: "var(--lavender-pale)",  emoji: "⏸️" },
} as const;

function gbp(val: string | number | null | undefined): string {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? "£0.00" : `£${n.toFixed(2)}`;
}

function profit(item: VintedItem): number {
  if (item.status === "sold" && item.sale_price) {
    return parseFloat(item.sale_price) - parseFloat(item.purchase_price);
  }
  if (item.listing_price) {
    return parseFloat(item.listing_price) - parseFloat(item.purchase_price);
  }
  return -parseFloat(item.purchase_price);
}

// ── item photo component ───────────────────────────────────────────────────────
function ItemPhoto({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-12 h-12" : size === "lg" ? "w-full h-40" : "w-16 h-16";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn(dim, "object-cover rounded-xl flex-shrink-0")}
      />
    );
  }
  return (
    <div
      className={cn(dim, "rounded-xl flex items-center justify-center flex-shrink-0")}
      style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}
    >
      <ShoppingBag size={size === "lg" ? 28 : 18} />
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function VintedPage() {
  const [items,    setItems]    = useState<VintedItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [tab,      setTab]      = useState<Tab>("inventory");
  const [loading,  setLoading]  = useState(true);

  // form
  const [showItemForm, setShowItemForm] = useState(false);
  const [showSoldForm, setShowSoldForm] = useState<number | null>(null);
  const [showWishForm, setShowWishForm] = useState(false);
  const [editItem, setEditItem]         = useState<VintedItem | null>(null);

  // item form fields
  const [fName,      setFName]      = useState("");
  const [fCategory,  setFCategory]  = useState("Other");
  const [fBrand,     setFBrand]     = useState("");
  const [fBuyPrice,  setFBuyPrice]  = useState("");
  const [fListPrice, setFListPrice] = useState("");
  const [fBuyDate,   setFBuyDate]   = useState("");
  const [fListDate,  setFListDate]  = useState("");
  const [fStatus,    setFStatus]    = useState<VintedItem["status"]>("sourced");
  const [fNotes,     setFNotes]     = useState("");
  const [fPhotoUrl,   setFPhotoUrl]   = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // sold form
  const [fSalePrice, setFSalePrice] = useState("");
  const [fSaleDate,  setFSaleDate]  = useState("");

  // wishlist form
  const [fWishName,  setFWishName]  = useState("");
  const [fWishBrand, setFWishBrand] = useState("");
  const [fWishPrice, setFWishPrice] = useState("");
  const [fWishNotes, setFWishNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/vinted");
      const data = await res.json();
      setItems(data.items    ?? []);
      setWishlist(data.wishlist ?? []);
      setStats(data.stats   ?? null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── photo upload ─────────────────────────────────────────────────────────────
  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await upload(
        `vinted/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "-")}`,
        file,
        { access: "public", handleUploadUrl: "/api/vinted/upload" }
      );
      setFPhotoUrl(blob.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── item form ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setFName(""); setFCategory("Other"); setFBrand("");
    setFBuyPrice(""); setFListPrice("");
    setFBuyDate(""); setFListDate("");
    setFStatus("sourced"); setFNotes(""); setFPhotoUrl(""); setUploadError(null);
    setShowItemForm(true);
  };

  const openEdit = (item: VintedItem) => {
    setEditItem(item);
    setFName(item.name);
    setFCategory(item.category);
    setFBrand(item.brand ?? "");
    setFBuyPrice(item.purchase_price);
    setFListPrice(item.listing_price ?? "");
    setFBuyDate(item.date_purchased?.split("T")[0] ?? "");
    setFListDate(item.date_listed?.split("T")[0] ?? "");
    setFStatus(item.status);
    setFNotes(item.notes ?? "");
    setFPhotoUrl(item.photo_url ?? ""); setUploadError(null);
    setShowItemForm(true);
  };

  const saveItem = async () => {
    if (!fName.trim()) return;
    const payload = {
      action:       editItem ? "update-item" : "add-item",
      id:           editItem?.id,
      name:         fName.trim(),
      category:     fCategory,
      brand:        fBrand.trim() || null,
      purchasePrice: parseFloat(fBuyPrice) || 0,
      listingPrice:  fListPrice ? parseFloat(fListPrice) : null,
      datePurchased: fBuyDate || null,
      dateListed:    fListDate || null,
      status:        fStatus,
      photoUrl:      fPhotoUrl || null,
      notes:         fNotes.trim() || null,
    };
    const res  = await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.item) {
      if (editItem) {
        setItems((p) => p.map((i) => i.id === editItem.id ? data.item : i));
      } else {
        setItems((p) => [data.item, ...p]);
      }
    }
    setShowItemForm(false);
    setEditItem(null);
    fetchData(); // refresh stats
  };

  const deleteItem = async (id: number) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-item", id }),
    });
    fetchData();
  };

  const markSold = async (id: number) => {
    if (!fSalePrice) return;
    const res  = await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark-sold", id,
        salePrice: parseFloat(fSalePrice),
        dateSold: fSaleDate || null,
      }),
    });
    const data = await res.json();
    if (data.item) setItems((p) => p.map((i) => i.id === id ? data.item : i));
    setShowSoldForm(null);
    setFSalePrice(""); setFSaleDate("");
    fetchData();
  };

  // ── wishlist ─────────────────────────────────────────────────────────────────
  const addWish = async () => {
    if (!fWishName.trim()) return;
    const res  = await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-wish",
        itemName: fWishName.trim(),
        brand:    fWishBrand.trim() || null,
        maxPrice: fWishPrice ? parseFloat(fWishPrice) : null,
        notes:    fWishNotes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.wish) setWishlist((p) => [data.wish, ...p]);
    setFWishName(""); setFWishBrand(""); setFWishPrice(""); setFWishNotes("");
    setShowWishForm(false);
  };

  const toggleFound = async (id: number) => {
    setWishlist((p) => p.map((w) => w.id === id ? { ...w, found: !w.found } : w));
    await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-found", id }),
    });
  };

  const deleteWish = async (id: number) => {
    setWishlist((p) => p.filter((w) => w.id !== id));
    await fetch("/api/vinted", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-wish", id }),
    });
  };

  // ── derived ───────────────────────────────────────────────────────────────────
  const activeItems = items.filter((i) => i.status !== "sold");
  const soldItems   = items.filter((i) => i.status === "sold");

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 py-2">

      {/* Hero profit dashboard */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(253,248,236,0.95) 0%, rgba(240,208,128,0.2) 40%, rgba(222,238,232,0.8) 100%)",
      }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
                Vinted Business
              </span>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              🛍️ My Shop
            </h1>
          </div>
          <button className="btn-primary flex items-center gap-1.5" onClick={openAdd}>
            <Plus size={14} /> List item
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total profit",
              value: gbp(stats?.totalProfit),
              sub: `from ${stats?.soldCount ?? 0} sold`,
              color: "var(--gold)",
              icon: <TrendingUp size={16} />,
            },
            {
              label: "Potential profit",
              value: gbp(stats?.potentialProfit),
              sub: `${stats?.listedCount ?? 0} listed`,
              color: "var(--sage)",
              icon: <Star size={16} />,
            },
            {
              label: "Invested",
              value: gbp(stats?.totalInvested),
              sub: "in current stock",
              color: "var(--lavender)",
              icon: <Package size={16} />,
            },
            {
              label: "Revenue",
              value: gbp(stats?.totalRevenue),
              sub: "all-time sales",
              color: "var(--rose)",
              icon: <ShoppingBag size={16} />,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>{s.label}</span>
              </div>
              <div className="font-display font-bold italic text-2xl" style={{ color: s.color }}>
                {loading ? "—" : s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Status mini-row */}
        {!loading && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {(["sourced", "listed", "sold", "unlisted"] as const).map((s) => {
              const meta  = STATUS_META[s];
              const count = items.filter((i) => i.status === s).length;
              if (count === 0) return null;
              return (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
                  {meta.emoji} {count} {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5">
        {([
          { key: "inventory", label: "Inventory", count: activeItems.length, emoji: "🏷️" },
          { key: "sold",      label: "Sold",      count: soldItems.length,   emoji: "✅" },
          { key: "wishlist",  label: "Sourcing Wishlist", count: wishlist.filter(w => !w.found).length, emoji: "⭐" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("nav-item flex items-center gap-1.5 text-sm", tab === t.key && "active")}
          >
            <span>{t.emoji}</span>
            {t.label}
            {t.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: tab === t.key ? "rgba(255,255,255,0.5)" : "var(--cream-dark)",
                  color: tab === t.key ? "var(--sage)" : "var(--text-soft)",
                }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ───────────────────────────────────────────────────── */}
      {tab === "inventory" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
              ))}
            </div>
          ) : activeItems.length === 0 ? (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">🛍️</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                No items yet
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
                Add your first item to start tracking your Vinted business.
              </p>
              <button className="btn-primary" onClick={openAdd}>Add first item ✦</button>
            </div>
          ) : (
            activeItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={deleteItem}
                onMarkSold={() => { setShowSoldForm(item.id); setFSalePrice(""); setFSaleDate(""); }}
                soldFormOpen={showSoldForm === item.id}
                salePrice={fSalePrice}
                saleDate={fSaleDate}
                onSalePriceChange={setFSalePrice}
                onSaleDateChange={setFSaleDate}
                onConfirmSold={() => markSold(item.id)}
                onCancelSold={() => setShowSoldForm(null)}
              />
            ))
          )}
        </div>
      )}

      {/* ── SOLD TAB ────────────────────────────────────────────────────────── */}
      {tab === "sold" && (
        <div className="space-y-3">
          {soldItems.length === 0 ? (
            <div className="card px-5 py-8 text-center">
              <div className="text-3xl mb-3">✅</div>
              <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                No sales yet
              </p>
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                When you mark an item as sold it will appear here.
              </p>
            </div>
          ) : (
            soldItems.map((item) => <SoldCard key={item.id} item={item} onDelete={deleteItem} />)
          )}
        </div>
      )}

      {/* ── WISHLIST TAB ────────────────────────────────────────────────────── */}
      {tab === "wishlist" && (
        <div className="space-y-3">
          {/* Quick add */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
                ⭐ Fleek Haul Wishlist
              </h2>
              <button
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition-all"
                style={{ background: "var(--gold)", color: "white", border: "1px solid rgba(212,168,83,0.4)" }}
                onClick={() => setShowWishForm(!showWishForm)}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {showWishForm && (
              <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: "rgba(253,248,236,0.9)", border: "1px solid rgba(212,168,83,0.3)" }}>
                <input className="input-fairy text-sm" placeholder="Item name *" autoFocus
                  value={fWishName} onChange={e => setFWishName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWish()} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-fairy text-sm" placeholder="Brand (optional)"
                    value={fWishBrand} onChange={e => setFWishBrand(e.target.value)} />
                  <input className="input-fairy text-sm" placeholder="Max price £"
                    type="number" step="0.01"
                    value={fWishPrice} onChange={e => setFWishPrice(e.target.value)} />
                </div>
                <input className="input-fairy text-sm" placeholder="Notes (size, colour, condition…)"
                  value={fWishNotes} onChange={e => setFWishNotes(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-primary text-xs px-4 py-1.5" onClick={addWish}>Add to list</button>
                  <button className="text-xs px-3 py-1.5 rounded-full" style={{ color: "var(--text-soft)" }}
                    onClick={() => setShowWishForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {wishlist.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-soft)" }}>
                Add items you want to source at your next Fleek haul
              </p>
            ) : (
              <div className="space-y-2">
                {/* Not found first */}
                {wishlist.filter(w => !w.found).map(wish => (
                  <WishCard key={wish.id} wish={wish} onToggle={toggleFound} onDelete={deleteWish} />
                ))}
                {/* Found / sourced */}
                {wishlist.some(w => w.found) && (
                  <>
                    <div className="divider-fairy" />
                    <p className="text-xs font-medium px-1" style={{ color: "var(--text-soft)" }}>Sourced ✓</p>
                    {wishlist.filter(w => w.found).map(wish => (
                      <WishCard key={wish.id} wish={wish} onToggle={toggleFound} onDelete={deleteWish} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT ITEM FORM ─────────────────────────────────────────────── */}
      {showItemForm && (
        <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(212,168,83,0.35)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
              {editItem ? "Edit item" : "Add item ✦"}
            </h2>
            <button onClick={() => { setShowItemForm(false); setEditItem(null); }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}>
              <X size={14} />
            </button>
          </div>

          {/* Photo upload */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>
              Photo
            </label>
            <div className="flex items-center gap-3">
              {fPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fPhotoUrl} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--cream-dark)", color: "var(--text-soft)", border: "1.5px dashed rgba(200,184,224,0.4)" }}>
                  <ShoppingBag size={20} />
                </div>
              )}
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                <button className="btn-primary text-xs px-3 py-1.5 mb-1"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {fPhotoUrl && (
                  <button className="block text-xs" style={{ color: "var(--text-soft)" }}
                    onClick={() => setFPhotoUrl("")}>Remove</button>
                )}
                {uploadError && (
                  <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Item name *</label>
              <input autoFocus className="input-fairy" placeholder="e.g. Vintage Levi's denim jacket"
                value={fName} onChange={e => setFName(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Category</label>
              <select className="input-fairy" value={fCategory} onChange={e => setFCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Brand</label>
              <input className="input-fairy" placeholder="e.g. Levi's, Zara"
                value={fBrand} onChange={e => setFBrand(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Purchase price (£) *</label>
              <input type="number" step="0.01" className="input-fairy" placeholder="0.00"
                value={fBuyPrice} onChange={e => setFBuyPrice(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Listing price (£)</label>
              <input type="number" step="0.01" className="input-fairy" placeholder="0.00"
                value={fListPrice} onChange={e => setFListPrice(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Date purchased</label>
              <input type="date" className="input-fairy"
                value={fBuyDate} onChange={e => setFBuyDate(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Date listed</label>
              <input type="date" className="input-fairy"
                value={fListDate} onChange={e => setFListDate(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-soft)" }}>Status</label>
              <div className="flex gap-2 flex-wrap">
                {(["sourced", "listed", "unlisted"] as const).map(s => {
                  const meta = STATUS_META[s];
                  return (
                    <button key={s} onClick={() => setFStatus(s)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: fStatus === s ? meta.bg : "rgba(250,246,240,0.8)",
                        color: fStatus === s ? meta.color : "var(--text-soft)",
                        border: `1.5px solid ${fStatus === s ? meta.color + "60" : "rgba(200,184,224,0.2)"}`,
                        transform: fStatus === s ? "scale(1.05)" : "scale(1)",
                      }}>
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
              <textarea className="input-fairy resize-none" rows={2}
                placeholder="Condition, measurements, Vinted listing link…"
                value={fNotes} onChange={e => setFNotes(e.target.value)} />
            </div>
          </div>

          {/* Potential profit preview */}
          {fBuyPrice && fListPrice && (
            <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: "rgba(143,173,160,0.1)", border: "1px solid rgba(143,173,160,0.25)" }}>
              <TrendingUp size={16} style={{ color: "var(--sage)" }} />
              <span className="text-sm" style={{ color: "var(--text-mid)" }}>
                Potential profit:{" "}
                <strong style={{ color: "var(--sage)" }}>
                  £{(parseFloat(fListPrice) - parseFloat(fBuyPrice)).toFixed(2)}
                </strong>
                {" "}({Math.round(((parseFloat(fListPrice) - parseFloat(fBuyPrice)) / parseFloat(fBuyPrice)) * 100)}% margin)
              </span>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button className="btn-primary flex-1" onClick={saveItem}>
              <Check size={14} className="inline mr-1" />
              {editItem ? "Save changes" : "Add item ✦"}
            </button>
            {editItem && (
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                onClick={() => { deleteItem(editItem.id); setShowItemForm(false); setEditItem(null); }}>
                <X size={12} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── inventory card ─────────────────────────────────────────────────────────────
function InventoryCard({
  item, onEdit, onDelete, onMarkSold,
  soldFormOpen, salePrice, saleDate,
  onSalePriceChange, onSaleDateChange, onConfirmSold, onCancelSold,
}: {
  item: VintedItem;
  onEdit: (i: VintedItem) => void;
  onDelete: (id: number) => void;
  onMarkSold: () => void;
  soldFormOpen: boolean;
  salePrice: string;
  saleDate: string;
  onSalePriceChange: (v: string) => void;
  onSaleDateChange: (v: string) => void;
  onConfirmSold: () => void;
  onCancelSold: () => void;
}) {
  const meta           = STATUS_META[item.status];
  const potentialProfit = parseFloat(item.listing_price ?? "0") - parseFloat(item.purchase_price ?? "0");

  return (
    <div className="card overflow-hidden group">
      <div className="flex gap-3 px-4 py-3.5">
        <ItemPhoto url={item.photo_url} name={item.name} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--text-dark)" }}>{item.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.category}</span>
                {item.brand && <><span style={{ color: "var(--text-soft)" }}>·</span><span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.brand}</span></>}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
              {meta.emoji} {meta.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="text-xs" style={{ color: "var(--text-soft)" }}>
              Bought: <span className="font-medium" style={{ color: "var(--text-mid)" }}>{gbp(item.purchase_price)}</span>
            </div>
            {item.listing_price && (
              <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                Listed: <span className="font-medium" style={{ color: "var(--text-mid)" }}>{gbp(item.listing_price)}</span>
              </div>
            )}
            {item.listing_price && parseFloat(item.purchase_price) > 0 && (
              <div className="text-xs font-medium" style={{ color: potentialProfit > 0 ? "var(--sage)" : "#b06070" }}>
                {potentialProfit > 0 ? "+" : ""}{gbp(potentialProfit)} profit
              </div>
            )}
            {item.date_listed && (
              <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                Listed {format(parseISO(item.date_listed), "d MMM")}
              </div>
            )}
          </div>

          {item.notes && (
            <p className="text-xs mt-1.5 italic line-clamp-1" style={{ color: "var(--text-soft)" }}>{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
            <Pencil size={11} />
          </button>
          {item.status !== "sold" && (
            <button onClick={onMarkSold} className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--rose-pale)", color: "#b06070" }} title="Mark as sold">
              <Check size={11} />
            </button>
          )}
          <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--cream-dark)", color: "var(--text-soft)" }}>
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Inline sold form */}
      {soldFormOpen && (
        <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: "rgba(232,180,184,0.3)", background: "rgba(253,240,241,0.5)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "#b06070" }}>Mark as sold</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Sale price (£) *</label>
              <input type="number" step="0.01" autoFocus className="input-fairy text-sm"
                placeholder={item.listing_price ?? "0.00"}
                value={salePrice} onChange={e => onSalePriceChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onConfirmSold()} />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-soft)" }}>Date sold</label>
              <input type="date" className="input-fairy text-sm"
                value={saleDate} onChange={e => onSaleDateChange(e.target.value)} />
            </div>
            <button className="btn-primary text-xs px-3 py-2 flex-shrink-0"
              style={{ background: "#b06070", border: "1px solid rgba(176,96,112,0.4)" }}
              onClick={onConfirmSold}>Sold ✓</button>
            <button onClick={onCancelSold} className="text-xs px-2 py-2 flex-shrink-0" style={{ color: "var(--text-soft)" }}>
              Cancel
            </button>
          </div>
          {salePrice && (
            <p className="text-xs mt-1.5" style={{ color: "var(--sage)" }}>
              Profit: £{(parseFloat(salePrice) - parseFloat(item.purchase_price)).toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── sold card ──────────────────────────────────────────────────────────────────
function SoldCard({ item, onDelete }: { item: VintedItem; onDelete: (id: number) => void }) {
  const itemProfit = parseFloat(item.sale_price ?? "0") - parseFloat(item.purchase_price ?? "0");
  const margin = parseFloat(item.purchase_price) > 0
    ? Math.round((itemProfit / parseFloat(item.purchase_price)) * 100)
    : 0;

  return (
    <div className="card flex gap-3 px-4 py-3.5 group" style={{ background: "rgba(253,240,241,0.7)", border: "1.5px solid rgba(232,180,184,0.3)" }}>
      <ItemPhoto url={item.photo_url} name={item.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{item.name}</p>
          <div className="text-right flex-shrink-0">
            <div className="font-display font-bold italic text-lg" style={{ color: itemProfit >= 0 ? "var(--sage)" : "#b06070" }}>
              {itemProfit >= 0 ? "+" : ""}{gbp(itemProfit)}
            </div>
            <div className="text-xs" style={{ color: "var(--text-soft)" }}>{margin}% margin</div>
          </div>
        </div>
        <div className="flex gap-3 mt-1 flex-wrap">
          <span className="text-xs" style={{ color: "var(--text-soft)" }}>Bought {gbp(item.purchase_price)}</span>
          <span className="text-xs" style={{ color: "var(--text-soft)" }}>Sold {gbp(item.sale_price)}</span>
          {item.date_sold && (
            <span className="text-xs" style={{ color: "var(--text-soft)" }}>
              {format(parseISO(item.date_sold), "d MMM yyyy")}
            </span>
          )}
          {item.brand && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.brand}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 self-start transition-opacity"
        style={{ color: "var(--text-soft)" }}>
        <X size={11} />
      </button>
    </div>
  );
}

// ── wishlist card ──────────────────────────────────────────────────────────────
function WishCard({
  wish,
  onToggle,
  onDelete,
}: {
  wish: WishlistItem;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all"
      style={{
        background: wish.found ? "rgba(222,238,232,0.4)" : "rgba(250,246,240,0.8)",
        border: "1.5px solid rgba(200,184,224,0.2)",
        opacity: wish.found ? 0.65 : 1,
      }}>
      <button onClick={() => onToggle(wish.id)}
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: wish.found ? "var(--sage)" : "white",
          border: `2px solid ${wish.found ? "var(--sage)" : "rgba(143,173,160,0.5)"}`,
          color: "white", fontSize: "11px", fontWeight: "bold",
        }}>
        {wish.found && "✓"}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" style={{
          color: "var(--text-dark)",
          textDecoration: wish.found ? "line-through" : "none",
        }}>
          {wish.item_name}
        </span>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {wish.brand    && <span className="text-xs" style={{ color: "var(--text-soft)" }}>{wish.brand}</span>}
          {wish.max_price && <span className="text-xs" style={{ color: "var(--gold)" }}>max {gbp(wish.max_price)}</span>}
          {wish.notes    && <span className="text-xs italic" style={{ color: "var(--text-soft)" }}>{wish.notes}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(wish.id)}
        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: "var(--text-soft)" }}>
        <X size={11} />
      </button>
    </div>
  );
}
