// src/app/sign-in/page.tsx
"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<"signin"|"signup">("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    const res = await signIn("credentials", {
      redirect: false, email, password, name,
      action: mode === "signup" ? "register" : "login",
    });
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    router.push("/dashboard");
  };

  const field = (label: string, type: string, value: string, set: (v: string) => void, ph: string) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#8B7070", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{label}</label>
      <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph}
        onKeyDown={e => e.key === "Enter" && submit()}
        style={{ width:"100%", padding:"12px 14px", border:"1.5px solid #EDE0D8", borderRadius:10, fontSize:14, outline:"none", color:"#3D2C2C", background:"#FFFCFA", fontFamily:"'Nunito',sans-serif", boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(135deg, #F7E6E6 0%, #EDE9F7 50%, #E3EFF8 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Nunito',sans-serif" }}>
      {/* decorative blobs */}
      <div style={{ position:"fixed", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(181,168,212,0.2)", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", bottom:-80, left:-80, width:300, height:300, borderRadius:"50%", background:"rgba(232,165,165,0.2)", pointerEvents:"none" }}/>

      <div style={{ background:"rgba(255,252,250,0.92)", backdropFilter:"blur(20px)", border:"1.5px solid #EDE0D8", borderRadius:24, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(100,60,60,0.12)", position:"relative" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:18, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:26 }}>🏡</div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:600, color:"#3D2C2C", marginBottom:4 }}>FamilyTime</h1>
          <p style={{ fontSize:13, color:"#8B7070" }}>{mode === "signin" ? "Welcome back 🌸" : "Join your family hub 🌿"}</p>
        </div>

        {mode === "signup" && field("Your Name", "text", name, setName, "e.g. Sarah")}
        {field("Email", "email", email, setEmail, "you@example.com")}
        {field("Password", "password", password, setPassword, "••••••••")}

        {error && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:16 }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading}
          style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", color:"white", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", boxShadow:"0 4px 16px rgba(181,168,212,0.4)", marginBottom:16 }}>
          {loading ? "One moment..." : mode === "signin" ? "Sign In ✨" : "Create Account ✨"}
        </button>

        <div style={{ textAlign:"center", fontSize:13, color:"#8B7070" }}>
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            style={{ background:"none", border:"none", color:"#B5A8D4", fontWeight:800, cursor:"pointer", fontSize:13, fontFamily:"'Nunito',sans-serif" }}>
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
