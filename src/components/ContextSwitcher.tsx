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

  // Current family display
  const isPersonalFamily = !!(currentFamily?.family as unknown as { is_personal?: boolean })?.is_personal;
  const currentLabel = isPersonalFamily ? "My Space" : (currentFamily?.family?.name ?? "Family");
  const currentAvatarBg = isPersonalFamily ? me.color : "linear-gradient(135deg,#E8A5A5,#B5A8D4)";
  const currentInitials = isPersonalFamily ? (me.initials || "?") : currentLabel.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
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

      {/* Dropdown */}
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
            const isPF = !!(f.family as unknown as { is_personal?: boolean })?.is_personal;
            const name = isPF ? "My Space" : (f.family?.name ?? "Family");
            const initials = isPF ? (me.initials || "?") : name.slice(0, 2).toUpperCase();
            const bg = isPF ? me.color : "linear-gradient(135deg,#E8A5A5,#B5A8D4)";
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
                  <div style={{ fontSize: 11, color: "var(--ink-subtle)", textTransform: "capitalize" }}>
                    {isPF ? "Private" : f.role}
                  </div>
                </div>
                {isActive && <span style={{ fontSize: 14, color: "var(--ink-subtle)" }}>✓</span>}
              </button>
            );
          })}

          <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }}/>
          <a
            href="/dashboard/join"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              color: "var(--ink-subtle)", textDecoration: "none",
              fontSize: 12, fontWeight: 600,
            }}
          >
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
