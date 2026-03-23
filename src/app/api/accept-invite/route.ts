// src/app/api/accept-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { createPersonalFamily } from "@/lib/createPersonalFamily";
import { validatePassword } from "@/lib/validatePassword";

// GET /api/accept-invite?token=xxx
// Returns invite info + whether the email already has an account
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: member, error } = await supabaseAdmin
    .from("family_members")
    .select("id, first_name, last_name, email, role, invite_status, families:family_id(id, name)")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  // Check if this email already has an account
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", member.email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({
    member_id:        member.id,
    first_name:       member.first_name,
    last_name:        member.last_name,
    email:            member.email,
    role:             member.role,
    family_name:      ((member.families as unknown as { name: string }[])?.[0]?.name) ?? "Your Family",
    has_account:      !!existingUser, // key flag — drives which flow the UI shows
  });
}

// POST /api/accept-invite
// Two modes:
//   1. New user (no account): create users row + link + personal family
//   2. Existing user (has account): just link the family_members row to their existing user
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password, name } = body;

  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  // Look up the invite
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, last_name, invite_status, is_active, nextauth_user_id, family_id")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  const email = member.email.toLowerCase().trim();

  // Check if account already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    // Existing user — no password needed, just link them
    // (They signed in via the app's "join from within" flow which handles auth separately)
    userId = existingUser.id;
  } else {
    // New user — password required
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

    const { valid, errors } = validatePassword(password);
    if (!valid) return NextResponse.json({ error: errors[0] }, { status: 400 });

    const displayName = name?.trim() || `${member.first_name} ${member.last_name}`;
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
      invite_token:     null,
      updated_at:       new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Create personal family for new users
  if (!existingUser) {
    await createPersonalFamily({
      userId,
      email,
      firstName: member.first_name,
      lastName:  member.last_name,
    });
  }

  return NextResponse.json({ success: true, email, is_new_user: !existingUser });
}

// PATCH /api/accept-invite — existing logged-in user accepts invite from within the app
// Called from dashboard when user clicks "Join [Family]" on a pending invite
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { token } = body;
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, last_name, invite_status, is_active")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "Already accepted" }, { status: 409 });
  }

  // Look up the user by email
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", member.email.toLowerCase().trim())
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "No account found" }, { status: 404 });

  await supabaseAdmin
    .from("family_members")
    .update({
      nextauth_user_id: user.id,
      invite_status:    "accepted",
      joined_at:        new Date().toISOString(),
      invite_token:     null,
      updated_at:       new Date().toISOString(),
    })
    .eq("id", member.id);

  return NextResponse.json({ success: true });
}
