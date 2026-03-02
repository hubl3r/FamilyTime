// src/app/page.tsx
"use client";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
// Inline SVG icons
const Icons = {
  Wallet:     () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><path d="M17 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  FolderOpen: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  CheckSquare:() => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>,
  UtensilsCrossed:() => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,
  Calendar:   () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Heart:      () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Users:      () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  ChevronLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight:() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Shield:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Home:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  ArrowRight: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
};

const FEATURES = [
  {
    Icon: Icons.Wallet,
    label: "Finances",
    headline: "Total financial clarity",
    desc: "Track every bill, due date, and payment across your household. Encrypted credential storage, autopay tracking, payment history, and a 30-day projection engine so nothing slips through.",
    color: "#2D9B6F",
    bg: "rgba(45,155,111,0.1)",
    points: ["Bill tracking with due date projections", "Encrypted login & account credentials", "Payment history and partial payment logs"],
  },
  {
    Icon: Icons.FolderOpen,
    label: "Documents",
    headline: "Your family's vault",
    desc: "Store insurance cards, birth certificates, tax returns, warranties — everything in one secure, searchable place with per-member permissions.",
    color: "#C07D2F",
    bg: "rgba(192,125,47,0.1)",
    points: ["Secure file storage with search", "Granular per-member sharing", "Organized by category and date"],
  },
  {
    Icon: Icons.CheckSquare,
    label: "Chores",
    headline: "Everyone pulls their weight",
    desc: "Assign recurring or one-off tasks to any family member. Track completion, set schedules, and award points so kids stay accountable.",
    color: "#7059C4",
    bg: "rgba(112,89,196,0.1)",
    points: ["Recurring and one-time task assignment", "Points and completion tracking", "Age-appropriate roles and controls"],
  },
  {
    Icon: Icons.UtensilsCrossed,
    label: "Meals",
    headline: "Dinner, decided",
    desc: "Plan the week's meals, build shopping lists automatically, and store your family's favorite recipes. No more 'what's for dinner?' paralysis.",
    color: "#C0572F",
    bg: "rgba(192,87,47,0.1)",
    points: ["Weekly meal planning board", "Auto-generated shopping lists", "Family recipe storage"],
  },
  {
    Icon: Icons.Calendar,
    label: "Events",
    headline: "One family calendar",
    desc: "Birthdays, school events, appointments, date nights — a shared calendar every family member can see and contribute to. Never double-book again.",
    color: "#2F7EC0",
    bg: "rgba(47,126,192,0.1)",
    points: ["Shared family calendar", "Event reminders and RSVP", "Recurring events and birthdays"],
  },
  {
    Icon: Icons.Heart,
    label: "Prayer",
    headline: "Pray together, stay together",
    desc: "Share prayer requests, mark answered prayers, and build a history of faith as a family. A private, sacred space within your hub.",
    color: "#B84F7A",
    bg: "rgba(184,79,122,0.1)",
    points: ["Private prayer request sharing", "Answered prayer tracking", "Family faith history"],
  },
  {
    Icon: Icons.Users,
    label: "Members",
    headline: "Built for every role",
    desc: "Owner, admin, member, or child — each role has appropriate access. Add everyone from grandparents to toddlers with controls that fit.",
    color: "#4F8A8C",
    bg: "rgba(79,138,140,0.1)",
    points: ["Role-based access control", "Unlimited family members", "Child-safe permissions"],
  },
];

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const dragStart = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const go = (dir: "prev" | "next" | number) => {
    let next: number;
    if (typeof dir === "number") {
      setAnimDir(dir > active ? "right" : "left");
      next = dir;
    } else {
      setAnimDir(dir === "next" ? "right" : "left");
      next = dir === "next"
        ? (active + 1) % FEATURES.length
        : (active - 1 + FEATURES.length) % FEATURES.length;
    }
    setVisible(false);
    setTimeout(() => { setActive(next); setVisible(true); }, 160);
  };

  useEffect(() => {
    const t = setInterval(() => go("next"), 5000);
    return () => clearInterval(t);
  }, [active]);

  const feat = FEATURES[active];
  const Icon = feat.Icon;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#FAFAF7",
      fontFamily: "'Nunito', system-ui, sans-serif",
      overflowX: "hidden",
      color: "#2C2C2C",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=Nunito:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; border-radius: 12px;
          background: #2C2C2C; color: #FAFAF7;
          text-decoration: none; font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em;
          transition: background 0.15s, transform 0.15s;
          font-family: 'Nunito', sans-serif;
        }
        .cta-primary:hover { background: #111; transform: translateY(-1px); }

        .cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 12px;
          background: transparent; color: #6B6B6B;
          text-decoration: none; font-size: 15px; font-weight: 600;
          border: 1.5px solid #E0DDD8;
          transition: border-color 0.15s, color 0.15s;
          font-family: 'Nunito', sans-serif;
        }
        .cta-ghost:hover { border-color: #2C2C2C; color: #2C2C2C; }

        .feat-chip {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 999px;
          font-size: 13px; font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
          border: 1.5px solid transparent;
          white-space: nowrap;
          font-family: 'Nunito', sans-serif;
          background: none;
        }

        .chip-track {
          display: flex; gap: 8px;
          overflow-x: auto; padding: 4px 0 12px;
          scrollbar-width: none;
        }
        .chip-track::-webkit-scrollbar { display: none; }

        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #D4CFC8; cursor: pointer;
          transition: all 0.2s; border: none; padding: 0;
        }
        .dot.active { width: 20px; border-radius: 3px; }

        .nav-link {
          color: #6B6B6B; text-decoration: none;
          font-size: 14px; font-weight: 600;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #2C2C2C; }

        .card-fade {
          transition: opacity 0.16s ease, transform 0.16s ease;
        }
        .card-fade.out {
          opacity: 0;
          transform: translateX(${animDir === "right" ? "-20px" : "20px"});
        }
        .card-fade.in { opacity: 1; transform: translateX(0); }

        .icon-circle {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .stat-pill {
          background: #fff;
          border: 1.5px solid #E8E4DF;
          border-radius: 12px;
          padding: 18px 24px;
          text-align: center;
        }

        .point-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px; font-weight: 600;
          color: #3C3C3C; line-height: 1.4;
        }

        .arrow-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff; border: 1.5px solid #E0DDD8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.15s;
          color: #6B6B6B;
        }
        .arrow-btn:hover { border-color: #2C2C2C; color: #2C2C2C; }

        .noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 128px;
        }
      `}</style>

      <div className="noise"/>

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 32px", maxWidth: 1080, margin: "0 auto", borderBottom: "1px solid #EDEAE5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#2C2C2C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Home/>
          </div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 700, color: "#1C1C1C", letterSpacing: "-0.01em" }}>FamilyTime</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="#features" className="nav-link">Features</Link>
          <Link href="/sign-in" className="nav-link">Sign in</Link>
          <Link href="/sign-in" className="cta-primary" style={{ padding: "9px 20px", fontSize: 13 }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px 72px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #E0DDD8", borderRadius: 999, padding: "5px 16px", fontSize: 13, color: "#6B6B6B", marginBottom: 28, fontWeight: 600 }}>
          <Icons.Shield/> Private · Secure · No ads, ever
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(38px, 6vw, 66px)", fontWeight: 700, color: "#1C1C1C", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 22 }}>
          One place for every<br/>
          <em style={{ fontStyle: "italic", fontWeight: 300 }}>part of family life</em>
        </h1>

        <p style={{ fontSize: 17, color: "#6B6B6B", lineHeight: 1.8, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px", fontWeight: 500 }}>
          Finances, documents, chores, meals, and events — organized in a private hub your whole family actually uses.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-in" className="cta-primary">
            Create your family hub <Icons.ArrowRight/>
          </Link>
          <Link href="/sign-in" className="cta-ghost">Sign in</Link>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginTop: 60, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { n: "7", label: "Core modules" },
            { n: "AES-256", label: "Encryption" },
            { n: "∞", label: "Family members" },
          ].map(s => (
            <div key={s.label} className="stat-pill" style={{ flex: 1, minWidth: 110 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "#1C1C1C", letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 12, color: "#9C9C9C", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: "#EDEAE5", maxWidth: 1080, margin: "0 auto" }}/>

      {/* Feature Carousel */}
      <section id="features" style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, color: "#1C1C1C", letterSpacing: "-0.02em", marginBottom: 8 }}>
            Everything your family needs
          </h2>
          <p style={{ fontSize: 14, color: "#9C9C9C", fontWeight: 600 }}>Swipe or tap to explore each module</p>
        </div>

        {/* Chip nav */}
        <div className="chip-track">
          {FEATURES.map((f, i) => {
            const FIcon = f.Icon;
            return (
              <button key={f.label} className="feat-chip" onClick={() => go(i)} style={{
                background: i === active ? f.bg : "#fff",
                borderColor: i === active ? f.color + "50" : "#E0DDD8",
                color: i === active ? f.color : "#6B6B6B",
              }}>
                <FIcon/> {f.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div
          onPointerDown={e => { dragStart.current = e.clientX; setDragging(true); }}
          onPointerUp={e => {
            if (dragStart.current === null) return;
            const dx = e.clientX - dragStart.current;
            if (Math.abs(dx) > 44) go(dx < 0 ? "next" : "prev");
            dragStart.current = null; setDragging(false);
          }}
          onPointerCancel={() => { dragStart.current = null; setDragging(false); }}
          style={{ userSelect: "none", cursor: dragging ? "grabbing" : "grab", touchAction: "pan-y" }}
        >
          <div className={`card-fade ${visible ? "in" : "out"}`} style={{
            background: "#fff",
            border: `1.5px solid ${feat.color}30`,
            borderRadius: 20,
            padding: "40px 44px",
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 44,
            alignItems: "center",
            minHeight: 260,
            boxShadow: `0 2px 40px ${feat.color}12, 0 1px 3px rgba(0,0,0,0.04)`,
          }}>
            <div>
              <div className="icon-circle" style={{ background: feat.bg, border: `1.5px solid ${feat.color}30`, marginBottom: 20 }}>
                <Icon/>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: feat.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{feat.label}</div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 700, color: "#1C1C1C", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 14 }}>{feat.headline}</h3>
              <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.8, fontWeight: 500 }}>{feat.desc}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {feat.points.map((pt, i) => (
                <div key={i} className="point-row" style={{ background: feat.bg, border: `1px solid ${feat.color}20` }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: feat.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>{i + 1}</span>
                  </div>
                  {pt}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 22 }}>
          <button className="arrow-btn" onClick={() => go("prev")}><Icons.ChevronLeft/></button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {FEATURES.map((_, i) => (
              <button key={i} className={`dot${i === active ? " active" : ""}`} onClick={() => go(i)} style={{ background: i === active ? feat.color : undefined }}/>
            ))}
          </div>
          <button className="arrow-btn" onClick={() => go("next")}><Icons.ChevronRight/></button>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ maxWidth: 1080, margin: "0 auto 80px", padding: "0 24px", zIndex: 1, position: "relative" }}>
        <div style={{ background: "#1C1C1C", borderRadius: 20, padding: "52px 48px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 700, color: "#FAFAF7", letterSpacing: "-0.02em", marginBottom: 14 }}>
            Ready to bring your family together?
          </h2>
          <p style={{ fontSize: 15, color: "#9C9C9C", marginBottom: 36, maxWidth: 440, margin: "0 auto 36px", fontWeight: 500, lineHeight: 1.7 }}>
            Create your private family hub in minutes. No subscriptions, no ads — just your family.
          </p>
          <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 36px", borderRadius: 12, background: "#FAFAF7", color: "#1C1C1C", textDecoration: "none", fontSize: 15, fontWeight: 800, transition: "opacity 0.15s", fontFamily: "'Nunito', sans-serif" }}>
            Get started free <Icons.ArrowRight/>
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #EDEAE5", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1080, margin: "0 auto", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#2C2C2C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Home/>
          </div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 600, color: "#6B6B6B" }}>FamilyTime</span>
        </div>
        <div style={{ fontSize: 13, color: "#9C9C9C", fontWeight: 500 }}>Built with Next.js & Supabase</div>
      </footer>
    </main>
  );
}