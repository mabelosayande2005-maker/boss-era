"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { INCOME_SOURCES, SUMMER_GOAL, summerProgress } from "@/lib/utils";

type IncomeEntry = {
  id: number;
  source: string;
  source_type: string | null;
  work_date: string | null;
  pay_date: string | null;
  gross: string | null;
  tax_fees: string | null;
  net: string | null;
  account: string | null;
  notes: string | null;
};

type PayslipEntry = {
  id: number;
  employer: string;
  pay_date: string | null;
  gross_pay: string | null;
  tax_deducted: string | null;
  ni_deducted: string | null;
  tax_code: string | null;
  net_pay: string | null;
  notes: string | null;
};

type SEEntry = {
  id: number;
  source: string;
  entry_date: string | null;
  gross_amount: string | null;
  expenses: string | null;
  net_amount: string | null;
  notes: string | null;
};

type BySource = { source: string; total: string };
type Totals = { total_net: string; total_gross: string };

const SE_SOURCES = [
  { value: "Vinted",      emoji: "👗" },
  { value: "TikTok Shop", emoji: "🛍️" },
  { value: "UGC",         emoji: "🎬" },
  { value: "Brand Deal",  emoji: "✨" },
  { value: "Tutoring",    emoji: "📚" },
  { value: "Other",       emoji: "💰" },
];

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

function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const afterStart = month > 4 || (month === 4 && day >= 6);
  const start = afterStart ? year : year - 1;
  return `${start}/${String(start + 1).slice(2)}`;
}

function getSADeadline(taxYear: string): string {
  const start = parseInt(taxYear.split("/")[0]);
  return `5 October ${start + 1}`;
}

export default function IncomePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_net: "0", total_gross: "0" });
  const [bySource, setBySource] = useState<BySource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [payslips, setPayslips] = useState<PayslipEntry[]>([]);
  const [latestTaxCode, setLatestTaxCode] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [editPayslip, setEditPayslip] = useState<PayslipEntry | null>(null);
  const [expandedPayslip, setExpandedPayslip] = useState<number | null>(null);

  const [seEntries, setSEEntries] = useState<SEEntry[]>([]);
  const [showSEForm, setShowSEForm] = useState(false);
  const [editSEEntry, setEditSEEntry] = useState<SEEntry | null>(null);
  const [expandedSEEntry, setExpandedSEEntry] = useState<number | null>(null);

  const [form, setForm] = useState({
    source: "Stint",
    sourceType: "Self-Employed",
    workDate: "",
    payDate: "",
    gross: "",
    taxFees: "",
    net: "",
    account: "",
    notes: "",
  });

  const [payForm, setPayForm] = useState({
    employer: "",
    payDate: "",
    grossPay: "",
    taxDeducted: "",
    niDeducted: "",
    taxCode: "",
    netPay: "",
    notes: "",
  });

  const [seForm, setSEForm] = useState({
    source: "Vinted",
    entryDate: "",
    grossAmount: "",
    expenses: "",
    netAmount: "",
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

  const fetchPayslips = useCallback(async () => {
    try {
      const res = await fetch("/api/paye", { cache: "no-store" });
      const data = await res.json();
      setPayslips(data.payslips || []);
      setLatestTaxCode(data.latestTaxCode ?? null);
    } catch {}
  }, []);

  const fetchSEEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/se", { cache: "no-store" });
      const data = await res.json();
      setSEEntries(data.entries || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchPayslips();
    fetchSEEntries();
  }, [fetchData, fetchPayslips, fetchSEEntries]);

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

  const handlePayFormChange = (field: string, value: string) => {
    setPayForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSEFormChange = (field: string, value: string) => {
    setSEForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "grossAmount" || field === "expenses") {
        const g = parseFloat(updated.grossAmount) || 0;
        const e = parseFloat(updated.expenses) || 0;
        updated.netAmount = g > 0 ? (g - e).toFixed(2) : "";
      }
      return updated;
    });
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm({ source: "Stint", sourceType: "Self-Employed", workDate: "", payDate: "", gross: "", taxFees: "", net: "", account: "", notes: "" });
    setShowForm(true);
  };

  const openEdit = (entry: IncomeEntry) => {
    setEditEntry(entry);
    setForm({
      source: entry.source,
      sourceType: entry.source_type || "Self-Employed",
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
      sourceType: form.sourceType,
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

  const openAddPayslip = () => {
    setEditPayslip(null);
    setPayForm({ employer: "", payDate: "", grossPay: "", taxDeducted: "", niDeducted: "", taxCode: "", netPay: "", notes: "" });
    setShowPayForm(true);
  };

  const openEditPayslip = (ps: PayslipEntry) => {
    setEditPayslip(ps);
    setPayForm({
      employer: ps.employer,
      payDate: ps.pay_date?.split("T")[0] || "",
      grossPay: ps.gross_pay || "",
      taxDeducted: ps.tax_deducted || "",
      niDeducted: ps.ni_deducted || "",
      taxCode: ps.tax_code || "",
      netPay: ps.net_pay || "",
      notes: ps.notes || "",
    });
    setShowPayForm(true);
  };

  const savePayslip = async () => {
    if (!payForm.employer.trim()) return;
    const payload = {
      action: editPayslip ? "update" : "add",
      id: editPayslip?.id,
      employer: payForm.employer.trim(),
      payDate: payForm.payDate || null,
      grossPay: payForm.grossPay ? parseFloat(payForm.grossPay) : null,
      taxDeducted: payForm.taxDeducted ? parseFloat(payForm.taxDeducted) : 0,
      niDeducted: payForm.niDeducted ? parseFloat(payForm.niDeducted) : 0,
      taxCode: payForm.taxCode || null,
      netPay: payForm.netPay ? parseFloat(payForm.netPay) : null,
      notes: payForm.notes || null,
    };
    await fetch("/api/paye", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setShowPayForm(false);
    setEditPayslip(null);
    fetchPayslips();
  };

  const deletePayslip = async (id: number) => {
    await fetch("/api/paye", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchPayslips();
  };

  const openAddSE = () => {
    setEditSEEntry(null);
    setSEForm({ source: "Vinted", entryDate: "", grossAmount: "", expenses: "", netAmount: "", notes: "" });
    setShowSEForm(true);
  };

  const openEditSE = (entry: SEEntry) => {
    setEditSEEntry(entry);
    setSEForm({
      source: entry.source,
      entryDate: entry.entry_date?.split("T")[0] || "",
      grossAmount: entry.gross_amount || "",
      expenses: entry.expenses || "",
      netAmount: entry.net_amount || "",
      notes: entry.notes || "",
    });
    setShowSEForm(true);
  };

  const saveSEEntry = async () => {
    if (!seForm.source) return;
    const payload = {
      action: editSEEntry ? "update" : "add",
      id: editSEEntry?.id,
      source: seForm.source,
      entryDate: seForm.entryDate || null,
      grossAmount: seForm.grossAmount ? parseFloat(seForm.grossAmount) : null,
      expenses: seForm.expenses ? parseFloat(seForm.expenses) : 0,
      netAmount: seForm.netAmount ? parseFloat(seForm.netAmount) : (seForm.grossAmount ? parseFloat(seForm.grossAmount) : null),
      notes: seForm.notes || null,
    };
    await fetch("/api/se", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setShowSEForm(false);
    setEditSEEntry(null);
    fetchSEEntries();
  };

  const deleteSEEntry = async (id: number) => {
    await fetch("/api/se", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchSEEntries();
  };

  const totalNet = parseFloat(totals.total_net || "0");
  const goalProgress = Math.min(100, (totalNet / SUMMER_GOAL) * 100);
  const summerProg = summerProgress();

  // ── Tax year helpers ─────────────────────────────────────────────────────
  const TRADING_ALLOWANCE = 1000;
  const currentTaxYear = getCurrentTaxYear();
  const tyStart = parseInt(currentTaxYear.split("/")[0]);
  const tyStartDate = `${tyStart}-04-06`;
  const tyEndDate = `${tyStart + 1}-04-05`;

  // ── Self-employment tracker (dedicated SE entries) ────────────────────────
  const seTaxYear = { gross: 0, net: 0 };
  for (const entry of seEntries) {
    const d = entry.entry_date?.slice(0, 10) ?? null;
    if (!d || d < tyStartDate || d > tyEndDate) continue;
    seTaxYear.gross += parseFloat(String(entry.gross_amount || "0")) || 0;
    seTaxYear.net   += parseFloat(String(entry.net_amount   || "0")) || 0;
  }
  const seGross = seTaxYear.gross;

  // ── PAYE tracker (current tax year) ──────────────────────────────────────
  const payeTaxYear = { gross: 0, tax: 0, ni: 0, net: 0 };
  for (const ps of payslips) {
    const d = ps.pay_date?.slice(0, 10) ?? null;
    if (!d || d < tyStartDate || d > tyEndDate) continue;
    payeTaxYear.gross += parseFloat(String(ps.gross_pay || "0")) || 0;
    payeTaxYear.tax   += parseFloat(String(ps.tax_deducted || "0")) || 0;
    payeTaxYear.ni    += parseFloat(String(ps.ni_deducted || "0")) || 0;
    payeTaxYear.net   += parseFloat(String(ps.net_pay || "0")) || 0;
  }

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
                        style={{ width: `${pct}%`, background: "var(--sage-light)" }}
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

      {/* ── Self-Employment Tracker ──────────────────────────────────────── */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧾</span>
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            Self-Employment Tracker
          </h2>
          <span className="ml-auto tag tag-sage" style={{ fontSize: "10px" }}>{currentTaxYear}</span>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
          6 Apr {tyStart} – 5 Apr {tyStart + 1} · log SE income from Vinted, TikTok, UGC, tutoring, etc.
        </p>

        {/* Current tax year totals */}
        {seTaxYear.gross > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(253,248,236,0.8)" }}>
              <div
                className="font-bold text-base"
                style={{ color: seGross >= TRADING_ALLOWANCE ? "var(--gold)" : "var(--text-dark)" }}
              >
                {formatGBP(seTaxYear.gross)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>gross this tax year</div>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(253,248,236,0.8)" }}>
              <div className="font-bold text-base" style={{ color: "var(--sage)" }}>
                {formatGBP(seTaxYear.net)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>net this tax year</div>
            </div>
          </div>
        )}

        {/* Warning banners */}
        {seGross >= TRADING_ALLOWANCE && (
          <div
            className="rounded-xl px-4 py-3.5 flex gap-3 items-start mb-4"
            style={{ background: "rgba(212,168,83,0.12)", border: "1.5px solid rgba(212,168,83,0.55)" }}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold leading-snug" style={{ color: "#a07020" }}>
                Self Assessment registration required
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-mid)" }}>
                Your gross SE income this tax year is{" "}
                <span className="font-semibold">{formatGBP(seGross)}</span> — £{(seGross - TRADING_ALLOWANCE).toFixed(2)} above the £1,000 trading allowance.
                Deadline to register: <span className="font-semibold">{getSADeadline(currentTaxYear)}</span>.
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

        {seGross >= 800 && seGross < TRADING_ALLOWANCE && (
          <div
            className="rounded-xl px-4 py-3 flex gap-2.5 items-start mb-4"
            style={{ background: "rgba(143,173,160,0.12)", border: "1.5px solid rgba(143,173,160,0.4)" }}
          >
            <span className="text-lg flex-shrink-0">📌</span>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-mid)" }}>
              You&apos;re <span className="font-semibold">£{(TRADING_ALLOWANCE - seGross).toFixed(2)} away</span> from the £1,000 trading allowance. Once you cross £1,000 gross SE income you&apos;ll need to register for Self Assessment.
            </p>
          </div>
        )}

        {/* Entry list */}
        {seEntries.length === 0 ? (
          <p className="text-sm text-center py-3 mb-3" style={{ color: "var(--text-soft)" }}>
            No SE entries logged yet ✦
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {seEntries.map(e => (
              <div key={e.id}>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: expandedSEEntry === e.id ? "rgba(143,173,160,0.1)" : "rgba(250,246,240,0.8)",
                    border: "1.5px solid rgba(200,184,224,0.2)",
                  }}
                  onClick={() => setExpandedSEEntry(expandedSEEntry === e.id ? null : e.id)}
                >
                  <span className="text-lg">{SOURCE_EMOJI[e.source] || "💰"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{e.source}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {e.entry_date ? format(parseISO(e.entry_date), "d MMM yyyy") : "—"}
                      {e.notes && ` · ${e.notes}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: "var(--gold)" }}>{formatGBP(e.gross_amount)}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>net {formatGBP(e.net_amount)}</div>
                  </div>
                  {expandedSEEntry === e.id
                    ? <ChevronUp size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                  }
                </div>

                {expandedSEEntry === e.id && (
                  <div
                    className="mx-2 px-4 py-3 rounded-b-xl mb-1 -mt-1"
                    style={{ background: "rgba(143,173,160,0.07)", border: "1.5px solid rgba(143,173,160,0.2)", borderTop: "none" }}
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Gross: </span>
                        <span className="font-bold">{formatGBP(e.gross_amount)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Net: </span>
                        <span className="font-bold" style={{ color: "var(--gold)" }}>{formatGBP(e.net_amount)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Expenses/fees: </span>
                        <span>{formatGBP(e.expenses)}</span>
                      </div>
                      {e.notes && (
                        <div className="col-span-2">
                          <span style={{ color: "var(--text-soft)" }}>Notes: </span>
                          <span>{e.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-1"
                        onClick={() => { openEditSE(e); setExpandedSEEntry(null); }}
                      >
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all"
                        style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                        onClick={() => deleteSEEntry(e.id)}
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

        {!showSEForm && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAddSE}>
            <Plus size={14} />
            Add SE Entry
          </button>
        )}

        {showSEForm && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(200,184,224,0.25)" }}>
            <h3 className="font-display font-bold italic text-lg mb-3" style={{ color: "var(--text-dark)" }}>
              {editSEEntry ? "Edit Entry" : "Add SE Entry ✦"}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Source *</label>
                <select
                  className="input-fairy"
                  value={seForm.source}
                  onChange={ev => handleSEFormChange("source", ev.target.value)}
                >
                  {SE_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.emoji} {s.value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Date</label>
                <input
                  type="date"
                  className="input-fairy"
                  value={seForm.entryDate}
                  onChange={ev => handleSEFormChange("entryDate", ev.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Gross earned (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={seForm.grossAmount}
                  onChange={ev => handleSEFormChange("grossAmount", ev.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Expenses / fees (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={seForm.expenses}
                  onChange={ev => handleSEFormChange("expenses", ev.target.value)}
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
                  value={seForm.netAmount}
                  onChange={ev => handleSEFormChange("netAmount", ev.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
                <input
                  className="input-fairy"
                  placeholder="e.g. 3 Vinted sales, UGC video"
                  value={seForm.notes}
                  onChange={ev => handleSEFormChange("notes", ev.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-primary flex-1" onClick={saveSEEntry}>
                {editSEEntry ? "Save changes ✦" : "Add entry ✦"}
              </button>
              <button
                className="btn-primary btn-rose flex-1"
                onClick={() => { setShowSEForm(false); setEditSEEntry(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PAYE Tracker ─────────────────────────────────────────────────── */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-lg">🏢</span>
          <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>
            PAYE Tracker
          </h2>
          {latestTaxCode && (
            <span
              className="ml-auto font-mono font-bold text-sm px-3 py-1 rounded-xl flex-shrink-0"
              style={{ background: "rgba(143,173,160,0.15)", color: "var(--sage)", border: "1.5px solid rgba(143,173,160,0.3)" }}
            >
              Tax code: {latestTaxCode}
            </span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
          {currentTaxYear} · 6 Apr {tyStart} – 5 Apr {tyStart + 1} · log payslips from Stint, Liveforce, agencies, employers
        </p>

        {payeTaxYear.gross > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(253,248,236,0.8)" }}>
              <div className="font-bold text-base" style={{ color: "var(--gold)" }}>{formatGBP(payeTaxYear.gross)}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>gross</div>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(253,248,236,0.8)" }}>
              <div className="font-bold text-base" style={{ color: "var(--text-mid)" }}>{formatGBP(payeTaxYear.tax)}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>tax paid</div>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(253,248,236,0.8)" }}>
              <div className="font-bold text-base" style={{ color: "var(--text-mid)" }}>{formatGBP(payeTaxYear.ni)}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>NI paid</div>
            </div>
          </div>
        )}

        {payslips.length === 0 ? (
          <p className="text-sm text-center py-3 mb-3" style={{ color: "var(--text-soft)" }}>
            No payslips logged yet ✦
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {payslips.map(ps => (
              <div key={ps.id}>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: expandedPayslip === ps.id ? "rgba(143,173,160,0.1)" : "rgba(250,246,240,0.8)",
                    border: "1.5px solid rgba(200,184,224,0.2)",
                  }}
                  onClick={() => setExpandedPayslip(expandedPayslip === ps.id ? null : ps.id)}
                >
                  <span className="text-lg">🏢</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{ps.employer}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {ps.pay_date ? format(parseISO(ps.pay_date), "d MMM yyyy") : "—"}
                      {ps.tax_code && ` · ${ps.tax_code}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: "var(--gold)" }}>{formatGBP(ps.gross_pay)}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>net {formatGBP(ps.net_pay)}</div>
                  </div>
                  {expandedPayslip === ps.id
                    ? <ChevronUp size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                  }
                </div>

                {expandedPayslip === ps.id && (
                  <div
                    className="mx-2 px-4 py-3 rounded-b-xl mb-1 -mt-1"
                    style={{ background: "rgba(143,173,160,0.07)", border: "1.5px solid rgba(143,173,160,0.2)", borderTop: "none" }}
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Gross: </span>
                        <span className="font-bold">{formatGBP(ps.gross_pay)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Net: </span>
                        <span className="font-bold" style={{ color: "var(--gold)" }}>{formatGBP(ps.net_pay)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>Tax deducted: </span>
                        <span>{formatGBP(ps.tax_deducted)}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-soft)" }}>NI deducted: </span>
                        <span>{formatGBP(ps.ni_deducted)}</span>
                      </div>
                      {ps.tax_code && (
                        <div>
                          <span style={{ color: "var(--text-soft)" }}>Tax code: </span>
                          <span className="font-mono font-bold">{ps.tax_code}</span>
                        </div>
                      )}
                      {ps.notes && (
                        <div className="col-span-2">
                          <span style={{ color: "var(--text-soft)" }}>Notes: </span>
                          <span>{ps.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-1"
                        onClick={() => { openEditPayslip(ps); setExpandedPayslip(null); }}
                      >
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all"
                        style={{ background: "var(--rose-pale)", color: "#b06070", border: "1px solid rgba(232,180,184,0.4)" }}
                        onClick={() => deletePayslip(ps.id)}
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

        {!showPayForm && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAddPayslip}>
            <Plus size={14} />
            Add Payslip
          </button>
        )}

        {showPayForm && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(200,184,224,0.25)" }}>
            <h3 className="font-display font-bold italic text-lg mb-3" style={{ color: "var(--text-dark)" }}>
              {editPayslip ? "Edit Payslip" : "Add Payslip ✦"}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Employer / Agency *</label>
                <input
                  className="input-fairy"
                  placeholder="e.g. Stint, Liveforce, Platinum Recruitment"
                  value={payForm.employer}
                  onChange={e => handlePayFormChange("employer", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Pay date</label>
                <input
                  type="date"
                  className="input-fairy"
                  value={payForm.payDate}
                  onChange={e => handlePayFormChange("payDate", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Tax code</label>
                <input
                  className="input-fairy"
                  placeholder="e.g. 1257L"
                  value={payForm.taxCode}
                  onChange={e => handlePayFormChange("taxCode", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Gross pay (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={payForm.grossPay}
                  onChange={e => handlePayFormChange("grossPay", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Net pay (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={payForm.netPay}
                  onChange={e => handlePayFormChange("netPay", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Tax deducted (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={payForm.taxDeducted}
                  onChange={e => handlePayFormChange("taxDeducted", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>NI deducted (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-fairy"
                  placeholder="0.00"
                  value={payForm.niDeducted}
                  onChange={e => handlePayFormChange("niDeducted", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Notes</label>
                <input
                  className="input-fairy"
                  placeholder="e.g. weekly shift pay, 12hrs"
                  value={payForm.notes}
                  onChange={e => handlePayFormChange("notes", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-primary flex-1" onClick={savePayslip}>
                {editPayslip ? "Save changes ✦" : "Add payslip ✦"}
              </button>
              <button
                className="btn-primary btn-rose flex-1"
                onClick={() => { setShowPayForm(false); setEditPayslip(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit income form */}
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
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-soft)" }}>Employment type</label>
              <div className="flex gap-2">
                {(["Self-Employed", "PAYE"] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={
                      form.sourceType === st
                        ? { background: "var(--sage)", color: "#fff", border: "1.5px solid var(--sage)" }
                        : { background: "rgba(255,255,255,0.7)", color: "var(--text-mid)", border: "1.5px solid rgba(200,184,224,0.35)" }
                    }
                    onClick={() => handleFormChange("sourceType", st)}
                  >
                    {st === "Self-Employed" ? "🧾 SE" : "🏢 PAYE"}
                  </button>
                ))}
              </div>
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{entry.source}</span>
                      {entry.source_type === "PAYE" && (
                        <span className="tag tag-rose" style={{ fontSize: "9px", padding: "1px 6px" }}>PAYE</span>
                      )}
                    </div>
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
                        <span style={{ color: "var(--text-soft)" }}>Type: </span>
                        <span className={`tag tag-${entry.source_type === "PAYE" ? "rose" : "sage"}`} style={{ fontSize: "10px" }}>
                          {entry.source_type || "Self-Employed"}
                        </span>
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
