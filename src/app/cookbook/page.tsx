"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Heart, ChevronDown, ChevronUp, X, Clock, Upload, ImageIcon } from "lucide-react";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  cuisine: string | null;
  cook_time_mins: number | null;
  prep_time_mins: number | null;
  difficulty: string | null;
  ingredients: string | null;
  method: string | null;
  notes: string | null;
  emoji: string | null;
  is_favourite: boolean;
  photo_url: string | null;
};

function RecipePhoto({ url }: { url: string }) {
  return (
    <div className="w-full overflow-hidden rounded-t-2xl" style={{ height: 190 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/vinted/photo?url=${encodeURIComponent(url)}`}
        alt="Recipe"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function RecipeCard({ recipe, onToggleFav, onDelete }: {
  recipe: Recipe; onToggleFav: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ingredientList = recipe.ingredients ? recipe.ingredients.split("\n").filter(Boolean) : [];
  const methodList = recipe.method ? recipe.method.split("\n").filter(Boolean) : [];

  return (
    <div className="card overflow-hidden" style={{ padding: 0, borderTop: recipe.is_favourite ? "2.5px solid var(--rose)" : undefined }}>
      {recipe.photo_url && <RecipePhoto url={recipe.photo_url} />}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-snug" style={{ color: "var(--text-dark)" }}>
              {recipe.emoji && <span className="mr-1.5">{recipe.emoji}</span>}
              {recipe.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {recipe.prep_time_mins != null && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                  <Clock size={10} /> {recipe.prep_time_mins}min prep
                </span>
              )}
              {recipe.cook_time_mins != null && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--lavender-pale)", color: "var(--lavender)" }}>
                  🍳 {recipe.cook_time_mins}min cook
                </span>
              )}
              {recipe.cuisine && recipe.cuisine !== "Other" && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--cream-dark)", color: "var(--text-mid)" }}>{recipe.cuisine}</span>
              )}
            </div>
            {recipe.description && (
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-soft)" }}>{recipe.description}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            <button onClick={onToggleFav} className="p-1.5 rounded-lg transition-colors">
              <Heart size={16} fill={recipe.is_favourite ? "var(--rose)" : "transparent"} stroke={recipe.is_favourite ? "var(--rose)" : "var(--text-soft)"} />
            </button>
            {(ingredientList.length > 0 || methodList.length > 0 || recipe.notes) && (
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg" style={{ color: "var(--text-soft)" }}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            <button onClick={onDelete} className="p-1.5 rounded-lg opacity-40 hover:opacity-80">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            {ingredientList.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>Ingredients</p>
                <ul className="space-y-1.5">
                  {ingredientList.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-dark)" }}>
                      <span className="shrink-0 font-bold mt-0.5" style={{ color: "var(--sage)" }}>·</span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {methodList.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>Method</p>
                <ol className="space-y-2.5">
                  {methodList.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="shrink-0 flex items-center justify-center text-xs font-bold rounded-full"
                        style={{ background: "var(--lavender-pale)", color: "var(--lavender)", width: 22, height: 22, minWidth: 22, marginTop: 1 }}>
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: "var(--text-dark)" }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {recipe.notes && (
              <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--gold)" }}>✨ Notes & Tips</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-mid)" }}>{recipe.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>{label}</p>
      {children}
    </div>
  );
}

export default function CookbookPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [favOnly, setFavOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [rTitle, setRTitle] = useState("");
  const [rPhotoUrl, setRPhotoUrl] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rPrepTime, setRPrepTime] = useState("");
  const [rCookTime, setRCookTime] = useState("");
  const [rIngredients, setRIngredients] = useState<string[]>([""]);
  const [rSteps, setRSteps] = useState<string[]>([""]);
  const [rNotes, setRNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cookbook", { cache: "no-store" });
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/cookbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cookbook/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setRPhotoUrl(data.url);
      else setUploadError(data.error || "Upload failed");
    } catch {
      setUploadError("Upload failed — check your connection");
    }
    setUploading(false);
  };

  const resetForm = () => {
    setRTitle(""); setRPhotoUrl(""); setRDesc("");
    setRPrepTime(""); setRCookTime("");
    setRIngredients([""]); setRSteps([""]); setRNotes("");
    setUploadError(null);
  };

  const updateIng = (i: number, val: string) => {
    const next = [...rIngredients]; next[i] = val; setRIngredients(next);
  };
  const removeIng = (i: number) => setRIngredients(rIngredients.filter((_, j) => j !== i));
  const addIngAfter = (i: number) => {
    const next = [...rIngredients]; next.splice(i + 1, 0, ""); setRIngredients(next);
  };

  const updateStep = (i: number, val: string) => {
    const next = [...rSteps]; next[i] = val; setRSteps(next);
  };
  const removeStep = (i: number) => setRSteps(rSteps.filter((_, j) => j !== i));

  const saveRecipe = async () => {
    if (!rTitle.trim()) return;
    setSaving(true);
    try {
      const res = await post({
        action: "add",
        title: rTitle.trim(),
        description: rDesc.trim() || null,
        photo_url: rPhotoUrl || null,
        prepTimeMins: rPrepTime ? parseInt(rPrepTime) : null,
        cookTimeMins: rCookTime ? parseInt(rCookTime) : null,
        ingredients: rIngredients.filter(s => s.trim()).join("\n") || null,
        method: rSteps.filter(s => s.trim()).join("\n") || null,
        notes: rNotes.trim() || null,
      });
      const data = await res.json();
      if (data.error) { console.error("[cookbook save]", data.error); }
    } catch (e) {
      console.error("[cookbook save]", e);
    }
    setSaving(false);
    resetForm();
    setShowForm(false);
    fetchData();
  };

  const favCount = recipes.filter(r => r.is_favourite).length;
  const displayed = favOnly ? recipes.filter(r => r.is_favourite) : recipes;

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
        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { label: "recipes", value: recipes.length || "—", color: "var(--gold)" },
            { label: "favourites", value: favCount || "—", color: "var(--rose)" },
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
        <div className="flex gap-2">
          <button onClick={() => setFavOnly(false)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: !favOnly ? "var(--gold)" : "var(--cream-dark)", color: !favOnly ? "white" : "var(--text-mid)" }}>
            All
          </button>
          <button onClick={() => setFavOnly(v => !v)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1"
            style={{ background: favOnly ? "var(--rose)" : "var(--rose-pale)", color: favOnly ? "white" : "var(--text-mid)" }}>
            <Heart size={11} /> Favourites
          </button>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1 shrink-0">
          <Plus size={14} /> Recipe
        </button>
      </div>

      {/* Add recipe form */}
      {showForm && (
        <div className="card px-5 py-5" style={{ background: "linear-gradient(160deg, rgba(253,240,241,0.6) 0%, rgba(255,255,255,0.9) 100%)" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>New Recipe</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} style={{ color: "var(--text-soft)" }} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Title */}
            <FormSection label="Title">
              <input
                value={rTitle}
                onChange={e => setRTitle(e.target.value)}
                className="input-fairy w-full font-semibold text-base"
                placeholder="Recipe name…"
                autoFocus
              />
            </FormSection>

            {/* Photo */}
            <FormSection label="Photo">
              {rPhotoUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/vinted/photo?url=${encodeURIComponent(rPhotoUrl)}`}
                    alt="Preview"
                    className="rounded-2xl object-cover shrink-0"
                    style={{ width: 88, height: 88, border: "2px solid var(--sage-pale)" }}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5"
                      style={{ background: "var(--sage-pale)", color: "var(--sage)" }}>
                      <Upload size={13} /> Replace photo
                    </button>
                    <button onClick={() => setRPhotoUrl("")} className="text-xs" style={{ color: "var(--text-soft)" }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed font-medium text-sm transition-all"
                  style={{ borderColor: "var(--sage-light)", color: "var(--text-mid)", background: "var(--sage-pale)", padding: "14px 16px" }}>
                  {uploading
                    ? <span className="animate-pulse">Uploading…</span>
                    : <><ImageIcon size={16} style={{ color: "var(--sage)" }} /> Add a photo</>}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              {uploadError && <p className="text-xs" style={{ color: "var(--rose)" }}>{uploadError}</p>}
            </FormSection>

            {/* Description */}
            <FormSection label="Description">
              <textarea
                value={rDesc}
                onChange={e => setRDesc(e.target.value)}
                className="input-fairy w-full text-sm leading-relaxed"
                rows={2}
                placeholder="A short description of the dish…"
                style={{ resize: "vertical" }}
              />
            </FormSection>

            {/* Timing */}
            <FormSection label="Timing">
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-mid)" }}>Prep time</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={rPrepTime}
                      onChange={e => setRPrepTime(e.target.value)}
                      type="number"
                      min="0"
                      className="input-fairy flex-1 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm shrink-0" style={{ color: "var(--text-soft)" }}>min</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-mid)" }}>Cook time</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={rCookTime}
                      onChange={e => setRCookTime(e.target.value)}
                      type="number"
                      min="0"
                      className="input-fairy flex-1 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm shrink-0" style={{ color: "var(--text-soft)" }}>min</span>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Ingredients */}
            <FormSection label="Ingredients">
              <div className="space-y-2">
                {rIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="shrink-0 text-lg leading-none font-bold" style={{ color: "var(--sage)", marginTop: -2 }}>·</span>
                    <input
                      value={ing}
                      onChange={e => updateIng(i, e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addIngAfter(i); } }}
                      className="input-fairy flex-1 text-sm"
                      placeholder={`Ingredient ${i + 1}`}
                    />
                    {rIngredients.length > 1 && (
                      <button onClick={() => removeIng(i)} className="p-1 shrink-0 opacity-40 hover:opacity-70">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRIngredients(prev => [...prev, ""])}
                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--sage)" }}>
                <Plus size={12} /> Add ingredient
              </button>
            </FormSection>

            {/* Method */}
            <FormSection label="Method">
              <div className="space-y-3">
                {rSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 flex items-center justify-center text-xs font-bold rounded-full"
                      style={{ background: "var(--lavender-pale)", color: "var(--lavender)", width: 24, height: 24, minWidth: 24, marginTop: 8 }}>
                      {i + 1}
                    </span>
                    <textarea
                      value={step}
                      onChange={e => updateStep(i, e.target.value)}
                      className="input-fairy flex-1 text-sm"
                      rows={2}
                      placeholder={`Step ${i + 1}…`}
                      style={{ resize: "vertical" }}
                    />
                    {rSteps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="p-1 shrink-0 mt-2 opacity-40 hover:opacity-70">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setRSteps(prev => [...prev, ""])}
                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--lavender)" }}>
                <Plus size={12} /> Add step
              </button>
            </FormSection>

            {/* Notes & Tips */}
            <FormSection label="Notes & Tips">
              <textarea
                value={rNotes}
                onChange={e => setRNotes(e.target.value)}
                className="input-fairy w-full text-sm"
                rows={3}
                placeholder="Substitutions, tips, make-ahead notes…"
                style={{ resize: "vertical" }}
              />
            </FormSection>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="text-sm"
                style={{ color: "var(--text-soft)" }}>
                Cancel
              </button>
              <button
                onClick={saveRecipe}
                disabled={saving || !rTitle.trim() || uploading}
                className="btn-primary text-sm px-5"
                style={{ opacity: saving || !rTitle.trim() || uploading ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save Recipe ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-3xl mb-2">👩‍🍳</p>
          <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>
            {favOnly ? "No favourites yet" : "No recipes yet"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
            {favOnly ? "Heart a recipe to save it to your favourites" : "Start building your recipe collection"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFav={() => post({ action: "toggle-fav", id: recipe.id }).then(() => fetchData())}
              onDelete={() => post({ action: "delete", id: recipe.id }).then(() => fetchData())}
            />
          ))}
        </div>
      )}
    </div>
  );
}
