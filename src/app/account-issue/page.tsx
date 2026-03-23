// src/app/account-issue/page.tsx
"use client";
import { Suspense } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

function AccountIssueContent() {
  const { data: session } = useSession();

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F7E6E6 0%, #EDE9F7 50%, #E3EFF8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Nunito',sans-serif",
    }}>
      <div style={{
        background: "rgba(255,252,250,0.92)", backdropFilter: "blur(20px)",
        border: "1.5px solid #EDE0D8", borderRadius: 24,
        padding: "40px 36px", width: "100%", maxWidth: 440,
        boxShadow: "0 20px 60px rgba(100,60,60,0.12)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 600, color: "#3D2C2C", marginBottom: 8 }}>
          Account Access Issue
        </h1>
        <p style={{ fontSize: 14, color: "#8B7070", lineHeight: 1.7, marginBottom: 8 }}>
          Your account <strong>{session?.user?.email}</strong> is signed in but doesn't have access to any active family hub.
        </p>
        <p style={{ fontSize: 13, color: "#8B7070", lineHeight: 1.7, marginBottom: 28 }}>
          This can happen if your membership was deactivated. Please contact the family owner to restore access, or join a new family.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/join" style={{ display:"block", padding:"13px", background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", color:"#fff", borderRadius:12, textDecoration:"none", fontSize:15, fontWeight:800 }}>
            Join a Family
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            style={{ padding:"13px", background:"#fff", border:"1.5px solid #EDE0D8", borderRadius:12, fontSize:14, fontWeight:700, color:"#8B7070", cursor:"pointer", fontFamily:"inherit" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AccountIssuePage() {
  return (
    <Suspense>
      <AccountIssueContent />
    </Suspense>
  );
}
