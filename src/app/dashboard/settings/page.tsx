// src/app/dashboard/settings/page.tsx - replaced with StylePicker
"use client";
import StylePicker from "@/components/StylePicker";
export default function SettingsPage() { return <StylePicker />; }
// STOP HERE - ignore everything below
import React, { useState } from "react";
import SignOutButton from "@/components/SignOutButton";

const ACCENTS = [
  { name:"Rose",    val:"#E8A5A5" },
  { name:"Lavender",val:"#B5A8D4" },
  { name:"Sky",     val:"#A8C8E8" },
  { name:"Sage",    val:"#A8C5A0" },
  { name:"Peach",   val:"#F0C4A0" },
  { name:"Plum",    val:"#9B89C4" },
];

const THEMES = [
  { name:"Soft Pastel",  bg:"#FDF8F4", preview:["#F7E6E6","#EDE9F7","#E3EFF8"] },
  { name:"Warm Cream",   bg:"#FAF5EE", preview:["#F5EDD8","#EDE0D0","#E0D0C0"] },
  { name:"Cool Mist",    bg:"#F4F7FA", preview:["#E3EFF8","#DDE8F0","#D5E0EC"] },
  { name:"Garden",       bg:"#F4FAF4", preview:["#E3EFE1","#D5E8D4","#C8E0C6"] },
];

export default function SettingsPage() {
  const [accent, setAccent] = useState("#E8A5A5");
  const [theme, setTheme]   = useState(0);
  const [fontSize, setFontSize] = useState("normal");
  const [saved, setSaved]   = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding:"20px 0" }}>
      <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)", marginBottom:24 }}>Settings ⚙️</h1>

      {/* Account */}
      <section style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"20px", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:17, color:"var(--ink)", marginBottom:16 }}>Account</h2>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>Signed in</div>
            <div style={{ fontSize:12, color:"var(--ink-subtle)" }}>Manage your account settings</div>
          </div>
          <SignOutButton />
        </div>
      </section>

      {/* Accent color */}
      <section style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"20px", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:17, color:"var(--ink)", marginBottom:16 }}>Accent Color</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {ACCENTS.map(a => (
            <button key={a.val} onClick={() => setAccent(a.val)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:a.val, border: accent===a.val ? "3px solid var(--ink)" : "3px solid transparent", transition:"border 0.15s", boxShadow:"0 2px 8px rgba(100,60,60,0.15)" }}/>
              <span style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:600, fontFamily:"'Nunito',sans-serif" }}>{a.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"20px", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:17, color:"var(--ink)", marginBottom:16 }}>Theme</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {THEMES.map((t, i) => (
            <button key={t.name} onClick={() => setTheme(i)}
              style={{ background:t.bg, border: theme===i ? "2px solid var(--ink)" : "1.5px solid var(--border)", borderRadius:14, padding:"16px 12px", cursor:"pointer", textAlign:"left" }}>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {t.preview.map((c,j) => (
                  <div key={j} style={{ flex:1, height:16, borderRadius:6, background:c }}/>
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:800, color:"var(--ink)", fontFamily:"'Nunito',sans-serif" }}>{t.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Font size */}
      <section style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"20px", marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:17, color:"var(--ink)", marginBottom:16 }}>Text Size</h2>
        <div style={{ display:"flex", gap:8 }}>
          {[["Small","12px","A"],["Normal","15px","A"],["Large","18px","A"]].map(([lbl, size, letter]) => (
            <button key={lbl} onClick={() => setFontSize(lbl.toLowerCase())}
              style={{ flex:1, padding:"12px 8px", borderRadius:12, border: fontSize===lbl.toLowerCase() ? "2px solid var(--ink)" : "1.5px solid var(--border)", background: fontSize===lbl.toLowerCase() ? "var(--lav-light)" : "var(--warm-white)", cursor:"pointer" }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:size, color:"var(--ink)", fontWeight:500, marginBottom:4 }}>{letter}</div>
              <div style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{lbl}</div>
            </button>
          ))}
        </div>
      </section>

      <button onClick={save}
        style={{ width:"100%", padding:"14px", background: saved ? "linear-gradient(135deg,#A8C5A0,#A8C8E8)" : "linear-gradient(135deg,#E8A5A5,#B5A8D4)", color:"white", border:"none", borderRadius:14, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"background 0.3s", boxShadow:"0 4px 16px rgba(181,168,212,0.4)" }}>
        {saved ? "Saved! ✓" : "Save Settings ✨"}
      </button>
    </div>
  );
}
