// src/components/SignOutButton.tsx
"use client";
import { signOut } from "next-auth/react";
export default function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}
      style={{ background:"rgba(232,165,165,0.15)", border:"1.5px solid #EDE0D8", borderRadius:8, color:"#8B7070", fontSize:12, fontWeight:700, padding:"6px 12px", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
      Sign out
    </button>
  );
}
