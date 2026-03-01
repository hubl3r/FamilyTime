// src/app/dashboard/settings/page.tsx
"use client";
import { useTheme } from "@/components/ThemeContext";

const NAV_NAMES  = ["Pill Slide","Float Bubble","Underline Sweep","Minimal Dark"];
const CARD_NAMES = ["Clean Flat","Color Header","Glass","Bold Dark"];
const FONT_NAMES: Record<string, string> = { nunito:"Nunito", rounded:"Rounded", serif:"Serif (Fraunces)", mono:"Mono" };

export default function SettingsPage() {
  const { theme } = useTheme();

  return (
    <div style={{ padding:"20px 0 12px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)", marginBottom:6 }}>Settings</h1>
        <p style={{ fontSize:13, color:"var(--ink-muted)" }}>Manage your FamilyTime preferences</p>
      </div>

      {/* Style summary card */}
      <div style={{ background:"rgba(255,255,255,0.8)", border:"1.5px solid var(--border)", borderRadius:20, padding:"20px", marginBottom:16, backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎨</div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>Your Current Style</div>
            <div style={{ fontSize:11, color:"var(--ink-subtle)" }}>Tap the 🎨 button to customize</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ background:"var(--cream)", borderRadius:12, padding:"12px 14px", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--ink-subtle)", marginBottom:10 }}>Colors</div>
            {[["Accent", theme.accent],["Page", theme.pageBg],["Nav", theme.navBg]].map(([label, color]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:18, height:18, borderRadius:5, background:color, border:"1.5px solid rgba(61,44,44,0.1)", flexShrink:0 }}/>
                <span style={{ fontSize:12, color:"var(--ink-muted)", fontWeight:600 }}>{label}</span>
                <span style={{ fontSize:11, color:"var(--ink-subtle)", fontFamily:"monospace", marginLeft:"auto" }}>{color.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div style={{ background:"var(--cream)", borderRadius:12, padding:"12px 14px", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--ink-subtle)", marginBottom:10 }}>Styles</div>
            {[
              ["Navigation", NAV_NAMES[theme.navStyle]],
              ["Cards", CARD_NAMES[theme.cardStyle]],
              ["Font", FONT_NAMES[theme.fontFam] || theme.fontFam],
              ["Size", theme.fontSize.charAt(0).toUpperCase() + theme.fontSize.slice(1)],
            ].map(([label, value]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"var(--ink-muted)", fontWeight:600 }}>{label}</span>
                <span style={{ fontSize:12, color:theme.accent, fontWeight:700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop:14, padding:"10px 14px", background:`${theme.accent}12`, borderRadius:10, border:`1px solid ${theme.accent}30`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>💡</span>
          <span style={{ fontSize:12, color:"var(--ink-muted)", lineHeight:1.5 }}>Open the <strong style={{ color:theme.accent }}>Style Studio</strong> by tapping the 🎨 button floating above the nav bar — changes apply across the whole app instantly.</span>
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.8)", border:"1.5px solid var(--border)", borderRadius:20, padding:"20px", backdropFilter:"blur(8px)" }}>
        <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)", marginBottom:16 }}>Account & Privacy</div>
        {[
          { icon:"👤", label:"Profile", desc:"Edit your name and photo" },
          { icon:"🔔", label:"Notifications", desc:"Manage alerts & reminders" },
          { icon:"🔒", label:"Privacy", desc:"Data sharing preferences" },
          { icon:"👨‍👩‍👧‍👦", label:"Family Members", desc:"Manage who is in your hub" },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(232,165,165,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>{item.label}</div>
              <div style={{ fontSize:12, color:"var(--ink-subtle)" }}>{item.desc}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#B8A8A8" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}
