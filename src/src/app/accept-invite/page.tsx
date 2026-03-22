// src/app/accept-invite/page.tsx
"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type InviteInfo = {
  member_id:   string;
  first_name:  string;
  last_name:   string;
  email:       string;
  role:        string;
  family_name: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "👑 Owner", admin: "🛡️ Admin", member: "👤 Member", child: "⭐ Child",
};

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [info, setInfo]       = useState<InviteInfo | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName]           = useState("");
  const [password, setPassword]   = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  // Load invite info on mount
  useEffect(() => {
    if (!token) { setLoadErr("No invite token found."); setLoading(false); return; }
    fetch(`/api/accept-invite?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setLoadErr(data.error); }
        else {
          setInfo(data);
          setName(`${data.first_name} ${data.last_name}`);
        }
      })
      .catch(() => setLoadErr("Failed to load invite. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== password2) { setError("Passwords don't match"); return; }
    setError(""); setSubmitting(true);

    try {
      const res = await fetch("/api/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); setSubmitting(false); return; }

      // Auto sign in with the new credentials
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: info!.email,
        password,
        action: "login",
      });

      if (signInRes?.error) {
        // Sign-in failed but account was created — send to sign-in page
        router.push("/sign-in?invited=1");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    border: "1.5px solid #EDE0D8", borderRadius: 10,
    fontSize: 14, outline: "none", color: "#3D2C2C",
    background: "#FFFCFA", fontFamily: "'Nunito',sans-serif",
    boxSizing: "border-box",
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F7E6E6 0%, #EDE9F7 50%, #E3EFF8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Nunito',sans-serif",
    }}>
      {/* Decorative blobs */}
      <div style={{ position:"fixed", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(181,168,212,0.2)", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", bottom:-80, left:-80, width:300, height:300, borderRadius:"50%", background:"rgba(232,165,165,0.2)", pointerEvents:"none" }}/>

      <div style={{
        background: "rgba(255,252,250,0.92)", backdropFilter: "blur(20px)",
        border: "1.5px solid #EDE0D8", borderRadius: 24,
        padding: "40px 36px", width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(100,60,60,0.12)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width:56, height:56, borderRadius:18, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:26 }}>🏡</div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:600, color:"#3D2C2C", margin:0 }}>FamilyTime</h1>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#B8A8A8" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
            <div style={{ fontSize:14 }}>Loading your invite...</div>
          </div>
        )}

        {/* Error loading */}
        {!loading && loadErr && (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>😕</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#3D2C2C", marginBottom:8 }}>Invite not found</div>
            <div style={{ fontSize:13, color:"#8B7070", marginBottom:24, lineHeight:1.6 }}>{loadErr}</div>
            <a href="/join" style={{ fontSize:13, color:"#B5A8D4", fontWeight:700 }}>Request to join a family instead →</a>
          </div>
        )}

        {/* Invite form */}
        {!loading && info && (
          <>
            {/* Family banner */}
            <div style={{
              background: "linear-gradient(135deg, rgba(232,165,165,0.15), rgba(181,168,212,0.15))",
              border: "1.5px solid #EDE0D8", borderRadius: 14,
              padding: "16px", marginBottom: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 13, color: "#8B7070", marginBottom: 4 }}>You've been invited to join</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize: 20, fontWeight: 600, color: "#3D2C2C", marginBottom: 6 }}>
                {info.family_name}
              </div>
              <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color:"#8B7070" }}>{info.first_name} {info.last_name}</span>
                <span style={{ fontSize:12, color:"#D4C4B4" }}>·</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#8B7BB8", background:"#EDE9F7", padding:"2px 10px", borderRadius:20 }}>
                  {ROLE_LABELS[info.role] ?? info.role}
                </span>
              </div>
            </div>

            <p style={{ fontSize:13, color:"#8B7070", marginBottom:20, textAlign:"center" }}>
              Create a password to set up your account
            </p>

            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:16, fontWeight:600 }}>
                {error}
              </div>
            )}

            {/* Name */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Your Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                placeholder="Jane Smith"
              />
            </div>

            {/* Email (read-only) */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Email</label>
              <input
                value={info.email}
                readOnly
                style={{ ...inputStyle, background:"#F7F4F2", color:"#B8A8A8", cursor:"not-allowed" }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                style={inputStyle}
                placeholder="At least 8 characters"
              />
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Confirm Password</label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                style={{
                  ...inputStyle,
                  borderColor: password2 && password !== password2 ? "#FECACA" : "#EDE0D8",
                }}
                placeholder="Repeat your password"
              />
              {password2 && password !== password2 && (
                <div style={{ fontSize:12, color:"#DC2626", marginTop:4, fontWeight:600 }}>Passwords don't match</div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={submitting || !password || password !== password2}
              style={{
                width:"100%", padding:13,
                background: submitting || !password || password !== password2
                  ? "#EDE0D8"
                  : "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                color:"#fff", border:"none", borderRadius:12,
                fontSize:15, fontWeight:800,
                cursor: submitting || !password || password !== password2 ? "not-allowed" : "pointer",
                fontFamily:"'Nunito',sans-serif",
                boxShadow: "0 4px 16px rgba(181,168,212,0.4)",
              }}
            >
              {submitting ? "Setting up your account..." : "Join the Family 🏡"}
            </button>

            <div style={{ textAlign:"center", fontSize:12, color:"#B8A8A8", marginTop:16 }}>
              Already have an account?{" "}
              <a href="/sign-in" style={{ color:"#B5A8D4", fontWeight:700, textDecoration:"none" }}>Sign in instead</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
