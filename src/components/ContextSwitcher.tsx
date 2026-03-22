// src/components/ContextSwitcher.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useUser } from "./UserContext";

export default function ContextSwitcher() {
  const { me, currentContext, currentFamily, isPersonal, switchContext } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!me) return null;

  const label = isPersonal
    ? "Personal"
    : currentFamily?.family?.name ?? "Family";

  const avatarBg = isPersonal ? me.color : "linear-gradient(135deg,#E8A5A5,#B5A8D4)";
  const avatarContent = isPersonal ? (me.initials || "?") : "🏡";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
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
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: avatarBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isPersonal ? 11 : 14, fontWeight: 800, color: "#fff",
          flexShrink: 0,
        }}>
          {avatarContent}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{label}</div>
          <div style={{ fontSize: 10, color: "var(--ink-subtle)", lineHeight: 1.2 }}>
            {isPersonal ? "Personal view" : `${currentFamily?.role ?? ""} · Switch ▾`}
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--ink-subtle)", marginLeft: 2 }}>▾</span>
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
          {/* Personal option */}
          <button
            onClick={() => { switchContext("personal"); setOpen(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, border: "none",
              background: isPersonal ? "var(--accent-soft)" : "transparent",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: me.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {me.initials || "?"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                {me.first_name} {me.last_name}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-subtle)" }}>Personal view</div>
            </div>
            {isPersonal && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
          </button>

          {/* Divider */}
          {me.families.length > 0 && (
            <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }}/>
          )}

          {/* Family options */}
          {me.families.map(f => {
            const isActive = currentContext === f.family_id;
            const name = f.family?.name ?? "Family";
            const initials = name.slice(0, 2).toUpperCase();
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
                  width: 34, height: 34, borderRadius: 10,
                  background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-subtle)", textTransform: "capitalize" }}>
                    {f.role}
                  </div>
                </div>
                {isActive && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
              </button>
            );
          })}

          {/* Join another family */}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }}/>
          <a
            href="/join"
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
