// src/app/api/verify-email/route.ts
// GET /api/verify-email?token=xxx — marks the user's email as verified

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid-token", req.url));
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email_verified")
    .eq("verify_token", token)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid-token", req.url));
  }

  if (user.email_verified) {
    // Already verified — just send them to sign in
    return NextResponse.redirect(new URL("/sign-in?verified=1", req.url));
  }

  await supabaseAdmin
    .from("users")
    .update({ email_verified: true, verify_token: null })
    .eq("verify_token", token);

  return NextResponse.redirect(new URL("/sign-in?verified=1", req.url));
}
