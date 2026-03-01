// src/components/StyleSidebar.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeContext";

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function hexToHsv(hex: string) {
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min; let h = 0;
  if (d) { if (max===r) h=((g-b)/d+6)%6; else if (max===g) h=(b-r)/d+2; else h=(r-g)/d+4; h=h/6; }
  return { h: h*360, s: max ? d/max : 0, v: max };
}
function hsvToHex(h: number, s: number, v: number) {
  h = h/360;
  const i = Math.floor(h*6), f = h*6-i, p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
  let r=0,g=0,b=0;
  switch (i%6) { case 0: r=v;g=t;b=p; break; case 1: r=q;g=v;b=p; break; case 2: r=p;g=v;b=t; break; case 3: r=p;g=q;b=v; break; case 4: r=t;g=p;b=v; break; default: r=v;g=p;b=q; }
  return '#' + [r,g,b].map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
}

// ── Color Picker ──────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, label, swatches = [] }: { value: string; onChange: (v: string) => void; label: string; swatches?: string[] }) {
  const [open, setOpen]   = useState(false);
  const [hexIn, setHexIn] = useState(value);
  const [hsv, setHsv]     = useState(() => hexToHsv(value));
  const svRef     = useRef<HTMLDivElement>(null);
  const hueRef    = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dragSV    = useRef(false);
  const dragHue   = useRef(false);

  useEffect(() => { setHexIn(value); setHsv(hexToHsv(value)); }, [value]);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);

  const commit = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h,s,v); setHsv({h,s,v}); setHexIn(hex); onChange(hex);
  }, [onChange]);

  const onSV = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!svRef.current) return;
    const r = svRef.current.getBoundingClientRect();
    commit(hsv.h, Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)), Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height)));
  }, [hsv.h, commit]);

  const onHue = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!hueRef.current) return;
    const r = hueRef.current.getBoundingClientRect();
    commit(Math.max(0,Math.min(360,((e.clientX-r.left)/r.width)*360)), hsv.s, hsv.v);
  }, [hsv.s, hsv.v, commit]);

  useEffect(() => {
    const up = () => { dragSV.current = false; dragHue.current = false; };
    const mv = (e: PointerEvent) => { if (dragSV.current) onSV(e); if (dragHue.current) onHue(e); };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", mv);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointermove", mv); };
  }, [onSV, onHue]);

  const pureHue = hsvToHex(hsv.h, 1, 1);

  return (
    <div ref={pickerRef} style={{ position: "relative", marginBottom: 16 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, color:"#B8A8A8", marginBottom:8 }}>{label}</div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(255,255,255,0.8)", border:`1.5px solid ${open ? value : "#EDE0D8"}`, borderRadius:12, cursor:"pointer", width:"100%", transition:"border-color 0.15s", backdropFilter:"blur(8px)" }}
      >
        <div style={{ width:24, height:24, borderRadius:7, background:value, flexShrink:0, boxShadow:"inset 0 0 0 1px rgba(0,0,0,0.08)" }}/>
        <span style={{ fontSize:12, fontWeight:700, color:"#3D2C2C", fontFamily:"'Courier New',monospace", letterSpacing:1 }}>{value.toUpperCase()}</span>
        <svg style={{ marginLeft:"auto", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s" }} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#B8A8A8" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, zIndex:9999, background:"#FFFCFA", borderRadius:16, border:"1.5px solid #EDE0D8", boxShadow:"0 16px 48px rgba(61,44,44,0.18)", padding:14, width:"100%" }}>
          <div ref={svRef} onPointerDown={e => { dragSV.current = true; onSV(e); }} style={{ width:"100%", height:120, borderRadius:10, position:"relative", background:pureHue, marginBottom:10, cursor:"crosshair", backgroundImage:"linear-gradient(to right,#fff,transparent),linear-gradient(to top,#000,transparent)" }}>
            <div style={{ position:"absolute", left:`${hsv.s*100}%`, top:`${(1-hsv.v)*100}%`, transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", border:"2.5px solid white", boxShadow:"0 1px 6px rgba(0,0,0,0.3)", background:value, pointerEvents:"none" }}/>
          </div>
          <div ref={hueRef} onPointerDown={e => { dragHue.current = true; onHue(e); }} style={{ width:"100%", height:12, borderRadius:6, position:"relative", background:"linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", marginBottom:12, cursor:"pointer" }}>
            <div style={{ position:"absolute", left:`${(hsv.h/360)*100}%`, top:"50%", transform:"translate(-50%,-50%)", width:18, height:18, borderRadius:"50%", border:"2.5px solid white", boxShadow:"0 1px 4px rgba(0,0,0,0.3)", background:pureHue, pointerEvents:"none" }}/>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={hexIn} onChange={e => { setHexIn(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { onChange(e.target.value); setHsv(hexToHsv(e.target.value)); } }} style={{ flex:1, padding:"7px 10px", border:"1.5px solid #EDE0D8", borderRadius:8, fontSize:12, fontFamily:"'Courier New',monospace", outline:"none", color:"#3D2C2C", background:"#fff" }}/>
            <div style={{ width:34, height:34, borderRadius:8, background:value, border:"1.5px solid #EDE0D8", flexShrink:0 }}/>
          </div>
          {swatches.length > 0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
              {swatches.map(s => <button key={s} onClick={() => { onChange(s); setHsv(hexToHsv(s)); setHexIn(s); }} style={{ width:24, height:24, borderRadius:6, background:s, border:`2.5px solid ${value===s ? "#3D2C2C" : "transparent"}`, cursor:"pointer", transition:"transform 0.1s", transform: value===s ? "scale(1.2)" : "scale(1)" }} title={s}/>)}
            </div>
          )}
          <button onClick={() => setOpen(false)} style={{ width:"100%", padding:"8px", background:"#3D2C2C", color:"#FDF8F4", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Done</button>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:"none", border:"none", cursor:"pointer", padding:"14px 0 10px", borderBottom:"1px solid #EDE0D8" }}
      >
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:14, fontWeight:800, color:"#3D2C2C", fontFamily:"'Nunito',sans-serif", flex:1, textAlign:"left" }}>{title}</span>
        <svg style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform 0.25s", flexShrink:0 }} width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#B8A8A8" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      {open && <div style={{ paddingTop:14 }}>{children}</div>}
    </div>
  );
}

// ── Style option button ────────────────────────────────────────────────────────
function StyleOption({ label, selected, accent, dark = false, onClick, children }: { label: string; selected: boolean; accent: string; dark?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: dark ? "#09090B" : "#fff",
        borderRadius:12, padding:"10px 10px 8px", border:`2px solid ${selected ? accent : dark ? "#27272A" : "#EDE0D8"}`,
        cursor:"pointer", transition:"all 0.15s", textAlign:"left", overflow:"hidden", width:"100%",
        boxShadow: selected ? `0 0 0 3px ${accent}30` : "none",
      }}
    >
      {children && <div style={{ pointerEvents:"none", marginBottom:6 }}>{children}</div>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop: children ? 6 : 0, borderTop: children ? `1px solid ${dark ? "#1c1c1f" : "#F4F0ED"}` : "none" }}>
        <span style={{ fontSize:12, fontWeight:700, color: selected ? accent : dark ? "#D4D4D8" : "#3D2C2C", fontFamily:"'Nunito',sans-serif" }}>{label}</span>
        {selected && (
          <div style={{ width:16, height:16, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Nav mini previews ─────────────────────────────────────────────────────────
const NAV_ITEMS_MINI = [
  { label:"Home", icon:"🏠" }, { label:"Finance", icon:"💰" }, { label:"Files", icon:"📁" }, { label:"Chores", icon:"🧹" }, { label:"Settings", icon:"⚙️" },
];

function MiniNavPill({ accent, bg }: { accent: string; bg: string }) {
  return (
    <div style={{ background: bg || "#fff", borderTop:"1px solid #EDE0D8", padding:"6px 4px 8px", display:"flex", position:"relative" }}>
      <div style={{ position:"absolute", top:6, height:36, width:"20%", left:"0%", background:accent+"18", borderRadius:10, transition:"none" }}/>
      {NAV_ITEMS_MINI.map((n, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <div style={{ fontSize:14 }}>{n.icon}</div>
          <span style={{ fontSize:8, color: i===0 ? accent : "#B8A8A8", fontWeight: i===0 ? 700 : 500 }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniNavBubble({ accent, bg }: { accent: string; bg: string }) {
  return (
    <div style={{ background: bg || "#fff", borderTop:"1px solid #EDE0D8", padding:"0 4px 6px", display:"flex", alignItems:"flex-end" }}>
      {NAV_ITEMS_MINI.map((n, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background: i===0 ? accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transform: i===0 ? "translateY(-8px)" : "none", fontSize:14 }}>{n.icon}</div>
          <span style={{ fontSize:8, color: i===0 ? accent : "transparent", height:10, fontWeight:700 }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniNavUnderline({ accent, bg }: { accent: string; bg: string }) {
  return (
    <div style={{ background: bg || "#fff", borderTop:"1px solid #EDE0D8", position:"relative" }}>
      <div style={{ position:"absolute", top:0, width:"20%", left:0, height:2, background:accent, borderRadius:"0 0 3px 3px" }}/>
      <div style={{ display:"flex", padding:"8px 0 6px" }}>
        {NAV_ITEMS_MINI.map((n, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, transform: i===0 ? "scale(1.1)" : "scale(1)" }}>
            <div style={{ fontSize:14 }}>{n.icon}</div>
            <span style={{ fontSize:8, color: i===0 ? accent : "#B8A8A8", fontWeight: i===0 ? 700 : 500 }}>{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniNavDark({ accent }: { accent: string }) {
  return (
    <div style={{ background:"#09090B", padding:"8px 0 10px", display:"flex" }}>
      {NAV_ITEMS_MINI.map((n, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <div style={{ fontSize:14 }}>{n.icon}</div>
          {i===0 && <div style={{ width:4, height:4, borderRadius:"50%", background:accent }}/>}
          <span style={{ fontSize:8, color: i===0 ? accent : "#52525B", fontWeight: i===0 ? 700 : 400 }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main StyleSidebar ─────────────────────────────────────────────────────────
const ACCENT_SWATCHES = ["#E8A5A5","#B5A8D4","#A8C8E8","#A8C5A0","#F0C4A0","#C97B7B","#8B7BB8","#0078D4","#107C10","#6B21A8"];
const BG_SWATCHES     = ["#FDF8F4","#FFFCFA","#F2F4F7","#F0F7FF","#F0FFF0","#FFF7F0","#F5F0FF","#FFFBEB","#FFF1F2","#09090B"];
const NAV_SWATCHES    = ["#FDF8F4","#FFFCFA","#FFFFFF","#09090B","#E8A5A5","#B5A8D4"];

const NAV_STYLES  = ["Pill Slide","Float Bubble","Underline Sweep","Minimal Dark"];
const CARD_STYLES = ["Clean Flat","Color Header","Glass","Bold Dark"];

export default function StyleSidebar() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, saved, saveTheme } = useTheme();

  // Close on outside click
  const overlayRef = useRef<HTMLDivElement>(null);

  const navMinis = [
    <MiniNavPill key={0} accent={theme.accent} bg={theme.navBg}/>,
    <MiniNavBubble key={1} accent={theme.accent} bg={theme.navBg}/>,
    <MiniNavUnderline key={2} accent={theme.accent} bg={theme.navBg}/>,
    <MiniNavDark key={3} accent={theme.accent}/>,
  ];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Customize style"
        style={{
          position:"fixed", bottom:84, right:16, zIndex:200,
          width:48, height:48, borderRadius:"50%",
          background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)",
          border:"none", cursor:"pointer",
          boxShadow:"0 6px 24px rgba(181,168,212,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20,
          transition:"transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(181,168,212,0.65)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(181,168,212,0.5)"; }}
      >
        🎨
      </button>

      {/* Backdrop */}
      {open && (
        <div
          ref={overlayRef}
          onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(61,44,44,0.35)", zIndex:300, backdropFilter:"blur(2px)", transition:"opacity 0.25s" }}
        />
      )}

      {/* Sidebar drawer */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:400,
        width: open ? 340 : 0,
        overflow:"hidden",
        transition:"width 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          width:340, height:"100%",
          background:"#FDF8F4",
          borderLeft:"1.5px solid #EDE0D8",
          boxShadow:"-12px 0 60px rgba(61,44,44,0.15)",
          display:"flex", flexDirection:"column",
          overflowY:"auto",
        }}>
          {/* Header */}
          <div style={{ padding:"20px 20px 16px", background:"linear-gradient(135deg,rgba(232,165,165,0.2),rgba(181,168,212,0.15))", borderBottom:"1.5px solid #EDE0D8", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎨</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#3D2C2C", fontFamily:"'Nunito',sans-serif" }}>Style Studio</div>
                  <div style={{ fontSize:11, color:"#B8A8A8", fontWeight:600 }}>Your look, your rules</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ width:32, height:32, borderRadius:8, border:"1.5px solid #EDE0D8", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#8B7070", fontSize:16 }}>×</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:"4px 20px 24px" }}>

            <Section icon="🎨" title="Colors">
              <ColorPicker label="Accent Color"          value={theme.accent} onChange={v => setTheme({accent: v})} swatches={ACCENT_SWATCHES}/>
              <ColorPicker label="Page Background"       value={theme.pageBg} onChange={v => setTheme({pageBg: v})} swatches={BG_SWATCHES}/>
              <ColorPicker label="Navigation Background" value={theme.navBg}  onChange={v => setTheme({navBg: v})}  swatches={NAV_SWATCHES}/>

              {/* Color preview dots */}
              <div style={{ display:"flex", gap:8, padding:"12px 14px", background:"rgba(255,255,255,0.6)", borderRadius:12, border:"1px solid #EDE0D8", marginTop:4, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#B8A8A8", fontWeight:700, flex:1 }}>PREVIEW</span>
                {[["Accent", theme.accent],["Page", theme.pageBg],["Nav", theme.navBg]].map(([label, color]) => (
                  <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ width:22, height:22, borderRadius:7, background:color, border:"1.5px solid rgba(61,44,44,0.1)", boxShadow:"0 2px 6px rgba(61,44,44,0.1)" }}/>
                    <span style={{ fontSize:9, color:"#B8A8A8", fontWeight:700 }}>{label}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon="🧭" title="Navigation Style">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {NAV_STYLES.map((name, i) => (
                  <StyleOption key={name} label={name} selected={theme.navStyle===i} accent={theme.accent} dark={i===3} onClick={() => setTheme({navStyle: i})}>
                    <div style={{ background: i===3 ? "#09090B" : theme.navBg || "#fff" }}>
                      {navMinis[i]}
                    </div>
                  </StyleOption>
                ))}
              </div>
            </Section>

            <Section icon="🃏" title="Card Style">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {CARD_STYLES.map((name, i) => {
                  const isDark = i === 3;
                  return (
                    <StyleOption key={name} label={name} selected={theme.cardStyle===i} accent={theme.accent} dark={isDark} onClick={() => setTheme({cardStyle: i})}>
                      <div style={{ background: isDark ? "#09090B" : "#fff", padding:"8px 8px 4px", borderRadius:8 }}>
                        {/* Mini card preview */}
                        {i === 0 && (
                          <div style={{ border:`1px solid ${theme.accent}30`, borderRadius:8, padding:"6px 8px", background:"#fff" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#3D2C2C", marginBottom:4 }}>Today's Chores</div>
                            <div style={{ height:2, borderRadius:1, background:theme.accent+"40", marginBottom:3 }}/>
                            <div style={{ height:2, borderRadius:1, background:"#EDE0D8", marginBottom:3 }}/>
                            <div style={{ height:2, borderRadius:1, background:"#EDE0D8" }}/>
                          </div>
                        )}
                        {i === 1 && (
                          <div style={{ borderRadius:8, overflow:"hidden" }}>
                            <div style={{ background:theme.accent, padding:"5px 8px" }}><div style={{ fontSize:10, fontWeight:700, color:"#fff" }}>Today's Chores</div></div>
                            <div style={{ padding:"4px 8px 6px", background:"#fff" }}>
                              <div style={{ height:2, borderRadius:1, background:theme.accent+"40", marginBottom:3 }}/>
                              <div style={{ height:2, borderRadius:1, background:"#EDE0D8" }}/>
                            </div>
                          </div>
                        )}
                        {i === 2 && (
                          <div style={{ borderRadius:8, background:"rgba(255,255,255,0.65)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.9)", padding:"6px 8px", position:"relative", overflow:"hidden" }}>
                            <div style={{ position:"absolute", top:-10, right:-10, width:30, height:30, borderRadius:"50%", background:theme.accent+"44", filter:"blur(8px)" }}/>
                            <div style={{ fontSize:10, fontWeight:700, color:"#3D2C2C", marginBottom:4, position:"relative" }}>Today's Chores</div>
                            <div style={{ height:2, borderRadius:1, background:theme.accent+"40", marginBottom:3 }}/>
                            <div style={{ height:2, borderRadius:1, background:"#EDE0D8" }}/>
                          </div>
                        )}
                        {i === 3 && (
                          <div style={{ borderRadius:8, background:"#09090B", border:"1px solid #18181B", padding:"6px 8px", position:"relative", overflow:"hidden" }}>
                            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${theme.accent},${theme.accent}88)` }}/>
                            <div style={{ fontSize:10, fontWeight:700, color:"#FAFAFA", marginBottom:4 }}>Today's Chores</div>
                            <div style={{ height:2, borderRadius:1, background:theme.accent+"60", marginBottom:3 }}/>
                            <div style={{ height:2, borderRadius:1, background:"#27272A" }}/>
                          </div>
                        )}
                      </div>
                    </StyleOption>
                  );
                })}
              </div>
            </Section>

            <Section icon="✏️" title="Typography">
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, color:"#B8A8A8", marginBottom:10 }}>Font Size</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[{v:"normal",sz:15,label:"Normal"},{v:"large",sz:19,label:"Large"},{v:"xlarge",sz:23,label:"X-Large"}].map(opt => {
                    const isS = theme.fontSize === opt.v;
                    return (
                      <button key={opt.v} onClick={() => setTheme({fontSize: opt.v})} style={{ flex:1, padding:"12px 8px", borderRadius:12, border:`2px solid ${isS ? theme.accent : "#EDE0D8"}`, background: isS ? theme.accent+"10" : "#fff", cursor:"pointer", transition:"all 0.15s", textAlign:"center" }}>
                        <div style={{ fontSize:opt.sz, fontWeight:800, color: isS ? theme.accent : "#3D2C2C", lineHeight:1, marginBottom:4 }}>Aa</div>
                        <div style={{ fontSize:10, fontWeight:700, color: isS ? theme.accent : "#B8A8A8" }}>{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, color:"#B8A8A8", marginBottom:10 }}>Font Family</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[{v:"nunito",label:"Nunito",ff:"'Nunito',sans-serif",sample:"Friendly & Modern"},{v:"rounded",label:"Rounded",ff:"'Trebuchet MS',sans-serif",sample:"Warm & Cozy"},{v:"serif",label:"Serif",ff:"'Fraunces',Georgia,serif",sample:"Classic & Elegant"},{v:"mono",label:"Mono",ff:"'Courier New',monospace",sample:"Clean & Technical"}].map(opt => {
                    const isS = theme.fontFam === opt.v;
                    return (
                      <button key={opt.v} onClick={() => setTheme({fontFam: opt.v})} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`2px solid ${isS ? theme.accent : "#EDE0D8"}`, background: isS ? theme.accent+"10" : "#fff", cursor:"pointer", transition:"all 0.15s", textAlign:"left" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, fontFamily:opt.ff, fontWeight: isS ? 700 : 500, color: isS ? theme.accent : "#3D2C2C", marginBottom:2 }}>{opt.label}</div>
                          <div style={{ fontSize:11, fontFamily:opt.ff, color: isS ? theme.accent+"aa" : "#B8A8A8" }}>{opt.sample}</div>
                        </div>
                        {isS && <div style={{ width:16, height:16, borderRadius:"50%", background:theme.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* Live type preview */}
            <div style={{ background:"rgba(255,255,255,0.6)", borderRadius:14, padding:"16px 16px", border:"1.5px solid #EDE0D8", marginTop:8 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, color:"#B8A8A8", marginBottom:12 }}>Preview</div>
              <div style={{ fontFamily:{"nunito":"'Nunito',sans-serif","rounded":"'Trebuchet MS',sans-serif","serif":"'Fraunces',Georgia,serif","mono":"'Courier New',monospace"}[theme.fontFam] }}>
                <div style={{ fontSize:{normal:20,large:24,xlarge:28}[theme.fontSize]||20, fontWeight:700, color:"#3D2C2C", marginBottom:4, lineHeight:1.2 }}>The Johnson Family</div>
                <div style={{ fontSize:{normal:13,large:15,xlarge:17}[theme.fontSize]||13, color:"#8B7070", marginBottom:6 }}>Your private family hub · Est. 1982</div>
                <div style={{ fontSize:{normal:12,large:14,xlarge:16}[theme.fontSize]||12, color:theme.accent, fontWeight:700 }}>3 chores · 2 events · 5 members</div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div style={{ padding:"16px 20px", borderTop:"1.5px solid #EDE0D8", flexShrink:0, background:"rgba(253,248,244,0.95)" }}>
            <button
              onClick={saveTheme}
              style={{ width:"100%", padding:"14px", background: saved ? "#107C10" : `linear-gradient(135deg,${theme.accent},${theme.accent}cc)`, color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", transition:"background 0.4s", boxShadow: saved ? "0 4px 16px rgba(16,124,16,0.3)" : `0 6px 20px ${theme.accent}55`, fontFamily:"'Nunito',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            >
              {saved ? "✓  Saved to your profile!" : "💾  Save My Style"}
            </button>
            <div style={{ fontSize:11, color:"#B8A8A8", textAlign:"center", marginTop:8, fontWeight:600 }}>Changes apply instantly to the whole app</div>
          </div>
        </div>
      </div>
    </>
  );
}
