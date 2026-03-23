// src/app/api/accept-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validatePassword } from "@/lib/validatePassword";
import { sendJoinRequestNotification } from "@/lib/email";
import bcrypt from "bcryptjs";
import { createPersonalFamily } from "@/lib/createPersonalFamily";

// GET /api/accept-invite?token=xxx
// Validates token (including expiry) and returns invite info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: member, error } = await supabaseAdmin
    .from("family_members")
    .select("id, first_name, last_name, email, role, invite_status, invite_expires_at, families:family_id(id, name)")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  // Check expiry
  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Ask the family owner to send a new one." }, { status: 410 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", member.email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({
    member_id:   member.id,
    first_name:  member.first_name,
    last_name:   member.last_name,
    email:       member.email,
    role:        member.role,
    family_name: ((member.families as unknown as { name: string }[])?.[0]?.name) ?? "Your Family",
    family_id:   ((member.families as unknown as { id: string }[])?.[0]?.id) ?? null,
    has_account: !!existingUser,
  });
}

// POST /api/accept-invite
// Creates account if needed, then creates a PENDING join request (requires owner approval)
// Token is invalidated immediately after use (single-use)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password, name } = body;
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, last_name, invite_status, is_active, invite_expires_at, family_id")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }

  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Ask the family owner to send a new one." }, { status: 410 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  const email = member.email.toLowerCase().trim();

  // Check for existing account
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
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

    if (userErr || !newUser) return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    userId = newUser.id;

    // Create personal family for new users
    await createPersonalFamily({
      userId, email,
      firstName: member.first_name,
      lastName:  member.last_name,
    });
  }

  // Invalidate token immediately (single-use) but keep invite_status as pending
  await supabaseAdmin
    .from("family_members")
    .update({
      nextauth_user_id: userId,
      invite_token:     null, // single-use — invalidate now
      invite_status:    "pending", // stays pending until owner approves
      updated_at:       new Date().toISOString(),
    })
    .eq("id", member.id);

  // Get family info for notification
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, name")
    .eq("id", member.family_id)
    .single();

  // Notify all owners/admins
  try {
    const { data: admins } = await supabaseAdmin
      .from("family_members")
      .select("email, first_name")
      .eq("family_id", member.family_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    const reviewUrl = `${process.env.NEXTAUTH_URL}/dashboard/members`;

    for (const admin of admins ?? []) {
      await sendJoinRequestNotification({
        to:             admin.email,
        adminName:      admin.first_name,
        requesterName:  `${member.first_name} ${member.last_name}`,
        requesterEmail: email,
        familyName:     family?.name ?? "your family",
        via:            "invite_link",
        reviewUrl,
      });
    }
  } catch (e) {
    console.error("[INVITE] Admin notification failed:", e);
  }

  return NextResponse.json({ success: true, email, pending: true });
}

// PATCH /api/accept-invite — logged-in user joins via one-click (still creates pending request)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { token } = body;
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, last_name, invite_status, is_active, invite_expires_at, family_id")
    .eq("invite_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (memberErr || !member) return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });

  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "Already accepted" }, { status: 409 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", member.email.toLowerCase().trim())
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "No account found" }, { status: 404 });

  // Invalidate token, link user, keep pending
  await supabaseAdmin
    .from("family_members")
    .update({
      nextauth_user_id: user.id,
      invite_token:     null,
      invite_status:    "pending",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", member.id);

  // Notify admins
  try {
    const { data: family } = await supabaseAdmin.from("families").select("name").eq("id", member.family_id).single();
    const { data: admins } = await supabaseAdmin
      .from("family_members")
      .select("email, first_name")
      .eq("family_id", member.family_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    const reviewUrl = `${process.env.NEXTAUTH_URL}/dashboard/members`;
    for (const admin of admins ?? []) {
      await sendJoinRequestNotification({
        to:             admin.email,
        adminName:      admin.first_name,
        requesterName:  `${member.first_name} ${member.last_name}`,
        requesterEmail: member.email,
        familyName:     family?.name ?? "your family",
        via:            "invite_link",
        reviewUrl,
      });
    }
  } catch (e) {
    console.error("[INVITE] Admin notification failed:", e);
  }

  return NextResponse.json({ success: true, pending: true });
}
