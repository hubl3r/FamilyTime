// src/app/dashboard/finances/page.tsx
"use client";
import React, { useState } from "react";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

const CATEGORIES = ["Housing","Food","Transport","Medical","Entertainment","Shopping","Utilities","Savings","Other"];

const MOCK: Transaction[] = [
  { id:"1", description:"Grocery run",        amount:142.50, type:"expense", category:"Food",          date:"2026-02-28" },
  { id:"2", description:"Monthly salary",     amount:4200,   type:"income",  category:"Other",         date:"2026-02-25" },
  { id:"3", description:"Electric bill",      amount:98.00,  type:"expense", category:"Utilities",     date:"2026-02-22" },
  { id:"4", description:"Kids school lunch",  amount:45.00,  type:"expense", category:"Food",          date:"2026-02-20" },
  { id:"5", description:"Gas station",        amount:60.00,  type:"expense", category:"Transport",     date:"2026-02-18" },
  { id:"6", description:"Freelance project",  amount:800,    type:"income",  category:"Other",         date:"2026-02-15" },
];

const CAT_COLORS: Record<string, [string, string]> = {
  Housing:       ["#A8C8E8","#E3EFF8"],
  Food:          ["#A8C5A0","#E3EFE1"],
  Transport:     ["#F0C4A0","#FBF0E6"],
  Medical:       ["#E8A5A5","#F7E6E6"],
  Entertainment: ["#B5A8D4","#EDE9F7"],
  Shopping:      ["#E8A5A5","#F7E6E6"],
  Utilities:     ["#A8C8E8","#E3EFF8"],
  Savings:       ["#A8C5A0","#E3EFE1"],
  Other:         ["#B5A8D4","#EDE9F7"],
};

export default function FinancesPage() {
  const [txns, setTxns]       = useState<Transaction[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc]         = useState("");
  const [amount, setAmount]     = useState("");
  const [type, setType]         = useState<"income"|"expense">("expense");
  const [cat, setCat]           = useState("Food");
  const [filter, setFilter]     = useState<"all"|"income"|"expense">("all");

  const income  = txns.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;

  const add = () => {
    if (!desc || !amount) return;
    setTxns(t => [{
      id: Date.now().toString(),
      description: desc, amount: parseFloat(amount),
      type, category: cat,
      date: new Date().toISOString().split("T")[0],
    }, ...t]);
    setDesc(""); setAmount(""); setShowForm(false);
  };

  const remove = (id: string) => setTxns(t => t.filter(x => x.id !== id));
  const filtered = filter === "all" ? txns : txns.filter(t => t.type === filter);

  const inp = (val: string, set: (v:string)=>void, ph: string, type="text") => (
    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
      style={{ flex:1, padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, outline:"none", color:"var(--ink)", background:"var(--warm-white)", fontFamily:"'Nunito',sans-serif" }}/>
  );

  return (
    <div style={{ padding:"20px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)" }}>Finances 💰</h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding:"10px 18px", background:"linear-gradient(135deg,#A8C5A0,#A8C8E8)", color:"white", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
          + Add
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {[
          ["Balance", balance, balance >= 0 ? "#A8C5A0" : "#E8A5A5", balance >= 0 ? "#E3EFE1" : "#F7E6E6"],
          ["Income",  income,  "#A8C5A0", "#E3EFE1"],
          ["Spent",   expense, "#E8A5A5", "#F7E6E6"],
        ].map(([lbl, val, color, bg]) => (
          <div key={String(lbl)} style={{ background: String(bg), border:`1.5px solid ${String(color)}40`, borderRadius:14, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:700, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{String(lbl)}</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, color: Number(val) < 0 ? "#C97B7B" : "var(--ink)" }}>
              {Number(val) < 0 ? "-" : ""}${Math.abs(Number(val)).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background:"rgba(255,255,255,0.9)", border:"1.5px solid var(--border)", borderRadius:16, padding:20, marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:16, color:"var(--ink)", marginBottom:14 }}>New Transaction</h3>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {inp(desc, setDesc, "Description")}
            {inp(amount, setAmount, "Amount", "number")}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <select value={type} onChange={e => setType(e.target.value as "income"|"expense")}
              style={{ flex:1, padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, color:"var(--ink)", background:"var(--warm-white)", fontFamily:"'Nunito',sans-serif" }}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={cat} onChange={e => setCat(e.target.value)}
              style={{ flex:1, padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, color:"var(--ink)", background:"var(--warm-white)", fontFamily:"'Nunito',sans-serif" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={add} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#A8C5A0,#A8C8E8)", color:"white", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:14, fontFamily:"'Nunito',sans-serif" }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding:"11px 18px", background:"var(--tan)", color:"var(--ink-muted)", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {(["all","income","expense"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:"7px 16px", borderRadius:20, border:"1.5px solid var(--border)", background: filter===f ? "linear-gradient(135deg,#E8A5A5,#B5A8D4)" : "var(--warm-white)", color: filter===f ? "white" : "var(--ink-muted)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", textTransform:"capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(t => {
          const [color, bg] = CAT_COLORS[t.category] ?? ["#B5A8D4","#EDE9F7"];
          return (
            <div key={t.id} style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                {t.type === "income" ? "💵" : "💸"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description}</div>
                <div style={{ fontSize:11, color:"var(--ink-subtle)", marginTop:2 }}>{t.category} · {t.date}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color: t.type === "income" ? "#6A9F6A" : "#C97B7B" }}>
                  {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                </div>
              </div>
              <button onClick={() => remove(t.id)}
                style={{ background:"none", border:"none", color:"var(--ink-subtle)", fontSize:16, cursor:"pointer", padding:"4px", lineHeight:1 }}>×</button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--ink-subtle)", fontSize:14 }}>
            No transactions yet 🌸
          </div>
        )}
      </div>
    </div>
  );
}
