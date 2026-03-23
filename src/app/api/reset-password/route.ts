// src/app/api/reset-password/route.ts
// POST /api/reset-password         — request a reset (send email)
// PUT  /api/reset-password         — confirm reset (new password + token)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM ?? "Hubler@endurawill.com";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://hubler.vercel.app";

// POST — request password reset
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ success: true });

  const reset_token = crypto.randomBytes(32).toString("hex");
  const expires_at  = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

  await supabaseAdmin
    .from("users")
    .update({ reset_token, reset_token_expires: expires_at })
    .eq("id", user.id);

  const resetUrl = `${APP_URL}/reset-password?token=${reset_token}`;

  await resend.emails.send({
    from: FROM,
    to:   normalizedEmail,
    subject: "Reset your FamilyTime password",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:sans-serif;background:#FDF8F4;margin:0;padding:0">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(100,60,60,0.10)">
        <div style="background:linear-gradient(135deg,#E8A5A5,#B5A8D4);padding:32px 36px 24px;text-align:center">
          <h1 style="margin:0;font-size:24px;color:#fff;font-weight:700">🏡 FamilyTime</h1>
        </div>
        <div style="padding:32px 36px">
          <p style="font-size:15px;color:#3D2C2C;margin:0 0 16px">Hi ${user.name},</p>
          <p style="font-size:15px;color:#3D2C2C;margin:0 0 24px">We received a request to reset your password. Click below to choose a new one:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#E8A5A5,#B5A8D4);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">Reset Password →</a>
          <p style="font-size:13px;color:#8B7070;margin:24px 0 0">This link expires in 1 hour. If you didn't request this, you can safely ignore it.</p>
        </div>
      </div>
    </body></html>`,
  });

  return NextResponse.json({ success: true });
}

// PUT — confirm reset with token + new password
export async function PUT(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, reset_token_expires")
    .eq("reset_token", token)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

  if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await supabaseAdmin
    .from("users")
    .update({ password: hashed, reset_token: null, reset_token_expires: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
