// src/app/api/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { sendInviteEmail } from "@/lib/email";

const MEMBER_SELECT = `
  id, family_id, nextauth_user_id, email, first_name, last_name, initials, color, role,
  is_active, invite_status, invite_token,
  birthday, phone, blood_type, allergies, medications, medical_notes,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  bio, nickname, created_at, joined_at, last_seen_at
`;

// ── GET /api/members ──────────────────────────────────────────
export async function GET() {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select(MEMBER_SELECT)
    .eq("family_id", sessionMember.family_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Strip sensitive medical fields for non-owner/admin
  const isPrivileged = sessionMember.role === "owner" || sessionMember.role === "admin";
  const sanitized = (data ?? []).map(m => {
    if (isPrivileged) return m;
    // Members/children only see own medical info
    if (m.id === sessionMember.id) return m;
    return {
      ...m,
      blood_type: null, allergies: null, medications: null, medical_notes: null,
      emergency_contact_name: null, emergency_contact_phone: null, emergency_contact_relation: null,
    };
  });

  return NextResponse.json(sanitized);
}

// ── POST /api/members — invite a new member ───────────────────
export async function POST(req: NextRequest) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owners and admins can invite
  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
  }

  const body = await req.json();
  const {
    first_name, last_name, email, role = "member",
    color, nickname, bio, birthday, phone,
    blood_type, allergies, medications, medical_notes,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "first_name, last_name, and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists in this family
  const { data: existing } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("family_id", sessionMember.family_id)
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json({ error: "A member with this email already exists in your family" }, { status: 409 });
  }

  const initials = `${(first_name[0] ?? "").toUpperCase()}${(last_name[0] ?? "").toUpperCase()}`;
  const invite_token = crypto.randomBytes(32).toString("hex");
  const defaultColor = color || "#A8C8E8";

  const { data: newMember, error } = await supabaseAdmin
    .from("family_members")
    .insert({
      family_id: sessionMember.family_id,
      email: normalizedEmail,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      initials,
      color: defaultColor,
      role,
      is_active: true,
      invite_status: "pending",
      invite_token,
      nickname: nickname?.trim() || null,
      bio: bio?.trim() || null,
      birthday: birthday || null,
      phone: phone?.trim() || null,
      blood_type: blood_type || null,
      allergies: allergies?.trim() || null,
      medications: medications?.trim() || null,
      medical_notes: medical_notes?.trim() || null,
      emergency_contact_name: emergency_contact_name?.trim() || null,
      emergency_contact_phone: emergency_contact_phone?.trim() || null,
      emergency_contact_relation: emergency_contact_relation?.trim() || null,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Send invite email ─────────────────────────────────────────
  try {
    const { data: family } = await supabaseAdmin
      .from("families")
      .select("name")
      .eq("id", sessionMember.family_id)
      .single();

    await sendInviteEmail({
      to: normalizedEmail,
      firstName: first_name.trim(),
      inviteToken: invite_token,
      familyName: family?.name ?? "Your Family",
      invitedByName: sessionMember.first_name ?? "A family member",
    });
  } catch (emailErr) {
    console.error("[INVITE] Email failed:", emailErr);
    // Don't fail the request if email fails — member record is already created
  }

  return NextResponse.json(newMember, { status: 201 });
}