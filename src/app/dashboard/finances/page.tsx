// src/app/dashboard/finances/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeContext";

// ── Types ─────────────────────────────────────────────────────
type Bill = {
  id: string; name: string; category: string; frequency: string;
  anticipated_amount: number; budget_amount: number; day_of_month: number;
  start_date: string; is_autopay: boolean; payee_name: string;
  phone: string; website: string; notes: string;
  instances?: Instance[];
  credentials?: Credentials;
};
type CreditCard = {
  id: string; name: string; issuer: string; current_balance: number;
  credit_limit: number; minimum_payment: number; anticipated_payment: number;
  apr: number; due_day: number; last_four: string; card_type: string;
  is_autopay: boolean; notes: string;
  instances?: CCInstance[];
};
type Instance = {
  id: string; due_date: string; scheduled_date: string; status: string;
  anticipated_amount: number; actual_amount: number; remaining_balance: number;
  paid_date: string; paid_full: boolean;
  promise_to_pay_date: string; promise_to_pay_date_2: string;
  fees?: Fee[];
};
type CCInstance = {
  id: string; due_date: string; status: string;
  statement_balance: number; minimum_payment: number;
  actual_payment: number; remaining_balance: number;
  paid_date: string; paid_full: boolean; promise_to_pay_date: string;
};
type Fee = {
  id: string; fee_type: string; amount: number; description: string;
  assessed_date: string; waived: boolean;
};
type Credentials = {
  account_number: string | null; username: string | null;
  password: string | null; pin: string | null;
  website: string; phone: string;
};
type DashboardData = {
  summary: {
    total_budget_monthly: number; total_paid_this_month: number;
    total_due_this_month: number; total_past_due: number;
    bills_count: number; cards_count: number;
    past_due_count: number; due_soon_count: number;
  };
  credit_cards: { total_balance: number; total_limit: number; utilization_pct: number; cards: CreditCard[] };
  category_breakdown: Record<string, { budget: number; actual: number; count: number }>;
  due_soon: object[]; past_due: object[];
};
type UpcomingData = {
  upcoming: UpcomingItem[]; past_due: UpcomingItem[];
};
type UpcomingItem = {
  type: string; id: string | null; bill_id?: string; card_id?: string;
  name: string; category: string; due_date: string; frequency: string;
  anticipated_amount: number; actual_amount: number | null;
  remaining_balance: number | null; status: string;
  paid_date: string | null; paid_full: boolean;
  promise_to_pay_date: string | null; promise_to_pay_date_2: string | null;
  minimum_payment?: number; current_balance?: number; issuer?: string;
};

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  { id: "financial_accounts", label: "Financial Accounts", icon: "🏦" },
  { id: "credit_cards",       label: "Credit Cards",       icon: "💳" },
  { id: "vehicles",           label: "Vehicles",           icon: "🚗" },
  { id: "insurance",          label: "Insurance",          icon: "🛡️" },
  { id: "housing",            label: "Housing",            icon: "🏠" },
  { id: "utilities",          label: "Utilities",          icon: "⚡" },
  { id: "subscriptions",      label: "Subscriptions",      icon: "📱" },
  { id: "memberships",        label: "Memberships",        icon: "🎫" },
  { id: "clothing",           label: "Clothing",           icon: "👕" },
  { id: "fees",               label: "Fees",               icon: "📋" },
  { id: "food",               label: "Food",               icon: "🍽️" },
  { id: "other",              label: "Other",              icon: "📦" },
];

const FREQUENCIES = [
  { id: "weekly",      label: "Weekly"      },
  { id: "biweekly",   label: "Bi-Weekly"   },
  { id: "monthly",    label: "Monthly"     },
  { id: "bimonthly",  label: "Bi-Monthly"  },
  { id: "quarterly",  label: "Quarterly"   },
  { id: "semi_annual",label: "Semi-Annual" },
  { id: "annual",     label: "Annual"      },
  { id: "one_time",   label: "One-Time"    },
];

const STATUS_COLORS: Record<string, string> = {
  upcoming:       "#A8C8E8",
  due_today:      "#F0C4A0",
  past_due:       "#E8A5A5",
  promise_to_pay: "#B5A8D4",
  paid_partial:   "#F0C4A0",
  paid_full:      "#A8C5A0",
  skipped:        "#D4C4B4",
  waived:         "#D4C4B4",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming:       "Upcoming",
  due_today:      "Due Today",
  past_due:       "Past Due",
  promise_to_pay: "Promise to Pay",
  paid_partial:   "Partial",
  paid_full:      "Paid",
  skipped:        "Skipped",
  waived:         "Waived",
};

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const daysSince = (d: string) =>
  Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000);

// ── Components ────────────────────────────────────────────────
function RevealField({ label, value }: { label: string; value: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);
  if (!value) return null;

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 12px", border: "1px solid #EDE0D8" }}>
        <span style={{ flex: 1, fontSize: 13, fontFamily: "monospace", color: "#3D2C2C", letterSpacing: revealed ? 1 : 3 }}>
          {revealed ? value : "•".repeat(Math.min(value.length, 12))}
        </span>
        <button onClick={() => setRevealed(r => !r)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>{revealed ? "🙈" : "👁️"}</button>
        <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>{copied ? "✅" : "📋"}</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#D4C4B4";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: color + "40", color: color.replace("A8", "6A").replace("F0", "C4"), border: `1px solid ${color}60` }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function BudgetBar({ budget, actual, accent }: { budget: number; actual: number; accent: string }) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
  const over = actual > budget;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: "#B8A8A8", fontWeight: 600 }}>Budget vs Actual</span>
        <span style={{ color: over ? "#E8A5A5" : "#A8C5A0", fontWeight: 700 }}>{fmt(actual)} / {fmt(budget)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#EDE0D8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: over ? "#E8A5A5" : accent, borderRadius: 3, transition: "width 0.4s" }}/>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FinancesPage() {
  const { theme } = useTheme();
  const accent = theme.accent;

  // Navigation state
  const [view,        setView]        = useState<"dashboard"|"accounts"|"upcoming"|"past_due"|"history"|"search">("dashboard");
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Data state
  const [dashboard,  setDashboard]   = useState<DashboardData | null>(null);
  const [bills,      setBills]       = useState<Bill[]>([]);
  const [cards,      setCards]       = useState<CreditCard[]>([]);
  const [upcoming,   setUpcoming]    = useState<UpcomingData | null>(null);
  const [loading,    setLoading]     = useState(true);
  const [searchQ,    setSearchQ]     = useState("");

  // Modal state
  const [addModal,   setAddModal]    = useState<"bill"|"card"|null>(null);
  const [detailItem, setDetailItem]  = useState<Bill | CreditCard | null>(null);
  const [payModal,   setPayModal]    = useState<UpcomingItem | null>(null);

  // Form state
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/finances/dashboard");
    if (res.ok) setDashboard(await res.json());
  }, []);

  const loadBills = useCallback(async (category?: string) => {
    const url = category ? `/api/finances/bills?category=${category}` : "/api/finances/bills";
    const res = await fetch(url);
    if (res.ok) setBills(await res.json());
  }, []);

  const loadCards = useCallback(async () => {
    const res = await fetch("/api/finances/credit-cards");
    if (res.ok) setCards(await res.json());
  }, []);

  const loadUpcoming = useCallback(async () => {
    const res = await fetch("/api/finances/upcoming?days=30&count=10");
    if (res.ok) setUpcoming(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDashboard(), loadBills(), loadCards(), loadUpcoming()])
      .finally(() => setLoading(false));
  }, [loadDashboard, loadBills, loadCards, loadUpcoming]);

  useEffect(() => {
    if (view === "accounts") loadBills(activeCategory ?? undefined);
  }, [view, activeCategory, loadBills]);

  const handleSaveBill = async () => {
    setSaving(true);
    const res = await fetch("/api/finances/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setAddModal(null);
      setForm({});
      await Promise.all([loadBills(), loadDashboard()]);
    }
    setSaving(false);
  };

  const handleSaveCard = async () => {
    setSaving(true);
    const res = await fetch("/api/finances/credit-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setAddModal(null);
      setForm({});
      await Promise.all([loadCards(), loadDashboard()]);
    }
    setSaving(false);
  };

  const handleLogPayment = async () => {
    if (!payModal) return;
    setSaving(true);
    const isPaid = form.paid_full === "true";
    const amount = parseFloat(form.actual_amount ?? "0");
    const body = {
      bill_id:          payModal.bill_id,
      scheduled_date:   payModal.due_date,
      due_date:         payModal.due_date,
      anticipated_amount: payModal.anticipated_amount,
      actual_amount:    amount,
      remaining_balance: isPaid ? 0 : (payModal.anticipated_amount - amount),
      status:           isPaid ? "paid_full" : amount > 0 ? "paid_partial" : payModal.status,
      paid_date:        form.paid_date ?? new Date().toISOString().split("T")[0],
      paid_full:        isPaid,
      promise_to_pay_date:   form.promise_to_pay_date ?? null,
      promise_to_pay_date_2: form.promise_to_pay_date_2 ?? null,
      promise_notes:    form.promise_notes ?? null,
    };
    const res = await fetch("/api/finances/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setPayModal(null);
      setForm({});
      await Promise.all([loadUpcoming(), loadDashboard()]);
    }
    setSaving(false);
  };

  const f = (key: string) => form[key] ?? "";
  const sf = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Input helper ─────────────────────────────────
  const Input = ({ label, k, type = "text", placeholder = "" }: { label: string; k: string; type?: string; placeholder?: string }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 6 }}>{label}</div>
      <input
        type={type} value={f(k)} onChange={e => sf(k)(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 14, color: "#3D2C2C", background: "#fff", outline: "none", fontFamily: "inherit" }}
      />
    </div>
  );

  const Select = ({ label, k, options }: { label: string; k: string; options: { id: string; label: string }[] }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 6 }}>{label}</div>
      <select value={f(k)} onChange={e => sf(k)(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 14, color: "#3D2C2C", background: "#fff", outline: "none", fontFamily: "inherit" }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  // ── Views ─────────────────────────────────────────
  const renderDashboard = () => {
    if (!dashboard) return <div style={{ padding: 40, textAlign: "center", color: "#B8A8A8" }}>Loading...</div>;
    const { summary, credit_cards: cc, category_breakdown, due_soon, past_due } = dashboard;

    return (
      <div style={{ padding: "16px 0" }}>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Monthly Budget",   value: fmt(summary.total_budget_monthly),    color: "#A8C8E8", bg: "#E3EFF8" },
            { label: "Paid This Month",  value: fmt(summary.total_paid_this_month),   color: "#A8C5A0", bg: "#E3EFE1" },
            { label: "Past Due",         value: fmt(summary.total_past_due),          color: "#E8A5A5", bg: "#F7E6E6" },
            { label: "Due This Month",   value: fmt(summary.total_due_this_month),    color: "#F0C4A0", bg: "#FBF0E6" },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, border: `1.5px solid ${card.color}40`, borderRadius: 14, padding: "14px 12px" }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: "#3D2C2C", marginBottom: 2 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: "#8B7070", fontWeight: 600 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Credit utilization */}
        {cc.total_limit > 0 && (
          <div style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C" }}>💳 Credit Cards</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: cc.utilization_pct > 30 ? "#E8A5A5" : "#A8C5A0" }}>{cc.utilization_pct}% utilized</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "#EDE0D8", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${cc.utilization_pct}%`, background: cc.utilization_pct > 30 ? "#E8A5A5" : "#A8C5A0", borderRadius: 4, transition: "width 0.4s" }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8B7070" }}>
              <span>{fmt(cc.total_balance)} balance</span>
              <span>{fmt(cc.total_limit)} limit</span>
            </div>
          </div>
        )}

        {/* Due soon */}
        {due_soon.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C", marginBottom: 12 }}>⏰ Due in 7 Days</div>
            {(due_soon as Array<{ due_date: string; anticipated_amount: number; bill: { name: string; category: string } }>).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < due_soon.length - 1 ? "1px solid #EDE0D8" : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C2C" }}>{item.bill?.name}</div>
                  <div style={{ fontSize: 11, color: "#B8A8A8" }}>{fmtDate(item.due_date)}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>{fmt(item.anticipated_amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Past due alerts */}
        {past_due.length > 0 && (
          <div style={{ background: "#F7E6E6", border: "1.5px solid #E8A5A580", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#C97B7B", marginBottom: 12 }}>🚨 Past Due ({past_due.length})</div>
            {(past_due as Array<{ due_date: string; anticipated_amount: number; remaining_balance: number; status: string; bill: { name: string } }>).slice(0, 3).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(past_due.length, 3) - 1 ? "1px solid #E8A5A530" : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C2C" }}>{item.bill?.name}</div>
                  <div style={{ fontSize: 11, color: "#C97B7B", fontWeight: 600 }}>{daysSince(item.due_date)} days overdue</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#C97B7B" }}>{fmt(item.remaining_balance ?? item.anticipated_amount)}</span>
              </div>
            ))}
            {past_due.length > 3 && <div style={{ fontSize: 12, color: "#C97B7B", textAlign: "center", marginTop: 8, fontWeight: 600 }}>+{past_due.length - 3} more</div>}
          </div>
        )}

        {/* Category breakdown */}
        {Object.keys(category_breakdown).length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 16, padding: "16px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C", marginBottom: 12 }}>📊 By Category</div>
            {Object.entries(category_breakdown).map(([cat, data]) => {
              const catInfo = CATEGORIES.find(c => c.id === cat);
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#3D2C2C" }}>{catInfo?.icon} {catInfo?.label ?? cat}</span>
                    <span style={{ fontSize: 11, color: "#8B7070" }}>{data.count} account{data.count !== 1 ? "s" : ""}</span>
                  </div>
                  <BudgetBar budget={data.budget} actual={data.actual} accent={accent}/>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAccounts = () => {
    const filtered = searchQ
      ? bills.filter(b => b.name.toLowerCase().includes(searchQ.toLowerCase()))
      : bills;
    const filteredCards = searchQ
      ? cards.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()))
      : cards;

    return (
      <div style={{ padding: "16px 0" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search accounts..."
            style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #EDE0D8", borderRadius: 12, fontSize: 14, color: "#3D2C2C", background: "rgba(255,255,255,0.8)", outline: "none", fontFamily: "inherit" }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
        </div>

        {/* Category filter pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 14, scrollbarWidth: "none" }}>
          <button onClick={() => setActiveCategory(null)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${!activeCategory ? accent : "#EDE0D8"}`, background: !activeCategory ? accent + "20" : "#fff", fontSize: 12, fontWeight: 700, color: !activeCategory ? accent : "#8B7070", cursor: "pointer", whiteSpace: "nowrap" }}>All</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${activeCategory === cat.id ? accent : "#EDE0D8"}`, background: activeCategory === cat.id ? accent + "20" : "#fff", fontSize: 12, fontWeight: 700, color: activeCategory === cat.id ? accent : "#8B7070", cursor: "pointer", whiteSpace: "nowrap" }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Credit cards section */}
        {(!activeCategory || activeCategory === "credit_cards") && filteredCards.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C", marginBottom: 10 }}>💳 Credit Cards</div>
            {filteredCards.map(card => {
              const utilPct = card.credit_limit > 0 ? Math.round((card.current_balance / card.credit_limit) * 100) : 0;
              return (
                <div key={card.id} onClick={() => setDetailItem(card)} style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 16, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C" }}>{card.name}</div>
                      <div style={{ fontSize: 11, color: "#B8A8A8" }}>{card.issuer} {card.last_four ? `••••${card.last_four}` : ""} · Due day {card.due_day}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#3D2C2C" }}>{fmt(card.current_balance)}</div>
                      <div style={{ fontSize: 11, color: "#B8A8A8" }}>of {fmt(card.credit_limit)}</div>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#EDE0D8", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${utilPct}%`, background: utilPct > 30 ? "#E8A5A5" : accent, borderRadius: 3 }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#8B7070" }}>Min: {fmt(card.minimum_payment)}</span>
                    <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>Plan: {fmt(card.anticipated_payment)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bills by category */}
        {CATEGORIES.filter(cat => cat.id !== "credit_cards").map(cat => {
          const catBills = filtered.filter(b => b.category === cat.id);
          if ((activeCategory && activeCategory !== cat.id) || catBills.length === 0) return null;
          const catTotal = catBills.reduce((s, b) => s + (b.anticipated_amount ?? 0), 0);

          return (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C" }}>{cat.icon} {cat.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{fmt(catTotal)}/mo</div>
              </div>
              {catBills.map(bill => {
                const latestInstance = (bill.instances ?? []).sort((a, b) => b.due_date?.localeCompare(a.due_date ?? "") ?? 0)[0];
                return (
                  <div key={bill.id} onClick={() => setDetailItem(bill)} style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C", marginBottom: 2 }}>{bill.name}</div>
                        <div style={{ fontSize: 11, color: "#B8A8A8" }}>{FREQUENCIES.find(f => f.id === bill.frequency)?.label} · {bill.day_of_month ? `Day ${bill.day_of_month}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#3D2C2C" }}>{fmt(bill.anticipated_amount)}</div>
                        {latestInstance && <StatusBadge status={latestInstance.status}/>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {filtered.length === 0 && filteredCards.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#B8A8A8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No accounts yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Tap + to add your first account</div>
          </div>
        )}
      </div>
    );
  };

  const renderUpcoming = () => {
    if (!upcoming) return <div style={{ padding: 40, textAlign: "center", color: "#B8A8A8" }}>Loading...</div>;
    const items = upcoming.upcoming;

    // Group by date
    const grouped: Record<string, UpcomingItem[]> = {};
    for (const item of items) {
      if (!grouped[item.due_date]) grouped[item.due_date] = [];
      grouped[item.due_date].push(item);
    }

    return (
      <div style={{ padding: "16px 0" }}>
        <div style={{ fontSize: 12, color: "#B8A8A8", fontWeight: 600, marginBottom: 14 }}>Next 30 days · {items.length} payments</div>
        {Object.entries(grouped).map(([date, dateItems]) => {
          const total = dateItems.reduce((s, i) => s + (i.anticipated_amount ?? 0), 0);
          return (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C" }}>{fmtDate(date)}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{fmt(total)}</div>
              </div>
              {dateItems.map((item, i) => (
                <div key={i} onClick={() => setPayModal(item)} style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #EDE0D8", borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C2C" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#B8A8A8" }}>{CATEGORIES.find(c => c.id === item.category)?.icon} {item.frequency}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#3D2C2C" }}>{fmt(item.anticipated_amount)}</div>
                      <StatusBadge status={item.status}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#B8A8A8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Nothing due in 30 days</div>
          </div>
        )}
      </div>
    );
  };

  const renderPastDue = () => {
    const pastDueItems = upcoming?.past_due ?? [];
    return (
      <div style={{ padding: "16px 0" }}>
        {pastDueItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#B8A8A8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>All caught up!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>No past due accounts</div>
          </div>
        ) : (
          <>
            <div style={{ background: "#F7E6E6", border: "1.5px solid #E8A5A550", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#C97B7B" }}>
                {pastDueItems.length} past due · {fmt((pastDueItems as UpcomingItem[]).reduce((s, i) => s + (i.remaining_balance ?? i.anticipated_amount ?? 0), 0))} total owed
              </div>
            </div>
            {(pastDueItems as UpcomingItem[]).map((item, i) => (
              <div key={i} onClick={() => setPayModal(item)} style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid #E8A5A560", borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C" }}>{(item as { bill?: { name: string } }).bill?.name ?? item.name}</div>
                    <div style={{ fontSize: 11, color: "#C97B7B", fontWeight: 600 }}>{daysSince(item.due_date)} days overdue · was due {fmtDate(item.due_date)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#C97B7B" }}>{fmt(item.remaining_balance ?? item.anticipated_amount)}</div>
                    <StatusBadge status={item.status}/>
                  </div>
                </div>
                {item.promise_to_pay_date && (
                  <div style={{ fontSize: 11, color: "#B5A8D4", fontWeight: 600 }}>📅 Promise to pay: {fmtDate(item.promise_to_pay_date)}</div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  // ── Nav items ─────────────────────────────────────
  const NAV_VIEWS = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "accounts",  icon: "🏦", label: "Accounts"  },
    { id: "upcoming",  icon: "📅", label: "Upcoming"  },
    { id: "past_due",  icon: "🚨", label: "Past Due",
      badge: (upcoming?.past_due?.length ?? 0) > 0 ? upcoming?.past_due?.length : null },
  ] as const;

  // ── Modal: Add Bill ───────────────────────────────
  const AddBillModal = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#FDF8F4", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#3D2C2C", fontFamily: "'Fraunces',serif" }}>Add Account</div>
          <button onClick={() => { setAddModal(null); setForm({}); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#B8A8A8" }}>×</button>
        </div>
        <Select label="Category" k="category" options={CATEGORIES.filter(c => c.id !== "credit_cards").map(c => ({ id: c.id, label: `${c.icon} ${c.label}` }))}/>
        <Input label="Account Name" k="name" placeholder="e.g. Electric Bill"/>
        <Select label="Frequency" k="frequency" options={FREQUENCIES}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Anticipated Amount" k="anticipated_amount" type="number" placeholder="0.00"/>
          <Input label="Budget Amount" k="budget_amount" type="number" placeholder="0.00"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Day of Month Due" k="day_of_month" type="number" placeholder="1-31"/>
          <Input label="Start Date" k="start_date" type="date"/>
        </div>
        <Input label="Payee Name" k="payee_name" placeholder="Company name"/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Phone" k="phone" placeholder="555-000-0000"/>
          <Input label="Website" k="website" placeholder="https://"/>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C", margin: "16px 0 10px", paddingTop: 12, borderTop: "1px solid #EDE0D8" }}>🔒 Credentials (encrypted)</div>
        <Input label="Account Number" k="account_number" placeholder="Account #"/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Username" k="username" placeholder="Login username"/>
          <Input label="Password" k="password" placeholder="Login password"/>
        </div>
        <Input label="Notes" k="notes" placeholder="Any additional notes"/>
        <button onClick={handleSaveBill} disabled={saving || !f("name") || !f("category")} style={{ width: "100%", padding: 14, background: saving ? "#EDE0D8" : accent, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", marginTop: 8, fontFamily: "inherit" }}>
          {saving ? "Saving..." : "Save Account"}
        </button>
      </div>
    </div>
  );

  // ── Modal: Add Credit Card ────────────────────────
  const AddCardModal = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#FDF8F4", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#3D2C2C", fontFamily: "'Fraunces',serif" }}>Add Credit Card</div>
          <button onClick={() => { setAddModal(null); setForm({}); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#B8A8A8" }}>×</button>
        </div>
        <Input label="Card Name" k="name" placeholder="e.g. Chase Sapphire"/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Issuer" k="issuer" placeholder="Chase, Citi, Amex..."/>
          <Input label="Card Type" k="card_type" placeholder="Visa, MC, Amex..."/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Credit Limit" k="credit_limit" type="number" placeholder="0.00"/>
          <Input label="APR (%)" k="apr" type="number" placeholder="0.00"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Minimum Payment" k="minimum_payment" type="number" placeholder="0.00"/>
          <Input label="Planned Payment" k="anticipated_payment" type="number" placeholder="0.00"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Statement Day" k="statement_day" type="number" placeholder="1-31"/>
          <Input label="Due Day" k="due_day" type="number" placeholder="1-31"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Last 4 Digits" k="last_four" placeholder="0000"/>
          <Input label="Rewards Program" k="rewards_program" placeholder="Points, Miles..."/>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C", margin: "16px 0 10px", paddingTop: 12, borderTop: "1px solid #EDE0D8" }}>🔒 Credentials (encrypted)</div>
        <Input label="Account Number" k="account_number" placeholder="Full account number"/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Username" k="username" placeholder="Online login"/>
          <Input label="Password" k="password" placeholder="Online password"/>
        </div>
        <Input label="Website" k="website" placeholder="https://"/>
        <button onClick={handleSaveCard} disabled={saving || !f("name")} style={{ width: "100%", padding: 14, background: saving ? "#EDE0D8" : accent, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", marginTop: 8, fontFamily: "inherit" }}>
          {saving ? "Saving..." : "Save Card"}
        </button>
      </div>
    </div>
  );

  // ── Modal: Log Payment ────────────────────────────
  const PayModal = () => {
    if (!payModal) return null;
    const isPTP = form.action === "ptp";
    const isPay = form.action === "pay" || !form.action;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
        <div style={{ background: "#FDF8F4", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#3D2C2C", fontFamily: "'Fraunces',serif" }}>{payModal.name}</div>
              <div style={{ fontSize: 11, color: "#B8A8A8" }}>Due {fmtDate(payModal.due_date)} · {fmt(payModal.anticipated_amount)}</div>
            </div>
            <button onClick={() => { setPayModal(null); setForm({}); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#B8A8A8" }}>×</button>
          </div>

          {/* Action tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[{ id: "pay", label: "💰 Log Payment" }, { id: "ptp", label: "📅 Promise to Pay" }].map(tab => (
              <button key={tab.id} onClick={() => sf("action")(tab.id)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${(form.action ?? "pay") === tab.id ? accent : "#EDE0D8"}`, background: (form.action ?? "pay") === tab.id ? accent + "15" : "#fff", fontSize: 12, fontWeight: 700, color: (form.action ?? "pay") === tab.id ? accent : "#8B7070", cursor: "pointer", fontFamily: "inherit" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {isPay && (
            <>
              <Input label="Payment Date" k="paid_date" type="date"/>
              <Input label="Amount Paid" k="actual_amount" type="number" placeholder={String(payModal.anticipated_amount ?? "")}/>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 8 }}>Payment Type</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ id: "true", label: "Paid in Full" }, { id: "false", label: "Partial Payment" }].map(opt => (
                    <button key={opt.id} onClick={() => sf("paid_full")(opt.id)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${(form.paid_full ?? "true") === opt.id ? accent : "#EDE0D8"}`, background: (form.paid_full ?? "true") === opt.id ? accent + "15" : "#fff", fontSize: 12, fontWeight: 700, color: (form.paid_full ?? "true") === opt.id ? accent : "#8B7070", cursor: "pointer", fontFamily: "inherit" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Fee section */}
              <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px 12px", border: "1px solid #EDE0D8", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B8A8A8", marginBottom: 8 }}>ADD FEE (optional)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Input label="Fee Type" k="fee_type" placeholder="late_fee, penalty..."/>
                  <Input label="Fee Amount" k="fee_amount" type="number" placeholder="0.00"/>
                </div>
              </div>
            </>
          )}

          {isPTP && (
            <>
              <Input label="Promise to Pay Date" k="promise_to_pay_date" type="date"/>
              <Input label="2nd Promise Date (if needed)" k="promise_to_pay_date_2" type="date"/>
              <Input label="Notes" k="promise_notes" placeholder="Why payment is delayed..."/>
            </>
          )}

          <button
            onClick={isPTP ? async () => {
              setSaving(true);
              if (payModal.id) {
                await fetch("/api/finances/instances", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    instance_id: payModal.id,
                    status: "promise_to_pay",
                    promise_to_pay_date: form.promise_to_pay_date,
                    promise_to_pay_date_2: form.promise_to_pay_date_2,
                    promise_notes: form.promise_notes,
                  }),
                });
              }
              setPayModal(null);
              setForm({});
              await loadUpcoming();
              setSaving(false);
            } : handleLogPayment}
            disabled={saving}
            style={{ width: "100%", padding: 14, background: saving ? "#EDE0D8" : accent, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? "Saving..." : isPTP ? "Set Promise to Pay" : "Log Payment"}
          </button>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 80px" }}>
      {/* Page header with hamburger */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 12px" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 500, color: "#3D2C2C", marginBottom: 2 }}>Finances</h1>
          <div style={{ fontSize: 12, color: "#B8A8A8" }}>
            {dashboard ? `${dashboard.summary.bills_count} accounts · ${dashboard.summary.cards_count} cards` : "Loading..."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* Add button */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setDrawerOpen(o => !o)} style={{ width: 38, height: 38, borderRadius: 12, background: accent + "20", border: `1.5px solid ${accent}40`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>+</button>
            {drawerOpen && (
              <>
                <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }}/>
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#FDF8F4", border: "1.5px solid #EDE0D8", borderRadius: 14, boxShadow: "0 8px 32px rgba(61,44,44,0.15)", zIndex: 100, minWidth: 180, overflow: "hidden" }}>
                  {[{ label: "Add Account", icon: "🏦", action: () => { setAddModal("bill"); setDrawerOpen(false); } },
                    { label: "Add Credit Card", icon: "💳", action: () => { setAddModal("card"); setDrawerOpen(false); } }
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#3D2C2C", fontFamily: "inherit", textAlign: "left" }}>
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: 4, marginBottom: 16, border: "1px solid #EDE0D8" }}>
        {NAV_VIEWS.map(nav => (
          <button key={nav.id} onClick={() => setView(nav.id as typeof view)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", background: view === nav.id ? "#fff" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, boxShadow: view === nav.id ? "0 2px 8px rgba(61,44,44,0.08)" : "none", position: "relative" }}>
            <span style={{ fontSize: 16 }}>{nav.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: view === nav.id ? accent : "#B8A8A8", whiteSpace: "nowrap" }}>{nav.label}</span>
            {"badge" in nav && nav.badge && (
              <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "#E8A5A5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{nav.badge}</div>
            )}
          </button>
        ))}
      </div>

      {/* View content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#B8A8A8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 14 }}>Loading your finances...</div>
        </div>
      ) : (
        <>
          {view === "dashboard" && renderDashboard()}
          {view === "accounts"  && renderAccounts()}
          {view === "upcoming"  && renderUpcoming()}
          {view === "past_due"  && renderPastDue()}
        </>
      )}

      {/* Modals */}
      {addModal === "bill" && <AddBillModal/>}
      {addModal === "card" && <AddCardModal/>}
      {payModal && <PayModal/>}
    </div>
  );
}
