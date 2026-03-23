// src/app/dashboard/join/page.tsx
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { useTheme } from "@/components/ThemeContext";

type FamilyResult = {
  family_id:    string;
  family_name:  string;
  member_count: number;
};

type Step = "landing" | "code" | "search" | "confirm" | "done";

export default function DashboardJoinPage() {
  const router = useRouter();
  const { me } = useUser();
  const { theme } = useTheme();
  const accent = theme.accent;

  const [step,           setStep]          = useState<Step>("landing");
  const [code,           setCode]          = useState("");
  const [searchQ,        setSearchQ]       = useState("");
  const [searchResults,  setSearchResults] = useState<FamilyResult[]>([]);
  const [searching,      setSearching]     = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyResult | null>(null);
  const [message,        setMessage]       = useState("");
  const [error,          setError]         = useState("");
  const [submitting,     setSubmitting]    = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: "1.5px solid #EDE0D8", borderRadius: 10,
    fontSize: 14, color: "#3D2C2C", background: "#fff",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  // Look up family by invite code
  const handleCodeLookup = async () => {
    if (code.trim().length < 3) { setError("Please enter a valid invite code"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch(`/api/join/lookup?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      if (!res.ok) { const e = await res.json(); setError(e.error ?? "Invalid invite code"); return; }
      const family = await res.json();
      setSelectedFamily(family);
      setStep("confirm");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  };

  // Search families by name
  const handleSearch = useCallback(async () => {
    if (searchQ.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/join/search?q=${encodeURIComponent(searchQ.trim())}`);
      if (res.ok) setSearchResults(await res.json());
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [searchQ]);

  // Submit join request — name/email come from the session, no user input needed
  const handleSubmit = async () => {
    if (!selectedFamily || !me) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/join/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_id:  selectedFamily.family_id,
          first_name: me.first_name,
          last_name:  me.last_name,
          email:      me.email,
          message:    message.trim(),
        }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error ?? "Request failed"); return; }
      setStep("done");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ padding: "24px 0 64px", maxWidth: 520, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background:"none", border:"none", color:"#B8A8A8", cursor:"pointer", fontSize:13, fontWeight:700, padding:0, fontFamily:"inherit", marginBottom:16 }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:500, color:"var(--ink)", margin:0 }}>
          Join a Family
        </h1>
        <p style={{ fontSize:13, color:"var(--ink-muted)", marginTop:6 }}>
          Enter an invite code or search for a family to send a join request.
        </p>
      </div>

      {/* ── DONE ── */}
      {step === "done" && (
        <div style={{ textAlign:"center", padding:"40px 0" }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, color:"var(--ink)", marginBottom:8 }}>
            Request sent!
          </h2>
          <p style={{ fontSize:13, color:"var(--ink-muted)", lineHeight:1.7, marginBottom:28 }}>
            Your join request has been sent to <strong>{selectedFamily?.family_name}</strong>. You'll get an email once a family admin approves it.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ padding:"12px 28px", background:`linear-gradient(135deg,${accent},#B5A8D4)`, color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* ── LANDING ── */}
      {step === "landing" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <button
            onClick={() => setStep("code")}
            style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid #EDE0D8", borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}
          >
            <div style={{ width:48, height:48, borderRadius:14, background:"#EDE9F7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🔑</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>Enter invite code</div>
              <div style={{ fontSize:12, color:"var(--ink-muted)", marginTop:2 }}>You have a code from a family member</div>
            </div>
          </button>
          <button
            onClick={() => setStep("search")}
            style={{ background:"rgba(255,255,255,0.85)", border:"1.5px solid #EDE0D8", borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}
          >
            <div style={{ width:48, height:48, borderRadius:14, background:"#E3EFF8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🔍</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>Search for a family</div>
              <div style={{ fontSize:12, color:"var(--ink-muted)", marginTop:2 }}>Find a family that's open to requests</div>
            </div>
          </button>
        </div>
      )}

      {/* ── CODE ── */}
      {step === "code" && (
        <div>
          <button onClick={() => { setStep("landing"); setError(""); setCode(""); }} style={{ background:"none", border:"none", color:"#B8A8A8", cursor:"pointer", fontSize:13, fontWeight:700, marginBottom:20, padding:0, fontFamily:"inherit" }}>← Back</button>
          <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#8B7070", marginBottom:8 }}>Family Invite Code</label>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleCodeLookup()}
            maxLength={12} placeholder="e.g. HUBLER-4F"
            style={{ ...inputStyle, textAlign:"center", fontSize:22, fontWeight:800, letterSpacing:4, marginBottom:12 }}
          />
          {error && <div style={{ fontSize:13, color:"#DC2626", fontWeight:600, marginBottom:12 }}>{error}</div>}
          <button
            onClick={handleCodeLookup}
            disabled={submitting || code.trim().length < 3}
            style={{ width:"100%", padding:13, background: code.trim().length < 3 ? "#EDE0D8" : `linear-gradient(135deg,${accent},#B5A8D4)`, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor: code.trim().length < 3 ? "not-allowed" : "pointer", fontFamily:"inherit" }}
          >
            {submitting ? "Looking up..." : "Find Family →"}
          </button>
        </div>
      )}

      {/* ── SEARCH ── */}
      {step === "search" && (
        <div>
          <button onClick={() => { setStep("landing"); setSearchResults([]); setSearchQ(""); }} style={{ background:"none", border:"none", color:"#B8A8A8", cursor:"pointer", fontSize:13, fontWeight:700, marginBottom:20, padding:0, fontFamily:"inherit" }}>← Back</button>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search by family name..."
              style={{ ...inputStyle, flex:1 }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || searchQ.trim().length < 2}
              style={{ padding:"10px 16px", background:`linear-gradient(135deg,${accent},#B5A8D4)`, color:"#fff", border:"none", borderRadius:10, fontSize:18, cursor:"pointer" }}
            >
              {searching ? "⏳" : "🔍"}
            </button>
          </div>
          {searchResults.map(fam => (
            <button
              key={fam.family_id}
              onClick={() => { setSelectedFamily(fam); setStep("confirm"); }}
              style={{ width:"100%", background:"rgba(255,255,255,0.85)", border:"1.5px solid #EDE0D8", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left", marginBottom:10 }}
            >
              <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏡</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{fam.family_name}</div>
                <div style={{ fontSize:12, color:"var(--ink-muted)" }}>{fam.member_count} member{fam.member_count !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ fontSize:18, color:"#D4C4B4" }}>›</div>
            </button>
          ))}
          {searchResults.length === 0 && searchQ.length >= 2 && !searching && (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--ink-muted)" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔎</div>
              <div style={{ fontSize:13, fontWeight:700 }}>No families found</div>
              <div style={{ fontSize:12, marginTop:4 }}>Try a different name or use an invite code</div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM ── */}
      {step === "confirm" && selectedFamily && (
        <div>
          <button onClick={() => { setStep(code ? "code" : "search"); setError(""); }} style={{ background:"none", border:"none", color:"#B8A8A8", cursor:"pointer", fontSize:13, fontWeight:700, marginBottom:20, padding:0, fontFamily:"inherit" }}>← Back</button>

          {/* Family card */}
          <div style={{ background:"linear-gradient(135deg,rgba(232,165,165,0.15),rgba(181,168,212,0.15))", border:"1.5px solid #EDE0D8", borderRadius:14, padding:"14px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏡</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>{selectedFamily.family_name}</div>
              <div style={{ fontSize:12, color:"var(--ink-muted)" }}>{selectedFamily.member_count} member{selectedFamily.member_count !== 1 ? "s" : ""} · Your request will be reviewed by an admin</div>
            </div>
          </div>

          {/* Who's requesting — pulled from session, no input needed */}
          {me && (
            <div style={{ background:"rgba(255,255,255,0.8)", border:"1.5px solid #EDE0D8", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:me.color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0 }}>
                {me.initials || (me.first_name?.[0] ?? "?")}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>{me.first_name} {me.last_name}</div>
                <div style={{ fontSize:12, color:"var(--ink-muted)" }}>{me.email}</div>
              </div>
            </div>
          )}

          {/* Optional message */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#8B7070", marginBottom:6 }}>Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hi, it's me! I'm Sarah's brother..."
              rows={3}
              style={{ ...inputStyle, resize:"vertical" } as React.CSSProperties}
            />
          </div>

          {error && <div style={{ fontSize:13, color:"#DC2626", fontWeight:600, marginBottom:12 }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !me}
            style={{ width:"100%", padding:13, background: submitting ? "#EDE0D8" : `linear-gradient(135deg,${accent},#B5A8D4)`, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor: submitting ? "not-allowed" : "pointer", fontFamily:"inherit" }}
          >
            {submitting ? "Sending request..." : "Send Join Request ✨"}
          </button>
        </div>
      )}
    </div>
  );
}
