// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const modules = [
  { href:"/dashboard/finances",  icon:"💰", label:"Finances",  desc:"Budgets & expenses",  color:"#A8C5A0", bg:"#E3EFE1" },
  { href:"/dashboard/documents", icon:"📁", label:"Documents", desc:"Family files",         color:"#A8C8E8", bg:"#E3EFF8" },
  { href:"/dashboard/chores",    icon:"🧹", label:"Chores",    desc:"Tasks & points",       color:"#E8A5A5", bg:"#F7E6E6" },
  { href:"/dashboard/meals",     icon:"🍽️", label:"Meals",     desc:"Meal planner",         color:"#F0C4A0", bg:"#FBF0E6" },
  { href:"/dashboard/prayer",    icon:"🙏", label:"Prayer",    desc:"Prayer requests",      color:"#B5A8D4", bg:"#EDE9F7" },
  { href:"/dashboard/events",    icon:"🎉", label:"Events",    desc:"Family calendar",      color:"#E8A5A5", bg:"#F7E6E6" },
  { href:"/dashboard/members",   icon:"👨‍👩‍👧‍👦", label:"Members",  desc:"Your family",          color:"#A8C8E8", bg:"#E3EFF8" },
  { href:"/dashboard/settings",  icon:"⚙️",  label:"Settings",  desc:"Customize your hub",  color:"#B5A8D4", bg:"#EDE9F7" },
];

export default async function DashboardHome() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding:"20px 0 12px" }}>

      {/* Greeting banner */}
      <div style={{
        background:"linear-gradient(135deg, rgba(232,165,165,0.3), rgba(181,168,212,0.3))",
        border:"1.5px solid var(--border)",
        borderRadius:20,
        padding:"24px 20px",
        marginBottom:24,
        position:"relative",
        overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"rgba(181,168,212,0.15)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-30, left:40, width:80, height:80, borderRadius:"50%", background:"rgba(232,165,165,0.15)", pointerEvents:"none" }}/>
        <p style={{ fontSize:13, color:"var(--ink-muted)", fontWeight:600, marginBottom:4 }}>{greeting} 🌸</p>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)", marginBottom:8 }}>
          Welcome, {session.user?.name?.split(" ")[0]}
        </h2>
        <p style={{ fontSize:13, color:"var(--ink-muted)" }}>The Johnson Family · Est. 1982 · 5 members</p>

        {/* Member avatars */}
        <div style={{ display:"flex", marginTop:16, gap:0 }}>
          {[["JA","#E8A5A5"],["MA","#B5A8D4"],["JO","#A8C8E8"],["LI","#A8C5A0"],["GR","#F0C4A0"]].map(([init, color], i) => (
            <div key={i} style={{
              width:34, height:34, borderRadius:10,
              background:color,
              border:"2px solid var(--cream)",
              marginLeft: i === 0 ? 0 : -8,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800, color:"white",
              boxShadow:"0 2px 8px rgba(100,60,60,0.12)",
            }}>{init}</div>
          ))}
          <div style={{ width:34, height:34, borderRadius:10, border:"2px dashed var(--tan-deep)", marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"var(--ink-subtle)" }}>+</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[["3","Chores due","#E8A5A5","#F7E6E6"],["$2,400","This month","#A8C5A0","#E3EFE1"],["2","Events soon","#B5A8D4","#EDE9F7"]].map(([val, lbl, color, bg]) => (
          <div key={lbl} style={{ background:bg, border:`1.5px solid ${color}40`, borderRadius:14, padding:"14px 12px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:"var(--ink)", marginBottom:2 }}>{val}</div>
            <div style={{ fontSize:11, color:"var(--ink-muted)", fontWeight:600 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500, color:"var(--ink)", marginBottom:14 }}>Your Hub</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:24 }}>
        {modules.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration:"none", background:"rgba(255,255,255,0.8)", border:"1.5px solid var(--border)", borderRadius:16, padding:"18px 16px", display:"flex", alignItems:"center", gap:14, backdropFilter:"blur(8px)", transition:"transform 0.15s" }}>
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
