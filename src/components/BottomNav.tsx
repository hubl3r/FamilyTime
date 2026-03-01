// src/components/BottomNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href:"/dashboard",            icon:"🏠", label:"Home"      },
  { href:"/dashboard/finances",   icon:"💰", label:"Finances"  },
  { href:"/dashboard/documents",  icon:"📁", label:"Files"     },
  { href:"/dashboard/chores",     icon:"🧹", label:"Chores"    },
  { href:"/dashboard/settings",   icon:"⚙️",  label:"Settings"  },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0,
      height:"var(--nav-height)",
      background:"rgba(253,248,244,0.95)",
      backdropFilter:"blur(20px)",
      borderTop:"1.5px solid #EDE0D8",
      display:"flex",
      alignItems:"center",
      justifyContent:"space-around",
      padding:"0 8px",
      zIndex:100,
      boxShadow:"0 -4px 20px rgba(100,60,60,0.06)",
    }}>
      {tabs.map(tab => {
        const active = path === tab.href || (tab.href !== "/dashboard" && path.startsWith(tab.href));
        return (
          <Link key={tab.href} href={tab.href} style={{ textDecoration:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1, padding:"8px 4px", position:"relative" }}>
            {active && (
              <div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", width:32, height:3, borderRadius:"0 0 4px 4px", background:"linear-gradient(90deg,#E8A5A5,#B5A8D4)" }}/>
            )}
            <div style={{
              width:42, height:36, borderRadius:12,
              background: active ? "linear-gradient(135deg,rgba(232,165,165,0.2),rgba(181,168,212,0.2))" : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, transition:"all 0.2s",
              transform: active ? "translateY(-2px)" : "none",
            }}>
              {tab.icon}
            </div>
            <span style={{ fontSize:10, fontWeight: active ? 800 : 500, color: active ? "#8B7070" : "#B8A8A8", fontFamily:"'Nunito',sans-serif" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
