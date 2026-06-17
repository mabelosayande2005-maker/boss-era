"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { todayISO } from "@/lib/utils";

type Category = { id: number; name: string; emoji: string; monthly_budget: number; color: string };
type Expense = { id: number; title: string; amount: number; expense_date: string; category_id: number | null; category_name: string | null; category_emoji: string | null; notes: string | null };
type Saving = { id: number; name: string; target_amount: number; current_amount: number; deadline: string | null; emoji: string; color: string };

const MONTH_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

const CAT_COLORS = ["#b8d4c8", "#e8b4b8", "#c8b8e0", "#d4a853", "#f0d080", "#deeee8"];

export default function FinancePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "expenses" | "savings">("overview");

  const [showExpForm, setShowExpForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showSavForm, setShowSavForm] = useState(false);

  const [eTitle, setETitle] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eCatId, setECatId] = useState<number | "">("");
  const [eDate, setEDate] = useState(todayISO());
  const [eNotes, setENotes] = useState("");

  const [cName, setCName] = useState("");
  const [cEmoji, setCEmoji] = useState("💰");
  const [cBudget, setCBudget] = useState("");
  const [cColor, setCColor] = useState(CAT_COLORS[0]);

  const [sName, setSName] = useState("");
  const [sTarget, setSTarget] = useState("");
  const [sCurrent, setSCurrent] = useState("");
  const [sDeadline, setSDeadline] = useState("");
  const [sEmoji, setSEmoji] = useState("🐷");
  const [editSav, setEditSav] = useState<{ id: number; amount: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?month=${month}`, { cache: "no-store" });
      const data = await res.json();
      setCategories(data.categories || []);
      setExpenses(data.expenses || []);
      setSavings(data.savings || []);
      setTotalSpent(parseFloat(String(data.totals?.total_spent || 0)));
      setTotalBudget(data.totalBudget || 0);
    } catch {/* */}
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addExpense = async () => {
    if (!eTitle || !eAmount) return;
    await post({ action: "add-expense", title: eTitle, amount: parseFloat(eAmount), categoryId: eCatId || null, expenseDate: eDate, notes: eNotes || null });
    setETitle(""); setEAmount(""); setECatId(""); setEDate(todayISO()); setENotes("");
    setShowExpForm(false); fetchData();
  };

  const addCategory = async () => {
    if (!cName) return;
    await post({ action: "add-category", name: cName, emoji: cEmoji, monthlyBudget: parseFloat(cBudget) || 0, color: cColor });
    setCName(""); setCEmoji("💰"); setCBudget(""); setCColor(CAT_COLORS[0]);
    setShowCatForm(false); fetchData();
  };

  const addSaving = async () => {
    if (!sName || !sTarget) return;
    await post({ action: "add-savings", name: sName, targetAmount: parseFloat(sTarget), currentAmount: parseFloat(sCurrent) || 0, deadline: sDeadline || null, emoji: sEmoji });
    setSName(""); setSTarget(""); setSCurrent(""); setSDeadline(""); setSEmoji("🐷");
    setShowSavForm(false); fetchData();
  };

  const spentPerCat = (catId: number) =>
    expenses.filter(e => e.category_id === catId).reduce((s, e) => s + parseFloat(String(e.amount)), 0);

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    return format(new Date(parseInt(y), parseInt(mo) - 1, 1), "MMMM yyyy");
  };

  const overBudget = totalBudget > 0 && totalSpent > totalBudget;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="card px-6 py-5" style={{
        background: "linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(222,238,232,0.8) 50%, rgba(245,213,216,0.6) 100%)",
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-soft)" }}>Budget Tracker</p>
            <h1 className="font-display font-black italic text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>Finance 📊</h1>
          </div>
          <span className="text-4xl float select-none">💸</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "spent", value: `£${totalSpent.toFixed(0)}`, color: overBudget ? "var(--rose)" : "var(--text-dark)" },
            { label: "budget", value: totalBudget > 0 ? `£${totalBudget.toFixed(0)}` : "—", color: "var(--sage)" },
            { label: "left", value: totalBudget > 0 ? `£${Math.max(0, totalBudget - totalSpent).toFixed(0)}` : "—", color: "var(--gold)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
              <div className="font-display font-bold italic text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        {totalBudget > 0 && (
          <div className="mt-3">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%`, background: overBudget ? "var(--rose)" : undefined }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
              {overBudget ? `£${(totalSpent - totalBudget).toFixed(2)} over budget` : `${Math.round((totalSpent / totalBudget) * 100)}% used`}
            </p>
          </div>
        )}
      </div>

      {/* Month picker */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {MONTH_OPTIONS.map(m => (
          <button key={m} onClick={() => setMonth(m)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ background: month === m ? "var(--sage)" : "var(--sage-pale)", color: month === m ? "white" : "var(--text-mid)" }}>
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "expenses", "savings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--rose)" : "var(--rose-pale)", color: tab === t ? "white" : "var(--text-mid)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Budget by Category</h2>
            <button onClick={() => setShowCatForm(!showCatForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Category
            </button>
          </div>

          {showCatForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>New category</h3>
              <div className="flex gap-2">
                <input value={cEmoji} onChange={e => setCEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="💰" />
                <input value={cName} onChange={e => setCName(e.target.value)} className="input-fairy flex-1" placeholder="Name (e.g. Groceries)" />
                <input value={cBudget} onChange={e => setCBudget(e.target.value)} type="number" className="input-fairy w-28" placeholder="£ budget" />
              </div>
              <div className="flex gap-2">
                {CAT_COLORS.map(c => (
                  <button key={c} onClick={() => setCColor(c)} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: cColor === c ? "var(--text-dark)" : "transparent" }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addCategory} className="btn-primary text-sm">Save</button>
                <button onClick={() => setShowCatForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream-dark)" }} />)}</div>
          ) : categories.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No categories yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Add budget categories like Groceries, Going out, Transport…</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => {
                const spent = spentPerCat(cat.id);
                const budget = parseFloat(String(cat.monthly_budget));
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const over = budget > 0 && spent > budget;
                return (
                  <div key={cat.id} className="card px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-semibold flex-1" style={{ color: "var(--text-dark)" }}>{cat.name}</span>
                      <span className="text-sm font-bold" style={{ color: over ? "var(--rose)" : "var(--text-mid)" }}>
                        £{spent.toFixed(2)}{budget > 0 ? ` / £${budget.toFixed(0)}` : ""}
                      </span>
                      <button onClick={() => post({ action: "delete-category", id: cat.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {budget > 0 && (
                      <div className="progress-track" style={{ height: "6px" }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: over ? "var(--rose)" : cat.color, transition: "width 0.4s ease" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expenses */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Expenses · {monthLabel(month)}</h2>
            <button onClick={() => setShowExpForm(!showExpForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>

          {showExpForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>Log expense</h3>
              <input value={eTitle} onChange={e => setETitle(e.target.value)} className="input-fairy w-full" placeholder="What did you spend on?" />
              <div className="flex gap-2">
                <input value={eAmount} onChange={e => setEAmount(e.target.value)} type="number" step="0.01" className="input-fairy flex-1" placeholder="£ amount" />
                <input value={eDate} onChange={e => setEDate(e.target.value)} type="date" className="input-fairy flex-1" />
              </div>
              <select value={eCatId} onChange={e => setECatId(e.target.value ? parseInt(e.target.value) : "")} className="input-fairy w-full">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
              <input value={eNotes} onChange={e => setENotes(e.target.value)} className="input-fairy w-full" placeholder="Notes (optional)" />
              <div className="flex gap-2">
                <button onClick={addExpense} className="btn-primary text-sm">Log it</button>
                <button onClick={() => setShowExpForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">💸</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No expenses logged</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Start tracking where your money goes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div key={exp.id} className="card px-4 py-3 flex items-center gap-3 group">
                  <span className="text-xl">{exp.category_emoji || "💰"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-dark)" }}>{exp.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {exp.category_name || "Uncategorised"} · {exp.expense_date ? format(new Date(String(exp.expense_date).split("T")[0] + "T12:00:00"), "d MMM") : ""}
                    </p>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "var(--text-dark)" }}>£{parseFloat(String(exp.amount)).toFixed(2)}</span>
                  <button onClick={() => post({ action: "delete-expense", id: exp.id }).then(() => fetchData())} className="opacity-0 group-hover:opacity-60 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="card px-4 py-3 flex justify-between items-center" style={{ background: "rgba(212,168,83,0.12)" }}>
                <span className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>Total spent</span>
                <span className="font-bold text-lg" style={{ color: "var(--gold)" }}>£{totalSpent.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Savings */}
      {tab === "savings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold italic text-xl" style={{ color: "var(--text-dark)" }}>Savings Goals</h2>
            <button onClick={() => setShowSavForm(!showSavForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> Goal
            </button>
          </div>

          {showSavForm && (
            <div className="card px-5 py-4 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-dark)" }}>New savings goal</h3>
              <div className="flex gap-2">
                <input value={sEmoji} onChange={e => setSEmoji(e.target.value)} className="input-fairy w-16 text-center text-xl" placeholder="🐷" />
                <input value={sName} onChange={e => setSName(e.target.value)} className="input-fairy flex-1" placeholder="Goal name" />
              </div>
              <div className="flex gap-2">
                <input value={sTarget} onChange={e => setSTarget(e.target.value)} type="number" className="input-fairy flex-1" placeholder="£ target" />
                <input value={sCurrent} onChange={e => setSCurrent(e.target.value)} type="number" className="input-fairy flex-1" placeholder="£ saved so far" />
              </div>
              <input value={sDeadline} onChange={e => setSDeadline(e.target.value)} type="date" className="input-fairy w-full" />
              <div className="flex gap-2">
                <button onClick={addSaving} className="btn-primary text-sm">Add goal</button>
                <button onClick={() => setShowSavForm(false)} className="text-sm" style={{ color: "var(--text-soft)" }}>Cancel</button>
              </div>
            </div>
          )}

          {savings.length === 0 ? (
            <div className="card px-5 py-10 text-center">
              <p className="text-3xl mb-2">🐷</p>
              <p className="font-display font-bold italic text-lg" style={{ color: "var(--text-dark)" }}>No savings goals yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>Create goals for holidays, treats, emergency fund…</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savings.map(sav => {
                const current = parseFloat(String(sav.current_amount));
                const target = parseFloat(String(sav.target_amount));
                const pct = Math.min(100, (current / target) * 100);
                return (
                  <div key={sav.id} className="card px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{sav.emoji}</span>
                        <div>
                          <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{sav.name}</p>
                          {sav.deadline && (
                            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                              by {format(new Date(String(sav.deadline).split("T")[0] + "T12:00:00"), "d MMM yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: "var(--gold)" }}>£{current.toFixed(0)} / £{target.toFixed(0)}</span>
                        <button onClick={() => post({ action: "delete-savings", id: sav.id }).then(() => fetchData())} className="opacity-40 hover:opacity-80">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: sav.color || "var(--sage)" }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: "var(--text-soft)" }}>{Math.round(pct)}% saved</span>
                      {editSav?.id === sav.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" value={editSav.amount} onChange={e => setEditSav({ ...editSav, amount: e.target.value })}
                            className="input-fairy w-24 text-sm" placeholder="£ total saved" />
                          <button onClick={async () => {
                            await post({ action: "update-savings", id: sav.id, currentAmount: parseFloat(editSav.amount) || 0 });
                            setEditSav(null); fetchData();
                          }} className="btn-primary text-xs px-2 py-1">Save</button>
                          <button onClick={() => setEditSav(null)} className="text-xs" style={{ color: "var(--text-soft)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditSav({ id: sav.id, amount: String(current) })}
                          className="text-xs font-semibold" style={{ color: "var(--sage)" }}>
                          + Add funds
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
