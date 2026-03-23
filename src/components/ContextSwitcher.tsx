// src/components/ContextSwitcher.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useUser } from "./UserContext";

export default function ContextSwitcher() {
  const { me, currentContext, currentFamily, switchContext } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!me) return null;

  // A family is "My Space" only if it's personal AND owned by the current user
  function isMySpace(family: typeof currentFamily | typeof me.families[0]) {
    const f = family as unknown as { family?: { is_personal?: boolean; owner_email?: string } };
    return !!(f?.family?.is_personal && f?.family?.owner_email === me!.email);
  }

  const mySpace = isMySpace(currentFamily);
  const currentLabel = mySpace ? "My Space" : (currentFamily?.family?.name ?? "Family");
  const currentAvatarBg = mySpace ? me.color : "linear-gradient(135deg,#E8A5A5,#B5A8D4)";
  const currentInitials = mySpace ? (me.initials || "?") : currentLabel.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.7)",
          border: "1.5px solid var(--border)",
          borderRadius: 12, padding: "6px 10px 6px 6px",
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 2px 8px rgba(100,60,60,0.06)",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: currentAvatarBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {currentInitials}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{currentLabel}</div>
          <div style={{ fontSize: 10, color: "var(--ink-subtle)", lineHeight: 1.2 }}>
            {currentFamily?.role ?? ""} · Switch ▾
          </div>
        </div>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: 14, padding: 6, minWidth: 220,
          boxShadow: "0 8px 32px rgba(100,60,60,0.14)",
          zIndex: 200,
        }}>
          {me.families.map(f => {
            const isActive = currentContext === f.family_id;
            const mine = isMySpace(f);
            const fam = f.family as unknown as { is_personal?: boolean; owner_email?: string; name?: string } | null;
            const isPF = !!fam?.is_personal;
            const name = mine ? "My Space" : (fam?.name ?? "Family");
            const initials = mine ? (me.initials || "?") : name.slice(0, 2).toUpperCase();
            const bg = mine ? me.color : isPF ? "linear-gradient(135deg,#B5A8D4,#A8C8E8)" : "linear-gradient(135deg,#E8A5A5,#B5A8D4)";
            const sublabel = mine ? "Private" : isPF ? `${fam?.owner_email?.split("@")[0]}'s space` : f.role;
            return (
              <button
                key={f.family_id}
                onClick={() => { switchContext(f.family_id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, border: "none",
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-subtle)", textTransform: "capitalize" }}>{sublabel}</div>
                </div>
                {isActive && <span style={{ fontSize: 14, color: "var(--ink-subtle)" }}>✓</span>}
              </button>
            );
          })}

          <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }}/>
          <a href="/dashboard/join" style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            color: "var(--ink-subtle)", textDecoration: "none",
            fontSize: 12, fontWeight: 600,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              border: "2px dashed var(--tan-deep)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "var(--ink-subtle)",
            }}>+</div>
            Join another family
          </a>
        </div>
      )}
    </div>
  );
}
