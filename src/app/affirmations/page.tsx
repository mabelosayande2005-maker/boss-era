"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";

type Affirmation = { text: string };

const CATEGORIES = [
  { label: "Self-worth", emojis: ["✨", "🦋", "💫"] },
  { label: "Abundance", emojis: ["💰", "🌟", "✨"] },
  { label: "Confidence", emojis: ["👑", "💪", "🔥"] },
  { label: "Peace", emojis: ["🌸", "🌿", "🫶"] },
];

const CARD_COLORS = [
  "linear-gradient(135deg, rgba(222,238,232,0.95) 0%, rgba(184,212,200,0.8) 100%)",
  "linear-gradient(135deg, rgba(245,213,216,0.95) 0%, rgba(232,180,184,0.8) 100%)",
  "linear-gradient(135deg, rgba(237,232,245,0.95) 0%, rgba(200,184,224,0.8) 100%)",
  "linear-gradient(135deg, rgba(240,208,128,0.5) 0%, rgba(212,168,83,0.3) 100%)",
  "linear-gradient(135deg, rgba(222,238,232,0.9) 0%, rgba(237,232,245,0.8) 100%)",
  "linear-gradient(135deg, rgba(245,213,216,0.9) 0%, rgba(237,232,245,0.8) 100%)",
];

export default function AffirmationsPage() {
  const [all, setAll] = useState<Affirmation[]>([]);
  const [daily, setDaily] = useState("");
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affirmations");
      const data = await res.json();
      setAll(data.all || []);
      setDaily(data.daily || "");
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (all.length > 0 && daily) {
      const idx = all.findIndex(a => a.text === daily);
      if (idx >= 0) setHighlighted(idx);
    }
  }, [all, daily]);

  const addAffirmation = async () => {
    if (!newText.trim()) return;
    await fetch("/api/affirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    setNewText(""); setShowForm(false);
    fetchData();
  };

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-6" style={{
        background: "linear-gradient(135deg, rgba(237,232,245,0.9) 0%, rgba(245,213,216,0.75) 50%, rgba(222,238,232,0.7) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: "var(--lavender)" }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>Daily Mantras</p>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Affirmations ✨</h1>
          </div>
          <span className="text-4xl float select-none">🦋</span>
        </div>

        {/* Today's affirmation */}
        {daily && (
          <div className="mt-5 px-5 py-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.7)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--lavender)" }}>Today&apos;s affirmation ✦</p>
            <p className="font-display font-bold italic text-xl leading-snug" style={{ color: "var(--text-dark)" }}>
              &ldquo;{daily}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Categories reminder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <div key={cat.label} className="card px-4 py-3 text-center">
            <div className="flex justify-center gap-1 mb-1">{cat.emojis.map(e => <span key={e}>{e}</span>)}</div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-mid)" }}>{cat.label}</p>
          </div>
        ))}
      </div>

      {/* All affirmations */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
          Your Mantras ({all.length})
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
          <Plus size={14} /> Add
        </button>
      </div>

      {showForm && (
        <div className="card card-lavender px-5 py-4 space-y-3">
          <h3 className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>New affirmation</h3>
          <textarea
            autoFocus
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addAffirmation(); }}
            className="input-fairy w-full text-sm"
            rows={3}
            placeholder="Write your affirmation starting with &quot;I am&quot;, &quot;I have&quot;, &quot;I attract&quot;…"
            style={{ background: "rgba(255,255,255,0.8)", resize: "none" }}
          />
          <div className="flex gap-2">
            <button onClick={addAffirmation} className="btn-primary text-sm">Save affirmation</button>
            <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}
        </div>
      ) : all.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <Sparkles size={32} className="mx-auto mb-3" style={{ color: "var(--lavender)" }} />
          <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No affirmations yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Add your personal mantras — words that remind you of who you truly are</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {all.map((aff, idx) => (
            <div key={idx}
              className="px-5 py-4 rounded-2xl group relative"
              style={{
                background: CARD_COLORS[idx % CARD_COLORS.length],
                border: highlighted === idx ? "2.5px solid var(--lavender)" : "1.5px solid rgba(200,184,224,0.2)",
                boxShadow: highlighted === idx ? "0 0 0 3px rgba(200,184,224,0.2)" : undefined,
              }}>
              {highlighted === idx && (
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles size={12} style={{ color: "var(--lavender)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--lavender)" }}>Today&apos;s pick ✦</span>
                </div>
              )}
              <p className="font-display font-bold italic text-lg leading-snug" style={{ color: "var(--text-dark)" }}>
                &ldquo;{aff.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center pb-2" style={{ color: "var(--text-soft)" }}>
        ✦ affirmations rotate daily · add your own mantras above · speak them into existence
      </p>
    </div>
  );
}
