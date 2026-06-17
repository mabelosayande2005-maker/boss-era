"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";

type WellbeingLog = {
  id: number;
  log_date: string;
  mood_score: number | null;
  energy_level: number | null;
  sleep_hours: number | null;
  water_glasses: number;
  anxiety_level: number | null;
  journal_entry: string | null;
};

const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "✨"];
const MOOD_LABELS = ["Rough", "Meh", "Okay", "Good", "Amazing"];
const ENERGY_EMOJIS = ["🪫", "😴", "⚡", "🔋", "🚀"];
const WATER_TARGET = 8;

const SCORE_BG: Record<number, string> = {
  1: "rgba(232,180,184,0.3)", 2: "rgba(245,213,216,0.3)",
  3: "rgba(212,168,83,0.2)", 4: "rgba(184,212,200,0.3)", 5: "rgba(143,173,160,0.3)",
};

export default function WellbeingPage() {
  const [todayLog, setTodayLog] = useState<WellbeingLog | null>(null);
  const [history, setHistory] = useState<WellbeingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState("");
  const [water, setWater] = useState(0);
  const [anxiety, setAnxiety] = useState<number | null>(null);
  const [journal, setJournal] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wellbeing?days=14", { cache: "no-store" });
      const data = await res.json();
      setHistory(data.logs || []);
      if (data.todayLog) {
        const t = data.todayLog;
        setTodayLog(t);
        setMood(t.mood_score);
        setEnergy(t.energy_level);
        setSleep(t.sleep_hours ? String(t.sleep_hours) : "");
        setWater(t.water_glasses || 0);
        setAnxiety(t.anxiety_level);
        setJournal(t.journal_entry || "");
      }
    } catch {/* */}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/wellbeing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log",
        moodScore: mood,
        energyLevel: energy,
        sleepHours: sleep ? parseFloat(sleep) : null,
        waterGlasses: water,
        anxietyLevel: anxiety,
        journalEntry: journal || null,
      }),
    });
    await fetchData();
    setSaving(false);
  };

  const adjustWater = async (next: number) => {
    const clamped = Math.max(0, Math.min(12, next));
    setWater(clamped);
    await fetch("/api/wellbeing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "water", glasses: clamped }),
    });
  };

  const dayLabel = (log: WellbeingLog) => {
    try { return format(parseISO(String(log.log_date).split("T")[0]), "EEE d"); }
    catch { return ""; }
  };

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(245,213,216,0.85) 0%, rgba(237,232,245,0.75) 60%, rgba(222,238,232,0.7) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Daily Check-In</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Wellbeing 🌸</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-mid)" }}>
              {format(new Date(), "EEEE, d MMMM")} — take care of you first
            </p>
          </div>
          <span className="text-4xl float select-none">🌿</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { label: "mood", value: mood ? MOOD_EMOJIS[mood - 1] : "—", sub: mood ? MOOD_LABELS[mood - 1] : "not set" },
            { label: "energy", value: energy ? ENERGY_EMOJIS[energy - 1] : "—", sub: energy ? `level ${energy}` : "not set" },
            { label: "sleep", value: sleep ? `${sleep}h` : "—", sub: "last night" },
            { label: "water", value: `${water}/${WATER_TARGET}`, sub: "glasses" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-2 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-xl leading-none" style={{ color: "var(--sage)" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Mood, Energy, Anxiety */}
        <div className="card px-5 py-4 space-y-5">
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>🌸 Mood & Energy</h2>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>How are you feeling?</p>
            <div className="flex gap-2">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button key={i} onClick={() => setMood(i + 1)}
                  className="flex-1 py-2 rounded-xl text-xl transition-all"
                  style={{
                    background: mood === i + 1 ? SCORE_BG[i + 1] : "var(--cream-dark)",
                    border: `2px solid ${mood === i + 1 ? "rgba(143,173,160,0.6)" : "transparent"}`,
                    transform: mood === i + 1 ? "scale(1.08)" : "scale(1)",
                  }}
                  title={MOOD_LABELS[i]}
                >{emoji}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>Energy level</p>
            <div className="flex gap-2">
              {ENERGY_EMOJIS.map((emoji, i) => (
                <button key={i} onClick={() => setEnergy(i + 1)}
                  className="flex-1 py-2 rounded-xl text-xl transition-all"
                  style={{
                    background: energy === i + 1 ? "rgba(143,173,160,0.25)" : "var(--cream-dark)",
                    border: `2px solid ${energy === i + 1 ? "var(--sage)" : "transparent"}`,
                    transform: energy === i + 1 ? "scale(1.08)" : "scale(1)",
                  }}
                >{emoji}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>Anxiety (1 = calm, 5 = anxious)</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setAnxiety(i)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: anxiety === i ? "rgba(200,184,224,0.35)" : "var(--cream-dark)",
                    border: `2px solid ${anxiety === i ? "var(--lavender)" : "transparent"}`,
                    color: anxiety === i ? "var(--text-dark)" : "var(--text-soft)",
                  }}
                >{i}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Sleep & Water */}
        <div className="card card-sage px-5 py-4 space-y-5">
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>💤 Sleep & Water</h2>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>Hours of sleep</p>
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="24" step="0.5" value={sleep}
                onChange={e => setSleep(e.target.value)}
                className="input-fairy w-28 text-center text-lg font-bold" placeholder="7.5" />
              <span className="text-sm" style={{ color: "var(--text-soft)" }}>
                {sleep ? (parseFloat(sleep) >= 7 ? "✓ well rested" : parseFloat(sleep) >= 5 ? "okay" : "need more rest") : "hours"}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-soft)" }}>
              Water — {water}/{WATER_TARGET} glasses
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: WATER_TARGET }).map((_, i) => (
                <button key={i} onClick={() => adjustWater(i < water ? i : i + 1)}
                  className="text-2xl transition-transform hover:scale-110" title={i < water ? "Remove" : "Add"}>
                  {i < water ? "💧" : "🫙"}
                </button>
              ))}
              {water > WATER_TARGET && (
                <span className="text-xs font-bold ml-1" style={{ color: "var(--sage)" }}>+{water - WATER_TARGET}</span>
              )}
            </div>
            <div className="progress-track mt-3">
              <div className="progress-fill" style={{ width: `${Math.min(100, (water / WATER_TARGET) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="card card-lavender px-5 py-4">
        <h2 className="font-display font-bold italic text-xl mb-3" style={{ color: "var(--text-dark)" }}>📝 Today&apos;s Journal</h2>
        <textarea
          className="input-fairy w-full text-sm leading-relaxed"
          rows={5}
          placeholder="How are you really doing? What&apos;s on your mind? What are you proud of today? ✨"
          value={journal}
          onChange={e => setJournal(e.target.value)}
          style={{ resize: "vertical", background: "rgba(255,255,255,0.7)" }}
        />
        <button onClick={save} disabled={saving} className="btn-primary mt-3">
          {saving ? "Saving…" : todayLog ? "Update today's log ✦" : "Save today's log ✦"}
        </button>
      </div>

      {/* History */}
      {!loading && history.length > 0 && (
        <div className="card px-5 py-4">
          <h2 className="font-display font-bold italic text-xl mb-4" style={{ color: "var(--text-dark)" }}>📊 Last 14 Days</h2>
          <div className="space-y-2">
            {history.map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: "rgba(250,246,240,0.6)" }}>
                <span className="text-xs font-semibold w-14 shrink-0" style={{ color: "var(--text-soft)" }}>{dayLabel(log)}</span>
                <span className="text-lg w-7">{log.mood_score ? MOOD_EMOJIS[log.mood_score - 1] : "—"}</span>
                <span className="text-lg w-7">{log.energy_level ? ENERGY_EMOJIS[log.energy_level - 1] : "—"}</span>
                <span className="text-sm w-10" style={{ color: "var(--text-mid)" }}>{log.sleep_hours ? `${log.sleep_hours}h` : "—"}</span>
                <div className="flex-1 flex items-center gap-0.5">
                  {Array.from({ length: Math.min(8, log.water_glasses || 0) }).map((_, i) => (
                    <span key={i} className="text-xs">💧</span>
                  ))}
                </div>
                {log.journal_entry && <span className="text-xs" style={{ color: "var(--text-soft)" }}>📝</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
