// src/app/dashboard/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import SignOutButton from "@/components/SignOutButton";
import { ThemeProvider } from "@/components/ThemeContext";
import StyleSidebar from "@/components/StyleSidebar";
import { getSessionMember } from "@/lib/permissions";
import { UserProvider } from "@/components/UserContext";
import ContextSwitcher from "@/components/ContextSwitcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const member = await getSessionMember();
  if (!member) redirect("/join");

  return (
    <ThemeProvider>
      <UserProvider>
        <div style={{ minHeight:"100vh", background:"var(--cream)", paddingBottom:"var(--nav-height)" }}>
          <header style={{
            position:"sticky", top:0, zIndex:50,
            background:"rgba(253,248,244,0.92)",
            backdropFilter:"blur(16px)",
            borderBottom:"1px solid var(--border)",
            padding:"10px 16px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap: 12,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🏡</div>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:600, color:"var(--ink)", marginRight:4 }}>FamilyTime</span>
              <ContextSwitcher />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <SignOutButton />
            </div>
          </header>

          <main style={{ maxWidth:680, margin:"0 auto", padding:"0 16px" }}>
            {children}
          </main>

          <BottomNav />
          <StyleSidebar />
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
