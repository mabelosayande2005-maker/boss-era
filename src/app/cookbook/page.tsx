"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Heart, ChevronDown, ChevronUp, Clock } from "lucide-react";

type Recipe = {
  id: number; title: string; description: string | null; cuisine: string; cook_time_mins: number | null;
  difficulty: string; ingredients: string | null; method: string | null; notes: string | null;
  emoji: string; is_favourite: boolean;
};

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const CUISINES = ["Italian", "Asian", "British", "Mexican", "Middle Eastern", "Mediterranean", "Indian", "American", "French", "Other"];
const DIFF_COLOR: Record<string, string> = { Easy: "var(--sage)", Medium: "var(--gold)", Hard: "var(--rose)" };

function RecipeCard({ recipe, onToggleFav, onDelete }: { recipe: Recipe; onToggleFav: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card px-5 py-4" style={{ borderTop: recipe.is_favourite ? "2px solid var(--rose)" : undefined }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{recipe.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{recipe.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onToggleFav} className="p-1 rounded-lg transition-colors">
                <Heart size={16} fill={recipe.is_favourite ? "var(--rose)" : "transparent"} stroke={recipe.is_favourite ? "var(--rose)" : "var(--text-soft)"} />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg" style={{ color: "var(--text-soft)" }}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button onClick={onDelete} className="p-1 rounded-lg opacity-40 hover:opacity-80">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>{recipe.cuisine}</span>
            <span className="text-xs font-medium" style={{ color: DIFF_COLOR[recipe.difficulty] }}>{recipe.difficulty}</span>
            {recipe.cook_time_mins && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-soft)" }}>
                <Clock size={11} /> {recipe.cook_time_mins}min
              </span>
            )}
          </div>
          {recipe.description && <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>{recipe.description}</p>}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pl-2">
          {recipe.ingredients && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Ingredients</p>
              <p className="text-sm whitespace-pre-line" style={{ color: "var(--text-dark)" }}>{recipe.ingredients}</p>
            </div>
          )}
          {recipe.method && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Method</p>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--text-dark)" }}>{recipe.method}</p>
            </div>
          )}
          {recipe.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Notes</p>
              <p className="text-sm" style={{ color: "var(--text-mid)" }}>{recipe.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CookbookPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [favOnly, setFavOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rCuisine, setRCuisine] = useState("Other");
  const [rDiff, setRDiff] = useState("Easy");
  const [rTime, setRTime] = useState("");
  const [rIngredients, setRIngredients] = useState("");
  const [rMethod, setRMethod] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [rEmoji, setREmoji] = useState("🍽️");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = favOnly ? "/api/cookbook?fav=true" : cuisineFilter !== "All" ? `/api/cookbook?cuisine=${encodeURIComponent(cuisineFilter)}` : "/api/cookbook";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setRecipes(data.recipes || []);
      setCuisines(data.cuisines || []);
    } catch {/* */}
    setLoading(false);
  }, [cuisineFilter, favOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/cookbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addRecipe = async () => {
    if (!rTitle) return;
    await post({ action: "add", title: rTitle, description: rDesc || null, cuisine: rCuisine, difficulty: rDiff, cookTimeMins: rTime ? parseInt(rTime) : null, ingredients: rIngredients || null, method: rMethod || null, notes: rNotes || null, emoji: rEmoji });
    setRTitle(""); setRDesc(""); setRCuisine("Other"); setRDiff("Easy"); setRTime(""); setRIngredients(""); setRMethod(""); setRNotes(""); setREmoji("🍽️");
    setShowForm(false); fetchData();
  };

  const favCount = recipes.filter(r => r.is_favourite).length;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(212,168,83,0.25) 0%, rgba(245,213,216,0.7) 50%, rgba(222,238,232,0.7) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Recipe Collection</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Cookbook 🍽️</h1>
          </div>
          <span className="text-4xl float select-none">👩‍🍳</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "recipes", value: recipes.length || "—", color: "var(--gold)" },
            { label: "favourites", value: favCount || "—", color: "var(--rose)" },
            { label: "cuisines", value: cuisines.length || "—", color: "var(--sage)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => { setCuisineFilter("All"); setFavOnly(false); }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: cuisineFilter === "All" && !favOnly ? "var(--gold)" : "var(--cream-dark)", color: cuisineFilter === "All" && !favOnly ? "white" : "var(--text-mid)" }}>
            All
          </button>
          <button onClick={() => { setFavOnly(!favOnly); setCuisineFilter("All"); }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1"
            style={{ background: favOnly ? "var(--rose)" : "var(--rose-pale)", color: favOnly ? "white" : "var(--text-mid)" }}>
            <Heart size={11} /> Favourites
          </button>
          {cuisines.map(c => (
            <button key={c} onClick={() => { setCuisineFilter(c); setFavOnly(false); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: cuisineFilter === c && !favOnly ? "var(--sage)" : "var(--sage-pale)", color: cuisineFilter === c && !favOnly ? "white" : "var(--text-mid)" }}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1 shrink-0">
          <Plus size={14} /> Recipe
        </button>
      </div>

      {/* Add recipe form */}
      {showForm && (
        <div className="card px-5 py-4 space-y-3">
          <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>New Recipe</h3>
          <div className="flex gap-2">
            <input value={rEmoji} onChange={e => setREmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="🍽️" />
            <input value={rTitle} onChange={e => setRTitle(e.target.value)} className="input-fairy flex-1" placeholder="Recipe name" />
          </div>
          <input value={rDesc} onChange={e => setRDesc(e.target.value)} className="input-fairy w-full" placeholder="Short description" />
          <div className="flex gap-2">
            <select value={rCuisine} onChange={e => setRCuisine(e.target.value)} className="input-fairy flex-1">
              {CUISINES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={rDiff} onChange={e => setRDiff(e.target.value)} className="input-fairy flex-1">
              {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
            </select>
            <input value={rTime} onChange={e => setRTime(e.target.value)} type="number" className="input-fairy w-24" placeholder="Mins" />
          </div>
          <textarea value={rIngredients} onChange={e => setRIngredients(e.target.value)} className="input-fairy w-full text-sm" rows={4} placeholder="Ingredients (one per line)" style={{ resize: "vertical" }} />
          <textarea value={rMethod} onChange={e => setRMethod(e.target.value)} className="input-fairy w-full text-sm" rows={5} placeholder="Method / Steps" style={{ resize: "vertical" }} />
          <textarea value={rNotes} onChange={e => setRNotes(e.target.value)} className="input-fairy w-full text-sm" rows={2} placeholder="Tips & notes (optional)" style={{ resize: "none" }} />
          <div className="flex gap-2">
            <button onClick={addRecipe} className="btn-primary text-sm">Save recipe</button>
            <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
      ) : recipes.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-3xl mb-2">👩‍🍳</p>
          <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No recipes yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Build your recipe collection — save your faves forever</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe}
              onToggleFav={() => post({ action: "toggle-fav", id: recipe.id }).then(() => fetchData())}
              onDelete={() => post({ action: "delete", id: recipe.id }).then(() => fetchData())} />
          ))}
        </div>
      )}
    </div>
  );
}
