// src/components/StylePicker.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
function HomeIcon({ active, color }: { active: boolean; color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill={active ? color : "none"} fillOpacity={active ? 0.15 : 0} stroke={active ? color : "#94A3B8"} strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
function ChoresIcon({ active, color }: { active: boolean; color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke={active ? color : "#94A3B8"} strokeWidth="1.8" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1.5" fill={active ? color : "none"} fillOpacity="0.2" stroke={active ? color : "#94A3B8"} strokeWidth="1.7"/><path d="M9 12L11 14L15 10" stroke={active ? color : "#94A3B8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function EventsIcon({ active, color }: { active: boolean; color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="17" rx="2.5" fill={active ? color : "none"} fillOpacity="0.12" stroke={active ? color : "#94A3B8"} strokeWidth="1.8"/><path d="M3 10H21" stroke={active ? color : "#94A3B8"} strokeWidth="1.8"/><path d="M8 3V7M16 3V7" stroke={active ? color : "#94A3B8"} strokeWidth="1.8" strokeLinecap="round"/><rect x="7" y="13" width="3" height="3" rx="0.8" fill={active ? color : "#94A3B8"}/></svg>;
}
function PhotosIcon({ active, color }: { active: boolean; color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="15" rx="2.5" fill={active ? color : "none"} fillOpacity="0.12" stroke={active ? color : "#94A3B8"} strokeWidth="1.8"/><circle cx="8.5" cy="10.5" r="1.5" fill={active ? color : "#94A3B8"}/><path d="M3 16L8 11L12 15L15 12L21 18" stroke={active ? color : "#94A3B8"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function MoreIcon({ active, color }: { active: boolean; color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill={active ? color : "#94A3B8"}/><circle cx="12" cy="12" r="1.5" fill={active ? color : "#94A3B8"}/><circle cx="19" cy="12" r="1.5" fill={active ? color : "#94A3B8"}/></svg>;
}

const NAV_ITEMS = [
  { id: "home",   label: "Home",   Icon: HomeIcon   },
  { id: "chores", label: "Chores", Icon: ChoresIcon },
  { id: "events", label: "Events", Icon: EventsIcon },
  { id: "photos", label: "Photos", Icon: PhotosIcon },
  { id: "more",   label: "More",   Icon: MoreIcon   },
];

const CHORES = [
  { task: "Take out trash",     who: "Jordan", done: true  },
  { task: "Vacuum living room", who: "Lily",   done: false },
  { task: "Grocery run",        who: "Maria",  done: false },
];

// ── Color picker helpers ──────────────────────────────────────────────────────
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

function ColorPicker({ value, onChange, label, swatches = [] }: { value: string; onChange: (v: string) => void; label: string; swatches?: string[] }) {
  const [open, setOpen]     = useState(false);
  const [hexIn, setHexIn]   = useState(value);
  const [hsv, setHsv]       = useState(() => hexToHsv(value));
  const svRef    = useRef<HTMLDivElement>(null);
  const hueRef   = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dragSV   = useRef(false);
  const dragHue  = useRef(false);

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
    <div ref={pickerRef} style={{ position: "relative" }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#A1A1AA", marginBottom:7 }}>{label}</div>
      <button onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:"#fff", border:`1.5px solid ${open ? value : "#E4E4E7"}`, borderRadius:10, cursor:"pointer", width:"100%", transition:"border-color 0.15s" }}>
        <div style={{ width:26, height:26, borderRadius:7, background:value, flexShrink:0, boxShadow:"inset 0 0 0 1px rgba(0,0,0,0.1)" }}/>
        <span style={{ fontSize:13, fontWeight:600, color:"#09090B", fontFamily:"monospace" }}>{value.toUpperCase()}</span>
        <svg style={{ marginLeft:"auto", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s" }} width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, zIndex:1000, background:"#fff", borderRadius:14, border:"1.5px solid #E4E4E7", boxShadow:"0 12px 40px rgba(0,0,0,0.18)", padding:14, width:240 }}>
          <div ref={svRef} onPointerDown={e => { dragSV.current = true; onSV(e); }} style={{ width:"100%", height:130, borderRadius:8, position:"relative", background:pureHue, marginBottom:10, cursor:"crosshair", backgroundImage:"linear-gradient(to right,#fff,transparent),linear-gradient(to top,#000,transparent)" }}>
            <div style={{ position:"absolute", left:`${hsv.s*100}%`, top:`${(1-hsv.v)*100}%`, transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", border:"2.5px solid white", boxShadow:"0 1px 4px rgba(0,0,0,0.3)", background:value, pointerEvents:"none" }}/>
          </div>
          <div ref={hueRef} onPointerDown={e => { dragHue.current = true; onHue(e); }} style={{ width:"100%", height:14, borderRadius:7, position:"relative", background:"linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", marginBottom:12, cursor:"pointer" }}>
            <div style={{ position:"absolute", left:`${(hsv.h/360)*100}%`, top:"50%", transform:"translate(-50%,-50%)", width:18, height:18, borderRadius:"50%", border:"2.5px solid white", boxShadow:"0 1px 4px rgba(0,0,0,0.3)", background:pureHue, pointerEvents:"none" }}/>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={hexIn} onChange={e => { setHexIn(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { onChange(e.target.value); setHsv(hexToHsv(e.target.value)); } }} style={{ flex:1, padding:"7px 10px", border:"1.5px solid #E4E4E7", borderRadius:8, fontSize:13, fontFamily:"monospace", outline:"none", color:"#09090B" }}/>
            <div style={{ width:34, height:34, borderRadius:8, background:value, border:"1.5px solid #E4E4E7", flexShrink:0 }}/>
          </div>
          {swatches.length > 0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
              {swatches.map(s => <button key={s} onClick={() => { onChange(s); setHsv(hexToHsv(s)); setHexIn(s); }} style={{ width:22, height:22, borderRadius:5, background:s, border:`2px solid ${value===s ? "#09090B" : "transparent"}`, cursor:"pointer" }} title={s}/>)}
            </div>
          )}
          <button onClick={() => setOpen(false)} style={{ width:"100%", padding:"8px", background:"#09090B", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Done</button>
        </div>
      )}
    </div>
  );
}

// ── Nav styles ────────────────────────────────────────────────────────────────
function NavPillSlide({ active, setActive, color, navBg }: { active: string; setActive: (id: string) => void; color: string; navBg: string }) {
  const idx = NAV_ITEMS.findIndex(n => n.id === active);
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center", background:navBg||"#fff", borderTop:"1px solid #E4E4E7", padding:"8px 6px 12px" }}>
      <div style={{ position:"absolute", top:8, height:44, width:`${100/NAV_ITEMS.length}%`, left:`${(idx*100)/NAV_ITEMS.length}%`, transition:"left 0.3s cubic-bezier(.34,1.56,.64,1)", padding:"0 8px", pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:color+"18", borderRadius:12, width:"100%", height:"100%" }}/>
      </div>
      {NAV_ITEMS.map(item => { const isA = item.id===active; return (
        <button key={item.id} onClick={() => setActive(item.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"6px 0", position:"relative", zIndex:1, transform:isA?"translateY(-1px)":"none", transition:"transform 0.2s" }}>
          <item.Icon active={isA} color={color}/><span style={{ fontSize:10, fontWeight:isA?700:500, color:isA?color:"#94A3B8", transition:"color 0.2s" }}>{item.label}</span>
        </button>
      );})}
    </div>
  );
}

function NavFloatingBubble({ active, setActive, color, navBg }: { active: string; setActive: (id: string) => void; color: string; navBg: string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", background:navBg||"#fff", borderTop:"1px solid #E4E4E7", padding:"0 4px 10px" }}>
      {NAV_ITEMS.map(item => { const isA = item.id===active; return (
        <button key={item.id} onClick={() => setActive(item.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", background:isA?color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transform:isA?"translateY(-10px)":"translateY(0)", transition:"all 0.35s cubic-bezier(.34,1.56,.64,1)", boxShadow:isA?`0 6px 20px ${color}55`:"none" }}>
            <item.Icon active={false} color={isA?"#fff":"#94A3B8"}/>
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:isA?color:"transparent", transition:"color 0.2s", height:14 }}>{item.label}</span>
        </button>
      );})}
    </div>
  );
}

function NavUnderlineSweep({ active, setActive, color, navBg }: { active: string; setActive: (id: string) => void; color: string; navBg: string }) {
  const idx = NAV_ITEMS.findIndex(n => n.id === active);
  return (
    <div style={{ position:"relative", background:navBg||"#fff", borderTop:"1px solid #E4E4E7" }}>
      <div style={{ position:"absolute", top:0, height:3, width:`${100/NAV_ITEMS.length}%`, left:`${(idx*100)/NAV_ITEMS.length}%`, background:color, borderRadius:"0 0 3px 3px", transition:"left 0.3s cubic-bezier(.25,.46,.45,.94)" }}/>
      <div style={{ display:"flex", padding:"8px 0 12px" }}>
        {NAV_ITEMS.map(item => { const isA = item.id===active; return (
          <button key={item.id} onClick={() => setActive(item.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", transform:isA?"scale(1.12)":"scale(1)", transition:"transform 0.25s cubic-bezier(.34,1.56,.64,1)" }}>
            <item.Icon active={isA} color={color}/><span style={{ fontSize:10, fontWeight:isA?700:500, color:isA?color:"#94A3B8", transition:"color 0.2s" }}>{item.label}</span>
          </button>
        );})}
      </div>
    </div>
  );
}

function NavMinimalDark({ active, setActive, color }: { active: string; setActive: (id: string) => void; color: string; navBg?: string }) {
  return (
    <div style={{ display:"flex", background:"#09090B", padding:"8px 0 14px" }}>
      {NAV_ITEMS.map(item => { const isA = item.id===active; return (
        <button key={item.id} onClick={() => setActive(item.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer" }}>
          <div style={{ position:"relative" }}><item.Icon active={isA} color={color}/>{isA && <div style={{ position:"absolute", bottom:-4, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:color }}/>}</div>
          <span style={{ fontSize:10, fontWeight:isA?700:400, color:isA?color:"#52525B", transition:"color 0.2s" }}>{item.label}</span>
        </button>
      );})}
    </div>
  );
}

// ── Card styles ───────────────────────────────────────────────────────────────
type ChoreItem = { task: string; who: string; done: boolean };
const FS: Record<string, number> = { normal:13, large:15, xlarge:17 };

function ChoreList({ color, chores, toggleChore, fontSize, dark = false }: { color: string; chores: ChoreItem[]; toggleChore: (i: number) => void; fontSize: string; dark?: boolean }) {
  const fs = FS[fontSize] || 13;
  return <>{chores.map((c, i) => (
    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<chores.length-1?`1px solid ${dark?"#18181B":"#F4F4F5"}`:"none" }}>
      <div onClick={() => toggleChore(i)} style={{ width:18, height:18, borderRadius:5, border:`1.8px solid ${c.done?color:dark?"#3F3F46":"#D4D4D8"}`, background:c.done?color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
        {c.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ flex:1, fontSize:fs, color:c.done?dark?"#52525B":"#A1A1AA":dark?"#D4D4D8":"#09090B", textDecoration:c.done?"line-through":"none" }}>{c.task}</span>
      <span style={{ fontSize:fs-2, fontWeight:600, color:color, background:color+"18", padding:"2px 8px", borderRadius:5 }}>{c.who}</span>
    </div>
  ))}</>;
}

function CardFlat({ color, chores, toggleChore, fontSize }: { color: string; chores: ChoreItem[]; toggleChore: (i: number) => void; fontSize: string }) {
  const fs = FS[fontSize] || 13;
  return <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #E4E4E7", padding:"14px 16px", margin:"0 0 10px" }}><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}><span style={{ fontSize:fs, fontWeight:700, color:"#09090B" }}>Today's Chores</span><span style={{ fontSize:fs-2, color, fontWeight:600 }}>View all</span></div><ChoreList color={color} chores={chores} toggleChore={toggleChore} fontSize={fontSize}/></div>;
}
function CardElevated({ color, chores, toggleChore, fontSize }: { color: string; chores: ChoreItem[]; toggleChore: (i: number) => void; fontSize: string }) {
  const fs = FS[fontSize] || 13;
  return <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 4px 24px rgba(0,0,0,0.10)", overflow:"hidden", margin:"0 0 10px" }}><div style={{ background:color, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ fontSize:fs, fontWeight:700, color:"#fff" }}>Today's Chores</span><span style={{ fontSize:fs-2, color:"rgba(255,255,255,0.75)", fontWeight:600 }}>View all</span></div><div style={{ padding:"4px 16px 12px" }}><ChoreList color={color} chores={chores} toggleChore={toggleChore} fontSize={fontSize}/></div></div>;
}
function CardGlass({ color, chores, toggleChore, fontSize }: { color: string; chores: ChoreItem[]; toggleChore: (i: number) => void; fontSize: string }) {
  const fs = FS[fontSize] || 13;
  return <div style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(12px)", borderRadius:18, border:"1.5px solid rgba(255,255,255,0.9)", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", padding:"14px 16px", margin:"0 0 10px", position:"relative", overflow:"hidden" }}><div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:color+"33", filter:"blur(20px)", pointerEvents:"none" }}/><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, position:"relative" }}><span style={{ fontSize:fs, fontWeight:700, color:"#09090B" }}>Today's Chores</span><span style={{ fontSize:fs-2, color, fontWeight:600 }}>View all</span></div><ChoreList color={color} chores={chores} toggleChore={toggleChore} fontSize={fontSize}/></div>;
}
function CardDark({ color, chores, toggleChore, fontSize }: { color: string; chores: ChoreItem[]; toggleChore: (i: number) => void; fontSize: string }) {
  const fs = FS[fontSize] || 13;
  return <div style={{ background:"#09090B", borderRadius:16, border:"1px solid #18181B", padding:"14px 16px", margin:"0 0 10px", position:"relative", overflow:"hidden" }}><div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)` }}/><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}><span style={{ fontSize:fs, fontWeight:700, color:"#FAFAFA" }}>Today's Chores</span><span style={{ fontSize:fs-2, color, fontWeight:600 }}>View all</span></div><ChoreList color={color} chores={chores} toggleChore={toggleChore} fontSize={fontSize} dark/></div>;
}

// ── Phone preview ─────────────────────────────────────────────────────────────
function PhonePreview({ navStyle, cardStyle, accent, navBg, pageBg, fontSize }: { navStyle: number; cardStyle: number; accent: string; navBg: string; pageBg: string; fontSize: string }) {
  const [activeTab, setActiveTab] = useState("home");
  const [chores, setChores] = useState(CHORES.map(c => ({ ...c })));
  const toggle = (i: number) => setChores(c => c.map((item, idx) => idx===i ? {...item, done: !item.done} : item));
  const NavC = [NavPillSlide, NavFloatingBubble, NavUnderlineSweep, NavMinimalDark][navStyle];
  const CardC = [CardFlat, CardElevated, CardGlass, CardDark][cardStyle];
  const darkCard = cardStyle === 3, darkNav = navStyle === 3;
  const fs = { normal:12, large:14, xlarge:16 }[fontSize] || 12;
  return (
    <div style={{ width:240, height:500, borderRadius:36, border:"7px solid #09090B", overflow:"hidden", background:darkCard?"#09090B":pageBg, display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,0.25)", flexShrink:0, position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:72, height:22, background:"#09090B", borderRadius:"0 0 14px 14px", zIndex:10 }}/>
      <div style={{ padding:"28px 14px 10px", background:darkCard?"#09090B":"#fff", borderBottom:`1px solid ${darkCard?"#18181B":"#E4E4E7"}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:fs+1, fontWeight:700, color:darkCard?"#FAFAFA":"#09090B", fontFamily:"Georgia,serif" }}>FamilyTime</span>
        <div style={{ width:24, height:24, borderRadius:6, background:accent+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8C18 4.7 15.3 2 12 2C8.7 2 6 4.7 6 8C6 14 3 16 3 16H21C21 16 18 14 18 8Z" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.8"/></svg>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 10px 0", background:darkCard?"#09090B":pageBg }}>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:fs-1, color:darkCard?"#71717A":"#A1A1AA" }}>Good morning,</div>
          <div style={{ fontSize:fs+3, fontWeight:700, color:darkCard?"#FAFAFA":"#09090B", fontFamily:"Georgia,serif" }}>Johnson Family 🌿</div>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {[["3","Chores"],["2","Events"],["5","Members"]].map(([n,l]) => (
            <div key={l} style={{ flex:1, textAlign:"center", padding:"8px 4px", background:darkCard?"rgba(255,255,255,0.06)":"#fff", borderRadius:10, border:`1px solid ${darkCard?"#18181B":"#E4E4E7"}` }}>
              <div style={{ fontSize:fs+4, fontWeight:700, color:accent, fontFamily:"Georgia,serif" }}>{n}</div>
              <div style={{ fontSize:fs-3, color:darkCard?"#52525B":"#A1A1AA", textTransform:"uppercase", letterSpacing:"0.5px" }}>{l}</div>
            </div>
          ))}
        </div>
        <CardC color={accent} chores={chores} toggleChore={toggle} fontSize={fontSize}/>
      </div>
      <NavC active={activeTab} setActive={setActiveTab} color={accent} navBg={darkNav?"#09090B":navBg}/>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #E4E4E7", padding:"18px 20px", marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#09090B", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #F4F4F5" }}>{title}</div>
      {children}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCENT_SWATCHES = ["#0078D4","#107C10","#6B21A8","#C2410C","#BE185D","#0F766E","#B45309","#1D4ED8","#047857","#7C3AED"];
const BG_SWATCHES     = ["#FFFFFF","#F2F4F7","#F0F7FF","#F0FFF0","#FFF7F0","#F5F0FF","#FFFBEB","#FFF1F2","#F8FAFF","#09090B"];
const NAV_SWATCHES    = ["#FFFFFF","#F2F4F7","#09090B","#0078D4","#107C10","#1E1E2E","#F8F9FA","#EFF6FF"];
const NAV_NAMES       = ["Pill Slide","Float Bubble","Underline Sweep","Minimal Dark"];
const CARD_NAMES      = ["Clean Flat","Color Header","Glass","Bold Dark"];

// ── Main component ────────────────────────────────────────────────────────────
export default function StylePicker() {
  const [accent,   setAccent]   = useState("#0078D4");
  const [pageBg,   setPageBg]   = useState("#F2F4F7");
  const [navBg,    setNavBg]    = useState("#FFFFFF");
  const [navStyle, setNavStyle] = useState(0);
  const [cardStyle,setCardStyle]= useState(0);
  const [fontSize, setFontSize] = useState("normal");
  const [fontFam,  setFontFam]  = useState("system");
  const [saved,    setSaved]    = useState(false);

  const fontMap: Record<string, string> = {
    system:  "system-ui,sans-serif",
    rounded: "'Trebuchet MS',sans-serif",
    serif:   "Georgia,serif",
    mono:    "'Courier New',monospace",
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2200); };

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F7", fontFamily:fontMap[fontFam] }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;} ::-webkit-scrollbar{display:none;} button{font-family:inherit;}`}</style>

      <div style={{ background:"#09090B", padding:"18px 20px 16px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ fontSize:20, fontWeight:700, color:"#FAFAFA", fontFamily:"Georgia,serif", marginBottom:2 }}>Customize Your App</div>
        <div style={{ fontSize:13, color:"#71717A" }}>All changes preview live · Saved per family member</div>
      </div>

      <div style={{ display:"flex", gap:16, padding:"16px", alignItems:"flex-start", maxWidth:1080, margin:"0 auto" }}>
        {/* Controls */}
        <div style={{ flex:1, minWidth:0 }}>
          <Section title="🎨  Colors">
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <ColorPicker label="Accent Color"          value={accent} onChange={setAccent} swatches={ACCENT_SWATCHES}/>
              <ColorPicker label="Page Background"       value={pageBg} onChange={setPageBg} swatches={BG_SWATCHES}/>
              <ColorPicker label="Navigation Background" value={navBg}  onChange={setNavBg}  swatches={NAV_SWATCHES}/>
            </div>
          </Section>

          <Section title="🧭  Navigation Style">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {NAV_NAMES.map((name, i) => {
                const isS = navStyle === i;
                const NavC = [NavPillSlide, NavFloatingBubble, NavUnderlineSweep, NavMinimalDark][i];
                return (
                  <button key={name} onClick={() => setNavStyle(i)} style={{ background:i===3?"#09090B":"#F8F9FA", borderRadius:12, padding:0, border:`2px solid ${isS?accent:i===3?"#27272A":"#E4E4E7"}`, cursor:"pointer", overflow:"hidden", transition:"all 0.15s", boxShadow:isS?`0 0 0 3px ${accent}22`:"none", textAlign:"left" }}>
                    <div style={{ pointerEvents:"none", paddingTop:6 }}>
                      <NavC active="home" setActive={() => {}} color={accent} navBg={i===3?"#09090B":navBg}/>
                    </div>
                    <div style={{ padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", background:i===3?"#09090B":"#fff", borderTop:`1px solid ${i===3?"#18181B":"#F4F4F5"}` }}>
                      <span style={{ fontSize:12, fontWeight:600, color:isS?accent:i===3?"#D4D4D8":"#09090B" }}>{name}</span>
                      {isS && <div style={{ width:16, height:16, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="🃏  Card Style">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {CARD_NAMES.map((name, i) => {
                const isS = cardStyle === i;
                const CardC = [CardFlat, CardElevated, CardGlass, CardDark][i];
                const dummy = CHORES.map(c => ({ ...c }));
                return (
                  <button key={name} onClick={() => setCardStyle(i)} style={{ background:i===3?"#09090B":"#fff", borderRadius:12, padding:"12px 12px 0", border:`2px solid ${isS?accent:i===3?"#27272A":"#E4E4E7"}`, cursor:"pointer", transition:"all 0.15s", boxShadow:isS?`0 0 0 3px ${accent}22`:"none", textAlign:"left", overflow:"hidden" }}>
                    <div style={{ pointerEvents:"none", transform:"scale(0.85)", transformOrigin:"top left", marginBottom:-12 }}>
                      <CardC color={accent} chores={dummy} toggleChore={() => {}} fontSize={fontSize}/>
                    </div>
                    <div style={{ padding:"6px 0 10px", display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:`1px solid ${i===3?"#18181B":"#F4F4F5"}`, marginTop:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:isS?accent:i===3?"#D4D4D8":"#09090B" }}>{name}</span>
                      {isS && <div style={{ width:16, height:16, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="✏️  Typography">
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#A1A1AA", marginBottom:10 }}>Font Size</div>
              <div style={{ display:"flex", gap:10 }}>
                {[{v:"normal",sz:13,label:"Normal"},{v:"large",sz:16,label:"Large"},{v:"xlarge",sz:20,label:"X-Large"}].map(opt => {
                  const isS = fontSize === opt.v;
                  return (
                    <button key={opt.v} onClick={() => setFontSize(opt.v)} style={{ flex:1, padding:"14px 10px", borderRadius:12, border:`2px solid ${isS?accent:"#E4E4E7"}`, background:isS?accent+"0D":"#fff", cursor:"pointer", transition:"all 0.15s", textAlign:"center" }}>
                      <div style={{ fontSize:opt.sz, fontWeight:700, color:isS?accent:"#09090B", lineHeight:1, marginBottom:6 }}>Aa</div>
                      <div style={{ fontSize:11, fontWeight:600, color:isS?accent:"#71717A" }}>{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#A1A1AA", marginBottom:10 }}>Font Family</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[{v:"system",label:"System",ff:"system-ui"},{v:"rounded",label:"Rounded",ff:"Trebuchet MS"},{v:"serif",label:"Serif",ff:"Georgia"},{v:"mono",label:"Mono",ff:"Courier New"}].map(opt => {
                  const isS = fontFam === opt.v;
                  return (
                    <button key={opt.v} onClick={() => setFontFam(opt.v)} style={{ padding:"9px 16px", borderRadius:20, border:`2px solid ${isS?accent:"#E4E4E7"}`, background:isS?accent+"0D":"#fff", cursor:"pointer", transition:"all 0.15s" }}>
                      <span style={{ fontSize:14, fontFamily:opt.ff, fontWeight:isS?700:500, color:isS?accent:"#71717A" }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ background:"#F8F9FA", borderRadius:10, padding:"14px 16px", border:"1px solid #E4E4E7" }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#A1A1AA", marginBottom:10 }}>Live Preview</div>
              <div style={{ fontFamily:fontMap[fontFam] }}>
                <div style={{ fontSize:{normal:22,large:26,xlarge:31}[fontSize]||22, fontWeight:700, color:"#09090B", marginBottom:4, lineHeight:1.2 }}>The Johnson Family</div>
                <div style={{ fontSize:{normal:14,large:16,xlarge:18}[fontSize]||14, color:"#71717A", marginBottom:8 }}>Your private family hub · Est. 1982</div>
                <div style={{ fontSize:{normal:13,large:15,xlarge:17}[fontSize]||13, color:accent, fontWeight:600 }}>3 chores due today · 2 upcoming events</div>
              </div>
            </div>
          </Section>

          <button onClick={handleSave} style={{ width:"100%", padding:15, background:saved?"#107C10":accent, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor:"pointer", transition:"background 0.3s", boxShadow:`0 6px 20px ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {saved ? "✓  Saved to your profile!" : "Save My Style"}
          </button>
          <div style={{ fontSize:12, color:"#A1A1AA", textAlign:"center", marginTop:8 }}>Each family member saves their own preferences</div>
        </div>

        {/* Live phone preview */}
        <div style={{ position:"sticky", top:80, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#A1A1AA", textAlign:"center", marginBottom:2 }}>Live Preview</div>
          <PhonePreview navStyle={navStyle} cardStyle={cardStyle} accent={accent} navBg={navBg} pageBg={pageBg} fontSize={fontSize}/>
          <div style={{ background:"#09090B", borderRadius:12, padding:"12px 18px", fontSize:12, color:"#FAFAFA", lineHeight:2, minWidth:200, textAlign:"center", border:"1px solid #18181B" }}>
            <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:1, color:"#52525B", marginBottom:6 }}>Current Selection</div>
            {[["Nav",NAV_NAMES[navStyle]],["Cards",CARD_NAMES[cardStyle]],["Font",fontSize.charAt(0).toUpperCase()+fontSize.slice(1)]].map(([k,v]) => (
              <div key={k}><span style={{ color:accent, fontWeight:700 }}>{k}:</span> {v}</div>
            ))}
            <div style={{ marginTop:8, display:"flex", gap:6, justifyContent:"center" }}>
              {[accent,pageBg,navBg].map((c,i) => <div key={i} title={["Accent","Page","Nav"][i]} style={{ width:18, height:18, borderRadius:5, background:c, border:"1.5px solid rgba(255,255,255,0.1)" }}/>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
