// src/app/reset-password/page.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // Two modes: "request" (enter email) or "confirm" (enter new password)
  const mode = token ? "confirm" : "request";

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    border: "1.5px solid #EDE0D8", borderRadius: 10,
    fontSize: 14, outline: "none", color: "#3D2C2C",
    background: "#FFFCFA", fontFamily: "'Nunito',sans-serif",
    boxSizing: "border-box",
  };

  async function handleRequest() {
    if (!email.trim()) { setError("Please enter your email"); return; }
    setLoading(true); setError("");
    try {
      await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true); // Always show success to prevent enumeration
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleConfirm() {
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== password2) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to reset password"); return; }
      setDone(true);
      setTimeout(() => router.push("/sign-in?reset=1"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F7E6E6 0%, #EDE9F7 50%, #E3EFF8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Nunito',sans-serif",
    }}>
      <div style={{ position:"fixed", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(181,168,212,0.2)", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", bottom:-80, left:-80, width:300, height:300, borderRadius:"50%", background:"rgba(232,165,165,0.2)", pointerEvents:"none" }}/>

      <div style={{
        background: "rgba(255,252,250,0.92)", backdropFilter: "blur(20px)",
        border: "1.5px solid #EDE0D8", borderRadius: 24,
        padding: "40px 36px", width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(100,60,60,0.12)",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:18, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:26 }}>🏡</div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:600, color:"#3D2C2C", margin:0 }}>
            {mode === "request" ? "Reset Password" : "Choose New Password"}
          </h1>
          <p style={{ fontSize:13, color:"#8B7070", marginTop:6 }}>
            {mode === "request"
              ? "Enter your email and we'll send a reset link"
              : "Enter your new password below"}
          </p>
        </div>

        {/* Success states */}
        {done && mode === "request" && (
          <div style={{ background:"#E3EFE1", border:"1px solid #A8C5A060", borderRadius:12, padding:"16px", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📬</div>
            <div style={{ fontSize:14, fontWeight:800, color:"#3D2C2C", marginBottom:4 }}>Check your email</div>
            <div style={{ fontSize:13, color:"#6A7A62" }}>If an account exists for that email, we've sent a reset link. It expires in 1 hour.</div>
          </div>
        )}

        {done && mode === "confirm" && (
          <div style={{ background:"#E3EFE1", border:"1px solid #A8C5A060", borderRadius:12, padding:"16px", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:800, color:"#3D2C2C", marginBottom:4 }}>Password updated!</div>
            <div style={{ fontSize:13, color:"#6A7A62" }}>Redirecting you to sign in...</div>
          </div>
        )}

        {!done && (
          <>
            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:16, fontWeight:600 }}>
                {error}
              </div>
            )}

            {mode === "request" && (
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRequest()}
                  placeholder="you@example.com" style={inputStyle} autoFocus
                />
              </div>
            )}

            {mode === "confirm" && (
              <>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>New Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" style={inputStyle} autoFocus
                  />
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Confirm Password</label>
                  <input
                    type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleConfirm()}
                    placeholder="Repeat your password"
                    style={{ ...inputStyle, borderColor: password2 && password !== password2 ? "#FECACA" : "#EDE0D8" }}
                  />
                  {password2 && password !== password2 && (
                    <div style={{ fontSize:12, color:"#DC2626", marginTop:4, fontWeight:600 }}>Passwords don't match</div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={mode === "request" ? handleRequest : handleConfirm}
              disabled={loading || (mode === "confirm" && (!password || password !== password2))}
              style={{
                width:"100%", padding:13,
                background: loading ? "#EDE0D8" : "linear-gradient(135deg,#E8A5A5,#B5A8D4)",
                color:"#fff", border:"none", borderRadius:12,
                fontSize:15, fontWeight:800, cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"'Nunito',sans-serif",
              }}
            >
              {loading ? "One moment..." : mode === "request" ? "Send Reset Link" : "Update Password"}
            </button>
          </>
        )}

        <div style={{ textAlign:"center", marginTop:20 }}>
          <Link href="/sign-in" style={{ fontSize:13, color:"#B5A8D4", fontWeight:700, textDecoration:"none" }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
