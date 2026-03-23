// src/app/join/page.tsx
"use client";
import React, { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type FamilyResult = {
  family_id: string;
  family_name: string;
  member_count: number;
  invite_code: string;
};

type Step = "landing" | "code" | "search" | "confirm" | "done";

function JoinFamilyForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  const [step, setStep] = useState<Step>("landing");
  const [code, setCode] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<FamilyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyResult | null>(null);
  const [codeError, setCodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Personal info — only needed when not signed in
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");

  // When signed in, fetch profile to pre-fill name/email
  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setEmail(data.email ?? session?.user?.email ?? "");
        } else {
          setEmail(session?.user?.email ?? "");
        }
      })
      .catch(() => setEmail(session?.user?.email ?? ""));
  }, [isSignedIn, session]);

  const handleCodeLookup = async () => {
    if (code.trim().length < 3) {
      setCodeError("Please enter a valid invite code");
      return;
    }
    setCodeError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/join/lookup?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      if (!res.ok) {
        const err = await res.json();
        setCodeError(err.error ?? "Invalid invite code");
        setSubmitting(false);
        return;
      }
      const family: FamilyResult = await res.json();
      setSelectedFamily(family);
      setStep("confirm");
    } catch {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (searchQ.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/join/search?q=${encodeURIComponent(searchQ.trim())}`);
      if (res.ok) setSearchResults(await res.json());
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }, [searchQ]);

  const handleSubmitRequest = async () => {
    if (!selectedFamily) return;
    // When signed in, name/email are pre-filled from profile — no manual entry needed
    if (!isSignedIn && (!firstName.trim() || !lastName.trim() || !email.trim())) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/join/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_id:  selectedFamily.family_id,
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          email:      email.trim().toLowerCase(),
          message:    message.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCodeError(err.error ?? "Request failed");
        setSubmitting(false);
        return;
      }
      setStep("done");
    } catch {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    border: "1.5px solid #EDE0D8", borderRadius: 10,
    fontSize: 15, color: "#3D2C2C", background: "#FFFCFA",
    outline: "none", fontFamily: "'Nunito', sans-serif",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 800,
    color: "#8B7070", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 6,
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F7E6E6 0%, #EDE9F7 50%, #E3EFF8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Nunito', sans-serif",
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(181,168,212,0.2)", pointerEvents: "none" }}/>
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(232,165,165,0.2)", pointerEvents: "none" }}/>

      <div style={{
        background: "rgba(255,252,250,0.92)", backdropFilter: "blur(20px)",
        border: "1.5px solid #EDE0D8", borderRadius: 24,
        padding: "40px 36px", width: "100%", maxWidth: 440,
        boxShadow: "0 20px 60px rgba(100,60,60,0.12)", position: "relative",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 24 }}>🏡</div>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 600, color: "#3D2C2C", marginBottom: 4 }}>Join a Family</h1>
          <p style={{ fontSize: 13, color: "#8B7070" }}>Connect to your family's hub 🌿</p>
        </div>

        {/* ── LANDING ── */}
        {step === "landing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setStep("code")} style={{
              width: "100%", padding: "16px 20px",
              background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
              color: "#fff", border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>🔑</span>
              <div>
                <div>Enter Invite Code</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>You have a code from a family member</div>
              </div>
            </button>

            <button onClick={() => setStep("search")} style={{
              width: "100%", padding: "16px 20px",
              background: "#fff", color: "#3D2C2C",
              border: "1.5px solid #EDE0D8", borderRadius: 14,
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>🔍</span>
              <div>
                <div>Search for Family</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#8B7070" }}>Find by family name and request to join</div>
              </div>
            </button>

            <div style={{ textAlign: "center", paddingTop: 8, fontSize: 13, color: "#8B7070" }}>
              Already have an account?{" "}
              <Link href="/sign-in" style={{ color: "#B5A8D4", fontWeight: 800, textDecoration: "none" }}>Sign in</Link>
            </div>
          </div>
        )}

        {/* ── ENTER CODE ── */}
        {step === "code" && (
          <div>
            <button onClick={() => { setStep("landing"); setCodeError(""); setCode(""); }} style={{ background: "none", border: "none", color: "#B8A8A8", cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Family Invite Code</label>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); setCodeError(""); }}
                onKeyDown={e => e.key === "Enter" && handleCodeLookup()}
                maxLength={12}
                placeholder="e.g. HUBLER-4F"
                style={{ ...inputStyle, textAlign: "center", fontSize: 22, fontWeight: 800, letterSpacing: 4 }}
              />
              {codeError && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#C97B7B", fontWeight: 600 }}>{codeError}</div>
              )}
            </div>
            <button
              onClick={handleCodeLookup}
              disabled={submitting || code.trim().length < 3}
              style={{
                width: "100%", padding: 13,
                background: submitting || code.trim().length < 3 ? "#EDE0D8" : "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 800, cursor: submitting || code.trim().length < 3 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Looking up..." : "Find Family →"}
            </button>
          </div>
        )}

        {/* ── SEARCH ── */}
        {step === "search" && (
          <div>
            <button onClick={() => { setStep("landing"); setSearchResults([]); setSearchQ(""); }} style={{ background: "none", border: "none", color: "#B8A8A8", cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Search by Family Name</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. The Smiths"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQ.trim().length < 2}
                  style={{
                    padding: "12px 16px", borderRadius: 10,
                    background: searching ? "#EDE0D8" : "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                    color: "#fff", border: "none",
                    fontSize: 18, cursor: searching ? "not-allowed" : "pointer",
                  }}
                >
                  {searching ? "⏳" : "🔍"}
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
                {searchResults.map(fam => (
                  <button
                    key={fam.family_id}
                    onClick={() => { setSelectedFamily(fam); setStep("confirm"); }}
                    style={{
                      width: "100%", padding: "14px 16px",
                      background: "#fff", border: "1.5px solid #EDE0D8",
                      borderRadius: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14,
                      textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏡</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#3D2C2C" }}>{fam.family_name}</div>
                      <div style={{ fontSize: 12, color: "#B8A8A8" }}>{fam.member_count} member{fam.member_count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontSize: 18, color: "#D4C4B4" }}>›</div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQ.length >= 2 && !searching && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#B8A8A8" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>No families found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Try a different name, or ask for an invite code</div>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && selectedFamily && (
          <div>
            <button onClick={() => { setStep(code ? "code" : "search"); setCodeError(""); }} style={{ background: "none", border: "none", color: "#B8A8A8", cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>

            {/* Family card */}
            <div style={{ background: "linear-gradient(135deg, rgba(232,165,165,0.15), rgba(181,168,212,0.15))", border: "1.5px solid #EDE0D8", borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3D2C2C" }}>{selectedFamily.family_name}</div>
                <div style={{ fontSize: 12, color: "#8B7070" }}>{selectedFamily.member_count} member{selectedFamily.member_count !== 1 ? "s" : ""} · Your request will be reviewed</div>
              </div>
            </div>

            {/* When signed in — show who they are, no need to re-enter */}
            {isSignedIn ? (
              <div style={{ background:"rgba(255,255,255,0.8)", border:"1.5px solid #EDE0D8", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0 }}>
                  {(firstName[0]??"")}{ (lastName[0]??"")}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#3D2C2C" }}>{firstName} {lastName}</div>
                  <div style={{ fontSize:12, color:"#8B7070" }}>{email}</div>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#8B7070", marginBottom: 18, lineHeight: 1.6 }}>
                  Tell them a little about yourself so they can verify who you are.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>First Name <span style={{ color: "#E8A5A5" }}>*</span></label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <span style={{ color: "#E8A5A5" }}>*</span></label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={inputStyle}/>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Email Address <span style={{ color: "#E8A5A5" }}>*</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jane@example.com" style={inputStyle}/>
                </div>
              </>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Message (optional)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi, it's Jane! I'm Sarah's sister..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
              />
            </div>

            {codeError && (
              <div style={{ marginBottom: 14, fontSize: 13, color: "#C97B7B", fontWeight: 600 }}>{codeError}</div>
            )}

            <button
              onClick={handleSubmitRequest}
              disabled={submitting || (!isSignedIn && (!firstName.trim() || !lastName.trim() || !email.trim()))}
              style={{
                width: "100%", padding: 13,
                background: submitting || (!isSignedIn && (!firstName.trim() || !lastName.trim() || !email.trim()))
                  ? "#EDE0D8"
                  : "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 800,
                cursor: submitting || (!isSignedIn && (!firstName.trim() || !lastName.trim() || !email.trim())) ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Sending request..." : "Send Join Request ✨"}
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 600, color: "#3D2C2C", marginBottom: 10 }}>
              Request sent!
            </h2>
            <p style={{ fontSize: 14, color: "#8B7070", lineHeight: 1.7, marginBottom: 28 }}>
              Your join request has been sent to <strong>{selectedFamily?.family_name}</strong>. You'll get an email once a family admin approves it.
            </p>
            <Link href={isSignedIn ? "/dashboard" : "/sign-in"} style={{
              display: "block", width: "100%", padding: 13,
              background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
              color: "#fff", borderRadius: 12, textDecoration: "none",
              fontSize: 15, fontWeight: 800, fontFamily: "inherit",
            }}>
              {isSignedIn ? "Back to Dashboard" : "Back to Sign In"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function JoinFamilyPage() {
  return (
    <Suspense>
      <JoinFamilyForm />
    </Suspense>
  );
}