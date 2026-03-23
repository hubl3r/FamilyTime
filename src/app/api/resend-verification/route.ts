// src/app/api/resend-verification/route.ts
// POST — resend the email verification link to an unverified user

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, name, email_verified")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // Always return success to prevent email enumeration
  if (!user || user.email_verified) {
    return NextResponse.json({ success: true });
  }

  // Generate a fresh token
  const verify_token = crypto.randomBytes(32).toString("hex");
  await supabaseAdmin
    .from("users")
    .update({ verify_token })
    .eq("id", user.id);

  try {
    await sendVerificationEmail({
      to:          normalizedEmail,
      name:        user.name ?? normalizedEmail.split("@")[0],
      verifyToken: verify_token,
    });
  } catch (e) {
    console.error("[RESEND VERIFY] Email failed:", e);
  }

  return NextResponse.json({ success: true });
}
