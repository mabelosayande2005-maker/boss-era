"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X, Check, Search, ShoppingCart, Trash2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = "fridge" | "freezer" | "cupboard";
type Tab      = "stock" | "canmake" | "mealplan" | "shopping";
type Day      = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

type StockItem = {
  id:          string;
  name:        string;
  category:    Category;
  quantity:    string;
  expiryDate?: string;
  used:        boolean;
};

type Recipe = {
  id:          string;
  title:       string;
  emoji:       string;
  ingredients: string[];
};

type DayMeal = {
  text:       string;
  recipeId?:  string;
};

type ShoppingItem = {
  id:        string;
  name:      string;
  checked:   boolean;
  fromMeal?: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAYS: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CAT: Record<Category, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  fridge:   { label: "Fridge",   emoji: "🧊", color: "var(--sage)",     bg: "rgba(222,238,232,0.45)", border: "rgba(143,173,160,0.22)" },
  freezer:  { label: "Freezer",  emoji: "❄️", color: "var(--lavender)", bg: "rgba(237,232,245,0.45)", border: "rgba(200,184,224,0.22)" },
  cupboard: { label: "Cupboard", emoji: "🗄️", color: "var(--gold)",     bg: "rgba(253,248,232,0.45)", border: "rgba(212,168,83,0.2)"   },
};

const LS = {
  stock:    "mp_stock",
  recipes:  "mp_recipes",
  mealplan: "mp_mealplan",
  shopping: "mp_shopping",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function daysUntil(iso: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function expiryStatus(item: StockItem): "expired" | "expiring" | "fresh" | "none" {
  if (!item.expiryDate) return "none";
  const d = daysUntil(item.expiryDate);
  return d < 0 ? "expired" : d <= 3 ? "expiring" : "fresh";
}

function ingInStock(ingredient: string, activeStock: StockItem[]): boolean {
  const a = ingredient.toLowerCase();
  return activeStock.some(s => {
    const b = s.name.toLowerCase();
    return a.includes(b) || b.includes(a);
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function MealPrepPage() {
  // Core state
  const [tab,      setTab]      = useState<Tab>("stock");
  const [stock,    setStock]    = useState<StockItem[]>([]);
  const [recipes,  setRecipes]  = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<Partial<Record<Day, DayMeal>>>({});
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [loaded,   setLoaded]   = useState(false);

  // Stock add form
  const [addingStock, setAddingStock] = useState(false);
  const [sName,       setSName]       = useState("");
  const [sCat,        setSCat]        = useState<Category>("fridge");
  const [sQty,        setSQty]        = useState("");
  const [sExpiry,     setSExpiry]     = useState("");

  // Recipe form
  const [addingRecipe,  setAddingRecipe]  = useState(false);
  const [rTitle,        setRTitle]        = useState("");
  const [rEmoji,        setREmoji]        = useState("🍽️");
  const [rIngs,         setRIngs]         = useState<string[]>([""]);
  const [recipeSearch,  setRecipeSearch]  = useState("");
  const [expandedRec,   setExpandedRec]   = useState<string | null>(null);

  // Meal plan editing
  const [editingDay,       setEditingDay]       = useState<Day | null>(null);
  const [editText,         setEditText]         = useState("");
  const [editRecipeId,     setEditRecipeId]     = useState<string | undefined>(undefined);
  const [showRecipePicker, setShowRecipePicker] = useState(false);

  // Shopping add form
  const [addingShop, setAddingShop] = useState(false);
  const [shopName,   setShopName]   = useState("");

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const s = localStorage.getItem(LS.stock);    if (s) setStock(JSON.parse(s));
      const r = localStorage.getItem(LS.recipes);  if (r) setRecipes(JSON.parse(r));
      const m = localStorage.getItem(LS.mealplan); if (m) setMealPlan(JSON.parse(m));
      const l = localStorage.getItem(LS.shopping); if (l) setShopping(JSON.parse(l));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const saveStock    = (n: StockItem[])                          => { setStock(n);    localStorage.setItem(LS.stock,    JSON.stringify(n)); };
  const saveRecipes  = (n: Recipe[])                             => { setRecipes(n);  localStorage.setItem(LS.recipes,  JSON.stringify(n)); };
  const saveMealPlan = (n: Partial<Record<Day, DayMeal>>)        => { setMealPlan(n); localStorage.setItem(LS.mealplan, JSON.stringify(n)); };
  const saveShopping = (n: ShoppingItem[])                       => { setShopping(n); localStorage.setItem(LS.shopping, JSON.stringify(n)); };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeStock = useMemo(() => stock.filter(s => !s.used), [stock]);

  // Map: stock item id → days it's needed for (via linked recipes in meal plan)
  const reservedFor = useMemo(() => {
    const map = new Map<string, string[]>();
    DAYS.forEach(day => {
      const plan = mealPlan[day];
      if (!plan?.recipeId) return;
      const recipe = recipes.find(r => r.id === plan.recipeId);
      if (!recipe) return;
      activeStock.forEach(si => {
        const sNorm = si.name.toLowerCase();
        const matched = recipe.ingredients.some(ing => {
          const iNorm = ing.toLowerCase();
          return iNorm.includes(sNorm) || sNorm.includes(iNorm);
        });
        if (matched) map.set(si.id, [...(map.get(si.id) ?? []), day]);
      });
    });
    return map;
  }, [mealPlan, recipes, activeStock]);

  // ── Stock actions ──────────────────────────────────────────────────────────

  function addStock() {
    if (!sName.trim()) return;
    const item: StockItem = {
      id: uid(), name: sName.trim(), category: sCat,
      quantity: sQty.trim(), expiryDate: sExpiry || undefined, used: false,
    };
    saveStock([...stock, item]);
    setSName(""); setSQty(""); setSExpiry(""); setAddingStock(false);
  }

  function toggleUsed(id: string) {
    saveStock(stock.map(s => s.id === id ? { ...s, used: !s.used } : s));
  }

  function deleteStockItem(id: string) {
    saveStock(stock.filter(s => s.id !== id));
  }

  // ── Recipe actions ─────────────────────────────────────────────────────────

  function addRecipe() {
    if (!rTitle.trim()) return;
    const recipe: Recipe = {
      id: uid(),
      title: rTitle.trim(),
      emoji: rEmoji.trim() || "🍽️",
      ingredients: rIngs.map(s => s.trim()).filter(Boolean),
    };
    saveRecipes([...recipes, recipe]);
    setRTitle(""); setREmoji("🍽️"); setRIngs([""]); setAddingRecipe(false);
  }

  function deleteRecipe(id: string) {
    saveRecipes(recipes.filter(r => r.id !== id));
    const next = { ...mealPlan };
    DAYS.forEach(day => {
      if (next[day]?.recipeId === id) {
        next[day] = next[day]?.text ? { text: next[day]!.text } : undefined;
      }
    });
    saveMealPlan(next);
  }

  // ── Meal plan actions ──────────────────────────────────────────────────────

  function startEditDay(day: Day) {
    const plan = mealPlan[day];
    setEditingDay(day);
    setEditText(plan?.text ?? "");
    setEditRecipeId(plan?.recipeId);
    setShowRecipePicker(false);
  }

  function saveDayMeal() {
    if (!editingDay) return;
    const next = { ...mealPlan };
    if (editText.trim()) {
      next[editingDay] = { text: editText.trim(), recipeId: editRecipeId };
    } else {
      delete next[editingDay];
    }
    saveMealPlan(next);
    setEditingDay(null);
    setShowRecipePicker(false);
  }

  function clearDay(day: Day) {
    const next = { ...mealPlan };
    delete next[day];
    saveMealPlan(next);
    if (editingDay === day) setEditingDay(null);
  }

  // Adds all missing recipe ingredients from the meal plan to the shopping list.
  // Returns the number of new items added.
  function syncMissingToShopping(): number {
    const toAdd: ShoppingItem[] = [];
    const existingNames = new Set(shopping.map(s => s.name.toLowerCase()));
    DAYS.forEach(day => {
      const plan = mealPlan[day];
      if (!plan?.recipeId) return;
      const recipe = recipes.find(r => r.id === plan.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const norm = ing.toLowerCase();
        if (!ingInStock(ing, activeStock) && !existingNames.has(norm)) {
          existingNames.add(norm);
          toAdd.push({ id: uid(), name: ing, checked: false, fromMeal: plan.text });
        }
      });
    });
    if (toAdd.length > 0) saveShopping([...shopping, ...toAdd]);
    return toAdd.length;
  }

  // ── Shopping actions ───────────────────────────────────────────────────────

  function addShopItem() {
    if (!shopName.trim()) return;
    saveShopping([...shopping, { id: uid(), name: shopName.trim(), checked: false }]);
    setShopName(""); setAddingShop(false);
  }

  function toggleShop(id: string) {
    saveShopping(shopping.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  }

  function deleteShopItem(id: string) {
    saveShopping(shopping.filter(s => s.id !== id));
  }

  function clearChecked() {
    saveShopping(shopping.filter(s => !s.checked));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS = [
    { id: "stock"    as Tab, label: "Fridge",    emoji: "🧊" },
    { id: "canmake"  as Tab, label: "Can Cook",  emoji: "🍽️" },
    { id: "mealplan" as Tab, label: "Meal Plan", emoji: "📅" },
    { id: "shopping" as Tab, label: "Shopping",  emoji: "🛒" },
  ];

  const filteredRecipes = recipeSearch.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
    : recipes;

  const shopPending = shopping.filter(s => !s.checked);
  const shopDone    = shopping.filter(s => s.checked);

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center gap-2 text-2xl select-none">
            <span>🥗</span><span>✦</span><span>🛒</span>
          </div>
          <h1
            className="font-display font-bold italic mb-1"
            style={{ fontSize: "clamp(2rem, 6vw, 2.8rem)", color: "var(--text-dark)", lineHeight: 1.1 }}
          >
            Meal Prep
          </h1>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            Plan your week, eat well, waste less ✦
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(200,184,224,0.25)" }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-medium transition-all"
              style={{
                background: tab === t.id ? "white" : "transparent",
                color:      tab === t.id ? "var(--text-dark)" : "var(--text-soft)",
                boxShadow:  tab === t.id ? "0 1px 6px rgba(143,173,160,0.18)" : "none",
              }}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1 — My Fridge & Cupboards
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "stock" && (
          <div className="space-y-4">

            {/* Add item button / form */}
            {!addingStock ? (
              <button
                onClick={() => setAddingStock(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.7)", border: "1.5px dashed rgba(200,184,224,0.4)", color: "var(--text-soft)" }}
              >
                <Plus size={15} /> Add item to stock
              </button>
            ) : (
              <div
                className="card px-4 py-4 space-y-3"
                style={{ background: "rgba(222,238,232,0.3)", border: "1px solid rgba(143,173,160,0.2)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>Add to stock</span>
                  <button onClick={() => setAddingStock(false)}><X size={15} style={{ color: "var(--text-soft)" }} /></button>
                </div>

                <input
                  autoFocus
                  placeholder="Item name (e.g. chicken breast)"
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addStock(); if (e.key === "Escape") setAddingStock(false); }}
                  className="input-fairy text-sm"
                />

                {/* Category picker */}
                <div className="flex gap-2">
                  {(["fridge", "freezer", "cupboard"] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSCat(cat)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: sCat === cat ? CAT[cat].bg : "rgba(255,255,255,0.6)",
                        color:      sCat === cat ? CAT[cat].color : "var(--text-soft)",
                        border:     `1.5px solid ${sCat === cat ? CAT[cat].border : "rgba(200,184,224,0.2)"}`,
                        fontWeight: sCat === cat ? 600 : 400,
                      }}
                    >
                      {CAT[cat].emoji} {CAT[cat].label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    placeholder="Quantity (e.g. 500g)"
                    value={sQty}
                    onChange={e => setSQty(e.target.value)}
                    className="input-fairy text-sm flex-1"
                  />
                  <input
                    type="date"
                    value={sExpiry}
                    onChange={e => setSExpiry(e.target.value)}
                    title="Expiry date (optional)"
                    className="input-fairy text-sm"
                    style={{ width: 160, minWidth: 0 }}
                  />
                </div>

                <button onClick={addStock} disabled={!sName.trim()} className="btn-primary text-sm w-full" style={{ opacity: !sName.trim() ? 0.5 : 1 }}>
                  Add to {CAT[sCat].label}
                </button>
              </div>
            )}

            {/* Items grouped by category */}
            {loaded && (["fridge", "freezer", "cupboard"] as Category[]).map(cat => {
              const catItems = stock.filter(s => s.category === cat);
              if (catItems.length === 0) return null;
              const activeCount = catItems.filter(s => !s.used).length;
              return (
                <div key={cat} className="card overflow-hidden" style={{ padding: 0 }}>
                  {/* Category header */}
                  <div
                    className="px-4 py-2.5 flex items-center gap-2"
                    style={{ background: CAT[cat].bg, borderBottom: `1px solid ${CAT[cat].border}` }}
                  >
                    <span className="text-lg leading-none">{CAT[cat].emoji}</span>
                    <span className="font-display font-bold italic text-[15px]" style={{ color: CAT[cat].color }}>
                      {CAT[cat].label}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "var(--text-soft)" }}>
                      {activeCount} item{activeCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Item rows */}
                  {catItems.map((item, idx) => {
                    const status   = expiryStatus(item);
                    const reserved = reservedFor.get(item.id);
                    const expDays  = item.expiryDate ? daysUntil(item.expiryDate) : null;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 group transition-opacity"
                        style={{
                          borderTop: idx > 0 ? "1px solid rgba(200,184,224,0.1)" : "none",
                          opacity:   item.used ? 0.5 : 1,
                          background: status === "expired" && !item.used
                            ? "rgba(220,80,80,0.04)"
                            : status === "expiring" && !item.used
                              ? "rgba(212,168,83,0.04)"
                              : "transparent",
                        }}
                      >
                        {/* Tick-off checkbox */}
                        <button
                          onClick={() => toggleUsed(item.id)}
                          className="flex-shrink-0 flex items-center justify-center rounded-md transition-all"
                          style={{
                            width: 20, height: 20,
                            background: item.used ? "var(--sage)" : "rgba(255,255,255,0.9)",
                            border:     item.used ? "none" : "1.5px solid rgba(200,184,224,0.5)",
                            boxShadow:  item.used ? "0 2px 6px rgba(143,173,160,0.3)" : "none",
                          }}
                        >
                          {item.used && <Check size={11} color="white" strokeWidth={3} />}
                        </button>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span
                              className="text-sm font-medium"
                              style={{
                                color:          item.used ? "var(--text-soft)" : "var(--text-dark)",
                                textDecoration: item.used ? "line-through" : "none",
                                textDecorationColor: "var(--text-soft)",
                              }}
                            >
                              {item.name}
                            </span>
                            {item.quantity && (
                              <span className="text-xs" style={{ color: "var(--text-soft)" }}>{item.quantity}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {status === "expired" && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,80,80,0.1)", color: "#dc5050", border: "1px solid rgba(220,80,80,0.18)" }}>
                                Expired
                              </span>
                            )}
                            {status === "expiring" && expDays !== null && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,168,83,0.12)", color: "var(--gold)", border: "1px solid rgba(212,168,83,0.2)" }}>
                                {expDays === 0 ? "Expires today" : `${expDays}d left`}
                              </span>
                            )}
                            {status === "fresh" && item.expiryDate && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(143,173,160,0.1)", color: "var(--sage)" }}>
                                exp {new Date(item.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            )}
                            {reserved && reserved.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(200,184,224,0.15)", color: "var(--lavender)", border: "1px solid rgba(200,184,224,0.25)" }}>
                                📅 {reserved[0]}{reserved.length > 1 ? ` +${reserved.length - 1}` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => deleteStockItem(item.id)}
                          className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0"
                        >
                          <X size={13} style={{ color: "var(--text-soft)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {loaded && stock.length === 0 && (
              <div className="card px-5 py-12 text-center">
                <p className="text-3xl mb-2">🧊</p>
                <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>Your fridge is empty</p>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>Start adding what you have in stock</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2 — What Can I Make
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "canmake" && (
          <div className="space-y-4">

            {/* Search + Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-soft)" }} />
                <input
                  placeholder="Search recipes…"
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  className="input-fairy text-sm pl-8"
                />
              </div>
              <button
                onClick={() => { setAddingRecipe(v => !v); setRTitle(""); setREmoji("🍽️"); setRIngs([""]); }}
                className="btn-primary text-sm px-3 flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Recipe
              </button>
            </div>

            {/* Add recipe form */}
            {addingRecipe && (
              <div
                className="card px-4 py-4 space-y-3"
                style={{ background: "rgba(237,232,245,0.3)", border: "1px solid rgba(200,184,224,0.2)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>New recipe</span>
                  <button onClick={() => setAddingRecipe(false)}><X size={15} style={{ color: "var(--text-soft)" }} /></button>
                </div>

                <div className="flex gap-2">
                  <input
                    placeholder="🍽️"
                    value={rEmoji}
                    onChange={e => setREmoji(e.target.value)}
                    className="input-fairy text-base text-center"
                    style={{ width: 52 }}
                  />
                  <input
                    autoFocus
                    placeholder="Recipe name"
                    value={rTitle}
                    onChange={e => setRTitle(e.target.value)}
                    className="input-fairy text-sm flex-1"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Ingredients</p>
                  <div className="space-y-1.5">
                    {rIngs.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-lg leading-none font-bold shrink-0" style={{ color: "var(--lavender)", marginTop: -2 }}>·</span>
                        <input
                          value={ing}
                          onChange={e => { const n = [...rIngs]; n[i] = e.target.value; setRIngs(n); }}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); const n = [...rIngs]; n.splice(i + 1, 0, ""); setRIngs(n); }
                            if (e.key === "Backspace" && ing === "" && rIngs.length > 1) { e.preventDefault(); setRIngs(rIngs.filter((_, j) => j !== i)); }
                          }}
                          placeholder={`Ingredient ${i + 1}`}
                          className="input-fairy text-sm flex-1"
                        />
                        {rIngs.length > 1 && (
                          <button onClick={() => setRIngs(rIngs.filter((_, j) => j !== i))} className="opacity-40 hover:opacity-80 shrink-0">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setRIngs(prev => [...prev, ""])}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "var(--lavender)" }}
                  >
                    <Plus size={11} /> Add ingredient
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setAddingRecipe(false)}
                    className="text-sm flex-1 py-2 rounded-xl"
                    style={{ color: "var(--text-soft)", background: "var(--cream-dark)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addRecipe}
                    disabled={!rTitle.trim()}
                    className="btn-primary text-sm flex-1 py-2"
                    style={{ opacity: !rTitle.trim() ? 0.5 : 1 }}
                  >
                    Save Recipe
                  </button>
                </div>
              </div>
            )}

            {/* Recipe cards */}
            {loaded && filteredRecipes.length === 0 ? (
              <div className="card px-5 py-12 text-center">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
                  {recipeSearch ? "No matching recipes" : "No recipes saved yet"}
                </p>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  {recipeSearch ? "Try a different search term" : "Add your favourite meals above"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecipes.map(recipe => {
                  const total   = recipe.ingredients.length;
                  const matched = recipe.ingredients.filter(ing => ingInStock(ing, activeStock)).length;
                  const pct     = total > 0 ? Math.round((matched / total) * 100) : 0;
                  const canMake = total > 0 && matched === total;
                  const close   = !canMake && total > 0 && pct >= 60;
                  const isOpen  = expandedRec === recipe.id;

                  return (
                    <div
                      key={recipe.id}
                      className="card overflow-hidden group"
                      style={{
                        padding: 0,
                        border: canMake
                          ? "1.5px solid rgba(143,173,160,0.4)"
                          : "1px solid rgba(200,184,224,0.2)",
                      }}
                    >
                      {/* Header row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                        onClick={() => setExpandedRec(isOpen ? null : recipe.id)}
                      >
                        <span className="text-2xl leading-none shrink-0">{recipe.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{recipe.title}</p>
                          {total > 0 && (
                            <p className="text-xs mt-0.5" style={{ color: canMake ? "var(--sage)" : close ? "var(--gold)" : "var(--text-soft)" }}>
                              {canMake ? "✓ All ingredients in stock" : `${matched} of ${total} ingredients in stock`}
                            </p>
                          )}
                        </div>
                        {canMake && (
                          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(143,173,160,0.12)", color: "var(--sage)" }}>
                            Ready ✓
                          </span>
                        )}
                        {!canMake && total > 0 && (
                          <span
                            className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: close ? "rgba(212,168,83,0.1)" : "var(--cream-dark)",
                              color:      close ? "var(--gold)"           : "var(--text-soft)",
                            }}
                          >
                            {pct}%
                          </span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteRecipe(recipe.id); }}
                          className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity shrink-0 p-1"
                        >
                          <Trash2 size={13} style={{ color: "var(--text-soft)" }} />
                        </button>
                      </div>

                      {/* Match bar */}
                      {total > 0 && (
                        <div className="progress-track mx-4 mb-1" style={{ height: "3px" }}>
                          <div
                            className="progress-fill"
                            style={{
                              width:     `${pct}%`,
                              background: canMake ? "var(--sage)" : close ? "var(--gold)" : "var(--lavender)",
                              animation: "none",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      )}

                      {/* Expanded ingredient list */}
                      {isOpen && recipe.ingredients.length > 0 && (
                        <div
                          className="px-4 pb-4 pt-3"
                          style={{ borderTop: "1px solid rgba(200,184,224,0.12)" }}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text-soft)" }}>
                            Ingredients
                          </p>
                          <div className="space-y-1.5">
                            {recipe.ingredients.map((ing, i) => {
                              const inS = ingInStock(ing, activeStock);
                              return (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="shrink-0 text-xs font-bold" style={{ color: inS ? "var(--sage)" : "var(--rose)" }}>
                                    {inS ? "✓" : "✗"}
                                  </span>
                                  <span className="flex-1" style={{ color: inS ? "var(--text-mid)" : "var(--text-dark)" }}>
                                    {ing}
                                  </span>
                                  {!inS && (
                                    <button
                                      onClick={() => {
                                        if (!shopping.some(s => s.name.toLowerCase() === ing.toLowerCase())) {
                                          saveShopping([...shopping, { id: uid(), name: ing, checked: false }]);
                                        }
                                        setTab("shopping");
                                      }}
                                      className="shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-opacity hover:opacity-80"
                                      style={{ background: "rgba(232,180,184,0.15)", color: "var(--rose)", border: "1px solid rgba(232,180,184,0.25)" }}
                                    >
                                      + list
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
            TAB 3 — Meal Plan
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "mealplan" && (
          <div className="space-y-3">

            {/* Sync button */}
            <button
              onClick={() => { const n = syncMissingToShopping(); if (n > 0) setTab("shopping"); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.7)",
                border:     "1px solid rgba(200,184,224,0.25)",
                color:      "var(--text-mid)",
              }}
            >
              <ShoppingCart size={14} /> Add missing ingredients to shopping list
            </button>

            {/* Day rows */}
            {DAYS.map(day => {
              const plan     = mealPlan[day];
              const isEdit   = editingDay === day;
              const recipe   = plan?.recipeId ? recipes.find(r => r.id === plan.recipeId) : null;

              return (
                <div key={day} className="card overflow-hidden" style={{ padding: 0 }}>

                  {/* Day header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background:   isEdit ? "rgba(222,238,232,0.3)" : "rgba(255,255,255,0.7)",
                      borderBottom: (isEdit || (recipe && recipe.ingredients.length > 0)) ? "1px solid rgba(200,184,224,0.12)" : "none",
                    }}
                  >
                    <span className="text-xs font-semibold shrink-0 w-20" style={{ color: "var(--text-mid)" }}>{day}</span>
                    {plan?.text ? (
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {recipe && <span className="text-base leading-none shrink-0">{recipe.emoji}</span>}
                        <span className="text-sm truncate" style={{ color: "var(--text-dark)" }}>{plan.text}</span>
                      </div>
                    ) : (
                      <span className="flex-1 text-sm" style={{ color: "var(--text-soft)" }}>—</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {plan?.text && !isEdit && (
                        <button
                          onClick={() => clearDay(day)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg opacity-40 hover:opacity-70"
                        >
                          <X size={12} style={{ color: "var(--text-soft)" }} />
                        </button>
                      )}
                      <button
                        onClick={() => isEdit ? setEditingDay(null) : startEditDay(day)}
                        className="text-xs px-2.5 py-1 rounded-xl font-medium transition-all"
                        style={{
                          background: isEdit ? "var(--sage-pale)" : "var(--cream-dark)",
                          color:      isEdit ? "var(--sage)"      : "var(--text-soft)",
                        }}
                      >
                        {isEdit ? "Cancel" : plan?.text ? "Edit" : "Plan"}
                      </button>
                    </div>
                  </div>

                  {/* Edit panel */}
                  {isEdit && (
                    <div className="px-4 py-3 space-y-2.5" style={{ background: "rgba(222,238,232,0.08)" }}>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          placeholder="What's for this day?"
                          value={editText}
                          onChange={e => { setEditText(e.target.value); if (!e.target.value) setEditRecipeId(undefined); }}
                          onKeyDown={e => { if (e.key === "Enter") saveDayMeal(); if (e.key === "Escape") setEditingDay(null); }}
                          className="input-fairy text-sm flex-1"
                        />
                        <button
                          onClick={() => setShowRecipePicker(v => !v)}
                          title="Pick a saved recipe"
                          className="text-sm px-2.5 py-2 rounded-xl shrink-0 transition-all"
                          style={{
                            background: showRecipePicker ? "var(--lavender-pale)" : "var(--cream-dark)",
                            color:      showRecipePicker ? "var(--lavender)"       : "var(--text-soft)",
                          }}
                        >
                          📖
                        </button>
                      </div>

                      {/* Recipe picker list */}
                      {showRecipePicker && (
                        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(200,184,224,0.25)", background: "rgba(255,255,255,0.95)" }}>
                          {recipes.length === 0 ? (
                            <p className="text-xs text-center py-3" style={{ color: "var(--text-soft)" }}>
                              No recipes — add some in the Can Cook tab first
                            </p>
                          ) : (
                            recipes.map((rec, i) => (
                              <button
                                key={rec.id}
                                onClick={() => { setEditText(rec.title); setEditRecipeId(rec.id); setShowRecipePicker(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                                style={{ borderTop: i > 0 ? "1px solid rgba(200,184,224,0.1)" : "none" }}
                              >
                                <span className="text-lg leading-none">{rec.emoji}</span>
                                <span className="text-sm flex-1" style={{ color: "var(--text-dark)" }}>{rec.title}</span>
                                {editRecipeId === rec.id && <Check size={13} style={{ color: "var(--sage)" }} />}
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      <button
                        onClick={saveDayMeal}
                        disabled={!editText.trim()}
                        className="btn-primary text-sm w-full"
                        style={{ opacity: !editText.trim() ? 0.5 : 1 }}
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Ingredient chips for linked recipes */}
                  {!isEdit && recipe && recipe.ingredients.length > 0 && (
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-soft)" }}>
                        Ingredients
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients.map((ing, i) => {
                          const inS = ingInStock(ing, activeStock);
                          return (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{
                                background: inS ? "rgba(143,173,160,0.1)"  : "rgba(232,180,184,0.12)",
                                color:      inS ? "var(--sage)"            : "var(--rose)",
                                border:     inS ? "1px solid rgba(143,173,160,0.2)" : "1px solid rgba(232,180,184,0.2)",
                              }}
                            >
                              {inS ? "✓" : "✗"} {ing}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 4 — Shopping List
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "shopping" && (
          <div className="space-y-4">

            {/* Add item + sync from plan */}
            <div className="flex gap-2">
              {addingShop ? (
                <>
                  <input
                    autoFocus
                    placeholder="Item to buy…"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addShopItem(); if (e.key === "Escape") { setAddingShop(false); setShopName(""); } }}
                    className="input-fairy text-sm flex-1"
                  />
                  <button onClick={addShopItem} className="btn-primary text-sm px-4">Add</button>
                  <button onClick={() => { setAddingShop(false); setShopName(""); }}>
                    <X size={16} style={{ color: "var(--text-soft)" }} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAddingShop(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1.5px dashed rgba(200,184,224,0.4)", color: "var(--text-soft)" }}
                  >
                    <Plus size={15} /> Add item
                  </button>
                  <button
                    onClick={() => syncMissingToShopping()}
                    title="Add missing recipe ingredients from meal plan"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium shrink-0 transition-all"
                    style={{ background: "rgba(237,232,245,0.7)", color: "var(--lavender)", border: "1px solid rgba(200,184,224,0.25)" }}
                  >
                    <ShoppingCart size={13} /> From plan
                  </button>
                </>
              )}
            </div>

            {/* Pending items */}
            {shopPending.length > 0 && (
              <div className="space-y-2">
                {shopPending.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
                    style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(200,184,224,0.22)", boxShadow: "0 1px 6px rgba(143,173,160,0.07)" }}
                  >
                    <button
                      onClick={() => toggleShop(item.id)}
                      className="flex-shrink-0 flex items-center justify-center rounded-md transition-all"
                      style={{ width: 20, height: 20, background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(200,184,224,0.5)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>{item.name}</p>
                      {item.fromMeal && (
                        <p className="text-xs" style={{ color: "var(--text-soft)" }}>for {item.fromMeal}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteShopItem(item.id)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0"
                    >
                      <X size={13} style={{ color: "var(--text-soft)" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Done items */}
            {shopDone.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    In basket ({shopDone.length})
                  </span>
                  <button onClick={clearChecked} className="text-xs font-medium" style={{ color: "var(--rose)" }}>
                    Clear
                  </button>
                </div>
                {shopDone.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl opacity-50"
                    style={{ background: "rgba(250,246,240,0.6)" }}
                  >
                    <button
                      onClick={() => toggleShop(item.id)}
                      className="flex-shrink-0 flex items-center justify-center rounded-md shrink-0"
                      style={{ width: 20, height: 20, background: "var(--sage)", border: "none", boxShadow: "0 2px 6px rgba(143,173,160,0.3)" }}
                    >
                      <Check size={11} color="white" strokeWidth={3} />
                    </button>
                    <span className="text-sm line-through flex-1" style={{ color: "var(--text-soft)" }}>{item.name}</span>
                    <button onClick={() => deleteShopItem(item.id)} className="opacity-50 hover:opacity-90 shrink-0">
                      <X size={13} style={{ color: "var(--text-soft)" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loaded && shopping.length === 0 && !addingShop && (
              <div className="card px-5 py-12 text-center">
                <p className="text-3xl mb-2">🛒</p>
                <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>Shopping list is empty</p>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>Add items manually or sync from your meal plan</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
