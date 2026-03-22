// src/app/dashboard/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
            {/* Left: logo (clickable) + context switcher */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Link href="/dashboard" style={{
                display:"flex", alignItems:"center", gap:8,
                textDecoration:"none", flexShrink:0,
              }}>
                <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🏡</div>
                <span style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:600, color:"var(--ink)" }}>FamilyTime</span>
              </Link>
              <ContextSwitcher />
            </div>

            {/* Right: logged-in user + sign out */}
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", lineHeight:1.3 }}>
                  {session.user?.name}
                </div>
                <div style={{ fontSize:10, color:"var(--ink-subtle)", lineHeight:1.3 }}>
                  {session.user?.email}
                </div>
              </div>
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
