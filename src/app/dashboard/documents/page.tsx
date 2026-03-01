// src/app/dashboard/documents/page.tsx
"use client";
import React, { useState } from "react";

type Doc = { id: string; name: string; category: string; size: string; date: string; icon: string; };

const CATS = ["All","Legal","Medical","Financial","School","Insurance","Other"];

const MOCK: Doc[] = [
  { id:"1", name:"Birth Certificate - James",    category:"Legal",     size:"1.2 MB", date:"2024-01-15", icon:"📄" },
  { id:"2", name:"Home Insurance Policy 2026",   category:"Insurance", size:"3.4 MB", date:"2026-01-01", icon:"🏠" },
  { id:"3", name:"Tax Return 2025",              category:"Financial", size:"2.1 MB", date:"2025-04-15", icon:"💰" },
  { id:"4", name:"Jordan School Report Card",    category:"School",    size:"0.8 MB", date:"2026-01-20", icon:"🎓" },
  { id:"5", name:"Maria Medical Records",        category:"Medical",   size:"5.2 MB", date:"2025-11-10", icon:"🏥" },
  { id:"6", name:"Car Title - Honda Odyssey",    category:"Legal",     size:"0.4 MB", date:"2023-06-01", icon:"🚗" },
];

const CAT_COLORS: Record<string, [string,string]> = {
  Legal:     ["#A8C8E8","#E3EFF8"],
  Medical:   ["#E8A5A5","#F7E6E6"],
  Financial: ["#A8C5A0","#E3EFE1"],
  School:    ["#F0C4A0","#FBF0E6"],
  Insurance: ["#B5A8D4","#EDE9F7"],
  Other:     ["#B5A8D4","#EDE9F7"],
};

export default function DocumentsPage() {
  const [docs, setDocs]       = useState<Doc[]>(MOCK);
  const [cat, setCat]         = useState("All");
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName]       = useState("");
  const [newCat, setNewCat]   = useState("Other");

  const filtered = docs.filter(d =>
    (cat === "All" || d.category === cat) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const add = () => {
    if (!name) return;
    setDocs(d => [{
      id: Date.now().toString(),
      name, category: newCat,
      size: "—", date: new Date().toISOString().split("T")[0],
      icon: "📄",
    }, ...d]);
    setName(""); setShowForm(false);
  };

  return (
    <div style={{ padding:"20px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)" }}>Documents 📁</h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding:"10px 18px", background:"linear-gradient(135deg,#A8C8E8,#B5A8D4)", color:"white", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
          + Upload
        </button>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search documents..."
        style={{ width:"100%", padding:"12px 14px", border:"1.5px solid var(--border)", borderRadius:12, fontSize:14, outline:"none", color:"var(--ink)", background:"rgba(255,255,255,0.8)", fontFamily:"'Nunito',sans-serif", marginBottom:14, boxSizing:"border-box" }}/>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding:"7px 14px", borderRadius:20, border:"1.5px solid var(--border)", background: cat===c ? "linear-gradient(135deg,#A8C8E8,#B5A8D4)" : "var(--warm-white)", color: cat===c ? "white" : "var(--ink-muted)", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap", flexShrink:0 }}>
            {c}
          </button>
        ))}
      </div>

      {/* Upload form */}
      {showForm && (
        <div style={{ background:"rgba(255,255,255,0.9)", border:"1.5px solid var(--border)", borderRadius:16, padding:20, marginBottom:16 }}>
          <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:16, color:"var(--ink)", marginBottom:14 }}>Add Document</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Document name"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, outline:"none", color:"var(--ink)", background:"var(--warm-white)", fontFamily:"'Nunito',sans-serif", marginBottom:10, boxSizing:"border-box" }}/>
          <select value={newCat} onChange={e => setNewCat(e.target.value)}
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, color:"var(--ink)", background:"var(--warm-white)", fontFamily:"'Nunito',sans-serif", marginBottom:14 }}>
            {CATS.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={add} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#A8C8E8,#B5A8D4)", color:"white", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:14, fontFamily:"'Nunito',sans-serif" }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding:"11px 18px", background:"var(--tan)", color:"var(--ink-muted)", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[["#E3EFF8","#A8C8E8",`${docs.length}`,`Total files`],["#E3EFE1","#A8C5A0",`${(docs.length * 1.8).toFixed(1)} MB`,"Storage used"]].map(([bg,color,val,lbl]) => (
          <div key={lbl} style={{ flex:1, background:bg, border:`1.5px solid ${color}40`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, color:"var(--ink)" }}>{val}</div>
            <div style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:600 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Doc list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(d => {
          const [color, bg] = CAT_COLORS[d.category] ?? ["#B5A8D4","#EDE9F7"];
          return (
            <div key={d.id} style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{d.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
                <div style={{ fontSize:11, color:"var(--ink-subtle)", marginTop:2, display:"flex", gap:8 }}>
                  <span style={{ background:bg, color:color, padding:"1px 8px", borderRadius:99, fontWeight:700 }}>{d.category}</span>
                  <span>{d.size} · {d.date}</span>
                </div>
              </div>
              <button style={{ background:"none", border:"1.5px solid var(--border)", borderRadius:8, color:"var(--ink-muted)", fontSize:12, fontWeight:700, padding:"6px 10px", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>View</button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--ink-subtle)", fontSize:14 }}>
            No documents found 🌸
          </div>
        )}
      </div>
    </div>
  );
}
