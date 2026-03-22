// src/app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/components/UserContext";

const FAMILY_MODULES = [
  { href:"/dashboard/finances",  icon:"💰", label:"Finances",  desc:"Budgets & expenses",  color:"#A8C5A0", bg:"#E3EFE1" },
  { href:"/dashboard/documents", icon:"📁", label:"Documents", desc:"Family files",         color:"#A8C8E8", bg:"#E3EFF8" },
  { href:"/dashboard/chores",    icon:"🧹", label:"Chores",    desc:"Tasks & points",       color:"#E8A5A5", bg:"#F7E6E6" },
  { href:"/dashboard/meals",     icon:"🍽️", label:"Meals",     desc:"Meal planner",         color:"#F0C4A0", bg:"#FBF0E6" },
  { href:"/dashboard/prayer",    icon:"🙏", label:"Prayer",    desc:"Prayer requests",      color:"#B5A8D4", bg:"#EDE9F7" },
  { href:"/dashboard/events",    icon:"🎉", label:"Events",    desc:"Family calendar",      color:"#E8A5A5", bg:"#F7E6E6" },
  { href:"/dashboard/members",   icon:"👨‍👩‍👧‍👦", label:"Members",  desc:"Your family",          color:"#A8C8E8", bg:"#E3EFF8" },
  { href:"/dashboard/settings",  icon:"⚙️",  label:"Settings",  desc:"Customize your hub",  color:"#B5A8D4", bg:"#EDE9F7" },
];

type Member = { id: string; first_name: string; last_name: string; initials: string; color: string; role: string };
type DashboardData = {
  family: { id: string; name: string; founded_year: number | null };
  members: Member[];
  member_count: number;
  monthly_total: number;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"var(--ink-subtle)" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color:"var(--ink)", textAlign:"right" as const, maxWidth:"60%" }}>{value}</span>
    </div>
  );
}

function FamilyView({ familyId }: { familyId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?family_id=${familyId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [familyId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div style={{ padding:"60px 0", textAlign:"center", color:"var(--ink-subtle)" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🏡</div>
      <div style={{ fontSize:14 }}>Loading your hub...</div>
    </div>
  );

  const members = data?.members ?? [];
  const visible = members.slice(0, 6);
  const overflow = members.length - 6;

  return (
    <div style={{ padding:"20px 0 12px" }}>
      <div style={{ background:"linear-gradient(135deg, rgba(232,165,165,0.3), rgba(181,168,212,0.3))", border:"1.5px solid var(--border)", borderRadius:20, padding:"24px 20px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"rgba(181,168,212,0.15)", pointerEvents:"none" }}/>
        <p style={{ fontSize:13, color:"var(--ink-muted)", fontWeight:600, marginBottom:4 }}>{greeting} 🌸</p>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)", marginBottom:6 }}>
          {data?.family.name ?? "Your Family"}
        </h2>
        <p style={{ fontSize:13, color:"var(--ink-muted)", marginBottom:16 }}>
          {data?.family.founded_year ? `Est. ${data.family.founded_year} · ` : ""}
          {data?.member_count ?? 0} member{(data?.member_count ?? 0) !== 1 ? "s" : ""}
        </p>
        <div style={{ display:"flex", gap:0 }}>
          {visible.map((m, i) => (
            <div key={m.id} style={{ width:34, height:34, borderRadius:10, background:m.color||"#E8A5A5", border:"2px solid var(--cream)", marginLeft:i===0?0:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white", boxShadow:"0 2px 8px rgba(100,60,60,0.12)", zIndex:10-i }}>
              {m.initials||(m.first_name?.[0]??"?")}
            </div>
          ))}
          {overflow > 0 && <div style={{ width:34, height:34, borderRadius:10, background:"var(--tan)", border:"2px solid var(--cream)", marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"var(--ink-muted)" }}>+{overflow}</div>}
          <Link href="/dashboard/members" style={{ width:34, height:34, borderRadius:10, border:"2px dashed var(--tan-deep)", marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"var(--ink-subtle)", textDecoration:"none" }}>+</Link>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[
          [String(data?.member_count??0), "Members", "#E8A5A5", "#F7E6E6"],
          [`$${((data?.monthly_total??0)/100).toLocaleString("en-US",{maximumFractionDigits:0})}`, "Monthly bills", "#A8C5A0", "#E3EFE1"],
          [String(new Date().getFullYear()), "This year", "#B5A8D4", "#EDE9F7"],
        ].map(([val,lbl,color,bg]) => (
          <div key={lbl} style={{ background:bg, border:`1.5px solid ${color}40`, borderRadius:14, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:"var(--ink)", marginBottom:2 }}>{val}</div>
            <div style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:600 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500, color:"var(--ink)", marginBottom:14 }}>Your Hub</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:24 }}>
        {FAMILY_MODULES.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration:"none", background:"rgba(255,255,255,0.8)", border:"1.5px solid var(--border)", borderRadius:16, padding:"18px 16px", display:"flex", alignItems:"center", gap:14, backdropFilter:"blur(8px)" }}>
            <div style={{ width:44, height:44, borderRadius:14, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{m.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)", marginBottom:2 }}>{m.label}</div>
              <div style={{ fontSize:12, color:"var(--ink-subtle)" }}>{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PersonalView() {
  const { me } = useUser();
  if (!me) return null;

  const age = me.birthday ? (() => {
    const b = new Date(me.birthday + "T00:00:00");
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth()-b.getMonth()<0||(now.getMonth()-b.getMonth()===0&&now.getDate()<b.getDate())) a--;
    return a;
  })() : null;

  return (
    <div style={{ padding:"20px 0 12px" }}>
      <div style={{ background:"linear-gradient(135deg, rgba(232,165,165,0.2), rgba(181,168,212,0.2))", border:"1.5px solid var(--border)", borderRadius:20, padding:"28px 20px", marginBottom:24, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:22, background:me.color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:800, color:"#fff", margin:"0 auto 14px", boxShadow:"0 4px 16px rgba(100,60,60,0.15)" }}>
          {me.initials||me.first_name?.[0]||"?"}
        </div>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:600, color:"var(--ink)", margin:"0 0 4px" }}>
          {me.first_name} {me.last_name}
          {me.nickname && <span style={{ fontSize:16, color:"var(--ink-muted)", fontWeight:400 }}> &ldquo;{me.nickname}&rdquo;</span>}
        </h2>
        <p style={{ fontSize:13, color:"var(--ink-muted)", margin:"0 0 16px" }}>{me.email}</p>
        {me.bio && <p style={{ fontSize:13, color:"var(--ink)", lineHeight:1.6, margin:"0 0 16px", fontStyle:"italic" }}>&ldquo;{me.bio}&rdquo;</p>}
        <div style={{ display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
          {age!==null && <span style={{ fontSize:12, color:"var(--ink-muted)" }}>🎂 {age} years old</span>}
          {me.phone && <span style={{ fontSize:12, color:"var(--ink-muted)" }}>📱 {me.phone}</span>}
        </div>
      </div>

      <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500, color:"var(--ink)", marginBottom:14 }}>Your Families</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {me.families.map(f => (
          <div key={f.family_id} style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏡</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>{f.family?.name??"Family"}</div>
              <div style={{ fontSize:12, color:"var(--ink-subtle)", textTransform:"capitalize" }}>{f.role}</div>
            </div>
          </div>
        ))}
        <Link href="/join" style={{ display:"flex", alignItems:"center", gap:14, background:"rgba(255,255,255,0.6)", border:"1.5px dashed var(--tan-deep)", borderRadius:16, padding:"16px", textDecoration:"none", color:"var(--ink-subtle)", fontSize:14, fontWeight:600 }}>
          <div style={{ width:44, height:44, borderRadius:14, border:"2px dashed var(--tan-deep)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>+</div>
          Join another family
        </Link>
      </div>

      {(me.blood_type||me.allergies||me.medications||me.emergency_contact_name) && (
        <>
          <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500, color:"var(--ink)", marginBottom:14 }}>Health & Emergency</h3>
          <div style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid var(--border)", borderRadius:16, padding:"16px 20px", marginBottom:24 }}>
            {me.blood_type && <Row label="Blood Type" value={me.blood_type}/>}
            {me.allergies && <Row label="Allergies" value={me.allergies}/>}
            {me.medications && <Row label="Medications" value={me.medications}/>}
            {me.emergency_contact_name && <Row label="Emergency Contact" value={`${me.emergency_contact_name}${me.emergency_contact_phone?` · ${me.emergency_contact_phone}`:""}`}/>}
          </div>
        </>
      )}

      <Link href="/dashboard/settings" style={{ display:"flex", alignItems:"center", gap:14, background:"rgba(255,255,255,0.8)", border:"1.5px solid var(--border)", borderRadius:16, padding:"16px", textDecoration:"none" }}>
        <div style={{ width:44, height:44, borderRadius:14, background:"#EDE9F7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚙️</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>Settings</div>
          <div style={{ fontSize:12, color:"var(--ink-subtle)" }}>Theme, preferences & account</div>
        </div>
      </Link>
    </div>
  );
}

export default function DashboardHome() {
  const { currentContext, isPersonal, loading } = useUser();
  if (loading) return (
    <div style={{ padding:"80px 0", textAlign:"center", color:"var(--ink-subtle)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🏡</div>
      <div>Loading...</div>
    </div>
  );
  if (isPersonal) return <PersonalView />;
  return <FamilyView familyId={currentContext} />;
}
