// src/app/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg, #FDF8F4 0%, #F7E6E6 30%, #EDE9F7 65%, #E3EFF8 100%)", fontFamily:"'Nunito',sans-serif", overflowX:"hidden" }}>

      {/* Nav */}
      <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏡</div>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:"#3D2C2C" }}>FamilyTime</span>
        </div>
        <Link href="/sign-in" style={{ padding:"10px 24px", borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", color:"white", textDecoration:"none", fontSize:14, fontWeight:800, boxShadow:"0 4px 14px rgba(181,168,212,0.35)" }}>
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ textAlign:"center", padding:"60px 24px 80px", maxWidth:700, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.7)", border:"1.5px solid #EDE0D8", borderRadius:999, padding:"6px 18px", fontSize:13, color:"#8B7070", marginBottom:24, fontWeight:600 }}>
          🌸 A cozy space for your whole family
        </div>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(38px,6vw,68px)", fontWeight:500, color:"#3D2C2C", lineHeight:1.2, marginBottom:20 }}>
          Everything your family<br/><em style={{ color:"#B5A8D4" }}>needs</em>, all in one place
        </h1>
        <p style={{ fontSize:17, color:"#8B7070", lineHeight:1.8, marginBottom:36, maxWidth:500, margin:"0 auto 36px" }}>
          Finances, documents, chores, meals, events — all in a warm, private hub built just for your family.
        </p>
        <Link href="/sign-in" style={{ display:"inline-block", padding:"15px 44px", borderRadius:14, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", color:"white", textDecoration:"none", fontSize:16, fontWeight:800, boxShadow:"0 8px 28px rgba(181,168,212,0.4)" }}>
          Create Your Family Hub →
        </Link>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 80px", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16 }}>
        {[
          { icon:"💰", label:"Finances",     desc:"Track budgets & expenses",  color:"#A8C5A0", bg:"#E3EFE1" },
          { icon:"📁", label:"Documents",    desc:"Store important files",      color:"#A8C8E8", bg:"#E3EFF8" },
          { icon:"🧹", label:"Chores",       desc:"Assign tasks & earn points", color:"#E8A5A5", bg:"#F7E6E6" },
          { icon:"🍽️", label:"Meals",        desc:"Plan meals & groceries",     color:"#F0C4A0", bg:"#FBF0E6" },
          { icon:"🙏", label:"Prayer",       desc:"Share prayer requests",      color:"#B5A8D4", bg:"#EDE9F7" },
          { icon:"🎉", label:"Events",       desc:"Family calendar",            color:"#E8A5A5", bg:"#F7E6E6" },
        ].map(f => (
          <div key={f.label} style={{ background:"rgba(255,255,255,0.8)", border:"1.5px solid #EDE0D8", borderRadius:16, padding:"24px 20px", backdropFilter:"blur(8px)" }}>
            <div style={{ width:44, height:44, borderRadius:14, background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:12 }}>{f.icon}</div>
            <div style={{ fontWeight:800, fontSize:15, color:"#3D2C2C", marginBottom:4 }}>{f.label}</div>
            <div style={{ fontSize:13, color:"#8B7070" }}>{f.desc}</div>
          </div>
        ))}
      </section>

      <footer style={{ textAlign:"center", padding:"24px", color:"#B8A8A8", fontSize:13, borderTop:"1px solid #EDE0D8" }}>
        FamilyTime · Built with Next.js & Supabase 🌸
      </footer>
    </main>
  );
}
