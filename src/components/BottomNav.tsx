// src/components/BottomNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "./UserContext";

const tabs = [
  { href:"/dashboard",          icon:"🏠", label:"Home"     },
  { href:"/dashboard/finances", icon:"💰", label:"Finances" },
  { href:"/dashboard/comms",    icon:"💬", label:"Comms"    },
  { href:"/dashboard/members",  icon:"👨‍👩‍👧", label:"Members"  },
  { href:"/dashboard/settings", icon:"⚙️",  label:"Settings" },
];

export default function BottomNav() {
  const path = usePathname();
  const { currentContext } = useUser();
  const [unread, setUnread] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);

  // Detect orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight * 1.2);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  // Poll unread count
  useEffect(() => {
    if (!currentContext || currentContext === "personal") { setUnread(0); return; }
    const check = async () => {
      try {
        const res = await fetch("/api/messages/channels");
        if (res.ok) {
          const channels = await res.json();
          setUnread(channels.reduce((sum: number, c: { unread_count: number }) => sum + (c.unread_count || 0), 0));
        }
      } catch { /* silent */ }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [currentContext]);

  const NavItem = ({ tab }: { tab: typeof tabs[0] }) => {
    const active = path === tab.href || (tab.href !== "/dashboard" && path.startsWith(tab.href));
    const isComms = tab.href === "/dashboard/comms";

    if (isLandscape) {
      return (
        <Link href={tab.href} style={{
          textDecoration:"none", display:"flex", flexDirection:"column",
          alignItems:"center", gap:3, padding:"10px 4px",
          borderRadius:12, position:"relative",
          background: active ? "var(--accent-soft)" : "transparent",
          width:"100%",
        }}>
          <div style={{ fontSize:22, position:"relative" }}>
            {tab.icon}
            {isComms && unread > 0 && !active && (
              <div style={{ position:"absolute", top:-2, right:-4, width:14, height:14, borderRadius:"50%", background:"#E8A5A5", color:"#fff", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {unread > 9 ? "9+" : unread}
              </div>
            )}
          </div>
          <span style={{ fontSize:9, fontWeight: active ? 800 : 500, color: active ? "var(--accent)" : "var(--ink-subtle)" }}>
            {tab.label}
          </span>
        </Link>
      );
    }

    return (
      <Link href={tab.href} style={{ textDecoration:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1, padding:"8px 4px", position:"relative" }}>
        {active && (
          <div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", width:32, height:3, borderRadius:"0 0 4px 4px", background:"linear-gradient(90deg,#E8A5A5,#B5A8D4)" }}/>
        )}
        <div style={{
          width:42, height:36, borderRadius:12,
          background: active ? "linear-gradient(135deg,rgba(232,165,165,0.2),rgba(181,168,212,0.2))" : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, transition:"all 0.2s",
          transform: active ? "translateY(-2px)" : "none",
          position:"relative",
        }}>
          {tab.icon}
          {isComms && unread > 0 && !active && (
            <div style={{ position:"absolute", top:0, right:2, width:16, height:16, borderRadius:"50%", background:"#E8A5A5", color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {unread > 9 ? "9+" : unread}
            </div>
          )}
        </div>
        <span style={{ fontSize:10, fontWeight: active ? 800 : 500, color: active ? "#8B7070" : "#B8A8A8", fontFamily:"'Nunito',sans-serif" }}>
          {tab.label}
        </span>
      </Link>
    );
  };

  if (isLandscape) {
    return (
      <nav style={{
        position:"fixed", left:0, top:0, bottom:0,
        width:"var(--nav-width)",
        background:"rgba(253,248,244,0.97)",
        backdropFilter:"blur(20px)",
        borderRight:"1.5px solid #EDE0D8",
        display:"flex", flexDirection:"column",
        alignItems:"center",
        padding:"8px 4px",
        gap:4,
        zIndex:100,
        boxShadow:"2px 0 12px rgba(100,60,60,0.06)",
      }}>
        {tabs.map(tab => <NavItem key={tab.href} tab={tab} />)}
      </nav>
    );
  }

  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0,
      height:"var(--nav-height)",
      background:"rgba(253,248,244,0.95)",
      backdropFilter:"blur(20px)",
      borderTop:"1.5px solid #EDE0D8",
      display:"flex", alignItems:"center", justifyContent:"space-around",
      padding:"0 8px",
      zIndex:100,
      boxShadow:"0 -4px 20px rgba(100,60,60,0.06)",
    }}>
      {tabs.map(tab => <NavItem key={tab.href} tab={tab} />)}
    </nav>
  );
}
