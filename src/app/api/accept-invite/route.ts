// src/app/api/accept-invite/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

// GET /api/accept-invite?token=xxx
// Returns the family + member info for the invite token so the page can show it
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data: member, error } = await supabaseAdmin
    .from("family_members")
    .select(`
      id, first_name, last_name, email, role, invite_status,
      families:family_id ( id, name )
    `)
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  return NextResponse.json({
    member_id:   member.id,
    first_name:  member.first_name,
    last_name:   member.last_name,
    email:       member.email,
    role:        member.role,
    family_name: (member.families as { name: string } | null)?.name ?? "Your Family",
  });
}

// POST /api/accept-invite
// Creates the users row (or finds existing), links to family_members, marks accepted
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password, name } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Look up the invite
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, last_name, invite_status, is_active, nextauth_user_id")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  const displayName = name?.trim() || `${member.first_name} ${member.last_name}`;
  const email = member.email.toLowerCase().trim();

  // Check if a users row already exists for this email
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    // User already has an account — just link them
    userId = existingUser.id;
  } else {
    // Create new users row
    const hashed = await bcrypt.hash(password, 10);
    const { data: newUser, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({ email, name: displayName, password: hashed, email_verified: true })
      .select("id")
      .single();

    if (userErr || !newUser) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
    userId = newUser.id;
  }

  // Link family_members row to the user and mark accepted
  const { error: updateErr } = await supabaseAdmin
    .from("family_members")
    .update({
      nextauth_user_id: userId,
      invite_status:    "accepted",
      joined_at:        new Date().toISOString(),
      invite_token:     null, // invalidate token after use
      updated_at:       new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}
