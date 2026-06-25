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

// ── UK tax year helpers ───────────────────────────────────────────────────────
// UK tax year runs 6 April → 5 April. Returns e.g. "2025/26".
function getTaxYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1–12
    const day = d.getDate();
    const afterStart = month > 4 || (month === 4 && day >= 6);
    const start = afterStart ? year : year - 1;
    return `${start}/${String(start + 1).slice(2)}`;
  } catch { return null; }
}

function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const afterStart = month > 4 || (month === 4 && day >= 6);
  const start = afterStart ? year : year - 1;
  return `${start}/${String(start + 1).slice(2)}`;
}

// Self Assessment new-registrant deadline: 5 October after the tax year ends.
function getSADeadline(taxYear: string): string {
  const start = parseInt(taxYear.split("/")[0]);
  return `5 October ${start + 1}`;
}

// Human-readable tax year span, e.g. "6 Apr 2026 – 5 Apr 2027"
function taxYearSpan(taxYear: string): string {
  const start = parseInt(taxYear.split("/")[0]);
  return `6 Apr ${start} – 5 Apr ${start + 1}`;
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

  // ── tax year totals (derived from loaded entries, no extra fetch) ──────────
  const currentTaxYear = getCurrentTaxYear();
  const taxYearMap = new Map<string, { label: string; gross: number; net: number; count: number; isCurrent: boolean }>();
  for (const entry of entries) {
    // Use work_date first; fall back to pay_date. Skip entirely if neither.
    const dateStr = entry.work_date || entry.pay_date;
    const ty = getTaxYear(dateStr);
    if (!ty) continue;
    const existing = taxYearMap.get(ty) ?? { label: ty, gross: 0, net: 0, count: 0, isCurrent: ty === currentTaxYear };
    // Use gross if available; if null, fall back to net (means no platform fees recorded)
    existing.gross += parseFloat(entry.gross ?? entry.net ?? "0") || 0;
    existing.net   += parseFloat(entry.net ?? "0") || 0;
    existing.count += 1;
    taxYearMap.set(ty, existing);
  }
  const taxYearRows = Array.from(taxYearMap.values()).sort((a, b) => b.label.localeCompare(a.label));
  const currentTYData = taxYearRows.find(r => r.isCurrent) ?? null;
  const TRADING_ALLOWANCE = 1000;

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

      {/* ── Tax Year Earnings Tracker ─────────────────────────────────── */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📋</span>
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            Tax Year Earnings
          </h2>
          <span className="ml-auto tag tag-sage" style={{ fontSize: "10px" }}>£1,000 Trading Allowance</span>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
          Tracks gross income per UK tax year (6 Apr–5 Apr) against the HMRC trading allowance.
        </p>

        {/* Warning banner — shown when current tax year crosses £1,000 */}
        {currentTYData && currentTYData.gross >= TRADING_ALLOWANCE && (
          <div
            className="rounded-xl px-4 py-3.5 mb-4 flex gap-3 items-start"
            style={{ background: "rgba(212,168,83,0.12)", border: "1.5px solid rgba(212,168,83,0.55)" }}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold leading-snug" style={{ color: "#a07020" }}>
                You&apos;ve exceeded the £1,000 trading allowance in {currentTYData.label}
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-mid)" }}>
                Your gross earnings this tax year are{" "}
                <span className="font-semibold">{formatGBP(currentTYData.gross)}</span> — £{(currentTYData.gross - TRADING_ALLOWANCE).toFixed(2)} above the threshold.
                You may need to register for Self Assessment with HMRC.
                The deadline to register for {currentTYData.label} is{" "}
                <span className="font-semibold">{getSADeadline(currentTYData.label)}</span>.
              </p>
              <a
                href="https://www.gov.uk/register-for-self-assessment"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold mt-2"
                style={{ color: "#a07020", textDecoration: "underline" }}
              >
                Register for Self Assessment on gov.uk →
              </a>
            </div>
          </div>
        )}

        {/* Approaching warning — between £800 and £999 */}
        {currentTYData && currentTYData.gross >= 800 && currentTYData.gross < TRADING_ALLOWANCE && (
          <div
            className="rounded-xl px-4 py-3 mb-4 flex gap-2.5 items-start"
            style={{ background: "rgba(143,173,160,0.12)", border: "1.5px solid rgba(143,173,160,0.4)" }}
          >
            <span className="text-lg flex-shrink-0">📌</span>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-mid)" }}>
              You&apos;re <span className="font-semibold">£{(TRADING_ALLOWANCE - currentTYData.gross).toFixed(2)} away</span> from the £1,000 trading allowance in {currentTYData.label}. Keep an eye on this — once you cross £1,000 gross you&apos;ll need to register for Self Assessment.
            </p>
          </div>
        )}

        {taxYearRows.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-soft)" }}>
            No dated income entries yet — add a work date or pay date when logging income ✦
          </p>
        ) : (
          <div className="space-y-4">
            {taxYearRows.map(ty => {
              const pct = Math.min(100, (ty.gross / TRADING_ALLOWANCE) * 100);
              const over = ty.gross >= TRADING_ALLOWANCE;
              const near = !over && ty.gross >= 800;
              const barColor = over ? "#d4a853" : near ? "var(--sage)" : "var(--sage-light)";
              return (
                <div key={ty.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: "var(--text-dark)" }}>
                        {ty.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                        {taxYearSpan(ty.label)}
                      </span>
                      {ty.isCurrent && (
                        <span
                          className="tag tag-sage"
                          style={{ fontSize: "10px", padding: "1px 7px" }}
                        >
                          current
                        </span>
                      )}
                      {over && (
                        <span
                          className="tag"
                          style={{ fontSize: "10px", padding: "1px 7px", background: "rgba(212,168,83,0.15)", color: "var(--gold)", border: "1px solid rgba(212,168,83,0.4)" }}
                        >
                          ⚠️ over limit
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-sm font-bold" style={{ color: over ? "var(--gold)" : "var(--text-dark)" }}>
                        {formatGBP(ty.gross)}
                      </span>
                      <span className="text-xs ml-1" style={{ color: "var(--text-soft)" }}>gross</span>
                    </div>
                  </div>

                  {/* Progress bar toward £1,000 */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 progress-track" style={{ height: "6px" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-xs tabular-nums flex-shrink-0" style={{ color: "var(--text-soft)", minWidth: "72px", textAlign: "right" }}>
                      {pct.toFixed(0)}% of £1,000
                    </span>
                  </div>

                  <div className="flex justify-between text-xs" style={{ color: "var(--text-soft)" }}>
                    <span>{ty.count} {ty.count === 1 ? "entry" : "entries"} · net {formatGBP(ty.net)}</span>
                    {over
                      ? <span style={{ color: "var(--gold)", fontWeight: 500 }}>£{(ty.gross - TRADING_ALLOWANCE).toFixed(0)} over allowance</span>
                      : <span>£{(TRADING_ALLOWANCE - ty.gross).toFixed(0)} under allowance</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs mt-5 pt-3 leading-relaxed" style={{ color: "var(--text-soft)", borderTop: "1px solid rgba(200,184,224,0.2)" }}>
          ✦ Based on gross income (or net if gross not recorded) from entries with a work or pay date.
          The £1,000 <a href="https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>trading allowance</a> covers self-employed / side-hustle income only — PAYE employment income is taxed separately by your employer.
          This is informational only; check with an accountant for your specific situation.
        </p>
      </div>

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
