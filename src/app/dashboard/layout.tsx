// src/app/dashboard/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import SignOutButton from "@/components/SignOutButton";
import { ThemeProvider } from "@/components/ThemeContext";
import StyleSidebar from "@/components/StyleSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  return (
    <ThemeProvider>
      <div style={{ minHeight:"100vh", background:"var(--cream)", paddingBottom:"var(--nav-height)" }}>
        {/* Top header */}
        <header style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(253,248,244,0.92)",
          backdropFilter:"blur(16px)",
          borderBottom:"1px solid var(--border)",
          padding:"14px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🏡</div>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600, color:"var(--ink)" }}>FamilyTime</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{session.user?.name}</div>
              <div style={{ fontSize:11, color:"var(--ink-subtle)" }}>{session.user?.email}</div>
            </div>
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main style={{ maxWidth:680, margin:"0 auto", padding:"0 16px" }}>
          {children}
        </main>

        <BottomNav />

        {/* Style sidebar — floating 🎨 button + slide-out panel */}
        <StyleSidebar />
      </div>
    </ThemeProvider>
  );
}
