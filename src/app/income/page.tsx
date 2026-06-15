"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { INCOME_SOURCES, SUMMER_GOAL, summerProgress } from "@/lib/utils";

type IncomeEntry = {
  id: number;
  source: string;
  work_date: string | null;
  pay_date: string | null;
  gross: string | null;
  tax_fees: string | null;
  net: string | null;
  account: string | null;
  notes: string | null;
};

type BySource = { source: string; total: string };
type Totals = { total_net: string; total_gross: string };

const SOURCE_EMOJI: Record<string, string> = {
  Stint: "⚡",
  Liveforce: "🎪",
  "Platinum Recruitment": "💎",
  SUSU: "🎓",
  "TikTok Shop": "🛍️",
  "Brand Deal": "✨",
  Vinted: "👗",
  Tutoring: "📚",
  Other: "💰",
};

const MILESTONES = [
  { label: "June end", target: 1000, month: 5 },
  { label: "July end", target: 2500, month: 6 },
  { label: "August end", target: 5000, month: 7 },
];

function formatGBP(val: string | null | number): string {
  const n = parseFloat(String(val || "0"));
  if (isNaN(n)) return "£0.00";
  return `£${n.toFixed(2)}`;
}

export default function IncomePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_net: "0", total_gross: "0" });
  const [bySource, setBySource] = useState<BySource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    source: "Stint",
    workDate: "",
    payDate: "",
    gross: "",
    taxFees: "",
    net: "",
    account: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/income");
      const data = await res.json();
      setEntries(data.entries || []);
      setTotals(data.totals || { total_net: "0", total_gross: "0" });
      setBySource(data.bySource || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if ((field === "gross" || field === "taxFees") && updated.gross && !editEntry) {
        const g = parseFloat(updated.gross) || 0;
        const t = parseFloat(updated.taxFees) || 0;
        updated.net = (g - t).toFixed(2);
      }
      return updated;
    });
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm({ source: "Stint", workDate: "", payDate: "", gross: "", taxFees: "", net: "", account: "", notes: "" });
    setShowForm(true);
  };

  const openEdit = (entry: IncomeEntry) => {
    setEditEntry(entry);
    setForm({
      source: entry.source,
      workDate: entry.work_date?.split("T")[0] || "",
      payDate: entry.pay_date?.split("T")[0] || "",
      gross: entry.gross || "",
      taxFees: entry.tax_fees || "",
      net: entry.net || "",
      account: entry.account || "",
      notes: entry.notes || "",
    });
    setShowForm(true);
  };

  const saveEntry = async () => {
    if (!form.source) return;
    const payload = {
      action: editEntry ? "update" : "add",
      id: editEntry?.id,
      source: form.source,
      workDate: form.workDate || null,
      payDate: form.payDate || null,
      gross: form.gross ? parseFloat(form.gross) : null,
      taxFees: form.taxFees ? parseFloat(form.taxFees) : 0,
      net: form.net ? parseFloat(form.net) : (form.gross ? parseFloat(form.gross) : null),
      account: form.account || null,
      notes: form.notes || null,
    };
    await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    fetchData();
  };

  const deleteEntry = async (id: number) => {
    await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchData();
  };

  const totalNet = parseFloat(totals.total_net || "0");
  const goalProgress = Math.min(100, (totalNet / SUMMER_GOAL) * 100);
  const summerProg = summerProgress();

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(253,248,236,0.95) 0%, rgba(250,246,240,0.9) 50%, rgba(222,238,232,0.8) 100%)",
      }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wide font-medium" style={{ color: "var(--text-soft)" }}>
                Summer 2026 · Income Tracker
              </span>
            </div>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
              💸 £5k Goal
            </h1>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
            <Plus size={14} />
            Log Income
          </button>
        </div>

        {/* Main progress */}
        <div className="mb-2">
          <div className="flex items-end justify-between mb-1">
            <span className="font-display font-bold italic text-2xl" style={{ color: "var(--gold)" }}>
              {formatGBP(totalNet)}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--text-soft)" }}>
              of £{SUMMER_GOAL.toLocaleString()} goal
            </span>
          </div>
          <div className="progress-track h-3 mb-1">
            <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--text-soft)" }}>
            <span>{goalProgress.toFixed(1)}% of goal</span>
            <span>£{(SUMMER_GOAL - totalNet).toFixed(0)} to go</span>
          </div>
        </div>

        {/* Summer progress */}
        <div className="mt-4 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.5)" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              ☀️ Summer progress
            </span>
            <span className="text-xs" style={{ color: "var(--text-soft)" }}>
              {summerProg.toFixed(0)}%
            </span>
          </div>
          <div className="progress-track h-1.5">
            <div className="progress-fill" style={{ width: `${summerProg}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-soft)" }}>
            <span>12 Jun</span>
            <span>31 Aug</span>
          </div>
        </div>
      </div>

      {/* Monthly milestones */}
      <div className="grid grid-cols-3 gap-3">
        {MILESTONES.map((m) => {
          const achieved = totalNet >= m.target;
          return (
            <div
              key={m.label}
              className="card px-4 py-3 text-center"
              style={{
                background: achieved
                  ? "linear-gradient(135deg, rgba(143,173,160,0.2), rgba(212,168,83,0.15))"
                  : "rgba(255,255,255,0.7)",
                border: achieved ? "1.5px solid rgba(143,173,160,0.4)" : undefined,
              }}
            >
              <div className="text-lg mb-1">{achieved ? "✅" : "🎯"}</div>
              <div className="font-display font-bold italic text-base" style={{ color: achieved ? "var(--sage)" : "var(--text-dark)" }}>
                £{m.target.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--text-soft)" }}>{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* By source breakdown */}
      {bySource.length > 0 && (
        <div className="card px-5 py-4">
          <h2 className="font-display font-bold italic text-xl mb-4" style={{ color: "var(--text-dark)" }}>
            By Source
          </h2>
          <div className="space-y-2">
            {bySource.map(s => {
              const pct = totalNet > 0 ? (parseFloat(s.total) / totalNet) * 100 : 0;
              return (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{SOURCE_EMOJI[s.source] || "💰"}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>{s.source}</span>
                      <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>{formatGBP(s.total)}</span>
                    </div>
                    <div className="progress-track h-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: "var(--sage-light)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs w-10 text-right" style={{ color: "var(--text-soft)" }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="card px-5 py-5" style={{ border: "1.5px solid rgba(143,173,160,0.4)" }}>
          <h2 className="font-display font-bold italic text-xl mb-4" style={{ color: "var(--text-dark)" }}>
            {editEntry ? "Edit Entry" : "Log Income ✦"}
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Source *</label>
              <select
                className="input-fairy"
                value={form.source}
                onChange={e => handleFormChange("source", e.target.value)}
              >
                {INCOME_SOURCES.map(s => (
                  <option key={s} value={s}>{SOURCE_EMOJI[s] || "💰"} {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Account paid into</label>
              <input
                className="input-fairy"
                placeholder="e.g. Monzo, Lloyds"
                value={form.account}
                onChange={e => handleFormChange("account", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Work date</label>
              <input
                type="date"
                className="input-fairy"
                value={form.workDate}
                onChange={e => handleFormChange("workDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Pay date</label>
              <input
                type="date"
                className="input-fairy"
                value={form.payDate}
                onChange={e => handleFormChange("payDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Gross (£)</label>
              <input
                type="number"
                step="0.01"
                className="input-fairy"
                placeholder="0.00"
                value={form.gross}
                onChange={e => handleFormChange("gross", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Tax / Fees (£)</label>
              <input
                type="number"
                step="0.01"
                className="input-fairy"
                placeholder="0.00"
                value={form.taxFees}
                onChange={e => handleFormChange("taxFees", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>
                Net (£) <span style={{ color: "var(--sage)" }}>— auto-calculated</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="input-fairy"
                placeholder="0.00"
                value={form.net}
                onChange={e => handleFormChange("net", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
              <input
                className="input-fairy"
                placeholder="e.g. weekend shift, 8hrs"
                value={form.notes}
                onChange={e => handleFormChange("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn-primary flex-1" onClick={saveEntry}>
              {editEntry ? "Save changes ✦" : "Log it ✦"}
            </button>
            <button
              className="btn-primary btn-rose flex-1"
              onClick={() => { setShowForm(false); setEditEntry(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="card px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            All Entries
          </h2>
          <span className="tag tag-sage">{entries.length} entries</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--cream-dark)" }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">💸</div>
            <p className="font-display font-bold italic text-lg mb-1" style={{ color: "var(--text-dark)" }}>
              No income logged yet
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              Start logging your earnings toward £5k
            </p>
            <button className="btn-primary" onClick={openAdd}>Log first entry ✦</button>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id}>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: expandedEntry === entry.id ? "rgba(143,173,160,0.1)" : "rgba(250,246,240,0.8)",
                    border: "1.5px solid rgba(200,184,224,0.2)",
                  }}
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                >
                  <span className="text-lg">{SOURCE_EMOJI[entry.source] || "💰"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{entry.source}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {entry.work_date ? format(parseISO(entry.work_date), "d MMM") : "—"}
                      {entry.notes && ` · ${entry.notes}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: "var(--gold)" }}>
                      {formatGBP(entry.net)}
                    </div>
                    {entry.gross && parseFloat(entry.gross) !== parseFloat(entry.net || "0") && (
                      <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                        gross {formatGBP(entry.gross)}
                      </div>
                    )}
                  </div>
                  {expandedEntry === entry.id
                    ? <ChevronUp size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                  }
                </div>

                {expandedEntry === entry.id && (
                  <div className="mx-2 px-4 py-3 rounded-b-xl mb-1 -mt-1"
                    style={{ background: "rgba(143,173,160,0.07)", border: "1.5px solid rgba(143,173,160,0.2)", borderTop: "none" }}>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Work date: </span>
                        <span>{entry.work_date ? format(parseISO(entry.work_date), "d MMM yyyy") : "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Pay date: </span>
                        <span>{entry.pay_date ? format(parseISO(entry.pay_date), "d MMM yyyy") : "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Gross: </span>
                        <span>{formatGBP(entry.gross)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Tax/fees: </span>
                        <span>{formatGBP(entry.tax_fees)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Net: </span>
                        <span className="font-bold" style={{ color: "var(--gold)" }}>{formatGBP(entry.net)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Account: </span>
                        <span>{entry.account || "—"}</span>
                      </div>
                      {entry.notes && (
                        <div className="col-span-2">
                          <span style={{ color: "var(--text-soft)" }}>Notes: </span>
                          <span>{entry.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-1"
                        onClick={() => { openEdit(entry); setExpandedEntry(null); }}
                      >
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all"
                        style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Running total */}
      {entries.length > 0 && (
        <div className="card px-5 py-4" style={{ background: "linear-gradient(135deg, rgba(253,248,236,0.95), rgba(240,208,128,0.15))" }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="font-display font-black italic text-3xl" style={{ color: "var(--gold)" }}>
                {formatGBP(totals.total_net)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>total net</div>
            </div>
            <div className="text-center">
              <div className="font-display font-black italic text-3xl" style={{ color: "var(--text-mid)" }}>
                {formatGBP(totals.total_gross)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>total gross</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
